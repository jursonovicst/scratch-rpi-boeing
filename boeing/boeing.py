#!/usr/bin/python

from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import signal
import random
import mcp3008

def MakeHandlerClass(mcp):
    class CustomHandler(BaseHTTPRequestHandler, object):
        _mcp = None

        def __init__(self, *args, **kwargs):
             super(CustomHandler, self).__init__(*args, **kwargs)
             self._mcp = mcp

        def do_GET(self):
            buff = ""
            if self.path == "/poll":
                for ch, value in self._mcp.getValues():
                    buff += "3008/%d/%d %d\n" % (0, ch, value)

            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(buff)

        def log_message(self, format, *args):
            return

    # def do_HEAD(self):
    #        self._set_headers()

    #    def do_POST(self):
    #        # Doesn't do anything with posted data
    #        self._set_headers()
    #        self.wfile.write("<html><body><h1>POST!</h1></body></html>")

    return CustomHandler

class MyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        buff = ""
        if self.path == "/poll":
            for spidev in range(0,2):
                for ch in range(0,8):
                    buff += "3008/%d/%d %d\n" % (spidev, ch, random.randint(0,1024))

        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(buff)

    def log_message(self, format, *args):
        return
#    def do_HEAD(self):
#        self._set_headers()

#    def do_POST(self):
#        # Doesn't do anything with posted data
#        self._set_headers()
#        self.wfile.write("<html><body><h1>POST!</h1></body></html>")


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

    HandlerClass = MakeHandlerClass(mcp)
    httpd = HTTPServer(("127.0.0.1", port), HandlerClass)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print "Serving at port", port
    httpd.serve_forever()

    httpd.server_close()
