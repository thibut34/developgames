# Serveur local de développement : sert le jeu sans cache pour voir chaque modification.
# Lancer : python serve.py   puis ouvrir http://localhost:8000
import http.server
import os


class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.webmanifest': 'application/manifest+json'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print('DevelopGames : http://localhost:8000')
    http.server.ThreadingHTTPServer(('', 8000), NoCache).serve_forever()
