# 🚀 GitHub Pages Deployment Guide

This guide will help you deploy the WebAssembly Isometric RPG Game to GitHub Pages.

## Quick Deploy (Recommended)

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Name your repository (e.g., `wasm-rpg-game`)
4. Make it **Public** (required for free GitHub Pages)
5. **DON'T** initialize with README (we already have one)
6. Click **Create repository**

### Step 2: Upload Files

#### Option A: Using GitHub Web Interface (Easiest)

1. On your new repository page, click **uploading an existing file**
2. Drag and drop or select these files:
   - `index.html`
   - `rpg_game.c`
   - `rpg_game.js`
   - `rpg_game.wasm`
   - `README.md`
   - `.nojekyll`
   - `server.py` (optional, for local testing)
   - `build.sh` (optional, for rebuilding)
3. Add commit message: "Initial game upload"
4. Click **Commit changes**

#### Option B: Using Git Command Line

```bash
# Clone your new repository
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME

# Copy all game files to this directory
cp /path/to/game/files/* .

# Add all files
git add .

# Commit
git commit -m "Initial game upload"

# Push to GitHub
git push origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (in the repository navigation)
3. Scroll down to **Pages** section (left sidebar)
4. Under **Source**, select:
   - **Deploy from a branch**
   - Branch: **main** (or master)
   - Folder: **/ (root)**
5. Click **Save**

### Step 4: Access Your Game

1. Wait 2-5 minutes for deployment
2. Your game will be available at:
   ```
   https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
   ```
3. You can check deployment status in the **Actions** tab

## 🎮 Game is Now Live!

Once deployed, share your game URL with friends! The game runs entirely in the browser with no server requirements.

## Optional: Custom Domain

If you have a custom domain:

1. Go to Settings → Pages
2. Under "Custom domain", enter your domain
3. Click Save
4. Add a CNAME record in your DNS settings pointing to `YOUR-USERNAME.github.io`

## Updating the Game

### Manual Update
1. Edit files locally or on GitHub
2. Commit and push changes
3. GitHub Pages will automatically redeploy

### Automatic WASM Compilation
If you've set up the GitHub Action:
1. Edit `rpg_game.c` directly on GitHub
2. The Action will automatically compile to WASM
3. Changes will be live in minutes

## Troubleshooting

### Game Not Loading?

1. **Check deployment status:**
   - Go to Settings → Pages
   - Look for "Your site is published at..."
   
2. **Verify files:**
   - Ensure all 4 main files are present:
     - `index.html`
     - `rpg_game.js`
     - `rpg_game.wasm`
     - `.nojekyll`

3. **Clear browser cache:**
   - Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

4. **Check browser console:**
   - Press F12 → Console tab
   - Look for error messages

### Common Issues

| Issue | Solution |
|-------|----------|
| 404 Error | Wait a few more minutes for deployment |
| WASM not loading | Ensure `.nojekyll` file exists |
| MIME type error | File might be corrupted, re-upload |
| Game freezes | Try a different browser |

## Local Testing

Before deploying, test locally:

```bash
# Python 3
python3 server.py

# Or using Python's built-in server
python3 -m http.server 8000
```

Then open: http://localhost:8000

## File Structure for GitHub Pages

```
your-repo/
├── index.html          # Main game (required)
├── rpg_game.js         # WASM loader (required)
├── rpg_game.wasm       # Game engine (required)
├── .nojekyll          # Disable Jekyll (required)
├── README.md          # Documentation
├── rpg_game.c         # Source code
├── server.py          # Local server
└── .github/
    └── workflows/
        └── build-wasm.yml  # Auto-build action
```

## Performance Tips

1. **Use Chrome or Firefox** for best performance
2. **Close unnecessary tabs** to free memory
3. **Enable hardware acceleration** in browser settings

## Sharing Your Game

Once deployed, share your game:

- **Direct Link:** `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`
- **QR Code:** Use a QR generator with your game URL
- **Social Media:** Share with #WebAssembly #IndieGame #RPG
- **Game Jams:** Submit to itch.io or game jams

## Next Steps

- ⭐ Star the repository
- 🔧 Customize the game mechanics in `rpg_game.c`
- 🎨 Modify the UI in `index.html`
- 📝 Update README with your own content
- 🤝 Enable Issues for player feedback

---

**Need Help?** Open an issue in the repository or check the main README for more details.

Happy Gaming! 🎮🗡️🛡️