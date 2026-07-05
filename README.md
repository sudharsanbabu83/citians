# CampusFlow

Production-ready college workflow management platform. CampusFlow starts with **On-Duty (OD) request management** and is architected to expand into leave requests, bonafide certificates, internship approvals, and more.

## Architecture

CampusFlow uses a **Firebase-first, client-read / server-write** security model:

- **Mobile app** (Expo + React Native) — students and HODs
- **Admin dashboard** (Vite + React) — deployed to Firebase Hosting
- **Cloud Functions** (TypeScript) — all sensitive mutations
- **Cloud Firestore** — primary database
- **Cloud Storage** — proof document uploads
- **Firebase Auth** — email/password authentication
- **FCM** — push notifications (Phase 7)

Sensitive actions (submit, approve, reject, pass generation, QR verification, audit logs) are **never** performed via direct client Firestore writes.

## Monorepo Structure

```
campusflow/
├── apps/
│   ├── mobile/          # Expo Dev Client + Expo Router + TypeScript
│   └── admin/           # Vite + React admin dashboard
├── packages/
│   ├── functions/       # Cloud Functions for Firebase
│   ├── shared/          # Shared types, constants, Zod schemas
│   └── rules-tests/     # Firestore + Storage security rules tests
├── scripts/
│   ├── deploy.mjs       # Production deployment orchestrator
│   └── run-rules-tests.mjs
├── firebase.json        # Firebase project configuration
├── firestore.rules      # Firestore security rules
├── storage.rules        # Storage security rules
└── firestore.indexes.json
```

## Prerequisites

- **Node.js** 20+ (22 works for local dev; Functions target Node 20 in production)
- **npm** 10+
- **Java JDK** 11+ (required for Firestore emulator)
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Android Studio** or **Xcode** (for Expo Dev Client native builds)
- **EAS CLI** (`npm install -g eas-cli`) — for development builds

## Firebase Project Setup

### 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → display name **Campusflow**, project ID **`campusflow-f798c`** (or your chosen ID — update `.firebaserc` and `packages/shared/src/constants/firebase.ts`)
3. Enable Google Analytics (optional)

### 2. Enable services

In the Firebase Console for your project:

| Service | Action |
|---------|--------|
| Authentication | Enable **Email/Password** provider |
| Firestore | Create database (start in **production mode**) |
| Storage | Get started with default bucket |
| Functions | Upgrade to Blaze plan (required for Cloud Functions deploy) |
| Hosting | Get started |
| Cloud Messaging | Enabled automatically |

### 3. Register apps

Register three apps in Project Settings:

| App | Package / Bundle ID |
|-----|---------------------|
| Web | (for admin dashboard) |
| Android | `com.campusflow.app` |
| iOS | `com.campusflow.app` |

Download native config files (gitignored):

- `google-services.json` → `apps/mobile/google-services.json`
- `GoogleService-Info.plist` → `apps/mobile/GoogleService-Info.plist`

### 4. Configure environment variables

```powershell
# Root
copy .env.example .env

# Admin
copy apps\admin\.env.example apps\admin\.env

# Mobile
copy apps\mobile\.env.example apps\mobile\.env
```

Fill in your Firebase web config values from **Project Settings → Your apps → Web app**.

### 5. Link Firebase CLI

```powershell
firebase login
firebase use dev
```

Update `.firebaserc` if your project ID differs from `campusflow-f798c`.

## Local Development

### Install dependencies

```powershell
cd campusflow
npm install
```

### Build packages

```powershell
npm run build:shared
npm run build:functions
```

### Start Firebase Emulators

```powershell
npm run emulators
```

Emulator UI: **http://127.0.0.1:4001**

| Emulator | Port |
|----------|------|
| Auth | 9095 |
| Functions | 5005 |
| Firestore | 8085 |
| Storage | 9195 |
| Hosting | 5050 |
| Emulator UI | 4001 |

> Ports were set to avoid conflicts with other local services. If a port is taken, update `firebase.json` and the emulator connection code in `apps/admin/src/config/firebase.ts` and `apps/mobile/src/config/firebase.ts`.

### Seed emulator data (optional)

With emulators running:

```powershell
cd packages\functions
npm run seed
```

This creates test accounts for Phase 2 auth (password for all: `password123`):

| Email | Role |
|-------|------|
| `arjunb1.cse2024@citchennai.net` | STUDENT |
| `meerab1.cse2024@citchennai.net` | STUDENT |
| `hod.cse@citchennai.net` | HOD |
| `admin.campusflow@citchennai.net` | ADMIN |

Only `@citchennai.net` emails are accepted at login (e.g. `sudharsanb1.cse2024@citchennai.net`).

The seed script also creates **6 sample OD requests** for dashboard testing:
- Arjun (`arjunb1.cse2024@citchennai.net`): 1 approved, 2 pending, 1 rejected, 1 changes requested, 1 draft
- Meera (`meerab1.cse2024@citchennai.net`): 1 pending review

**Dashboard stat mapping:**
- **Approved** → `APPROVED`
- **Pending** → `PENDING_HOD_REVIEW`, `CHANGES_REQUESTED`, `DRAFT`
- **Rejected** → `REJECTED`

To test inactive account blocking, set `isActive: false` on a user in the Emulator UI (Firestore → `users`).

### Run admin dashboard

```powershell
# Terminal 2
npm run dev:admin
```

Open **http://localhost:5173** — you should see "Connected" with health check status.

### Run mobile app

```powershell
# From repo root (recommended)
npm run dev:mobile

# Or from the mobile app folder
cd apps\mobile
npx expo start
```

> **Important:** Do not run `npx expo start` from the monorepo root without `npm run dev:mobile` — it will not load the CampusFlow app correctly.

Press `w` for web, or scan the QR code with **Expo Go** (update to the latest version from the Play Store / App Store).

> **Expo Go compatibility:** The mobile app uses **Expo SDK 54**, matching the current Expo Go app from the Play Store / App Store.

For quick browser demo without a phone:

```powershell
npm run dev:mobile:web
```

**Phone + Firebase emulators:** Your PC and phone must be on the **same Wi‑Fi**. The app **auto-detects** your PC IP from Expo Go when `EXPO_PUBLIC_EMULATOR_HOST=localhost` (default).

Emulators bind to `0.0.0.0` so phones on your LAN can connect. If sign-in still fails:

1. Confirm emulators show `✔ All emulators ready!` and http://127.0.0.1:4001 loads on PC
2. On your phone browser, open `http://YOUR_PC_IP:4001` (IP shown in Expo Metro, e.g. `exp://10.16.120.167:8081`)
3. If the phone browser cannot reach `:4001`, allow firewall (Admin PowerShell):
   ```powershell
   .\scripts\allow-emulator-firewall.ps1
   ```
4. Restart Expo after changing `.env`: `npm run dev:mobile`

Optional manual override in `apps/mobile/.env`:
```
EXPO_PUBLIC_EMULATOR_HOST=10.16.120.167
```

For **Android emulator** only, set `EXPO_PUBLIC_EMULATOR_HOST=10.0.2.2`.

### Build admin for Hosting emulator

```powershell
npm run build:admin
```

With emulators running, admin build is served at **http://127.0.0.1:5050**.

## Cloud Functions

All callable functions are deployed to region `asia-south1`.

| Function | Type | Phase |
|----------|------|-------|
| `healthCheck` | Callable | 1 ✅ |
| `submitODRequest` | Callable | 4 |
| `approveODRequest` | Callable | 5 |
| `rejectODRequest` | Callable | 5 |
| `requestODChanges` | Callable | 5 |
| `getODPassQrPayload` | Callable | 6 |
| `verifyODPass` | HTTPS | 6 |
| `revokeODPass` | Callable | 8 |
| `provisionUser` | Callable | 8 |
| `registerDeviceToken` | Callable | 7 |
| `markNotificationRead` | Callable | 7 |

### Functions secrets (Phase 6+)

```powershell
firebase functions:secrets:set OD_SIGNING_KEY
```

Never expose signing keys to client apps.

## Expo Dev Client

The mobile app uses **Expo Dev Client** for native modules (camera, FCM). Expo Go alone is not sufficient for production features.

```powershell
cd apps\mobile
eas build --profile development --platform android
```

Update `app.config.ts` with your EAS project ID from `eas init`.

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Firebase project setup, monorepo, emulators, rules |
| 2 | ✅ | Authentication & role-based navigation |
| 3 | ✅ | Student profile & dashboard |
| 4 | ✅ | OD request creation & submission |
| 5 | ✅ | HOD review flow |
| 6 | ✅ | Digital OD pass & QR verification |
| 7 | ✅ | FCM notifications & in-app notification center |
| 8 | ✅ | Admin dashboard CRUD |
| 9 | ✅ | Security rules testing |
| 10 | ✅ | Production deployment |

## Phase 10 Verification Checklist

Deploy CampusFlow to Firebase (`campusflow-f798c`) and ship mobile via EAS.

### One-time Firebase setup

- [ ] Firebase project **Campusflow** (`campusflow-f798c`) on Blaze plan
- [ ] Enable Auth (Email/Password), Firestore, Storage, Hosting, Cloud Messaging
- [ ] Register web app (admin), Android + iOS apps (`com.campusflow.app`)
- [ ] Download `google-services.json` → `apps/mobile/` (gitignored)
- [ ] `firebase login` && `firebase use prod`

### Secrets & config

- [ ] Set signing key: `firebase functions:secrets:set OD_SIGNING_KEY --project campusflow-f798c`
- [ ] Copy `apps/admin/.env.production.example` → `apps/admin/.env.production` (real prod Firebase web config, `VITE_USE_EMULATORS=false`)
- [ ] Set EAS secrets for mobile prod Firebase vars (see `apps/mobile/.env.production.example`)
- [ ] Update `app.config.ts` → `extra.eas.projectId` after `eas init`

### Deploy backend + admin

```powershell
npm run test:rules          # verify rules before deploy
npm run deploy:prod         # builds admin + functions, deploys all targets
```

Partial deploys:

```powershell
npm run deploy:hosting      # admin dashboard only
npm run deploy:functions    # Cloud Functions only
npm run deploy:rules        # Firestore + Storage rules only
```

### Bootstrap first admin

```powershell
npm run bootstrap:admin -- --email admin.campusflow@citchennai.net --name "Campus Admin" --password "YourSecurePassword" --project campusflow-f798c
```

Then sign in at your Hosting URL (`https://campusflow-f798c.web.app` or custom domain).

### Mobile production build

```powershell
cd apps\mobile
eas login
eas init                    # links EAS project ID in app.config.ts
eas build --profile production --platform android
# eas submit --profile production --platform android   # Play Store (optional)
```

- [ ] Production build has `EXPO_PUBLIC_USE_EMULATORS=false`
- [ ] FCM push works on Dev Client / production build (not Expo Go)
- [ ] Student login → submit OD → HOD approve → QR pass → verify end-to-end on prod

### Post-deploy monitoring (recommended)

- [ ] Firebase Crashlytics + Performance (mobile)
- [ ] Cloud Logging alerts on Functions errors
- [ ] Firebase budget alerts
- [ ] Firestore composite indexes deployed (`firestore.indexes.json`)

## Phase 9 Verification Checklist

Automated Firestore + Storage rules tests using `@firebase/rules-unit-testing`.

- [ ] `npm install` (includes `@campusflow/rules-tests` workspace)
- [ ] `npm run test:rules` — all tests pass
- [ ] **Users** — role-scoped reads, admin-only create, HOD cross-dept denied
- [ ] **OD requests** — student draft CRUD, status escalation blocked, HOD dept scoping
- [ ] **OD passes / secrets** — no client writes; secrets fully blocked
- [ ] **Notifications / device tokens** — owner read only; server-only writes
- [ ] **Audit / verification logs** — admin read only
- [ ] **Storage** — student upload on own request, type/size validation, HOD dept scoping

```powershell
npm run test:rules          # starts Firestore + Storage emulators, runs tests, shuts down
npm run test:rules:local    # use when emulators are already running (npm run emulators)
```

> Requires Java (Firestore emulator). `test:rules` uses `firebase emulators:exec` so ports **8085** (Firestore) and **9195** (Storage) must be free.

## Phase 8 Verification Checklist

Admin web app at `http://localhost:5173` — departments, users, OD overview, pass revocation, logs.

- [ ] `npm run build:functions` succeeds
- [ ] `npm run build:admin` succeeds
- [ ] Admin login with `admin.campusflow@citchennai.net` / `password123` (emulator seed)
- [ ] **Dashboard** shows department, student, request, and pass counts
- [ ] **Departments** — create/update department, toggle active status
- [ ] **Students** — list students, **Add student** via `provisionUser` callable
- [ ] **HODs** — list HODs, **Add HOD** via `provisionUser` (updates department `hodId`)
- [ ] **OD Requests** — read-only list of all requests
- [ ] **OD Passes** — revoke active pass with reason (uses `revokeODPass` callable)
- [ ] **Audit Logs** / **Verification Logs** — read-only server-written logs
- [ ] Non-admin accounts are rejected at login

```powershell
npm run dev:admin   # http://localhost:5173
```

## Phase 7 Verification Checklist

In-app notifications + device token registration (FCM push in production; emulator uses Firestore only).

- [ ] `npm run build:functions` succeeds
- [ ] Student **Submit for review** creates `OD_SUBMITTED` notification for HOD in Firestore
- [ ] HOD **Approve** creates `OD_PASS_GENERATED` notification for student
- [ ] HOD **Reject** / **Request changes** notify the student
- [ ] Bell icon on student & HOD home shows unread badge count
- [ ] Notifications screen lists items, tap marks read and opens OD request
- [ ] `registerDeviceToken` callable stores token in `deviceTokens` (server-only writes)
- [ ] `markNotificationRead` callable sets `isRead: true`
- [ ] `npm run typecheck` passes in `apps/mobile`

> **Note:** Native FCM push requires an Expo Dev Client / production build with FCM configured. **Expo Go (SDK 53+) does not support push** — use in-app notifications (bell icon) instead. In the emulator, notifications appear via Firestore only.

## Phase 6 Verification Checklist

Flow: **HOD approves → pass generated → student shows QR → HOD scans & verifies** (server-side only).

- [ ] `npm run build:functions` succeeds
- [ ] HOD **Approve** creates `odPasses` doc + `odPassSecrets` entry
- [ ] Seed includes pass for `od-seed-001` (Arjun's approved SIH request)
- [ ] Student opens approved request → **View Digital OD Pass** → QR displays
- [ ] HOD **Scan OD Pass** reads QR and shows **Valid OD Pass** with student details
- [ ] Invalid/wrong token returns `INVALID`; expired end date returns `EXPIRED`
- [ ] `verificationLogs` and `OD_PASS_VERIFIED` audit entries on valid scan
- [ ] QR token stored hashed only; plain token in `odPassSecrets` (no client access)
- [ ] `npm run typecheck` passes in `apps/mobile`

## Phase 5 Verification Checklist

HOD flow: **View pending → Review details → Approve / Reject / Request changes** (all via Cloud Functions).

- [ ] `npm run build:functions` succeeds
- [ ] HOD login (`hod.cse@citchennai.net`) shows pending count and request list (2 from seed)
- [ ] Tapping a pending request opens review screen with student name and documents
- [ ] **Approve** sets status `APPROVED` and writes `OD_APPROVED` audit log
- [ ] **Reject** requires reason → status `REJECTED`, student sees rejection reason
- [ ] **Request changes** requires comment → status `CHANGES_REQUESTED`, student can edit/resubmit (Phase 4)
- [ ] Pending count decreases after review; pull-to-refresh updates list
- [ ] HOD cannot review requests from other departments
- [ ] Digital OD pass / QR NOT implemented yet (Phase 6)
- [ ] `npm run typecheck` passes in `apps/mobile`

## Phase 4 Verification Checklist

Student flow: **Apply → Save Draft → Upload docs → Submit** (submit always goes through Cloud Function `submitODRequest`).

- [ ] `npm run build:functions` succeeds
- [ ] Student can tap **Apply for On-Duty** and open the form
- [ ] **Save as Draft** creates `odRequests` doc with status `DRAFT` in emulator
- [ ] Upload PDF/image attaches to request (Storage + Firestore `documents` subcollection)
- [ ] **Submit for Review** calls `submitODRequest` → status becomes `PENDING_HOD_REVIEW`
- [ ] Dashboard pending count updates after submit
- [ ] Arjun's `CHANGES_REQUESTED` seed request (`od-seed-004`) can be edited and resubmitted
- [ ] Audit log entry `OD_SUBMITTED` appears in emulator `auditLogs`
- [ ] HOD approve/reject NOT implemented yet (Phase 5)
- [ ] `npm run typecheck` passes in `apps/mobile`

## Phase 3 Verification Checklist

- [ ] `npm run seed` creates sample `odRequests` documents
- [ ] Student login shows live approved/pending/rejected counts (not hardcoded zeros)
- [ ] Recent activity lists seeded requests with status badges
- [ ] Tapping a request opens read-only detail screen
- [ ] Pull-to-refresh updates dashboard data
- [ ] HOD login shows live pending review count (2 from seed)
- [ ] `npm run typecheck` passes in `apps/mobile`

## Phase 2 Verification Checklist

- [ ] `npm run seed` creates Auth users and Firestore profiles
- [ ] Unauthenticated users are redirected to `/login`
- [ ] `arjunb1.cse2024@citchennai.net` → student Home + Profile with real data
- [ ] `hod.cse@citchennai.net` → HOD dashboard + profile
- [ ] `admin.campusflow@citchennai.net` → "Web dashboard only" screen
- [ ] Non-`@citchennai.net` email is rejected at login
- [ ] Sign out returns to login
- [ ] Wrong password shows inline error
- [ ] User with `isActive: false` is signed out with error message
- [ ] `npm run typecheck` passes in `apps/mobile`

## Phase 1 Verification Checklist

- [x] `npm install` at root succeeds; all workspaces resolve
- [x] `firebase emulators:start` runs Auth, Firestore, Functions, Storage
- [x] Emulator UI available at `:4001`
- [x] `healthCheck` callable returns `{ status: "ok", environment: "emulator" }`
- [x] Admin app builds (`npm run build:admin`)
- [x] Mobile app typechecks and shows Firebase connection status
- [x] Firestore rules block client writes to `odPasses`
- [x] Storage rules enforce 10MB + PDF/PNG/JPEG limits
- [x] README documents setup from zero on Windows

### Manual verification commands

```powershell
# Health check via emulator
Invoke-RestMethod -Uri "http://127.0.0.1:5005/campusflow-f798c/asia-south1/healthCheck" `
  -Method POST -ContentType "application/json" -Body '{"data":{}}'

# Build all packages
npm run build:shared
npm run build:functions
npm run build:admin
```

## Security Model

- **Firestore rules** enforce role-based reads and block sensitive writes
- **Storage rules** enforce file type, size, and ownership
- **Cloud Functions** handle all approvals, pass generation, QR tokens, signatures, notifications, and audit logs
- **QR verification** is server-side only; copied pass images fail verification
- **Signing key** stored in Functions secrets, never in client code

## Deployment

| Command | Description |
|---------|-------------|
| `npm run deploy:dev` | Deploy to `campusflow-f798c` |
| `npm run deploy:prod` | Deploy to `campusflow-f798c` |
| `npm run deploy:hosting` | Admin dashboard only |
| `npm run deploy:functions` | Cloud Functions only |
| `npm run deploy:rules` | Firestore + Storage rules |
| `npm run bootstrap:admin` | Create first production admin |

Project alias in `.firebaserc`: **`campusflow-f798c`** (dev and prod aliases point to the same project).

```powershell
firebase functions:secrets:set OD_SIGNING_KEY --project campusflow-f798c
```

Never commit signing keys or `.env.production` files.

See **Phase 10 Verification Checklist** above for the full pilot runbook.

## License

Private — CampusFlow college workflow platform.
