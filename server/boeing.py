#!/usr/bin/python

from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import signal
import mcp3008
import gpio
import re

def MakeHandlerClass(mcp, gpio):
    class CustomHandler(BaseHTTPRequestHandler, object):

        def __init__(self, *args, **kwargs):
             self._mcps = {mcp.getSpiDev(): mcp}
             self._gpio = gpio
             super(CustomHandler, self).__init__(*args, **kwargs)

        def do_GET(self):
            buff = ""
            retcode = 500

            #TODO: use try to handle error

            # Status
            if self.path == "/status":
                buff += "OK"
                retcode = 200

            # Polling, return all sensor values
            if self.path == "/poll":
                for spidev, mcp in self._mcps.iteritems():
                    for ch, value in mcp.getValues():
                        buff += "mcp3008/%d/%d %d\n" % (spidev, ch, value)
                for port, value in self._gpio.getValues():
                    buff += "gpio/%d %d\n" % (port, value)
                retcode = 200

            # get specific mcp's value
            m = re.match("/mcp3008/(\d+)/(\d+)", self.path)
            if m is not None:
                buff += ("mcp3008/%s/%s %d\n" % (m.group(1), m.group(2), self._mcps[int(m.group(1))].getValue(int(m.group(2)))))
                retcode = 200

            # get specific gpio value
            m = re.match("/gpio/(\d+)", self.path)
            if m is not None:
                buff += ("gpio/%d %s\n" % (int(m.group(1)), self._gpio.getValue(int(m.group(1)))) )
                retcode = 200

            # init gpio port
            m = re.match("/setupGpio/(\d+)/([a-zA-Z0-9_-]+)", self.path)
            if m is not None:
                self._gpio.setup(int(m.group(1)), m.group(2))
                retcode = 200

            # set gpio port
            m = re.match("/setGpio/(\d+)/(%s|%s)" % (gpio.Gpio.gpioHigh, gpio.Gpio.gpioLow), self.path)
            if m is not None:
                self._gpio.setup(int(m.group(1)), m.group(2))
                retcode = 200

            self.send_response(retcode)
            self.send_header('Content-type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            self.wfile.write(buff)

        def log_message(self, format, *args):
            #TODO: filter poll
            super(CustomHandler, self).log_message(format, *args)
            return

    return CustomHandler


httpd = None

def signal_handler(signal, frame):
    print('You pressed Ctrl+C!')

    # return response and shutdown the server
    import threading
    assassin = threading.Thread(target=httpd.shutdown)
    assassin.daemon = True
    assassin.start()

if __name__ == "__main__":
    port = 8000

    mcp = mcp3008.Mcp3008(0, 0)
    gpio = gpio.Gpio()

    HandlerClass = MakeHandlerClass(mcp, gpio)
    httpd = HTTPServer(("0.0.0.0", port), HandlerClass)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print "Listening on 0.0.0.0:%d..." % port
    httpd.serve_forever()

    httpd.server_close()