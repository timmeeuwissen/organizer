# Integrations setup guide

This page describes what you must configure so **Firebase**, **Google**, **Microsoft**, **XAI (optional)**, and **in-app AI providers** work with Organizer App.

Canonical environment variable names and descriptions also appear in **`.env.example`** at the project root. Copy that file to **`.env`** and fill in real values.

---

## After changing `.env`

Nuxt reads environment variables when the dev server **starts** (see `nuxt.config.ts`). If you add or change keys:

1. Save **`.env`** in the **`organizer-app`** directory (same folder as `nuxt.config.ts` and `package.json`).
2. **Stop** the dev server and run **`make dev`** (or `npm run dev`) again.

If you skip this, the browser may still see an empty Microsoft or Google client ID, which triggers errors such as:

**“Microsoft OAuth is not configured (missing public client ID).”**

That message means **`runtimeConfig.public.microsoft.clientId`** is empty—almost always because **`MICROSOFT_CLIENT_ID`** is missing in **`.env`** or the server was not restarted after you set it.

---

## 1. Firebase (required for the app)

The app uses Firebase for authentication and Firestore.

| Variable | Purpose |
|----------|---------|
| `FIREBASE_API_KEY` | Web API key |
| `FIREBASE_AUTH_DOMAIN` | Auth domain (e.g. `project.firebaseapp.com`) |
| `FIREBASE_PROJECT_ID` | Project ID |
| `FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `FIREBASE_APP_ID` | App ID |
| `FIREBASE_MEASUREMENT_ID` | Analytics (optional) |

**What to do**

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Add a **Web** app and copy the config into **`.env`**.
3. Enable **Authentication** and **Firestore** as needed for your environment.

Optional emulator variables (`FIREBASE_USE_EMULATOR`, etc.) are listed in **`.env.example`**.

---

## 2. Google integration (mail, calendar, contacts, tasks)

Uses an OAuth **authorization code** flow with a popup, callback page **`/auth/callback`**, and server-side token exchange at **`/api/auth/oidc-callback`**. Token refresh uses **`/api/auth/refresh`** with `provider: google`.

| Variable | Where it is used |
|----------|------------------|
| `GOOGLE_CLIENT_ID` | **Public** (browser): `runtimeConfig.public.google.clientId` — popup authorize URL |
| `GOOGLE_CLIENT_SECRET` | **Server only**: code exchange and refresh |

**What to do**

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project.
2. **APIs & Services → OAuth consent screen** — configure consent (test users if in testing).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** — type **Web application**.
4. **Authorized redirect URIs** — add the exact URL your app uses for the callback, for example:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.example/auth/callback`
5. Enable the APIs you need (Gmail, Calendar, People, Tasks, etc.), aligned with the scopes requested in `components/integrations/GoogleAuthButton.vue`.
6. Put **Client ID** and **Client secret** into **`.env`** as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`**, then restart the dev server.

CLI-oriented setup hints are printed by **`make oauth-google-setup`** (see the `Makefile`).

---

## 3. Microsoft integration (Office 365 / Microsoft Graph)

Two UI paths exist:

1. **Connect Microsoft** — Same overall pattern as Google: popup → **`/auth/callback`** → **`/api/auth/oidc-callback`** (provider taken from OAuth `state`) → `postMessage` back to the opener.
2. **Microsoft — manual OAuth** — In-app form for client ID, client secret, and refresh token (e.g. from a CLI or separate tool).

| Variable | Where it is used |
|----------|------------------|
| `MICROSOFT_CLIENT_ID` | **Public** (browser): `runtimeConfig.public.microsoft.clientId` — without this you get **“Microsoft OAuth is not configured (missing public client ID)”** |
| `MICROSOFT_CLIENT_SECRET` | **Server only**: authorization code exchange and refresh |
| `MICROSOFT_TENANT_ID` | **Public** (browser) as `tenantId` (default **`common`** if unset); also used server-side for token endpoints |

**What to do**

1. In [Microsoft Entra admin center](https://entra.microsoft.com/) (Azure AD), **App registrations → New registration**.
2. **Redirect URI** — platform **Web**, same pattern as Google:
   - `http://localhost:3000/auth/callback`
   - plus your production URL when deployed.
3. **Certificates & secrets** — create a **client secret**; store it as **`MICROSOFT_CLIENT_SECRET`** (never commit it; keep it in **`.env`** only).
4. **API permissions** — **Delegated** Microsoft Graph permissions that match what the app requests. The list is defined in code as a single scope string in **`config/microsoftIntegrationOAuth.ts`** (e.g. `Mail.Read`, `Calendars.ReadWrite`, `Contacts.Read`, `Tasks.ReadWrite`, `offline_access`, etc.). Grant admin consent for your organization if required.
5. Set in **`.env`**:
   - `MICROSOFT_CLIENT_ID` = Application (client) ID  
   - `MICROSOFT_CLIENT_SECRET` = the secret value  
   - `MICROSOFT_TENANT_ID` = your directory (tenant) ID, or `common` / `organizations` / `consumers` as appropriate  
6. **Restart** the Nuxt dev server so the public client ID is injected.

If code exchange fails, verify redirect URI matches **exactly** (scheme, host, port, path) in both Azure and the running app.

---

## 4. XAI (Grok) — optional env-based flag

| Variable | Purpose |
|----------|---------|
| `XAI_API_KEY` | API key when using XAI from environment-driven configuration |
| `XAI_API_ENABLED` | Feature toggle (`true` / `false`) |

See **`.env.example`**. Additional AI providers may be configured **in the app UI** (user profile / integrations), not only via **`.env`**.

---

## 5. AI providers (OpenAI, Gemini, XAI) in the application

In **Settings / Profile**, you can add AI integrations by **provider type** and **API key** stored with your user settings (see `components/integrations/AIIntegrationDialog.vue` and related forms). Those keys are **not** the same as the Google/Microsoft OAuth variables above.

**What to do**

1. Obtain an API key from the provider (OpenAI, Google AI Studio for Gemini, XAI, etc.).
2. Add the integration in the app and paste the key when prompted.
3. Use the in-app help links where available.

---

## 6. Feature flags and debugging

| Variable | Purpose |
|----------|---------|
| `FEATURE_*` | Toggle major features (mail, calendar, network graph, statistics); see **`.env.example`**. |
| `DEBUG_AUTH_REDIR` | When `true`, Google/Microsoft auth use a **full-page redirect** instead of a popup (useful for debugging). |

---

## Quick reference: OAuth redirect URL

Both **Google** and **Microsoft** popup flows redirect to:

```text
{origin}/auth/callback
```

Examples:

- `http://localhost:3000/auth/callback`
- `https://your-production-host/auth/callback`

Register **both** providers with the **same path** on the **same origin** your users use in the browser.

---

## Related documentation

- **[README.md](../README.md)** — Install, `make init`, `make setup-env`, `make dev`
- **`docs/testing/integrations.md`** — Automated tests vs live credentials
- **`docs/product/data-storage.md`** — Where data lives (Firebase vs provider APIs)
- **`config/microsoftIntegrationOAuth.ts`** — Microsoft Graph delegated scopes used for the popup flow
