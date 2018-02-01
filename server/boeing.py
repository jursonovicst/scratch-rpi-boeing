#!/usr/bin/python

from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import signal
import mcp3008
import gpio
import re

def MakeHandlerClass(mcp, gpio):
    class CustomHandler(BaseHTTPRequestHandler, object):
        _mcp = {}

        def __init__(self, *args, **kwargs):
             self._mcp['0'] = mcp
             self._gpio = gpio
             super(CustomHandler, self).__init__(*args, **kwargs)

        def do_GET(self):
            buff = ""
            if self.path == "/status":
                buff += "OK"

            if self.path == "/poll":
                for ch, value in self._mcp['0'].getValues():
                    buff += "mcp3008/%d/%d %d\n" % (0, ch, value)
                for port, value in self._gpio.getValues():
                    buff += "gpio/%d %d\n" % (port, value)

            m = re.match("/mcp3008/([0-1])/([0-7])", self.path)
            if m is not None:
                buff += ("mcp3008/%s/%s %d\n" % (m.group(1), m.group(2), self._mcp[m.group(1)].getValue(int(m.group(2)))))

            # Commands
            m = re.match("/setupGpio/([0-9]+)/([0-9])", self.path)
            if m is not None and 1 <= int(m.group(1)) and int(m.group(1)) <= 26:
                self._gpio.setup(int(m.group(1)), int(m.group(2)))

            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            self.wfile.write(buff)

#        def log_message(self, format, *args):
#            return

    # def do_HEAD(self):
    #        self._set_headers()

    #    def do_POST(self):
    #        # Doesn't do anything with posted data
    #        self._set_headers()
    #        self.wfile.write("<html><body><h1>POST!</h1></body></html>")

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

    print "Serving at port", port
    httpd.serve_forever()

    httpd.server_close()
