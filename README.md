# Deadline Defender AI 🛡️

**AI-Powered Deadline Risk & Procrastination Interceptor**

📄 **Project Submission Description & Architecture Doc:** [View Google Doc](https://docs.google.com/document/d/1mXShyO9TtYxGj4MowhG9osKu8_O4Yd4MOb7tEdMINEw/edit?usp=sharing)

Deadline Defender AI is an intelligent productivity companion designed to intercept procrastination before deadlines slip. Rather than passively listing tasks, it combines predictive risk analytics, natural language task parsing via Google Gemini 2.5 Flash, real Google Calendar schedule orchestration, automated Gmail deadline discovery, and an emergency Rescue Mode to ensure execution and secure partial credit when time runs short.

---

## 🔗 Real Integrations

Deadline Defender AI operates as a fully integrated, production-ready SaaS companion powered by real live services:

- **Firebase Authentication:** Secure email/password and Google OAuth identity management.
- **Cloud Firestore:** Real-time NoSQL document database storing user profiles, tasks, subtasks, focus blocks, risk snapshots, and behavior telemetry under strict tenant isolation.
- **Google Gemini API (`gemini-2.5-flash`):** Powers natural language task extraction, automated subtask breakdown, risk mitigation reasoning, and scope-reduction rescue plans.
- **Google OAuth 2.0:** Server-side token management allowing secure access to user calendars and inbox data without client bundle exposure.
- **Google Calendar FreeBusy:** Queries real user availability to avoid scheduling focus blocks during conflicting meetings.
- **Google Calendar Event Creation:** Automatically schedules dedicated focus sessions directly onto the user's primary calendar.
- **Gmail Readonly Deadline Extraction:** Scans recent emails (`source: "gmail"`) to discover actionable deadlines (e.g., assignment submissions or project deliverables) and drafts structured task previews.
- **Firebase Cloud Messaging (FCM):** Optional web push notification delivery for critical reminder alerts across desktop and mobile devices.

---

## ☁️ Required Google Cloud Setup

To enable real Google integrations (OAuth, Calendar, and Gmail), configure a Google Cloud project:

1. **Create Project:** Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. **Enable APIs:** Navigate to **APIs & Services > Library** and enable:
   - `Google Calendar API`
   - `Gmail API`
3. **Configure OAuth Consent Screen:**
   - Go to **APIs & Services > OAuth consent screen**.
   - Select **External** (or Internal for Google Workspace domains) and fill in application details.
   - Add the following least-privilege scopes:
     - `https://www.googleapis.com/auth/calendar.freebusy`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/gmail.readonly`
   - Add test users if your app is in testing mode.
4. **Create OAuth Web Client:**
   - Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Add Authorized Redirect URIs:
     - Local development: `http://localhost:3000/api/auth/google/callback`
     - Production: `https://your-production-domain.com/api/auth/google/callback`
   - Copy your **Client ID** and **Client Secret**.

---

## 🔥 Firebase Setup

To configure backend data storage, authentication, and security rules:

1. **Create Firebase Project:** Open the [Firebase Console](https://console.firebase.google.com/) and create a project (or attach your Google Cloud project).
2. **Enable Authentication:**
   - Navigate to **Build > Authentication > Sign-in method**.
   - Enable **Email/Password**.
   - Optionally enable **Google** provider.
3. **Create Firestore Database:**
   - Navigate to **Build > Firestore Database** and create a database in Production mode.
4. **Deploy Security Rules:** Deploy the included production-ready `firestore.rules`:
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```
5. **Configure FCM Web Push (Optional):**
   - Navigate to **Project Settings > Cloud Messaging > Web configuration**.
   - Generate a **VAPID key** pair for browser notification push support.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` in the project root:

```bash
cp .env.example .env.local
```

### Full `.env.example` Reference

```ini
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
NODE_ENV=development

# Firebase Public Client Config (Console > Project Settings > General)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABCDEF

# Firebase Admin Server Config (Console > Project Settings > Service Accounts)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Gemini AI (Google AI Studio > Get API Key)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# Google OAuth Server-Only Credentials (GCP Console > Credentials)
GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Google Integrations Scopes
GOOGLE_CALENDAR_SCOPES=https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.events
GOOGLE_GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.readonly

# Optional Push Notifications (Firebase Console > Cloud Messaging > Web VAPID Key)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BAbcdef...
```

### Variable Explanations
- **`NEXT_PUBLIC_APP_URL`**: Base URL used for OAuth callback routing and metadata generation.
- **`NEXT_PUBLIC_ENABLE_DEMO_MODE`**: Gating switch for mock sample data. Must be `false` in production.
- **`NEXT_PUBLIC_FIREBASE_*`**: Public identifiers for initializing the Firebase client bundle.
- **`FIREBASE_*`**: Privileged service account credentials used by API routes (`/api/*`) for token management and admin operations.
- **`GEMINI_*`**: API credentials specifying the AI model engine for natural language parsing and task generation.
- **`GOOGLE_CLIENT_*` & `GOOGLE_OAUTH_REDIRECT_URI`**: OAuth credentials orchestrating secure server-to-server token exchange.
- **`GOOGLE_*_SCOPES`**: Space-separated permission scopes requested during Google Connect authorization.

---

## 💻 Local Development

Run the following commands to develop, verify, and build the application locally:

```bash
# Install dependencies
npm install

# Start local development server on http://localhost:3000
npm run dev

# Run ESLint code quality checks
npm run lint

# Validate TypeScript type definitions across the entire codebase
npm run typecheck

# Verify strict production separation (ensures no mock data leaks)
npm run check:no-mocks

# Build production bundle and compile static/dynamic routes
npm run build
```

---

## 🎭 Demo Mode

Deadline Defender AI includes an isolated **Demo Mode** designed for rapid walkthroughs, hackathon presentations, and UI testing without requiring active third-party cloud credentials.

- **Disabled by Default:** Production flows operate entirely on real user Firestore collections and API calls.
- **Activation:** Enable only by setting `NEXT_PUBLIC_ENABLE_DEMO_MODE=true` in your `.env.local`.
- **Production Isolation:** In production environments (`NEXT_PUBLIC_ENABLE_DEMO_MODE=false`), the app strictly forbids generating fake sample tasks, dummy calendar events, or mock emails. Automated verification scripts (`npm run check:no-mocks`) enforce this boundary during CI/CD builds.

---

## 🚶 Real User Flow Demo

Step-by-step walkthrough of the end-to-end integrated application flow:

1. **Sign Up & Account Creation:**
   - Register a new account at `/login`. A private user profile is initialized in Cloud Firestore under `users/{userId}`.
2. **Connect Google Account:**
   - Navigate to **Settings > Integrations** (`/settings/integrations`). Click **Connect Google**.
   - Complete OAuth consent. Server routes store encrypted access/refresh tokens securely in Firestore (`users/{userId}/integrations/google`).
3. **Natural Language Task Capture:**
   - On the Dashboard, enter a natural language command into the AI bar: *"Submit distributed systems research paper by Friday 5 PM, high difficulty."*
4. **Generate AI Plan:**
   - Gemini parses the deadline, calculates an initial risk score based on effort/time proximity, and decomposes the assignment into structured 5-minute substeps.
5. **Suggest Real Calendar Focus Blocks:**
   - Open the task detail view. Click **Suggest Focus Blocks**. The server queries your real Google Calendar free/busy schedule and recommends available blocks avoiding existing meetings.
6. **Create Calendar Event:**
   - Confirm a recommended block. The app writes a real event directly to your Google Calendar and attaches the `googleCalendarEventId` to Firestore.
7. **Extract Gmail Deadlines:**
   - Navigate to **Inbox Deadlines** (`/inbox-deadlines`). Click **Scan Recent Emails**. The server inspects recent messages for academic or work deadlines and presents pre-filled task capture previews.
8. **Start Rescue Mode:**
   - If a task deadline becomes critical (Risk Score ≥ 80%), click **Enter Rescue Mode**. Gemini generates an emergency scope reduction strategy and drafts a professional extension request email.

---

## 🛠️ Troubleshooting

| Symptom / Error | Root Cause | Recommended Fix |
| :--- | :--- | :--- |
| **OAuth Redirect Mismatch** (`redirect_uri_mismatch`) | The callback URL in `.env.local` does not match GCP Console. | Ensure `GOOGLE_OAUTH_REDIRECT_URI` matches exact authorized URIs in GCP API Credentials (including protocol and port). |
| **Missing Env Vars** | API routes fail or return 500 internal server errors. | Verify all required variables in `.env.local` are populated and restart `npm run dev`. Visit `/settings/integrations` to run live diagnostics. |
| **Gmail Not Connected** | Inbox extraction returns permission error or missing status. | Re-run Google OAuth connect flow ensuring `https://www.googleapis.com/auth/gmail.readonly` scope is consented. |
| **Calendar Missing Scopes** | FreeBusy lookup or event creation returns 403 Forbidden. | Verify `calendar.freebusy` and `calendar.events` scopes are configured in `.env.local` and re-connect Google account. |
| **Gemini Invalid JSON** | Task parsing fails during complex natural language prompts. | The API route incorporates automatic Zod fallback parsing. Ensure `GEMINI_API_KEY` is valid and quota is not exhausted. |
| **Firestore Permission Denied** | Client SDK cannot read or write document collections. | Ensure user is signed in. Verify `firestore.rules` are deployed (`npx firebase-tools deploy --only firestore:rules`). |
| **FCM Requires HTTPS** | Browser push notification permission fails on custom domains. | Web Push Service Workers require secure origins (`https://` or `localhost`). Verify SSL certificate configuration. |
| **Build Errors** | `npm run build` fails during static generation. | Run `npm run typecheck` to catch interface mismatches. Note: Gemini warnings during static prerendering are expected if API keys are absent during CI build steps. |

---

## 🔒 Security Notes

Deadline Defender AI is architected adhering to strict defense-in-depth security principles:

- **Tokens Never Exposed to Client:** Google OAuth access and refresh tokens are managed strictly on server routes (`/api/auth/google/*`) using the Firebase Admin SDK. Client bundles never receive or store sensitive token keys.
- **Server Routes Require Authentication:** Every server API endpoint (`/api/*`) strictly verifies the user's Firebase ID token (`Authorization: Bearer <token>`) before processing requests or executing integrations.
- **Least-Privilege Scopes:** The application requests only the minimum required Google permissions (`calendar.freebusy`, `calendar.events`, `gmail.readonly`). It never requests full inbox modification or account deletion scopes.
- **User Confirmation Required:** Automated integrations never mutate external schedules or send messages silently. Users explicitly confirm AI task previews before saving and authorize suggested focus blocks before calendar events are written.
