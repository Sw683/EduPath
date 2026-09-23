# 🎓 EduPath — Open Educational Learning Platform

An open, beginner-friendly educational web platform designed to provide structured learning roadmaps, curated courses, milestone tracking, verified community gamification, and peer-recommended learning resources.

---

## 🌟 Main Features

- **Structured Learning Roadmaps**: Interactive guided tracks in Web Development, Python Programming, and Artificial Intelligence & Machine Learning.
- **Curated Course Catalog**: Filterable course directory with direct links to university offerings, official documentation, and interactive tutorials.
- **Community Learning Resources**:
  - Authenticated students can suggest YouTube educational videos with category tags, descriptions, and recommendation rationale.
  - Automatic duplicate video detection with one-user-one-vote recommendation voting.
  - Multi-stage moderation pipeline (`pending` → `candidate` → `approved` → `published`).
  - Top 3 early contributor recognition with opt-in public social links (GitHub, LinkedIn, Instagram).
- **Verified Gamification & Leaderboard**:
  - Earn points through milestone actions (modules completed, quizzes, projects submitted, daily activity bonuses).
  - Dynamic rank tiers: Novice 🌱, Apprentice ⚡, Practitioner 🔷, Specialist 🚀, Expert 👑, and Master 🏆.
  - Period-filtered community leaderboards (All-Time, Monthly, Weekly) with privacy safeguards that never expose internal database IDs.
- **Production-Ready Security & Authentication**:
  - PostgreSQL-backed persistent sessions with HTTP-only, secure, SameSite lax cookies.
  - Safe password hashing via `bcryptjs` (12 salt rounds).
  - Optional Google OAuth 2.0 authentication with CSRF state token verification.
  - Rate limiting on login and signup endpoints to reduce brute-force attempts.
  - HTTP security headers powered by `helmet` with strict Content-Security-Policy.
  - Hardened PostgreSQL TLS configuration supporting custom deployment CA certificates.
  - Isolated backend source tree preventing public access to server code or configuration files.
- **Offline & Local Resilience**:
  - Seamless in-memory fallback stores allowing frontend exploration and development even when a local PostgreSQL daemon is offline.

---

## 🛠️ Tech Stack

- **Backend**:
  - [Node.js](https://nodejs.org/) (v18+)
  - [Express](https://expressjs.com/) (REST API framework)
  - [express-session](https://www.npmjs.com/package/express-session) & [connect-pg-simple](https://www.npmjs.com/package/connect-pg-simple) (Persistent PostgreSQL sessions)
  - [pg (node-postgres)](https://node-postgres.com/) (Connection pooling & parameterized SQL)
  - [bcryptjs](https://www.npmjs.com/package/bcryptjs) (Secure password hashing)
  - [helmet](https://helmetjs.github.io/) (HTTP security headers)
  - [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) (Endpoint abuse protection)
  - [dotenv](https://www.npmjs.com/package/dotenv) (Environment variable management)
- **Frontend**:
  - Semantic HTML5 & Modern Vanilla CSS (No heavy framework overhead)
  - Responsive layout with custom design tokens, dark mode palette, and subtle micro-animations
  - Vanilla JavaScript (ES6+) for client-side routing, modals, and asynchronous API integration
- **Database**:
  - [PostgreSQL](https://www.postgresql.org/) (Automated schema migration on server startup via `initDb()`)

---

## 📁 Project Structure

```text
Edution_new/
├── .env.example               # Template environment configuration (placeholders only)
├── .gitignore                  # Git exclusions (secrets, logs, dependencies, OS files)
├── README.md                   # Project documentation and setup guide
├── db.js                       # PostgreSQL connection pool, schema initialization, and queries
├── package.json                # Project dependencies, metadata, and scripts
├── package-lock.json           # Deterministic dependency tree
├── server.js                   # Express application entrypoint, middleware, and route mounting
├── index.html                  # Main single-page application structure
├── style.css                   # Global stylesheet, design system tokens, and component styles
├── script.js                   # Client-side UI interactions, authentication, and API integrations
├── images/                     # Static media and course banner assets
├── middleware/
│   └── auth.js                 # Authentication verification middleware
├── routes/
│   ├── authRoutes.js           # Signup, login, logout, and learner profile endpoints
│   ├── courseRoutes.js         # Curated courses and category query endpoints
│   ├── activityRoutes.js       # Learning activity logging and streak calculation
│   ├── gamificationRoutes.js   # Leaderboard, learner stats, and point schedules
│   ├── communityResourceRoutes.js # Community video recommendations and moderation
│   └── oauthRoutes.js          # Google OAuth 2.0 authentication endpoints
└── tests/
    └── app.test.js             # Automated test suite (syntax, security, APIs, auth, privacy)
```

---

## 🚀 How to Run Locally

### 1. Prerequisites
- **Node.js**: Version 18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **PostgreSQL**: Version 13 or higher (Optional for UI/demo testing; required for database persistence)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/edupath.git
cd edupath
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
# On Linux / macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

Open `.env` in your text editor and adjust variables to match your local setup.

### 5. Start the Server
```bash
# Production mode
npm start

# Development mode with file watching (Node.js 18+)
npm run dev
```

Visit `http://localhost:3000` in your web browser.

---

## ⚙️ Environment Variables

Configure the following variables in your `.env` file:

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `3000` | Port for the Express HTTP server |
| `NODE_ENV` | No | `development` | Environment mode (`development` or `production`) |
| `SESSION_SECRET` | **Yes (Prod)** | *Generated* | Secret key used to sign session cookies. Required in production. |
| `DATABASE_URL` | No | *None* | PostgreSQL connection string (`postgresql://your_db_user:your_db_password@host:port/dbname`) |
| `PGHOST` | No | `localhost` | PostgreSQL host (used if `DATABASE_URL` is omitted) |
| `PGPORT` | No | `5432` | PostgreSQL port |
| `PGUSER` | No | `postgres` | PostgreSQL username |
| `PGPASSWORD` | No | *None* | PostgreSQL password |
| `PGDATABASE` | No | `edupath` | PostgreSQL database name |
| `DATABASE_SSL` | No | `false` | Set to `true` when connecting to cloud providers (e.g. AWS RDS, Neon) |
| `DATABASE_CA_CERT` | No | *None* | Provider CA certificate string (PEM) for strict TLS validation |
| `PGSSLROOTCERT` | No | *None* | Filepath to CA root certificate |
| `ADMIN_KEY` | No | *None* | Shared secret for moderation requests via `x-admin-key` header |
| `GOOGLE_CLIENT_ID` | No | *None* | Google OAuth 2.0 Client ID (optional) |
| `GOOGLE_CLIENT_SECRET` | No | *None* | Google OAuth 2.0 Client Secret (optional) |
| `GOOGLE_CALLBACK_URL` | No | `/api/auth/google/callback` | OAuth redirect URI |

---

## 🗄️ How to Configure PostgreSQL

1. **Create Database**:
   ```sql
   CREATE DATABASE edupath_db;
   ```
2. **Update Connection String**:
   In your `.env` file, set:
   ```env
   DATABASE_URL=postgresql://your_user:your_password@localhost:5432/edupath_db
   ```
3. **Automatic Schema Migration**:
   When the server boots, `db.initDb()` runs automatically. It creates all necessary tables (`users`, `user_profiles`, `courses`, `user_course_progress`, `user_learning_activities`, `user_streaks`, `point_transactions`, `session`, `learning_resources`, `resource_recommendations`, `resource_early_contributors`, `user_contributor_profiles`) and indices.
4. **Cloud Database SSL**:
   If connecting to managed cloud databases (Neon, Supabase, Render, AWS RDS), set `DATABASE_SSL=true`. If the provider supplies a custom CA bundle, provide it via `DATABASE_CA_CERT` or `PGSSLROOTCERT`.

---

## 🧪 How to Run Tests

Run the automated integration test suite:
```bash
npm test
```

The test runner validates:
- JavaScript syntax across all source files (`node -c`).
- Static asset serving and backend source isolation.
- Security headers (Helmet CSP, X-Frame-Options, nosniff).
- Public course and gamification API endpoints.
- Leaderboard privacy (verifies `userId`/`user_id` are never leaked).
- Authentication registration, profile resolution, and session logout.
- Rate limiting protection on auth mutations.
- Community learning resource submission and retrieval.

---

## 🔒 Security Architecture

- **Persistent Session Store**: PostgreSQL-backed sessions using `connect-pg-simple` with secure, HTTP-only cookies and SameSite protection.
- **Strict TLS Certificate Verification**: TLS connections enforce CA verification without blind `rejectUnauthorized: false` shortcuts.
- **Source Code Isolation**: Static middleware serves only public frontend assets (`index.html`, `style.css`, `script.js`, `images/`). Backend files (`server.js`, `db.js`, `routes/`, `.env`) return 404 on direct HTTP requests.
- **Leaderboard Privacy**: Public leaderboard endpoints omit internal database user IDs, returning only display rankings and scores.
- **Rate Limiting**: Brute-force mitigation on authentication endpoints (`/api/auth/login` and `/api/auth/signup`).
- **Timing-Safe Admin Moderation**: Admin API routes utilize `crypto.timingSafeEqual` to prevent side-channel timing attacks.
- **Secrets Management**: No credentials, tokens, or private keys are stored in the repository. All secrets are read via environment variables.

---

## 🗺️ Future Roadmap

- [ ] **AI Learning Mentor**: Interactive real-time conversational tutor providing customized code explanations.
- [ ] **Code Playground**: In-browser interactive code editor for HTML/CSS and Python exercises.
- [ ] **Certificate Generation**: Automated downloadable course completion certificates.
- [ ] **Expanded OAuth Providers**: GitHub and LinkedIn single-sign-on integration.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
