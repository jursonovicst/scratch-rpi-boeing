#!/usr/bin/python

from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import signal
import mcp3008

def MakeHandlerClass(mcp):
    class CustomHandler(BaseHTTPRequestHandler, object):
        _mcp = None

        def __init__(self, *args, **kwargs):
             self._mcp = mcp
             super(CustomHandler, self).__init__(*args, **kwargs)

        def do_GET(self):
            buff = ""
            if self.path == "/poll":
                for ch, value in self._mcp.getValues():
                    buff += "mcp3008/%d/%d %d\n" % (0, ch, value)
            elif self.path == "/status":
                buff += "OK"

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

    HandlerClass = MakeHandlerClass(mcp)
    httpd = HTTPServer(("0.0.0.0", port), HandlerClass)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print "Serving at port", port
    httpd.serve_forever()

    httpd.server_close()
