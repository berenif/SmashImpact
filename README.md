# SmashImpact

SmashImpact est un prototype de jeu de "tag" jouable directement dans le navigateur. Deux joueurs se connectent en pair à pair via WebRTC et peuvent échanger l'offre/réponse soit en copiant du texte, soit en scannant des QR codes.

## Installation

1. Cloner ce dépôt.
2. (Optionnel) Lancer un serveur HTTP statique, par exemple :
   ```bash
   python3 -m http.server
   ```

## Lancement

### Dans un navigateur
- Ouvrir `index.html` dans un navigateur moderne (Chrome, Firefox, etc.).
- Suivre les instructions à l'écran pour créer ou rejoindre une partie.

### Via la ligne de commande
- Si un serveur a été lancé avec la commande ci‑dessus, ouvrir `http://localhost:8000` dans le navigateur.

## Dépendances principales

- [jsQR](vendor/jsqr.js) : lecture de QR codes.
- [qrcode.js](vendor/qrcode.js) : génération de QR codes.
- APIs WebRTC et Web APIs standards du navigateur (canvas, etc.).

## Pages de tests

Des pages de tests sont fournies pour vérifier diverses fonctionnalités :

- `test-simple.html` : exemple minimal de connexion.
- `test-simple-qr.html` : handshake simple avec QR code.
- `test-qr.html` et `test-qr-debug.html` : tests d'offre/réponse via QR codes.
- `test-qr-scan.html` : vérification du scan vidéo.
- `test-firefox.html` : compatibilité spécifique à Firefox.
