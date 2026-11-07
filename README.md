# MemeMind AI

MemeMind AI is a full-stack meme studio with **real, optional multimodal generative AI**. When a server-side provider is configured, the model writes captions, rewrites their tone, analyzes uploaded images, and returns image-aware meme ideas, descriptions, tags, and sticker recommendations. The React editor then lets the user edit and export the result.

The app does not pretend its offline examples are AI: deterministic JavaScript tools live in a clearly labeled “Offline demo tools” section. Real AI actions are disabled until the backend has a provider key.

## Current capabilities

- **Generative captions:** model-generated captions from a user prompt and selected mood.
- **AI tone rewrite:** funny, sarcastic, dark humour, Gen-Z slang, relatable, and savage rewrites.
- **Image understanding:** send the current upload or template to the model for a description, context-aware captions, category, tags, and sticker ideas.
- **Structured output:** provider responses are requested as JSON and validated again with Zod before the UI receives them.
- **Meme editor:** original SVG templates, PNG/JPEG/WebP upload, top/bottom text, size, colour and positioning controls, stickers, Canvas preview, PNG download, and community sharing.
- **Role access:** public guest entry, standard-user registration/login, an owner-scoped user dashboard, and a backend-protected admin console.
- **Private drafts:** signed-in users can save private creations, revisit them, and delete only their own saved records.
- **Security baseline:** bcrypt password hashes, HTTP-only signed session cookies, server-side role checks, auth rate limits, and a private first-admin bootstrap command.
- **Offline examples:** local deterministic captions, rewrites, suggestions, tags, and keyword search, labeled as non-generative demo functionality.
- **Community:** in-memory demo storage or MongoDB persistence when configured.

## Current scope and limitations

The project includes guest access, standard user accounts, a private creation dashboard, and a starter administrator console. The admin console currently supports live totals, paginated user browsing, and suspending/reactivating standard accounts. Community posts can be made by guests and signed-in users; the community currently supports listing, keyword search, and remixing, but not likes, comments, reports, or moderation.

Saved meme images are currently stored as Base64 image data in MongoDB. This keeps local setup simple, but it is not an appropriate long-term storage design for a production community. There is no Cloudinary or other remote object-storage adapter configured. AI usage metrics are written to server logs only; they are not a persistent per-user quota or admin analytics feature. Password recovery, email verification, account deletion, and session revocation are also not implemented.

This is a portfolio prototype after environment-specific setup, but it is not a production-ready public social service. Before a public launch, add remote image storage, stronger shared abuse limits, moderation/report flows, account lifecycle flows, and a production deployment review.

## Architecture

```text
React + Vite + Canvas
  ├── Calls /api/ai/* for real model features
  ├── Calls /api/tools/* for clearly labeled offline examples
  └── Draws meme and exports PNG
              │ JSON over HTTP; image is resized in browser
              ▼
Express API
  ├── validates text, MIME type, image signature, and output schema
  ├── applies an AI-specific per-IP request limit
  ├── selects a provider adapter (Gemini is implemented)
  ├── sends requests using server environment secrets only
  ├── logs provider, model, task, latency, token counts, and status (no prompt/image)
  └── optionally persists community memes via Mongoose
              │
              ▼
Google Gemini Interactions API (only when configured and explicitly called)
```

The provider adapter sits behind `server/src/services/ai.js`. A later provider can implement the same task contract and be added there without changing React UI or route validation.

## Project map

```text
client/
  public/templates/       Original artwork used by the meme editor
  src/components/         Reusable UI, role cards, auth forms, dashboards, editor, feed
  src/context/            Signed-in user session state
  src/data/               Template and sticker choices
  src/lib/api.js           Browser-to-backend JSON helper
  src/App.jsx              App state, navigation, and component composition
  src/styles.css           Responsive visual system
server/
  .env.example             Placeholder-only backend settings
  .env                     Local secrets/configuration; ignored by Git
  src/middleware/          Authentication, authorization, and safe API errors
  src/models/              Mongoose user and meme schemas
  src/routes/              Auth, user, admin, health, AI, tools, and meme routes
  src/scripts/             One-time private admin bootstrap
  src/services/            Provider selection, Gemini, image validation, and demo tools
  src/app.js                Express middleware, validation routes, and limits
  src/index.js              Environment loading and server/database startup
experiments/
  README.md                Future Python model experiment plan; no model trained
  dataset-card-template.md Dataset licensing and provenance checklist
docs/
  project-audit.md         Verified repository status and staged architecture
```

## Run locally

Use Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open Vite at `http://127.0.0.1:5173` (or the next available Vite port); Express serves `http://127.0.0.1:4000`.

For user accounts, configure and start MongoDB, then add a strong session key to `server/.env`. Generate one with:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copy the generated value into `JWT_SECRET=` in the local ignored `.env` file. Do not commit it. Registration and login require both MongoDB and `JWT_SECRET`.

### Configure real Gemini AI

1. If `server/.env` does not exist (for example, after cloning), copy `server/.env.example` to `server/.env`.
2. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey).
3. Put it only in `server/.env` after `GEMINI_API_KEY=`. Never create a `VITE_GEMINI_API_KEY` or put the key under `client/`.
4. Keep `AI_PROVIDER=gemini` and optionally change `GEMINI_MODEL=gemini-3.5-flash-lite`.
5. Restart the backend and check `GET /api/health`; `ai.enabled` must be `true` before real AI controls activate.

The Gemini Developer API lists free access for some models, including this model at the time this README was written. Free availability, quotas, model access, regions, and data-use terms can change and can differ by project. Check [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [model availability](https://ai.google.dev/gemini-api/docs/models), and [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) in your own AI Studio project before using it. The app does not upgrade billing or automatically fall back to paid usage. Provider requests are sent only when a user triggers an AI action. Google notes that free-tier content may be used to improve its products; do not submit sensitive images or prompts unless you accept the provider’s current terms.

For deployment, set `HOST=0.0.0.0`, `CLIENT_ORIGIN` to the deployed frontend origin, and `API_ORIGIN` to the backend origin on the server. Set `VITE_API_BASE` to the backend API URL while building the frontend so its generated CSP only permits the configured API origin. Keep the default `127.0.0.1` settings for local development.

The image flow resizes the current image to at most 1024px on the longest side and sends JPEG bytes through the backend. The application does not save AI prompts or image-analysis requests. The configured provider processes them according to its data policy.

### Optional MongoDB

Install and start MongoDB Community Server locally, then set this in `server/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/mememind
```

That URI uses a database named `mememind` on your own computer; MongoDB creates the database and collections when the app first writes data. For MongoDB Atlas, replace it with the connection string from your cluster and URL-encode any reserved characters in the database username or password. Keep the URI in `server/.env`; never paste credentials into frontend files or commit the file.

Start MongoDB before the backend with `npm run dev:api` (or start both frontend and backend with `npm run dev`). When a URI is configured, the API waits for MongoDB and exits with a safe error if the connection fails; it will not silently save posts to temporary memory. With a blank URI, the app explicitly runs its demo community storage in memory and posts disappear when the server stops. The `/api/health` response reports the database state.

## API routes

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | API, storage, and provider configuration status; never returns the key |
| `POST` | `/api/ai/captions` | Model-generated captions, description, category, tags, sticker ideas |
| `POST` | `/api/ai/rewrite` | Model rewrite in a selected tone |
| `POST` | `/api/ai/image-context` | Multimodal image description, captions, tags, category, sticker ideas |
| `POST` | `/api/tools/captions` | Deterministic offline demo captions |
| `POST` | `/api/tools/rewrite` | Deterministic offline tone example |
| `POST` | `/api/tools/suggestions` | Offline keyword-based suggestions |
| `POST` | `/api/tools/tags` | Offline tag helper for meme sharing |
| `POST` | `/api/auth/register` | Create a standard user account; admin roles are rejected |
| `POST` | `/api/auth/login`, `/api/auth/logout` | Start and clear the HTTP-only session cookie |
| `GET` | `/api/auth/me` | Return the signed-in account's safe profile |
| `GET` | `/api/users/me/overview` | Protected user dashboard summary |
| `GET` | `/api/memes` | Recent community posts |
| `GET` | `/api/memes/search?q=...` | Keyword search for community posts |
| `GET` | `/api/memes/mine` | Protected, owner-filtered creation list |
| `POST` | `/api/memes/drafts` | Save a private meme draft |
| `DELETE` | `/api/memes/mine/:id` | Delete a creation only when the signed-in user owns it |
| `POST` | `/api/memes` | Validate and publish a meme |
| `GET` | `/api/admin/overview`, `/api/admin/users` | Admin-only database totals and paginated account list |
| `PATCH` | `/api/admin/users/:id/status` | Admin-only user suspend/reactivate control |

## Security and usage controls

### Accounts and roles

The role page is `/`; guests can explore the studio and community at `/explore` and `/community`. Standard users register at `/register`, sign in at `/login`, and access `/dashboard`. Sessions use an HTTP-only, SameSite Strict cookie backed by an eight-hour signed JWT. Passwords are hashed with bcryptjs, and protected requests load each user's current role from MongoDB. The browser guard improves navigation; Express middleware enforces access.

Public registration always creates the `user` role and rejects extra role fields. There is no admin sign-up. For the first administrator only, temporarily set `BOOTSTRAP_ADMIN_EMAIL` and a unique `BOOTSTRAP_ADMIN_PASSWORD` (16–72 bytes) in `server/.env`, then run:

```bash
npm run admin:bootstrap --workspace server
```

The bootstrap command refuses to create a second administrator. Remove both bootstrap values from `server/.env` after it succeeds. Administrator login uses `/login`; the protected console is `/admin`. It currently provides live MongoDB totals, paginated user rows, and account suspend/reactivate controls. Reports, audit logs, storage monitoring, AI usage history, and account deletion are future work and are not represented with fake data.

Signed-in users can save private drafts from the studio. Drafts appear only in their owner's dashboard and are excluded from community queries. The API checks ownership before listing or deleting a saved creation.

- Gemini credentials are read only from server environment variables.
- Helmet headers, allowlisted local CORS, Zod input validation, bounded JSON bodies, and safe API errors are enabled.
- AI image input only accepts PNG/JPEG/WebP data URLs under 1.25 MB after client-side resizing. The backend verifies image signatures before forwarding bytes.
- AI calls time out after 25 seconds and do not automatically retry. Provider failures do not silently turn into fake AI output.
- AI endpoints have a separate default limit of 8 requests per IP per 15 minutes. Change it with `AI_MAX_REQUESTS_PER_WINDOW` (hard-capped at 30 in this prototype). This in-memory IP limiter is per server process; a deployed multi-instance app needs a shared store and authenticated user quotas.
- Usage logs record provider, model, task, status, latency, and token counts, never prompts, image bytes, keys, or generated text.
- Authentication is implemented with MongoDB-backed users and server-checked roles/ownership. Remaining production gaps include account recovery/deletion, moderation, shared abuse controls, and explicit CSRF/origin protections for any future cross-site session setup.

## Verify

```sh
npm test
npm run build
```

Automated tests cover deterministic tools, route validation, safe disabled state, meme posting/search, and mocked provider request/response handling. Mocked provider tests do not use Gemini quota. To verify your own live setup, configure `server/.env`, start the app, and request captions, a tone rewrite, and image context from the studio. The smoke tests recorded in [docs/project-audit.md](docs/project-audit.md) are specific to that audit run and do not guarantee future provider availability.

## Beginner and recruiter explanation

“MemeMind AI uses React and Canvas for an interactive meme editor, with an Express API in front of a configurable multimodal model. The model writes captions, rewrites tone, and interprets images through backend-only requests. I constrain those requests, validate the model’s structured JSON with Zod, cap usage, and handle provider errors explicitly. Deterministic JavaScript examples remain available but are clearly separated from actual AI. I have not trained a model; the `experiments` folder documents a future evaluation and fine-tuning plan.”

Key concepts to explain:

- **Provider adapter:** isolates vendor request details behind a stable task interface.
- **Multimodal prompt:** includes text and image content in the same model request.
- **Structured generation:** asks the model for schema-shaped JSON, then validates it because model output is still untrusted input.
- **Rate limiting and token monitoring:** controls abuse and makes model usage visible without logging user content.
- **Canvas:** paints the selected image, text, and stickers into pixels for PNG download.

## Next milestone

Configure a personal free-tier key and run a manual smoke test on captions, rewrites, and image context. Then add authentication and persisted ownership before expanding public community features. See [experiments/README.md](experiments/README.md) for the later Python model research plan.
