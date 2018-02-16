#!/usr/bin/python

from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import signal
import re


try:
    import Adafruit_GPIO.SPI as SPI
    from Adafruit_MCP3008 import MCP3008
except ImportError:
    print("error importing Adafruit HW modules")
    exit(1)

from gpio import MyGPIO
from tlc5947 import TLC5947


def MakeHandlerClass(mcp, gpio, tlc):
    class CustomHandler(BaseHTTPRequestHandler, object):

        def __init__(self, *args, **kwargs):
             self._mcp = mcp
             self._gpio = gpio
             self._tlc = tlc
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
                for ch in range(0, 8):
                    buff += "mcp3008/%d %d\n" % (ch, self._mcp.read_adc(ch))

                for port, value in self._gpio.getValues():
                    buff += "gpio/%d %d\n" % (port, value)
                retcode = 200

            # get mcp's value
            m = re.match("/mcp3008/(\d+)", self.path)
            if m is not None:
                buff += ("mcp3008/%s %d\n" % (m.group(1), self._mcp.getValue(int(m.group(1)))))
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
            m = re.match("/setGpio/(\d+)/(%s|%s)" % (self._gpio.gpioHigh, self._gpio.gpioLow), self.path)
            if m is not None:
                self._gpio.setup(int(m.group(1)), m.group(2))
                retcode = 200

            # set tlc5947 port
            m = re.match("/setTLC5947/(\d+)/([0-9]+)", self.path)
            if m is not None:
                self._tlc[int(m.group(1))] = int(m.group(2))
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

    mcp = MCP3008(spi=SPI.SpiDev(0, 0))
    gpio = MyGPIO()
    tlc = TLC5947(spi=SPI.SpiDev(0, 1))

    HandlerClass = MakeHandlerClass(mcp, gpio, tlc)
    httpd = HTTPServer(("0.0.0.0", port), HandlerClass)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print "Listening on 0.0.0.0:%d..." % port
    httpd.serve_forever()

    httpd.server_close()