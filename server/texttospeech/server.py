#!/usr/bin/python

try:
    from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
    import signal
    import re
    import argparse

    import urllib
    import festival

except ImportError as e:
    print e.message
    exit(1)



parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter, description='RPi Boeing daemon.')

parser.add_argument('--port', type=int, default=8001, help='TCP port to listen on')
parser.add_argument('--bind', help='Bind server to this address', default='0.0.0.0')
#parser.add_argument('--mcp3008', type=int, nargs=2, help='SPI address of the MCP3008 A/D', default=(0,0), metavar=('PORT', 'DEV'))
#parser.add_argument('--tlc5947', type=int, nargs=2, help='SPI address of the MCPTLC5947 LED driver', default=(0,1), metavar=('PORT', 'DEV'))
parser.add_argument('--debug', action='store_true')


args = parser.parse_args()





def MakeHandlerClass(debug):
    class CustomHandler(BaseHTTPRequestHandler, object):

        def __init__(self, *args, **kwargs):
            self._debug = debug
            super(CustomHandler, self).__init__(*args, **kwargs)

        def do_GET(self):
            buff = ""
            retcode = 500

            #TODO: use try to handle error

            # Status
            if self.path == "/status":
                buff += "OK"
                retcode = 200


            # text2speech
            m = re.match("/say/(.+)", self.path)
            if m is not None:
                festival.sayText(urllib.unquote(m.group(1)))
                retcode = 200



            self.send_response(retcode)
            self.send_header('Content-type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            self.wfile.write(buff)

        def log_request(self, code='-', size='-'):
            if not self._debug and (self.path == "/poll" or self.path == "/status"):
                return
            super(CustomHandler, self).log_request(code, size)


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
        # create handler
        HandlerClass = MakeHandlerClass(args.debug)
        httpd = HTTPServer((args.bind, args.port), HandlerClass)

        # register signals
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

        # server forever
        print "Listening on %s:%d" % (args.bind, args.port)

        httpd.serve_forever()

    except Exception as e:
        print "Error: " + e.message

    if httpd is not None:
        httpd.server_close()