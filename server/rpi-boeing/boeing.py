#!/usr/bin/python

try:
    from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
    import signal
    import re
    import argparse

    from gpio import MyGPIO
    from tlc5947 import TLC5947

    import Adafruit_GPIO.SPI as SPI
    from Adafruit_MCP3008 import MCP3008
except ImportError as e:
    print e.message
    exit(1)



parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter, description='RPi Boeing daemon.')

parser.add_argument('--port', type=int, default=8000, help='TCP port to listen on')
parser.add_argument('--bind', help='Bind server to this address', default='0.0.0.0')
parser.add_argument('--mcp3008', type=int, nargs=2, help='SPI address of the MCP3008 A/D', default=(0,0), metavar=('PORT', 'DEV'))
parser.add_argument('--tlc5947', type=int, nargs=2, help='SPI address of the MCPTLC5947 LED driver', default=(0,1), metavar=('PORT', 'DEV'))

args = parser.parse_args()





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
    print('Interrupt!')

    # return response and shutdown the server
    import threading
    assassin = threading.Thread(target=httpd.shutdown)
    assassin.daemon = True
    assassin.start()

if __name__ == "__main__":

    try:
        # prepare HW interfaces
        mcp = MCP3008(spi=SPI.SpiDev(args.mcp3008[0], args.mcp3008[1]))
        gpio = MyGPIO()
        tlc = TLC5947(spi=SPI.SpiDev(args.tlc5947[0], args.tlc5947[1]))

        # create handler
        HandlerClass = MakeHandlerClass(mcp, gpio, tlc)
        httpd = HTTPServer((args.bind, args.port), HandlerClass)

        # register signals
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        # server forever
        print "Listening on %s:%d" % (args.bind, args.port)
        print "MCP3008 SPI address: %d.%d" % (args.mcp3008[0], args.mcp3008[1])
        print "TLC5947 SPI address: %d.%d" % (args.tlc5947[0], args.tlc5947[1])

        httpd.serve_forever()

    except Exception as e:
        print "Error: " + e.message

    if httpd is not None:
        httpd.server_close()