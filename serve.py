# Serveur local de développement : sert le jeu sans cache pour voir chaque modification.
# Lancer : python serve.py   puis ouvrir http://localhost:8000
import http.server
import os
import re


class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.webmanifest': 'application/manifest+json'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    # Outil de développement : enregistre une image envoyée par la page (couvertures de la fiche du jeu).
    # POST /capture/nom.png  ->  fiche/nom.png
    def do_POST(self):
        m = re.fullmatch(r'/capture/([a-z0-9-]+\.(png|jpg))', self.path)
        if not m:
            self.send_error(404)
            return
        data = self.rfile.read(int(self.headers['Content-Length']))
        os.makedirs('fiche', exist_ok=True)
        with open(os.path.join('fiche', m.group(1)), 'wb') as f:
            f.write(data)
        self.send_response(204)
        self.end_headers()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print('DevelopGames : http://localhost:8000')
    http.server.ThreadingHTTPServer(('', 8000), NoCache).serve_forever()
