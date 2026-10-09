#!/usr/bin/env python3
"""
Local dev server for FocusMirror.

Browsers block getUserMedia() on file:// pages, so the camera features only
work over http(s). Run this, then open the printed URL.

    python3 serve.py
"""
import http.server, os, socket, socketserver, sys, threading, webbrowser

PORT_START = 8000


def free_port(start):
    for port in range(start, start + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("no free port")


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    if not os.path.exists("index.html"):
        print("ERROR: run this from the folder containing index.html")
        return 1
    port = free_port(PORT_START)
    url = f"http://localhost:{port}/index.html"
    print("=" * 56)
    print("  FocusMirror running")
    print("=" * 56)
    print(f"  {url}")
    print("\n  Camera needs http:// — do not open index.html directly.")
    print("  Ctrl+C to stop.")
    print("=" * 56)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), Handler) as httpd:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
