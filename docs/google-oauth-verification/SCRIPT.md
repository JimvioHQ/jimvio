# Narration / on-screen script (English)

Target length: **4–6 minutes**. Speak slowly. Keep annotations off Google’s consent UI.

---

### Step 1 — Open Jimvio (15–20s)

**URL:** https://www.jimvio.com/

**Say:**
“Jimvio is a global creator-commerce platform. This demonstration shows how a user connects YouTube to Jimvio and uses YouTube as a live destination.”

---

### Step 2 — Jimvio login (brief)

Show real Jimvio authentication only to establish a session.

**Say:**
“First we sign in to Jimvio. This login is separate from the YouTube Live OAuth authorization that follows.”

---

### Step 3 — Live Destinations

**URL:** Live Studio → Live Settings → Live Destinations  
(`https://www.jimvio.com/communities/live?open=settings`)

**Say:**
“Jimvio allows users to connect external live destinations from Live Settings. We will now connect a YouTube account.”

---

### Step 4 — Connect YouTube

Click **Connect**. Do not cut the navigation to Google.

**Annotation:** Step 3 — Connect YouTube

---

### Step 5 — Real Google OAuth Consent (MOST IMPORTANT)

Show the complete real Google page:

- Google branding
- Jimvio app identity
- Account
- YouTube permission corresponding to `https://www.googleapis.com/auth/youtube.force-ssl`
- English UI
- Unverified-app warning if Google shows it (do not hide)
- Click **Allow** / **Continue**

**Say (before Allow):**
“This is the real Google OAuth consent screen. The user reviews and explicitly authorizes YouTube access for Jimvio Live Destinations.”

No overlays covering the consent content.

---

### Step 6 — Callback / Connected

Return to Jimvio Live Destinations. Show Connected / account name.

**Say:**
“After the user explicitly authorizes access, Jimvio completes the OAuth callback and connects the user’s YouTube account as a Live Destination.”

---

### Step 7 — Actual YouTube functionality

Open Live Studio. Enable YouTube if needed. Start **Go Live**.

Show destination preparation / streaming status driven by Jimvio’s YouTube Live Streaming API integration (broadcast + stream create/bind).

Optionally open YouTube Studio for the same authorized account to show the resulting live resource — only if real.

**Say:**
“Jimvio uses the authorized YouTube access to create and manage YouTube Live broadcasts as an external destination while the creator streams from Jimvio Live Studio.”

---

### Step 8 — Disconnect

Return to Live Destinations → Disconnect YouTube.

**Say:**
“Users can disconnect their YouTube account from Jimvio’s Live Destinations settings.”

---

### Close

**Say:**
“Jimvio uses the YouTube integration only after the user explicitly authorizes access. The authorized YouTube access is used to provide YouTube Live functionality as an external live destination. Users can manage and disconnect the integration from Jimvio settings.”
