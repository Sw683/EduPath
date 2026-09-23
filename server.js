/**
 * ==========================================================================
 * EduPath Server Application
 * ==========================================================================
 * Purpose:
 * Main entry point for the EduPath web application. Combines static file hosting
 * for the existing frontend with secure Express session-based authentication routes.
 *
 * Security:
 * - Session cookies are configured with httpOnly: true, sameSite: 'lax'.
 * - Passwords and database credentials are read via .env.
 * - Global error handling prevents leakage of internal stack traces.
 * ==========================================================================
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const activityRoutes = require('./routes/activityRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const oauthRoutes = require('./routes/oauthRoutes');
const communityResourceRoutes = require('./routes/communityResourceRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Fail-safe: In production, SESSION_SECRET environment variable is strictly mandatory
if (IS_PRODUCTION && (!process.env.SESSION_SECRET || !process.env.SESSION_SECRET.trim())) {
    console.error('❌ [Fatal Startup Error] SESSION_SECRET environment variable is required in production.');
    throw new Error('SESSION_SECRET environment variable is required in production.');
}

// In development, require SESSION_SECRET or use an ephemeral runtime key (never hardcoded in source)
const sessionSecret = process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex');

// Trust reverse proxy in production with HTTPS (e.g. Nginx, Cloudflare, Render, AWS ALB)
if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}

// 1. Standard HTTP security headers via Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://img.youtube.com", "https://i.ytimg.com", "https://lh3.googleusercontent.com", "https://avatars.githubusercontent.com"],
            frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// 2. Parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. PostgreSQL-backed persistent session store using connect-pg-simple
const pgStore = new pgSession({
    pool: db.pool, // Reuses existing PostgreSQL connection pool (no duplicate pools)
    tableName: 'session',
    createTableIfMissing: true,
    errorLog: (msg) => {
        if (!IS_PRODUCTION) {
            console.warn('⚠️ [Session Store Notice]:', msg);
        } else {
            console.error('❌ [Session Store Error]:', msg);
        }
    }
});

// Resilient store adapter: Uses PostgreSQL in production/when connected, with safe local fallback
class ResilientPgSessionStore extends session.Store {
    constructor(pgStore) {
        super();
        this.pgStore = pgStore;
        this.memStore = new session.MemoryStore();
        this.pgStore.on('error', (err) => {
            if (IS_PRODUCTION) {
                console.error('❌ [Session Store PostgreSQL Error]:', err.message || err);
            }
        });
    }

    get(sid, fn) {
        this.pgStore.get(sid, (err, sess) => {
            if (err) return this.memStore.get(sid, fn);
            if (sess) return fn(null, sess);
            this.memStore.get(sid, fn);
        });
    }

    set(sid, sess, fn) {
        this.pgStore.set(sid, sess, (err) => {
            if (err) return this.memStore.set(sid, sess, fn);
            this.memStore.set(sid, sess, () => {});
            if (fn) fn(null);
        });
    }

    destroy(sid, fn) {
        this.pgStore.destroy(sid, (err) => {
            this.memStore.destroy(sid, (memErr) => {
                if (fn) fn(memErr || null);
            });
        });
    }

    touch(sid, sess, fn) {
        if (typeof this.pgStore.touch === 'function') {
            this.pgStore.touch(sid, sess, (err) => {
                if (err && typeof this.memStore.touch === 'function') {
                    return this.memStore.touch(sid, sess, fn);
                }
                if (fn) fn(err);
            });
        } else if (fn) {
            fn(null);
        }
    }
}

const sessionStore = new ResilientPgSessionStore(pgStore);

// Configure session management with secure HTTP-only cookies and persistent store
app.use(session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true, // Prevents client-side scripts from reading the cookie
        secure: IS_PRODUCTION, // True in production with HTTPS
        sameSite: 'lax', // Protects against cross-site request forgery (CSRF)
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days expiration
    }
}));

// 3. Register API routes
app.use('/api/auth', oauthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/community-resources', communityResourceRoutes);
app.use('/api', authRoutes);

// 4. Serve ONLY frontend and public static assets (blocks backend source files from public access)
app.use('/images', express.static(path.join(__dirname, 'images')));

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 5. Fallback route to serve index.html for client-side single-page routing
// Explicitly blocks access to dotfiles (e.g. .env, .git), files with extensions, and unknown API routes
app.get('*', (req, res) => {
    const base = path.basename(req.path);
    if (req.path.startsWith('/api/') || base.startsWith('.') || path.extname(req.path)) {
        return res.status(404).json({
            success: false,
            error: 'Resource not found.'
        });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 6. Global error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ [Server Error]:', err.stack || err);
    res.status(500).json({
        success: false,
        error: 'An unexpected server error occurred. Please try again later.'
    });
});

// 7. Initialize database schema and start listening if executed directly
if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`🚀 EduPath server running at http://localhost:${PORT}`);
        await db.initDb();
    });
}

module.exports = app;
