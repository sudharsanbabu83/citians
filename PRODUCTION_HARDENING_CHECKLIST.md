# Citians production hardening checklist

Update an item only after its verification command or acceptance test passes.

## P0 — release blockers

- [x] Make event QR-ticket issuance atomic under simultaneous requests.
  - Implementation: `getEventTicket` reads and conditionally creates the token in one Firestore transaction.
  - Verification: 12 simultaneous requests for a legacy approved registration must return one identical QR payload.
- [x] Make bulk attendee approval bounded and resumable.
  - Approve at most 100 registrations per atomic transaction, including tickets and in-app notifications.
  - The mobile host continues batches until the server reports no pending registrations; rerunning is safe.
- [ ] Load-test bulk approval with at least 500 pending registrations, retries, two simultaneous hosts, and an interrupted run.
- [x] Make event broadcasts idempotent and resumable.
  - Track delivery state, use a request idempotency key, and resume receipt/push delivery safely.
  - Verify that a forced mid-delivery failure produces no duplicate announcement and eventually reaches every recipient.
- [ ] Deploy the observability backend and Firestore rules.
  - Confirm `getSystemHealth` and `reportClientError` appear in `firebase functions:list`.
  - Confirm admins can read diagnostics and students cannot.
- [ ] Produce and test a new APK containing mobile diagnostic reporting.
  - Verify a controlled client failure appears in the Operations Health Center with the correct build number.

## P1 — concurrency and correctness

- [ ] Make active Build-post replacement atomic.
  - Two simultaneous submissions from one student must leave exactly one regular active post.
- [ ] Add emulator-backed simultaneous-user scenarios.
  - Event capacity and waitlist: 100 concurrent students.
  - Ticket retrieval: repeated and simultaneous requests.
  - Check-in: multiple scanners submitting the same QR.
  - Announcement acknowledgement: duplicate taps and reconnects.
  - Canvas: 50–200 connected users moving, typing, reacting, and updating presence.
  - Doubt branches and reactions: simultaneous creates and toggles.
- [x] Repair the Firebase rules-test TypeScript dependency mismatch.
- [ ] Make the rules emulator available in CI and run the complete Firestore/Storage suite on every release.
- [ ] Add retry, timeout, and offline recovery tests for every mobile network operation.
- [ ] Verify counters after cancellation, rejection, removal, promotion, and concurrent registration.

## P2 — compatibility, performance, and operations

- [x] Align Expo SDK patch versions reported by Expo Doctor.
  - `expo`: expected `~54.0.37`.
  - `expo-constants`: expected `~18.0.14`.
- [ ] Fix the admin Vite development import failure caused by the CommonJS shared package output.
- [x] Split the admin production bundle; keep initial JavaScript comfortably below the current 769 KB.
- [ ] Measure cold-start and p95 Function latency from representative mobile networks.
- [ ] Add pagination/aggregation for more than 250 mobile diagnostic documents per 24 hours.
- [ ] Add alert thresholds for service downtime, fatal errors, and sudden error-rate increases.
- [ ] Verify phone, tablet, rotation, font scaling, keyboard, and screen-reader behavior.
- [x] Upgrade Cloud Functions away from Node.js 20 before its scheduled platform decommission.
- [x] Update `firebase-functions` and re-run the complete integration suite.

## Release gate

- [ ] Production builds, type checks, lint, Expo Doctor, and Firebase rules tests all pass.
- [ ] Auth, roles, OD workflow, events, tickets, check-in, broadcasts, competitions, doubts, Build, Canvas, notifications, and admin operations pass end-to-end.
- [ ] No open P0 issues.
- [ ] Load-test error rate is below the agreed threshold and counters remain consistent.
- [ ] Rollback steps, monitoring ownership, backups, privacy policy, and incident response are documented.
