# 📌 Tasker — Read-it-Later PWA

A serverless **Progressive Web App** that uses your **Google Calendar as a database**. Save URLs and notes with reminder times — get notified via the native Google Calendar app on your phone.

> No backend. No server. No database. Just Google Calendar.

## ✨ Features

- 🔗 **Save URLs & notes** — bookmark links or write short task notes
- ⏰ **Flexible reminders** — pick 1h, 3h, 6h, 8h, 24h or a custom date/time
- 📱 **Native push notifications** — via Google Calendar app on your phone
- 🌙 **Dark / Light mode** — auto-detects system preference
- 📲 **PWA installable** — add to home screen on Android/iOS
- 🔗 **Web Share Target** — share URLs directly from any app on Android
- 📴 **Offline support** — Service Worker caches the app shell

## 🚀 How it works

1. Sign in with your Google account (OAuth 2.0)
2. The app gets permission to create Google Calendar events
3. When you save a URL or note, a Calendar event is created with:
   - The URL/note in the event description
   - A popup reminder at your chosen time
4. At the scheduled time, your phone's Google Calendar app sends a push notification

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML + CSS + ES6 modules |
| Auth | Google Identity Services (GIS) |
| Storage | Google Calendar API v3 |
| Hosting | GitHub Pages |
| PWA | Web App Manifest + Service Worker |

## 🔧 Local Development

```bash
# Serve with any static server (no build step needed)
npx http-server ./ -p 8000 -a 0.0.0.0

# Open
open http://localhost:8000
```

> **Note:** Add `http://localhost:8000` to **Authorized JavaScript origins** in your [Google Cloud Console](https://console.cloud.google.com/apis/credentials) OAuth client.

## ⚙️ Configuration

Edit `config.js`:

```js
export const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
```

To get a Client ID:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **Google Calendar API**
3. Create an **OAuth 2.0 Client ID** (Web application type)
4. Add your domain to Authorized JavaScript origins:
   - `https://yourusername.github.io`
   - `http://localhost:8000` (for local dev)

## 📦 Deployment

The app is a static site — just push to `main` branch and enable GitHub Pages:

```bash
git push origin main
```

GitHub Pages will serve from the root of `main` branch.

## 📄 License

MIT
