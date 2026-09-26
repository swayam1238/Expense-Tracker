# Expense Tracker

A private, mobile-first expense tracker (PWA) built with React and Firebase. Track spending by category and month, set budgets, import notes as transactions, and sync data to Firestore when signed in.

## Features

- **Dashboard** — monthly totals, budget progress, savings vs spend, category donut chart
- **Transactions** — search and filter by month
- **Analytics** — spending breakdowns and trends
- **Categories** — per-month categories with icons, colors, and budgets
- **Settings** — currency, cloud sync status, JSON/CSV backup, PWA install hints
- **Magic Notes** — paste free-text lines to parse into expenses
- **App lock** — optional access code (hash stored in env, not in source) plus WebAuthn biometrics on supported devices
- **Auth** — Firebase Google or email sign-in with Firestore rules restricted to an allowed account

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A Firebase project (Auth + Firestore + Hosting optional)

## Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in values:

   ```bash
   cp .env.example .env
   ```

3. Configure Firebase in `.env` (see [Environment variables](#environment-variables)).

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Build for production:

   ```bash
   npm run build
   npm run preview
   ```

## Environment variables

All client variables use the `VITE_` prefix (embedded at build time).

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | For cloud sync | Firebase web app API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | For cloud sync | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | For cloud sync | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | For cloud sync | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | For cloud sync | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | For cloud sync | App ID |
| `VITE_APP_LOCK_SHA256` | Optional | Lowercase hex SHA-256 of your app access code |

If Firebase variables are missing, the app can run in **local-only** mode using `localStorage`.

### App lock hash

The lock screen compares a SHA-256 hash so the plain access code is not committed in source. Generate a hash locally:

```bash
node -e "const c=require('crypto');const p=process.argv[1];console.log(c.createHash('sha256').update(p).digest('hex'))" YOUR_ACCESS_CODE
```

Add the output to `.env` as `VITE_APP_LOCK_SHA256=...` and restart the dev server or rebuild. Leave it empty to skip the lock screen.

**Note:** A static SPA cannot hide secrets from someone with your built bundle. The lock is a casual privacy layer on the device; **Firebase Authentication and Firestore rules** protect cloud data.

Allowed sign-in email and verification requirements are enforced in `src/firebase.js` and `firestore.rules`. Update both if you change accounts.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint |

## Production deploy (GitHub Actions)

Pushes to **`main`** automatically build and deploy to Firebase (hosting + Firestore rules) via [`.github/workflows/deploy-production.yml`](.github/workflows/deploy-production.yml).

### One-time GitHub secrets setup

In GitHub: **Repository → Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Value |
|--------|--------|
| `VITE_FIREBASE_API_KEY` | Same as local `.env` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same as local `.env` |
| `VITE_FIREBASE_PROJECT_ID` | Same as local `.env` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Same as local `.env` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same as local `.env` |
| `VITE_FIREBASE_APP_ID` | Same as local `.env` |
| `VITE_APP_LOCK_SHA256` | Same as local `.env` (optional; leave unset to skip app lock in production) |
| `FIREBASE_SERVICE_ACCOUNT` | **Full JSON** of a Firebase/Google service account key (see below) |

**Service account (for deploy only):**

1. [Firebase Console](https://console.firebase.google.com/) → your project → **Project settings** (gear) → **Service accounts**.
2. Click **Generate new private key** and download the JSON file.
3. Open the file, copy the **entire** JSON object, and paste it as the `FIREBASE_SERVICE_ACCOUNT` secret (one line is fine).

The default Firebase Admin service account can deploy hosting and rules. Do not commit this JSON to the repo.

**Sync secrets from local `.env` (GitHub CLI):**

```powershell
# From repo root; requires `gh auth login`
Get-Content .env | ForEach-Object {
  if ($_ -match '^(VITE_[A-Z0-9_]+)=(.*)$') {
    $matches[2] | gh secret set $matches[1]
  }
}
```

Then add `FIREBASE_SERVICE_ACCOUNT` manually in the GitHub UI.

After secrets are set, push to `main` or run **Actions → Production Deploy → Run workflow**.

### Manual deploy (optional)

1. `npm run build` (with `.env` present)
2. `firebase deploy`

Hosting includes security headers (HSTS, `X-Frame-Options`, etc.) defined in `firebase.json`.

## Project structure

```
src/
  App.jsx                 # App lock + shell routing
  context/AppContext.jsx  # Global state, sync, CRUD
  firebase.js             # Auth and Firestore helpers
  utils/appLock.js        # Access-code hash verification
  utils/notesParser.js    # Magic Notes parser
  components/             # Views and modals
```

## License

Private personal project.
