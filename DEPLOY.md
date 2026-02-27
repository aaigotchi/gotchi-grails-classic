# Deployment Guide 🚀

## Quick Deploy to Vercel (Recommended)

### Option 1: One-Click Deploy

Click this button to deploy instantly:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/aaigotchi/gotchi-grails)

1. Click the button above
2. Sign in to Vercel (or create account)
3. Click "Deploy"
4. Wait ~2 minutes
5. Your app is live! 🎉

### Option 2: Import from GitHub

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select `aaigotchi/gotchi-grails`
4. Click "Deploy"

No environment variables needed - it just works! ✨

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Production Build

```bash
npm run build
npm start
```

---

## What Gets Deployed

- ✅ Static optimized pages
- ✅ API routes (none currently)
- ✅ Assets cached on CDN
- ✅ Automatic HTTPS
- ✅ Global edge network

---

## Post-Deployment

After deployment, your app will be live at:

```
https://gotchi-grails-{random}.vercel.app
```

You can add a custom domain in Vercel settings!

---

## Troubleshooting

**Build fails?**
- Check `npm run build` works locally
- Verify all dependencies in package.json

**Blank page?**
- Check browser console for errors
- Verify Base RPC is accessible

**Slow card generation?**
- Normal! Fetching on-chain data takes ~2-3 seconds
- Consider adding loading states

---

**Need help?** Open an issue on GitHub!

GOTCHI GRAAILS™ © 2026 👻
