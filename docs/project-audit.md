# MemeMind AI audit

Audit run: 2026-11-07. Status is based on source inspection and the tests listed below; implemented code alone is not considered proof that a user flow works.

## Executive summary

MemeMind AI is a working local React/Vite + Express + MongoDB application with a live Gemini integration. During this audit, the backend automated suite passed (21/21), the frontend production build passed, npm reported zero known production dependency vulnerabilities, MongoDB-backed registration and private draft ownership checks passed using disposable records, and real Gemini caption, rewrite, and image-context requests succeeded. Synthetic records were removed after the database test.

This is a portfolio prototype, not a finished public social platform. Meme image data is stored directly in MongoDB as Base64, community posting is open to guests, there are no likes/comments/moderation flows, AI usage records are only logged to stdout, and browser end-to-end interactions were not fully exercised during this run. No permanent image-storage provider is configured.

## Status matrix

| Area | Status | Evidence / remaining work |
|---|---|---|
| React/Vite application and access page | PARTIAL | Existing local browser exposed the access page and navigation via its accessibility tree; an attempted UI action could not be completed by the automation helper. Production build passes. |
| Guest studio and public community | PARTIAL | Routes and API exist; community list/search/post/remix are implemented. Guest posting remains allowed. Full browser interaction was not tested. |
| Authentication | PASS (core flow) | Live disposable registration, cookie session, logout protection, and MongoDB cleanup checks passed. Duplicate email and invalid login are covered in code, but not all were live-tested here. |
| User dashboard | PARTIAL | Reads profile and owned memes; refresh/remix/delete are wired. AI history, favourites, settings, password reset, and account deletion are not implemented. |
| Admin dashboard | PARTIAL | API/UI support totals, paginated user list, and suspend/reactivate. Anonymous admin access is denied in automated tests. Successful admin UI/status workflow was not live-tested in this run. |
| Gemini caption generation | PASS | Live backend request returned four structured captions from Gemini. |
| Gemini tone rewrite | PASS | Live request returned a validated rewritten caption. |
| Gemini image understanding | PASS | Live request using a synthetic PNG returned a description and four captions. No user photo was sent. |
| AI output validation and failure handling | PASS (covered paths) | Zod adapter tests cover structured response parsing, malformed output, timeout, and 503 mapping. Route tests cover validation, limits, and mocked output. |
| Gemini secret handling | PASS (source/config check) | Key is configured in ignored `server/.env`; health reports only enabled/provider/model. No key value was printed. |
| MongoDB connection | PASS | Live health endpoint reported connected. Disposable user and draft create/read/ownership/delete tests passed and all test records were removed. |
| Meme editor | PARTIAL | Source supports Canvas preview, templates, local image upload, caption controls, stickers, PNG download, sharing, and private draft save. Those interactions were not fully browser-tested. |
| Permanent image storage | NOT IMPLEMENTED | Canvas data URLs are stored in MongoDB. Cloudinary/object storage is absent; no permanent-upload claim should be made. |
| Community likes/comments/moderation/reports | NOT IMPLEMENTED | No corresponding models or routes exist. |
| AI generation history, favourites, usage quotas | NOT IMPLEMENTED | Usage metadata is logged to server stdout only; there is no persistent usage ledger. |
| Python model training | NOT IMPLEMENTED (intentionally) | `experiments/` documents a future licensed-data/fine-tuning workflow; no model has been trained. |
| Deployment readiness | PARTIAL | Build succeeds and host/origin settings exist. Production hosting, HTTPS, shared rate-limit storage, permanent image storage, and production security review remain. |

## Test evidence

| Check | Result | Notes |
|---|---|---|
| `npm test` | PASS — 21 passed, 0 failed, 0 skipped | Includes a regression test for malformed JSON returning a safe 400 response. First sandboxed attempt could not bind test ports; rerun with local-network permission passed. |
| `npm run build` | PASS | Vite production bundle generated successfully. |
| `npm audit` | PASS — 0 reported vulnerabilities | Full dependency tree, including development dependencies, at audit time; this is not a general security guarantee. |
| Live API health | PASS | `status=ok`, MongoDB connected, Gemini enabled; no secret value returned. |
| Live Gemini caption request | PASS | Provider/model identified as Gemini; four captions returned. |
| Live Gemini rewrite | PASS | One harmless generic caption rewritten successfully. |
| Live Gemini image context | PASS | A synthetic illustrated PNG produced a description and four captions. An initial locally constructed malformed image was rejected; a valid synthetic PNG then succeeded. |
| MongoDB lifecycle/ownership smoke test | PASS — 5 checks | Registered two disposable users, saved/read a private draft, confirmed another user could not delete it, deleted as owner, confirmed logout protection, and removed all synthetic records. |
| Browser end-to-end | NOT VERIFIED | Existing app page was visible through accessibility inspection, but the desktop automation helper could not complete an interaction. No Playwright/Cypress suite is configured. |
| Cloud storage upload/deletion | NOT VERIFIED | No cloud image-storage adapter or credentials exist. |
| Full admin workflow | NOT VERIFIED | No disposable admin was provisioned for this audit. Automated suite verifies that anonymous admin access is rejected. |

## Architecture and folders

```text
Browser: React + Vite + Canvas
  ├─ client/src/App.jsx: routes and page composition
  ├─ client/src/components/: studio, editor, feed, auth, user/admin dashboards
  ├─ client/src/context/AuthContext.jsx: session state from /api/auth/me
  └─ client/src/lib/api.js: same-origin API helper with credentials
                   │ JSON + HTTP-only session cookie
                   ▼
Server: Express
  ├─ server/src/app.js: Helmet, CORS, body limit, rate limits, route mounting
  ├─ server/src/routes/: health, auth, AI, users, admin, memes, offline tools
  ├─ server/src/middleware/auth.js: JWT cookie, role checks, ownership identity
  ├─ server/src/models/: Mongoose User and Meme schemas
  └─ server/src/services/: Mongo connection, image checks, AI adapter, demo tools
             ├─ MongoDB: users and meme records (image data currently embedded)
             └─ Gemini: server-side generation and multimodal image context
```

`client/` is the browser application. `server/` owns validation, authentication, authorization, persistence, rate limits, and provider credentials. `experiments/` is a future research plan only; it contains no trained model or dataset.

## Main workflows

### AI caption and image flow

1. React sends a prompt, mood, or resized image to `/api/ai/*`.
2. Express applies request limits and Zod validation.
3. The provider adapter reads Gemini settings from the backend environment and sends the request with `store: false`.
4. Gemini returns structured output; Zod validates the response before it reaches React.
5. The UI displays captions/description and allows the user to apply text to the Canvas.

Offline demo endpoints are separate deterministic JavaScript tools and are labeled as non-generative.

### Registration and private meme flow

1. Registration validates input, hashes the password with bcrypt, and stores a standard `user` record in MongoDB.
2. The API sets a signed eight-hour JWT in an HTTP-only, SameSite Strict cookie.
3. Protected routes verify the token and reload the account/role from MongoDB.
4. Draft queries/deletes include the authenticated user's ID; the live audit confirmed a second user could not delete another user's draft.

### Canvas export

Canvas paints the selected template or uploaded image, caption layers, and stickers. The browser can export a PNG. Sharing and draft saving currently send a JPEG data URL in the JSON request; this becomes a Base64 field in MongoDB and should be replaced with object storage before a public launch.

## Security findings

No critical or high issue was established by the checks performed. That is not a claim that the app is fully secure.

| Severity | Finding | Impact / next action |
|---|---|---|
| MEDIUM | Public community posts allow anonymous users | Can enable spam or abusive content. Require sign-in and add moderation/reporting before public exposure. |
| MEDIUM | Images are embedded as Base64 in MongoDB | Increases document/storage and response size. Move images to controlled object storage and retain metadata/ownership in MongoDB. |
| MEDIUM | Rate limiting is process-local and IP-based | Resets on restart and does not coordinate across instances. Add shared storage and per-account usage controls for deployment. |
| MEDIUM | JWT sessions are stateless for up to eight hours | Logout clears the browser cookie but cannot revoke a copied token before expiry. Consider a session-version/denylist strategy if the threat model requires revocation. |
| LOW | Registration responds differently for duplicate emails | Allows account existence inference. Use a uniform response if this matters for the intended audience. |
| INFORMATIONAL | No email verification/recovery/account deletion, audit log, or moderation | These are missing product capabilities and need implementation before production community use. |
| INFORMATIONAL | No image-hosting integration | Permanent cloud upload, retrieval, and deletion are not available. |

Implemented protections include bcrypt password hashing; server-verified roles/ownership; strict Zod request schemas; HTTP-only, SameSite Strict cookies; Helmet; configured CORS origins; JSON size limit; route-specific rate limits; image signature/dimension checks; Gemini timeout; output validation; safe provider errors; and no prompt/image/key logging in the AI usage log.

## Current API surface

| Method | Route | Access / purpose |
|---|---|---|
| GET | `/api/health` | Public service/config status without secret values |
| POST | `/api/ai/captions` | Public, rate-limited real Gemini caption generation |
| POST | `/api/ai/rewrite` | Public, rate-limited real Gemini rewrite |
| POST | `/api/ai/image-context` | Public, rate-limited multimodal image analysis |
| POST | `/api/auth/register`, `/login`, `/logout` | Account lifecycle baseline; MongoDB and `JWT_SECRET` required |
| GET | `/api/auth/me` | Signed-in user's safe profile |
| GET | `/api/users/me/overview` | Signed-in user summary |
| GET/POST | `/api/memes`, `/api/memes/search` | Public community list/search and guest-capable post |
| GET | `/api/memes/mine` | Signed-in user's creations |
| POST | `/api/memes/drafts` | Save a private meme owned by current user |
| DELETE | `/api/memes/mine/:id` | Delete only a meme owned by current user |
| GET | `/api/admin/overview`, `/api/admin/users` | Admin only; live totals and paginated users |
| PATCH | `/api/admin/users/:id/status` | Admin only; suspend/reactivate standard account |
| POST | `/api/tools/*` | Rate-limited, clearly separate offline algorithms |

## Deployment and known limits

Local run commands are in the root README. Production needs HTTPS, secure cookie configuration, the correct `CLIENT_ORIGIN`/`API_ORIGIN`, a production MongoDB URI, a strong `JWT_SECRET`, an API-key policy that matches the owner's Gemini account, and a shared rate-limit store. The API does not automatically upgrade Gemini billing. Free quotas and model availability are provider-controlled and can change.

Do not deploy this as an open public community until anonymous posting, moderation, object storage, resource limits, abuse controls, account recovery/deletion, monitoring, and deployment-specific security have been addressed.

## Next recommended milestone

Replace embedded image data with a storage adapter and owned asset metadata. This addresses MongoDB growth and gives the project a clean interface for a later Cloudinary-compatible provider. Before adding cloud credentials, implement and test the adapter locally with a mock; do not claim persistent image hosting until an actual provider is configured and upload/retrieval/deletion succeeds.
