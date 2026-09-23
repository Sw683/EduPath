/**
 * ==========================================================================
 * EduPath Database Module (PostgreSQL)
 * ==========================================================================
 * Purpose:
 * Manages the PostgreSQL connection pool using the 'pg' library and ensures
 * that required database tables are automatically initialized on startup.
 *
 * Security:
 * - Credentials are read exclusively from process.env (never hardcoded).
 * - All queries are executed with parameterization ($1, $2, ...) to prevent SQL injection.
 * ==========================================================================
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * Safely determines the SSL/TLS configuration for PostgreSQL connection.
 * Avoids blind rejectUnauthorized: false in production.
 * Supports CA certificate validation via DATABASE_CA_CERT or PGSSLROOTCERT.
 * Preserves local development compatibility.
 */
function getSslConfig() {
    const isExplicitSsl = process.env.DATABASE_SSL === 'true';
    const isUrlSsl = Boolean(process.env.DATABASE_URL && (
        process.env.DATABASE_URL.includes('sslmode=require') ||
        process.env.DATABASE_URL.includes('sslmode=verify-ca') ||
        process.env.DATABASE_URL.includes('sslmode=verify-full') ||
        process.env.DATABASE_URL.includes('ssl=true')
    ));

    // If SSL is not requested, keep local development working with plain connection
    if (!isExplicitSsl && !isUrlSsl) {
        return false;
    }

    const sslConfig = {};

    // 1. Check for CA certificate provided by deployment provider
    let caCert = process.env.DATABASE_CA_CERT;
    if (!caCert && process.env.PGSSLROOTCERT) {
        try {
            const fs = require('fs');
            if (fs.existsSync(process.env.PGSSLROOTCERT)) {
                caCert = fs.readFileSync(process.env.PGSSLROOTCERT, 'utf8');
            }
        } catch (err) {
            console.error('⚠️ [Database TLS]: Unable to read PGSSLROOTCERT file:', err.message);
        }
    }

    if (caCert && caCert.trim()) {
        // Deployment provider supplied a custom CA certificate (e.g. AWS RDS bundle)
        sslConfig.ca = caCert.trim();
        sslConfig.rejectUnauthorized = true;
    } else if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false') {
        // Explicit opt-out for development/staging environments with self-signed certificates
        console.warn('⚠️ [Database TLS Warning]: DATABASE_SSL_REJECT_UNAUTHORIZED=false. SSL certificate verification is disabled.');
        sslConfig.rejectUnauthorized = false;
    } else {
        // Safer production default: enforce certificate validation against trusted root CAs
        sslConfig.rejectUnauthorized = true;
    }

    return sslConfig;
}

// Create the connection pool based on environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // If DATABASE_URL is not set, fallback to individual variables
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    // Safe SSL configuration supporting custom CA certs & standard CA verification
    ssl: getSslConfig()
});

const CURATED_COURSES = [
    // Web Development
    {
        id: 'web-cs50w',
        category: 'web_dev',
        title: "Harvard CS50's Web Programming with Python and JavaScript",
        description: 'Dive deep into modern full-stack web applications with Python, JavaScript, SQL, APIs, and scalable architectural patterns.',
        provider: 'Harvard / CS50',
        url: 'https://cs50.harvard.edu/web/',
        type: 'Interactive University Course',
        difficulty: 'Intermediate'
    },
    {
        id: 'web-mdn-basics',
        category: 'web_dev',
        title: 'MDN Web Docs: Web Development Curriculum',
        description: 'The definitive open learning guide covering semantic HTML5 structure, responsive modern CSS layouts, and dynamic vanilla JavaScript.',
        provider: 'Official Documentation (Mozilla)',
        url: 'https://developer.mozilla.org/en-US/docs/Learn',
        type: 'Official Documentation & Guides',
        difficulty: 'Beginner'
    },
    {
        id: 'web-coursera-meta',
        category: 'web_dev',
        title: 'Meta Front-End Developer Professional Certificate',
        description: 'Industry certificate focused on building interactive web interfaces, version control with Git, and component architecture.',
        provider: 'Coursera (Meta)',
        url: 'https://www.coursera.org/professional-certificates/meta-front-end-developer',
        type: 'Accredited Specialization',
        difficulty: 'Beginner'
    },
    {
        id: 'web-youtube-netninja',
        category: 'web_dev',
        title: 'Modern JavaScript & Web Engineering Roadmaps',
        description: 'Visual code-alongs and practical project walkthroughs explaining DOM manipulation, async functions, APIs, and modern tooling.',
        provider: 'YouTube (The Net Ninja)',
        url: 'https://www.youtube.com/@NetNinja',
        type: 'Video Series & Walkthroughs',
        difficulty: 'Beginner to Intermediate'
    },

    // Python Programming
    {
        id: 'py-cs50p',
        category: 'python',
        title: "Harvard CS50's Introduction to Programming with Python (CS50P)",
        description: 'Learn programming fundamentals in Python: functions, variables, conditionals, loops, exceptions, unit tests, and file handling.',
        provider: 'Harvard / CS50',
        url: 'https://cs50.harvard.edu/python/',
        type: 'Interactive University Course',
        difficulty: 'Beginner'
    },
    {
        id: 'py-coursera-michigan',
        category: 'python',
        title: 'Python for Everybody Specialization',
        description: 'Learn foundational programming concepts, data structures, networked APIs, and relational database operations using Python.',
        provider: 'Coursera (Univ of Michigan)',
        url: 'https://www.coursera.org/specializations/python',
        type: 'Accredited Specialization',
        difficulty: 'Beginner'
    },
    {
        id: 'py-official-docs',
        category: 'python',
        title: 'Official Python 3 Tutorial & Standard Library Docs',
        description: 'The authoritative reference and tutorial directly from the Python Software Foundation explaining built-in modules and syntax.',
        provider: 'Official Documentation (Python PSF)',
        url: 'https://docs.python.org/3/tutorial/',
        type: 'Official Documentation & Reference',
        difficulty: 'Beginner to Intermediate'
    },
    {
        id: 'py-youtube-corey',
        category: 'python',
        title: 'Python OOP & Practical Software Engineering',
        description: 'Deep dives into object-oriented Python, classes, virtual environments, decorators, generators, and clean code practices.',
        provider: 'YouTube (Corey Schafer)',
        url: 'https://www.youtube.com/@coreyms',
        type: 'Video Series & Deep Dives',
        difficulty: 'Intermediate'
    },

    // AI & Machine Learning
    {
        id: 'ai-cs50-ai',
        category: 'ai_ml',
        title: "Harvard CS50's Introduction to Artificial Intelligence with Python",
        description: 'Explore core algorithms and principles of modern AI: graph search, knowledge representation, Bayesian networks, and neural models.',
        provider: 'Harvard / CS50',
        url: 'https://cs50.harvard.edu/ai/',
        type: 'Interactive University Course',
        difficulty: 'Intermediate'
    },
    {
        id: 'ai-coursera-deeplearning',
        category: 'ai_ml',
        title: 'Machine Learning Specialization by Andrew Ng',
        description: 'World-renowned foundational program teaching supervised learning, regression, classification, decision trees, and neural networks.',
        provider: 'Coursera (DeepLearning.AI)',
        url: 'https://www.coursera.org/specializations/machine-learning-introduction',
        type: 'Master Specialization',
        difficulty: 'Beginner to Intermediate'
    },
    {
        id: 'ai-google-mlcc',
        category: 'ai_ml',
        title: 'Google Machine Learning Crash Course & Docs',
        description: 'Fast-paced, practical introduction to machine learning featuring video lectures, interactive Colabs, and real-world case studies.',
        provider: 'Official Documentation (Google Developers)',
        url: 'https://developers.google.com/machine-learning/crash-course',
        type: 'Official Documentation & Interactive Tutorials',
        difficulty: 'Intermediate'
    },
    {
        id: 'ai-youtube-statquest',
        category: 'ai_ml',
        title: 'StatQuest Machine Learning & Neural Network Fundamentals',
        description: 'Visual step-by-step breakdowns of machine learning algorithms, cross-validation, gradient descent, and statistical intuition.',
        provider: 'YouTube (StatQuest with Josh Starmer)',
        url: 'https://www.youtube.com/@statquest',
        type: 'Video Series & Visual Concepts',
        difficulty: 'Beginner'
    }
];

/**
 * Initializes required database tables if they do not already exist.
 * Runs once when the Express server starts up.
 */
async function initDb() {
    const createTablesQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            auth_provider VARCHAR(50) DEFAULT 'local',
            provider_id VARCHAR(255),
            avatar_url VARCHAR(500),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_profiles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(50) NOT NULL,
            interests TEXT[] NOT NULL,
            learning_goal VARCHAR(100) NOT NULL,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS courses (
            id VARCHAR(100) PRIMARY KEY,
            category VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            provider VARCHAR(100) NOT NULL,
            url VARCHAR(500) NOT NULL,
            type VARCHAR(50) NOT NULL,
            difficulty VARCHAR(30) NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_course_progress (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id VARCHAR(100) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
        );

        CREATE TABLE IF NOT EXISTS user_learning_activities (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('module_completed', 'quiz_completed', 'course_completed', 'project_submitted')),
            course_id VARCHAR(100) REFERENCES courses(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            details JSONB DEFAULT '{}'::jsonb,
            activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_learning_activities(user_id, activity_date DESC);
        CREATE INDEX IF NOT EXISTS idx_user_activity_dedup ON user_learning_activities(user_id, activity_type, course_id, activity_date);

        CREATE TABLE IF NOT EXISTS user_streaks (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            current_streak INTEGER NOT NULL DEFAULT 0,
            longest_streak INTEGER NOT NULL DEFAULT 0,
            last_activity_date DATE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_feedback (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            user_name VARCHAR(100),
            user_email VARCHAR(255),
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            category VARCHAR(50) NOT NULL,
            improvement_topics TEXT[],
            clarity_rating VARCHAR(50),
            feedback_text TEXT NOT NULL,
            beta_tester_opt_in BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS point_transactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('module_completed', 'quiz_completed', 'course_completed', 'project_submitted', 'daily_learning_activity')),
            points INTEGER NOT NULL CHECK (points > 0),
            reference_id VARCHAR(100),
            description VARCHAR(255) NOT NULL,
            activity_id INTEGER REFERENCES user_learning_activities(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_point_tx_user_created ON point_transactions(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_point_tx_dedup ON point_transactions(user_id, action_type, reference_id);

        -- ======================================================================
        -- Persistent Session Store (connect-pg-simple)
        -- ======================================================================
        CREATE TABLE IF NOT EXISTS "session" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL,
            CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
        );
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

        -- ======================================================================
        -- Community Learning Resources System
        -- Tables: learning_resources, resource_recommendations,
        --         resource_early_contributors, user_contributor_profiles
        -- ======================================================================
        CREATE TABLE IF NOT EXISTS learning_resources (
            id SERIAL PRIMARY KEY,
            youtube_video_id VARCHAR(20) UNIQUE NOT NULL,
            youtube_url VARCHAR(500) NOT NULL,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(50) NOT NULL,
            topic VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending' 
                CHECK (status IN ('pending', 'candidate', 'approved', 'rejected', 'published')),
            recommendation_count INTEGER NOT NULL DEFAULT 1,
            submitted_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_resources_video_id ON learning_resources(youtube_video_id);
        CREATE INDEX IF NOT EXISTS idx_resources_status ON learning_resources(status);
        CREATE INDEX IF NOT EXISTS idx_resources_category ON learning_resources(category);
        CREATE INDEX IF NOT EXISTS idx_resources_recs ON learning_resources(recommendation_count DESC);

        CREATE TABLE IF NOT EXISTS resource_recommendations (
            id SERIAL PRIMARY KEY,
            resource_id INTEGER NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_resource_user_recommendation UNIQUE (resource_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_recommendations_resource_created ON resource_recommendations(resource_id, created_at ASC);

        CREATE TABLE IF NOT EXISTS resource_early_contributors (
            id SERIAL PRIMARY KEY,
            resource_id INTEGER NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            contributor_rank SMALLINT NOT NULL CHECK (contributor_rank IN (1, 2, 3)),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_resource_contributor_rank UNIQUE (resource_id, contributor_rank),
            CONSTRAINT unique_resource_contributor_user UNIQUE (resource_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS user_contributor_profiles (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            instagram VARCHAR(150),
            linkedin VARCHAR(255),
            github VARCHAR(150),
            other VARCHAR(255),
            show_social_links BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        await pool.query(createTablesQuery);

        // Ensure OAuth columns exist if table was previously initialized
        await pool.query(`
            ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
        `).catch(() => {});

        console.log('✅ [Database] PostgreSQL connected; tables verified including "learning_resources", "resource_recommendations", "resource_early_contributors", and "user_contributor_profiles".');

        // Seed curated courses if empty
        const countResult = await pool.query('SELECT COUNT(*) FROM courses');
        if (parseInt(countResult.rows[0].count, 10) === 0) {
            console.log('🌱 [Database] Seeding curated learning courses...');
            for (const course of CURATED_COURSES) {
                await pool.query(
                    `INSERT INTO courses (id, category, title, description, provider, url, type, difficulty)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (id) DO NOTHING`,
                    [course.id, course.category, course.title, course.description, course.provider, course.url, course.type, course.difficulty]
                );
            }
            console.log('✅ [Database] Seeded 12 curated educational courses.');
        }
    } catch (error) {
        console.warn('⚠️ [Database Warning] Could not connect to PostgreSQL:', error.message);
        console.warn('👉 Please verify that PostgreSQL is running and your DATABASE_URL in .env is correct.');
    }
}

/**
 * Pure helper function to calculate current and longest streaks from distinct date strings.
 * Ensures that multiple activities on the same day never artificially increment the streak.
 * 
 * @param {Array<string|Date>} dateStrings - List of dates when meaningful learning activity occurred
 * @returns {object} { currentStreak, longestStreak, streakActiveToday, lastActivityDate }
 */
function computeStreaksFromDates(dateStrings) {
    if (!dateStrings || dateStrings.length === 0) {
        return { currentStreak: 0, longestStreak: 0, streakActiveToday: false, lastActivityDate: null };
    }

    // Deduplicate and sort descending ('YYYY-MM-DD')
    const uniqueDateSet = new Set();
    dateStrings.forEach(d => {
        if (!d) return;
        if (d instanceof Date) {
            uniqueDateSet.add(d.toISOString().slice(0, 10));
        } else {
            uniqueDateSet.add(String(d).slice(0, 10));
        }
    });

    const uniqueDates = Array.from(uniqueDateSet).sort((a, b) => b.localeCompare(a));
    if (uniqueDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0, streakActiveToday: false, lastActivityDate: null };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const latestDate = uniqueDates[0];
    const streakActiveToday = (latestDate === todayStr);

    // 1. Calculate Current Streak
    // A streak is current if the latest activity happened today or yesterday.
    // If last activity was before yesterday, current streak has lapsed to 0.
    let currentStreak = 0;
    if (latestDate === todayStr || latestDate === yesterdayStr) {
        currentStreak = 1;
        let expectedDate = new Date(latestDate);

        for (let i = 1; i < uniqueDates.length; i++) {
            expectedDate.setDate(expectedDate.getDate() - 1);
            const expectedStr = expectedDate.toISOString().slice(0, 10);
            if (uniqueDates[i] === expectedStr) {
                currentStreak++;
            } else {
                break;
            }
        }
    }

    // 2. Calculate Longest Streak Across Entire History
    let longestStreak = 1;
    let runningStreak = 1;
    let prevDate = new Date(uniqueDates[0]);

    for (let i = 1; i < uniqueDates.length; i++) {
        const currDate = new Date(uniqueDates[i]);
        const diffMs = prevDate.getTime() - currDate.getTime();
        const diffDays = Math.round(diffMs / 86400000);

        if (diffDays === 1) {
            runningStreak++;
        } else {
            runningStreak = 1;
        }

        if (runningStreak > longestStreak) {
            longestStreak = runningStreak;
        }
        prevDate = currDate;
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    return {
        currentStreak,
        longestStreak,
        streakActiveToday,
        lastActivityDate: latestDate
    };
}

// In-memory fallback activity & streak store for offline resilience
const fallbackActivities = new Map(); // userId -> Array of activity objects
const fallbackStreaks = new Map();     // userId -> { currentStreak, longestStreak, lastActivityDate }

/**
 * Records a meaningful learning activity and recalculates user streaks.
 * Deduplicates exact activities on the same day to prevent streak exploitation.
 * 
 * @param {number} userId - Authenticated user ID
 * @param {string} activityType - 'module_completed' | 'quiz_completed' | 'course_completed' | 'project_submitted'
 * @param {string} courseId - Optional course ID
 * @param {string} title - Descriptive title of milestone
 * @param {object} details - Optional metadata (score, repo URL, etc.)
 * @returns {Promise<object>} Result containing saved activity and updated streak stats
 */
async function recordLearningActivity(userId, activityType, courseId = null, title, details = {}) {
    const validTypes = ['module_completed', 'quiz_completed', 'course_completed', 'project_submitted'];
    if (!validTypes.includes(activityType)) {
        throw new Error(`Invalid activity type: ${activityType}`);
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    try {
        // 1. Deduplication check: Has this exact activity occurred on the same day?
        const dupCheck = await pool.query(`
            SELECT id FROM user_learning_activities
            WHERE user_id = $1 
              AND activity_type = $2 
              AND (course_id = $3 OR ($3 IS NULL AND course_id IS NULL))
              AND activity_date = CURRENT_DATE
            LIMIT 1;
        `, [userId, activityType, courseId]);

        let activityRecord = null;
        let isDuplicate = false;

        if (dupCheck.rows.length > 0) {
            // Already logged today for this item; do not record a duplicate row
            isDuplicate = true;
            activityRecord = dupCheck.rows[0];
        } else {
            // Insert fresh meaningful learning activity
            const insertResult = await pool.query(`
                INSERT INTO user_learning_activities (user_id, activity_type, course_id, title, details, activity_date)
                VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
                RETURNING id, user_id, activity_type, course_id, title, details, activity_date, created_at;
            `, [userId, activityType, courseId, title, JSON.stringify(details)]);
            activityRecord = insertResult.rows[0];
        }

        // 2. Fetch all distinct activity dates to recompute streak accurately
        const datesResult = await pool.query(`
            SELECT DISTINCT activity_date FROM user_learning_activities
            WHERE user_id = $1
            ORDER BY activity_date DESC;
        `, [userId]);

        const dateList = datesResult.rows.map(r => r.activity_date);
        const streakInfo = computeStreaksFromDates(dateList);

        // 3. Atomically update cached user_streaks table
        await pool.query(`
            INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
                current_streak = EXCLUDED.current_streak,
                longest_streak = EXCLUDED.longest_streak,
                last_activity_date = EXCLUDED.last_activity_date,
                updated_at = CURRENT_TIMESTAMP;
        `, [userId, streakInfo.currentStreak, streakInfo.longestStreak, streakInfo.lastActivityDate]);

        return {
            success: true,
            isDuplicate,
            activity: activityRecord,
            streaks: streakInfo
        };

    } catch (dbErr) {
        console.warn('⚠️ [Activity DB Fallback]:', dbErr.message);

        // In-memory fallback
        if (!fallbackActivities.has(userId)) {
            fallbackActivities.set(userId, []);
        }
        const userActs = fallbackActivities.get(userId);

        const existingDup = userActs.find(a => 
            a.activityType === activityType && 
            a.courseId === courseId && 
            a.activityDate === todayStr
        );

        let act = existingDup;
        let isDuplicate = false;
        if (!existingDup) {
            act = {
                id: Date.now(),
                userId,
                activityType,
                courseId,
                title,
                details,
                activityDate: todayStr,
                createdAt: new Date().toISOString()
            };
            userActs.unshift(act);
        } else {
            isDuplicate = true;
        }

        const dateList = userActs.map(a => a.activityDate);
        const streakInfo = computeStreaksFromDates(dateList);
        fallbackStreaks.set(userId, streakInfo);

        return {
            success: true,
            isDuplicate,
            activity: act,
            streaks: streakInfo
        };
    }
}

/**
 * Retrieves the current streak, longest streak, and recent learning activities for a user.
 * 
 * @param {number} userId - Authenticated user ID
 * @param {number} limit - Number of recent activities to retrieve (default 10)
 * @returns {Promise<object>} { streaks, recentActivities }
 */
async function getUserStreakAndActivities(userId, limit = 10) {
    try {
        // Query distinct dates for streak calculation
        const datesResult = await pool.query(`
            SELECT DISTINCT activity_date FROM user_learning_activities
            WHERE user_id = $1
            ORDER BY activity_date DESC;
        `, [userId]);

        const dateList = datesResult.rows.map(r => r.activity_date);
        const streakInfo = computeStreaksFromDates(dateList);

        // Query recent activities with course details
        const activitiesResult = await pool.query(`
            SELECT a.id, a.activity_type, a.course_id, a.title, a.details, a.activity_date, a.created_at,
                   c.title AS course_title, c.category AS course_category
            FROM user_learning_activities a
            LEFT JOIN courses c ON a.course_id = c.id
            WHERE a.user_id = $1
            ORDER BY a.created_at DESC
            LIMIT $2;
        `, [userId, limit]);

        return {
            streaks: streakInfo,
            recentActivities: activitiesResult.rows
        };

    } catch (err) {
        console.warn('⚠️ [Streak/Activity Fetch Fallback]:', err.message);
        const userActs = fallbackActivities.get(userId) || [];
        const dateList = userActs.map(a => a.activityDate);
        const streakInfo = computeStreaksFromDates(dateList);

        return {
            streaks: streakInfo,
            recentActivities: userActs.slice(0, limit)
        };
    }
}

/**
 * ==========================================================================
 * GAMIFICATION & VERIFIED REWARD SYSTEM
 * ==========================================================================
 * Point Schedule:
 * - Module completed → 100 points
 * - Quiz completed → 50 points
 * - Course completed → 200 points
 * - Project submitted → 150 points
 * - Daily learning activity → 10 points
 * ==========================================================================
 */
const POINT_SCHEDULE = {
    module_completed: 100,
    quiz_completed: 50,
    course_completed: 200,
    project_submitted: 150,
    daily_learning_activity: 10
};

/**
 * Computes a learner's Rank Tier and progression metrics based strictly on verified points.
 * 
 * @param {number} points - Total accumulated verified points
 * @returns {object} { tier, title, badge, rankNumber, minPoints, nextTierPoints, pointsToNextTier }
 */
function computeRankTier(points) {
    const pts = Math.max(0, parseInt(points, 10) || 0);

    if (pts >= 1500) {
        return {
            tier: 'Grandmaster',
            title: 'Grandmaster',
            badge: '👑 Grandmaster',
            rankNumber: 'Tier I',
            minPoints: 1500,
            nextTierPoints: null,
            pointsToNextTier: 0
        };
    }
    if (pts >= 700) {
        return {
            tier: 'Master',
            title: 'Master',
            badge: '🎖️ Master',
            rankNumber: 'Tier II',
            minPoints: 700,
            nextTierPoints: 1500,
            pointsToNextTier: 1500 - pts
        };
    }
    if (pts >= 300) {
        return {
            tier: 'Scholar',
            title: 'Scholar',
            badge: '📜 Scholar',
            rankNumber: 'Tier III',
            minPoints: 300,
            nextTierPoints: 700,
            pointsToNextTier: 700 - pts
        };
    }
    if (pts >= 100) {
        return {
            tier: 'Apprentice',
            title: 'Apprentice',
            badge: '🛠️ Apprentice',
            rankNumber: 'Tier IV',
            minPoints: 100,
            nextTierPoints: 300,
            pointsToNextTier: 300 - pts
        };
    }
    return {
        tier: 'Novice',
        title: 'Novice',
        badge: '🌱 Novice',
        rankNumber: 'Tier V',
        minPoints: 0,
        nextTierPoints: 100,
        pointsToNextTier: 100 - pts
    };
}

// In-memory fallback point ledger
const inMemoryPointTransactions = [];

// Seed 5 realistic community learners for immediate vibrant leaderboard display
const DEMO_COMMUNITY_USERS = [
    { id: 901, name: 'Aarav Sharma', email: 'aarav@example.com' },
    { id: 902, name: 'Elena Rostova', email: 'elena@example.com' },
    { id: 903, name: 'Devon Vance', email: 'devon@example.com' },
    { id: 904, name: 'Priya Patel', email: 'priya@example.com' },
    { id: 905, name: 'Lucas Silva', email: 'lucas@example.com' }
];

function initDemoTransactions() {
    if (inMemoryPointTransactions.length > 0) return;

    const now = Date.now();
    const dayMs = 86400000;

    // Aarav: 1,650 points total (Grandmaster)
    inMemoryPointTransactions.push(
        { id: 1001, user_id: 901, action_type: 'course_completed', points: 200, reference_id: 'web-cs50w', description: 'Finished Course Milestone: Harvard CS50 Web', created_at: new Date(now - 1 * dayMs) },
        { id: 1002, user_id: 901, action_type: 'project_submitted', points: 150, reference_id: 'web-cs50w', description: 'Capstone Project: Full Stack Wiki', created_at: new Date(now - 2 * dayMs) },
        { id: 1003, user_id: 901, action_type: 'module_completed', points: 100, reference_id: 'py-cs50p', description: 'Started Module: Python Functions & Testing', created_at: new Date(now - 3 * dayMs) },
        { id: 1004, user_id: 901, action_type: 'quiz_completed', points: 50, reference_id: 'python-basics', description: 'Quiz Completed: Python Core Concepts', created_at: new Date(now - 1 * dayMs) },
        { id: 1005, user_id: 901, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 1 * dayMs) },
        { id: 1006, user_id: 901, action_type: 'course_completed', points: 200, reference_id: 'py-cs50p', description: 'Finished Course Milestone: CS50 Python', created_at: new Date(now - 10 * dayMs) },
        { id: 1007, user_id: 901, action_type: 'project_submitted', points: 150, reference_id: 'py-cs50p', description: 'Capstone Project: Data ETL Pipeline', created_at: new Date(now - 12 * dayMs) },
        { id: 1008, user_id: 901, action_type: 'project_submitted', points: 150, reference_id: 'ai-google-mlcc', description: 'Capstone Project: Linear Regression Model', created_at: new Date(now - 18 * dayMs) },
        { id: 1009, user_id: 901, action_type: 'project_submitted', points: 150, reference_id: 'web-coursera-meta', description: 'Capstone Project: Responsive E-Commerce', created_at: new Date(now - 22 * dayMs) },
        { id: 1010, user_id: 901, action_type: 'module_completed', points: 100, reference_id: 'ai-cs50-ai', description: 'Started Module: Graph Search Algorithms', created_at: new Date(now - 24 * dayMs) },
        { id: 1011, user_id: 901, action_type: 'module_completed', points: 100, reference_id: 'web-mdn-basics', description: 'Started Module: Semantic HTML & CSS', created_at: new Date(now - 26 * dayMs) },
        { id: 1012, user_id: 901, action_type: 'module_completed', points: 100, reference_id: 'web-youtube-netninja', description: 'Started Module: DOM Manipulation', created_at: new Date(now - 28 * dayMs) },
        { id: 1013, user_id: 901, action_type: 'quiz_completed', points: 50, reference_id: 'web-dev-basics', description: 'Quiz Completed: HTML5 Semantics', created_at: new Date(now - 10 * dayMs) },
        { id: 1014, user_id: 901, action_type: 'quiz_completed', points: 50, reference_id: 'css-layouts', description: 'Quiz Completed: Flexbox & Grid', created_at: new Date(now - 18 * dayMs) },
        { id: 1015, user_id: 901, action_type: 'quiz_completed', points: 50, reference_id: 'ai-fundamentals', description: 'Quiz Completed: AI Intro', created_at: new Date(now - 25 * dayMs) },
        { id: 1016, user_id: 901, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 3 * dayMs) },
        { id: 1017, user_id: 901, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 10 * dayMs) },
        { id: 1018, user_id: 901, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 18 * dayMs) },
        { id: 1019, user_id: 901, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 24 * dayMs) }
    );

    // Elena: 1,200 points total (Master)
    inMemoryPointTransactions.push(
        { id: 1020, user_id: 902, action_type: 'course_completed', points: 200, reference_id: 'py-coursera-michigan', description: 'Finished Course: Python for Everybody', created_at: new Date(now - 2 * dayMs) },
        { id: 1021, user_id: 902, action_type: 'project_submitted', points: 150, reference_id: 'py-coursera-michigan', description: 'Capstone Project: Web Scraper & Visualizer', created_at: new Date(now - 3 * dayMs) },
        { id: 1022, user_id: 902, action_type: 'module_completed', points: 100, reference_id: 'ai-coursera-deeplearning', description: 'Started Module: Machine Learning Specialization', created_at: new Date(now - 4 * dayMs) },
        { id: 1023, user_id: 902, action_type: 'quiz_completed', points: 50, reference_id: 'python-basics', description: 'Quiz Completed: Python Lists & Dictionaries', created_at: new Date(now - 2 * dayMs) },
        { id: 1024, user_id: 902, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 2 * dayMs) },
        { id: 1025, user_id: 902, action_type: 'course_completed', points: 200, reference_id: 'web-cs50w', description: 'Finished Course Milestone: Harvard CS50 Web', created_at: new Date(now - 14 * dayMs) },
        { id: 1026, user_id: 902, action_type: 'project_submitted', points: 150, reference_id: 'web-cs50w', description: 'Capstone Project: Social Network App', created_at: new Date(now - 15 * dayMs) },
        { id: 1027, user_id: 902, action_type: 'module_completed', points: 100, reference_id: 'web-mdn-basics', description: 'Started Module: JavaScript APIs', created_at: new Date(now - 16 * dayMs) },
        { id: 1028, user_id: 902, action_type: 'module_completed', points: 100, reference_id: 'py-official-docs', description: 'Started Module: Python Standard Library', created_at: new Date(now - 20 * dayMs) },
        { id: 1029, user_id: 902, action_type: 'quiz_completed', points: 50, reference_id: 'web-dev-basics', description: 'Quiz Completed: JavaScript Scope & Closures', created_at: new Date(now - 14 * dayMs) },
        { id: 1030, user_id: 902, action_type: 'quiz_completed', points: 50, reference_id: 'data-structures', description: 'Quiz Completed: Big-O & Trees', created_at: new Date(now - 20 * dayMs) },
        { id: 1031, user_id: 902, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 14 * dayMs) },
        { id: 1032, user_id: 902, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 20 * dayMs) },
        { id: 1033, user_id: 902, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 27 * dayMs) },
        { id: 1034, user_id: 902, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 28 * dayMs) }
    );

    // Devon: 850 points total (Master)
    inMemoryPointTransactions.push(
        { id: 1035, user_id: 903, action_type: 'course_completed', points: 200, reference_id: 'web-cs50w', description: 'Finished Course Milestone: Harvard CS50 Web', created_at: new Date(now - 5 * dayMs) },
        { id: 1036, user_id: 903, action_type: 'project_submitted', points: 150, reference_id: 'web-cs50w', description: 'Capstone Project: Realtime Chat', created_at: new Date(now - 6 * dayMs) },
        { id: 1037, user_id: 903, action_type: 'module_completed', points: 100, reference_id: 'web-mdn-basics', description: 'Started Module: Modern CSS Grid', created_at: new Date(now - 8 * dayMs) },
        { id: 1038, user_id: 903, action_type: 'module_completed', points: 100, reference_id: 'py-cs50p', description: 'Started Module: Python OOP', created_at: new Date(now - 15 * dayMs) },
        { id: 1039, user_id: 903, action_type: 'project_submitted', points: 150, reference_id: 'py-cs50p', description: 'Capstone Project: Command Line Tool', created_at: new Date(now - 16 * dayMs) },
        { id: 1040, user_id: 903, action_type: 'quiz_completed', points: 50, reference_id: 'web-dev-basics', description: 'Quiz Completed: Async JavaScript', created_at: new Date(now - 5 * dayMs) },
        { id: 1041, user_id: 903, action_type: 'quiz_completed', points: 50, reference_id: 'python-basics', description: 'Quiz Completed: Python Decorators', created_at: new Date(now - 15 * dayMs) },
        { id: 1042, user_id: 903, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 5 * dayMs) },
        { id: 1043, user_id: 903, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 8 * dayMs) },
        { id: 1044, user_id: 903, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 15 * dayMs) },
        { id: 1045, user_id: 903, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 22 * dayMs) },
        { id: 1046, user_id: 903, action_type: 'daily_learning_activity', points: 10, reference_id: 'daily-bonus', description: 'Daily learning activity bonus', created_at: new Date(now - 29 * dayMs) }
    );

    // Priya: 550 points total (Scholar)
    inMemoryPointTransactions.push(
        { id: 1047, user_id: 904, action_type: 'course_completed', points: 200, reference_id: 'ai-google-mlcc', description: 'Finished Course: Google Machine Learning', created_at: new Date(now - 3 * dayMs) },
        { id: 1048, user_id: 904, action_type: 'project_submitted', points: 150, reference_id: 'ai-google-mlcc', description: 'Capstone Project: Classification Model', created_at: new Date(now - 4 * dayMs) },
        { id: 1049, user_id: 904, action_type: 'module_completed', points: 100, reference_id: 'ai-cs50-ai', description: 'Started Module: Search Algorithms', created_at: new Date(now - 12 * dayMs) },
        { id: 1050, user_id: 904, action_type: 'quiz_completed', points: 50, reference_id: 'ai-fundamentals', description: 'Quiz Completed: Neural Networks Basics', created_at: new Date(now - 3 * dayMs) },
        { id: 1051, user_id: 904, action_type: 'quiz_completed', points: 50, reference_id: 'python-basics', description: 'Quiz Completed: NumPy & Vectors', created_at: new Date(now - 12 * dayMs) }
    );

    // Lucas: 250 points total (Apprentice)
    inMemoryPointTransactions.push(
        { id: 1052, user_id: 905, action_type: 'module_completed', points: 100, reference_id: 'web-mdn-basics', description: 'Started Module: HTML5 Semantics', created_at: new Date(now - 1 * dayMs) },
        { id: 1053, user_id: 905, action_type: 'quiz_completed', points: 50, reference_id: 'web-dev-basics', description: 'Quiz Completed: Web Fundamentals', created_at: new Date(now - 1 * dayMs) },
        { id: 1054, user_id: 905, action_type: 'module_completed', points: 100, reference_id: 'web-youtube-netninja', description: 'Started Module: CSS Box Model', created_at: new Date(now - 6 * dayMs) }
    );
}
initDemoTransactions();

/**
 * Awards verified points to a user for an authentic learning accomplishment.
 * Strictly prevents abuse and duplicate point inflation:
 * - 'module_completed': 100 pts, max 1 award per course (referenceId = courseId)
 * - 'course_completed': 200 pts, max 1 award per course (referenceId = courseId)
 * - 'project_submitted': 150 pts, max 1 award per capstone (referenceId = courseId)
 * - 'quiz_completed': 50 pts, max 1 award per topic per calendar day (referenceId = topic)
 * - 'daily_learning_activity': 10 pts, max 1 award per calendar day
 * 
 * Automatically awards the +10 daily activity bonus on the first verified activity of each day!
 *
 * @param {number} userId - Authenticated user ID
 * @param {string} actionType - 'module_completed' | 'quiz_completed' | 'course_completed' | 'project_submitted' | 'daily_learning_activity'
 * @param {string} referenceId - Optional identifier (e.g. courseId, quiz topic)
 * @param {string} description - Descriptive ledger entry
 * @param {number} activityId - Optional foreign key to user_learning_activities
 * @returns {Promise<object>} Result detailing points awarded and updated stats
 */
async function awardPoints(userId, actionType, referenceId = null, description = '', activityId = null) {
    const validActions = Object.keys(POINT_SCHEDULE);
    if (!validActions.includes(actionType)) {
        throw new Error(`Invalid gamification actionType: ${actionType}. Must be one of: ${validActions.join(', ')}.`);
    }

    const pointsToAward = POINT_SCHEDULE[actionType];
    const todayStr = new Date().toISOString().slice(0, 10);
    const cleanRefId = referenceId ? String(referenceId).trim() : null;
    const cleanDesc = description && description.trim().length > 0 
        ? description.trim().slice(0, 255) 
        : `${actionType.replace(/_/g, ' ')} completed`;

    let primaryResult = null;

    try {
        // 1. PostgreSQL Anti-Abuse Verification
        let isDuplicate = false;
        let dupQuery = '';
        let dupParams = [];

        if (actionType === 'module_completed' || actionType === 'course_completed' || actionType === 'project_submitted') {
            // Milestone points can only ever be earned ONCE per specific course/project
            dupQuery = `
                SELECT id FROM point_transactions
                WHERE user_id = $1 AND action_type = $2 AND reference_id = $3
                LIMIT 1;
            `;
            dupParams = [userId, actionType, cleanRefId];
        } else if (actionType === 'quiz_completed') {
            // Quiz points can only be earned ONCE per topic per calendar day (subsequent attempts = practice)
            dupQuery = `
                SELECT id FROM point_transactions
                WHERE user_id = $1 AND action_type = $2 AND reference_id = $3 AND created_at >= CURRENT_DATE
                LIMIT 1;
            `;
            dupParams = [userId, actionType, cleanRefId];
        } else if (actionType === 'daily_learning_activity') {
            // Daily learning bonus can only be earned ONCE per calendar day
            dupQuery = `
                SELECT id FROM point_transactions
                WHERE user_id = $1 AND action_type = $2 AND created_at >= CURRENT_DATE
                LIMIT 1;
            `;
            dupParams = [userId, actionType];
        }

        const dupCheck = await pool.query(dupQuery, dupParams);
        if (dupCheck.rows.length > 0) {
            isDuplicate = true;
        }

        if (isDuplicate) {
            primaryResult = {
                awarded: false,
                points: 0,
                actionType,
                reason: `Points have already been claimed for this ${actionType.replace(/_/g, ' ')}.`
            };
        } else {
            // Insert verified point transaction into PostgreSQL
            const insertResult = await pool.query(`
                INSERT INTO point_transactions (user_id, action_type, points, reference_id, description, activity_id, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                RETURNING id, user_id, action_type, points, reference_id, description, activity_id, created_at;
            `, [userId, actionType, pointsToAward, cleanRefId, cleanDesc, activityId]);

            primaryResult = {
                awarded: true,
                points: pointsToAward,
                actionType,
                transaction: insertResult.rows[0]
            };
        }

        // 2. Check and automatically award Daily Learning Activity Bonus (+10 points) on first activity of the day
        let dailyBonusAwarded = false;
        if (actionType !== 'daily_learning_activity') {
            const dailyCheck = await pool.query(`
                SELECT id FROM point_transactions
                WHERE user_id = $1 AND action_type = 'daily_learning_activity' AND created_at >= CURRENT_DATE
                LIMIT 1;
            `, [userId]);

            if (dailyCheck.rows.length === 0) {
                // Award daily bonus
                const bonusResult = await pool.query(`
                    INSERT INTO point_transactions (user_id, action_type, points, reference_id, description, activity_id, created_at)
                    VALUES ($1, 'daily_learning_activity', 10, $2, 'Daily learning activity bonus', $3, CURRENT_TIMESTAMP)
                    RETURNING id, points;
                `, [userId, `daily-${todayStr}`, activityId]);

                if (bonusResult.rows.length > 0) {
                    dailyBonusAwarded = true;
                }
            }
        }

        // Fetch fresh gamification stats for user
        const updatedStats = await getUserGamificationStats(userId);

        return {
            success: true,
            awarded: primaryResult.awarded,
            pointsAwarded: primaryResult.points + (dailyBonusAwarded ? 10 : 0),
            primaryPoints: primaryResult.points,
            dailyBonusAwarded,
            reason: primaryResult.reason || null,
            stats: updatedStats
        };

    } catch (err) {
        console.warn('⚠️ [Award Points Fallback]:', err.message);

        // In-memory fallback
        initDemoTransactions();

        let isDuplicate = false;
        if (actionType === 'module_completed' || actionType === 'course_completed' || actionType === 'project_submitted') {
            isDuplicate = inMemoryPointTransactions.some(t => 
                t.user_id === userId && t.action_type === actionType && t.reference_id === cleanRefId
            );
        } else if (actionType === 'quiz_completed') {
            isDuplicate = inMemoryPointTransactions.some(t => {
                const txDate = (t.created_at instanceof Date ? t.created_at : new Date(t.created_at)).toISOString().slice(0, 10);
                return t.user_id === userId && t.action_type === actionType && t.reference_id === cleanRefId && txDate === todayStr;
            });
        } else if (actionType === 'daily_learning_activity') {
            isDuplicate = inMemoryPointTransactions.some(t => {
                const txDate = (t.created_at instanceof Date ? t.created_at : new Date(t.created_at)).toISOString().slice(0, 10);
                return t.user_id === userId && t.action_type === 'daily_learning_activity' && txDate === todayStr;
            });
        }

        let primaryPoints = 0;
        let awarded = false;
        if (!isDuplicate) {
            const newTx = {
                id: inMemoryPointTransactions.length + 1000,
                user_id: userId,
                action_type: actionType,
                points: pointsToAward,
                reference_id: cleanRefId,
                description: cleanDesc,
                activity_id: activityId,
                created_at: new Date()
            };
            inMemoryPointTransactions.push(newTx);
            awarded = true;
            primaryPoints = pointsToAward;
        }

        // Auto-award daily bonus if not yet claimed today
        let dailyBonusAwarded = false;
        if (actionType !== 'daily_learning_activity') {
            const hadDaily = inMemoryPointTransactions.some(t => {
                const txDate = (t.created_at instanceof Date ? t.created_at : new Date(t.created_at)).toISOString().slice(0, 10);
                return t.user_id === userId && t.action_type === 'daily_learning_activity' && txDate === todayStr;
            });

            if (!hadDaily) {
                inMemoryPointTransactions.push({
                    id: inMemoryPointTransactions.length + 1000,
                    user_id: userId,
                    action_type: 'daily_learning_activity',
                    points: 10,
                    reference_id: `daily-${todayStr}`,
                    description: 'Daily learning activity bonus',
                    activity_id: activityId,
                    created_at: new Date()
                });
                dailyBonusAwarded = true;
            }
        }

        const updatedStats = await getUserGamificationStats(userId);

        return {
            success: true,
            awarded,
            pointsAwarded: primaryPoints + (dailyBonusAwarded ? 10 : 0),
            primaryPoints,
            dailyBonusAwarded,
            reason: isDuplicate ? `Points have already been claimed for this ${actionType.replace(/_/g, ' ')}.` : null,
            stats: updatedStats
        };
    }
}

/**
 * Retrieves a user's verified gamification stats:
 * - ⭐ Total Points
 * - 🏆 Current Rank (Tier + Leaderboard rank)
 * - 📅 Weekly Points (last 7 days)
 * - 📅 Monthly Points (last 30 days)
 * 
 * @param {number} userId - Authenticated user ID
 * @returns {Promise<object>} User points, rank tier, leaderboard position, recent transactions
 */
async function getUserGamificationStats(userId) {
    try {
        const statsQuery = `
            SELECT
                COALESCE(SUM(points), 0)::integer AS total_points,
                COALESCE(SUM(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days' THEN points ELSE 0 END), 0)::integer AS weekly_points,
                COALESCE(SUM(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days' THEN points ELSE 0 END), 0)::integer AS monthly_points
            FROM point_transactions
            WHERE user_id = $1;
        `;
        const statsRes = await pool.query(statsQuery, [userId]);
        const totals = statsRes.rows[0] || { total_points: 0, weekly_points: 0, monthly_points: 0 };

        const totalPoints = parseInt(totals.total_points, 10) || 0;
        const weeklyPoints = parseInt(totals.weekly_points, 10) || 0;
        const monthlyPoints = parseInt(totals.monthly_points, 10) || 0;
        const currentRank = computeRankTier(totalPoints);

        // Calculate leaderboard rank position (users with strictly higher total points + 1)
        const rankPosRes = await pool.query(`
            SELECT COUNT(DISTINCT user_id)::integer AS higher_users
            FROM (
                SELECT user_id, SUM(points) as user_total
                FROM point_transactions
                GROUP BY user_id
                HAVING SUM(points) > $1
            ) sub;
        `, [totalPoints]);
        const leaderboardPosition = (parseInt(rankPosRes.rows[0].higher_users, 10) || 0) + 1;

        // Recent 5 point ledger transactions
        const recentRes = await pool.query(`
            SELECT id, action_type, points, reference_id, description, created_at
            FROM point_transactions
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 5;
        `, [userId]);

        return {
            totalPoints,
            weeklyPoints,
            monthlyPoints,
            currentRank,
            leaderboardPosition,
            recentTransactions: recentRes.rows
        };

    } catch (err) {
        console.warn('⚠️ [Stats Fetch Fallback]:', err.message);
        initDemoTransactions();

        const userTxs = inMemoryPointTransactions.filter(t => t.user_id === userId);
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 86400000);
        const thirtyDaysAgo = now - (30 * 86400000);

        let totalPoints = 0;
        let weeklyPoints = 0;
        let monthlyPoints = 0;

        userTxs.forEach(t => {
            const pts = parseInt(t.points, 10) || 0;
            const tTime = (t.created_at instanceof Date ? t.created_at : new Date(t.created_at)).getTime();
            totalPoints += pts;
            if (tTime >= sevenDaysAgo) weeklyPoints += pts;
            if (tTime >= thirtyDaysAgo) monthlyPoints += pts;
        });

        const currentRank = computeRankTier(totalPoints);

        // Aggregate all user totals in memory to find leaderboard position
        const userTotalsMap = new Map();
        inMemoryPointTransactions.forEach(t => {
            const uid = t.user_id;
            const pts = parseInt(t.points, 10) || 0;
            userTotalsMap.set(uid, (userTotalsMap.get(uid) || 0) + pts);
        });

        let higherUsers = 0;
        userTotalsMap.forEach((pts, uid) => {
            if (uid !== userId && pts > totalPoints) higherUsers++;
        });

        const sortedRecent = [...userTxs].sort((a, b) => {
            const timeA = (a.created_at instanceof Date ? a.created_at : new Date(a.created_at)).getTime();
            const timeB = (b.created_at instanceof Date ? b.created_at : new Date(b.created_at)).getTime();
            return timeB - timeA;
        }).slice(0, 5);

        return {
            totalPoints,
            weeklyPoints,
            monthlyPoints,
            currentRank,
            leaderboardPosition: higherUsers + 1,
            recentTransactions: sortedRecent
        };
    }
}

/**
 * Retrieves the public verified leaderboard filtered by time period:
 * - 'all': All-Time total verified points
 * - 'monthly': Verified points earned in the last 30 days
 * - 'weekly': Verified points earned in the last 7 days
 * 
 * @param {string} period - 'all' | 'monthly' | 'weekly'
 * @param {number} limit - Maximum number of top learners to return (default 10)
 * @param {number} currentUserId - Optional authenticated user ID to highlight & identify placement
 * @returns {Promise<object>} { period, leaderboard: Array, currentUserStanding: object }
 */
async function getLeaderboard(period = 'all', limit = 10, currentUserId = null) {
    const validPeriods = ['all', 'monthly', 'weekly'];
    const selectedPeriod = validPeriods.includes(period.toLowerCase()) ? period.toLowerCase() : 'all';
    const boundedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    let periodSqlFilter = '';
    if (selectedPeriod === 'weekly') {
        periodSqlFilter = "AND pt.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'";
    } else if (selectedPeriod === 'monthly') {
        periodSqlFilter = "AND pt.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'";
    }

    try {
        const boardQuery = `
            SELECT 
                u.id AS user_id,
                u.name AS user_name,
                COALESCE(SUM(pt.points), 0)::integer AS points,
                COUNT(pt.id)::integer AS activities_count,
                MAX(pt.created_at) AS last_active
            FROM users u
            JOIN point_transactions pt ON u.id = pt.user_id
            WHERE 1=1 ${periodSqlFilter}
            GROUP BY u.id, u.name
            HAVING COALESCE(SUM(pt.points), 0) > 0
            ORDER BY points DESC, last_active DESC
            LIMIT $1;
        `;
        const res = await pool.query(boardQuery, [boundedLimit]);

        let currentUserStanding = null;

        const leaders = res.rows.map((row, index) => {
            const pts = parseInt(row.points, 10);
            const isCurrent = Boolean(currentUserId && row.user_id === currentUserId);
            const entry = {
                rank: index + 1,
                name: row.user_name,
                points: pts,
                activitiesCount: parseInt(row.activities_count, 10) || 0,
                rankTier: computeRankTier(pts),
                isCurrentUser: isCurrent
            };
            if (isCurrent) {
                currentUserStanding = {
                    rank: entry.rank,
                    name: entry.name,
                    points: entry.points,
                    activitiesCount: entry.activitiesCount,
                    rankTier: entry.rankTier,
                    isCurrentUser: true
                };
            }
            return entry;
        });

        // Compute current user's specific standing if provided and not already on the board
        if (currentUserId && !currentUserStanding) {
            const userStandingQuery = `
                SELECT 
                    COALESCE(SUM(pt.points), 0)::integer AS points,
                    COUNT(pt.id)::integer AS activities_count
                FROM point_transactions pt
                WHERE pt.user_id = $1 ${periodSqlFilter};
            `;
            const uRes = await pool.query(userStandingQuery, [currentUserId]);
            const uPts = (uRes.rows.length > 0 && parseInt(uRes.rows[0].points, 10)) || 0;

            const posQuery = `
                SELECT COUNT(DISTINCT sub.user_id)::integer AS higher_count
                FROM (
                    SELECT user_id, SUM(points) as pts
                    FROM point_transactions pt
                    WHERE 1=1 ${periodSqlFilter}
                    GROUP BY user_id
                    HAVING SUM(points) > $1
                ) sub;
            `;
            const posRes = await pool.query(posQuery, [uPts]);
            const rankNum = (parseInt(posRes.rows[0].higher_count, 10) || 0) + 1;

            currentUserStanding = {
                rank: rankNum,
                name: 'You',
                points: uPts,
                activitiesCount: (uRes.rows.length > 0 && parseInt(uRes.rows[0].activities_count, 10)) || 0,
                rankTier: computeRankTier(uPts),
                isCurrentUser: true
            };
        }

        return {
            period: selectedPeriod,
            leaderboard: leaders,
            currentUserStanding
        };

    } catch (err) {
        console.warn('⚠️ [Leaderboard Fetch Fallback]:', err.message);
        initDemoTransactions();

        const now = Date.now();
        const sevenDaysAgo = now - (7 * 86400000);
        const thirtyDaysAgo = now - (30 * 86400000);

        // Filter transactions by period
        const filteredTxs = inMemoryPointTransactions.filter(t => {
            if (selectedPeriod === 'all') return true;
            const tTime = (t.created_at instanceof Date ? t.created_at : new Date(t.created_at)).getTime();
            if (selectedPeriod === 'weekly') return tTime >= sevenDaysAgo;
            if (selectedPeriod === 'monthly') return tTime >= thirtyDaysAgo;
            return true;
        });

        // Group points by user
        const userMap = new Map();
        filteredTxs.forEach(t => {
            const uid = t.user_id;
            const pts = parseInt(t.points, 10) || 0;
            const existing = userMap.get(uid) || { points: 0, activitiesCount: 0 };
            existing.points += pts;
            existing.activitiesCount += 1;
            userMap.set(uid, existing);
        });

        // Resolve user names (from DEMO_COMMUNITY_USERS or inMemoryUsers)
        const allKnownUsers = [...DEMO_COMMUNITY_USERS, ...inMemoryUsers];
        const allRanked = [];

        userMap.forEach((data, uid) => {
            if (data.points <= 0) return;
            const foundUser = allKnownUsers.find(u => u.id === uid);
            allRanked.push({
                _internalUserId: uid,
                name: foundUser ? foundUser.name : `Learner #${uid}`,
                points: data.points,
                activitiesCount: data.activitiesCount,
                rankTier: computeRankTier(data.points),
                isCurrentUser: Boolean(currentUserId && uid === currentUserId)
            });
        });

        // Sort descending by points
        allRanked.sort((a, b) => b.points - a.points);
        allRanked.forEach((item, idx) => {
            item.rank = idx + 1;
        });

        const topLeaders = allRanked.slice(0, boundedLimit).map(item => ({
            rank: item.rank,
            name: item.name,
            points: item.points,
            activitiesCount: item.activitiesCount,
            rankTier: item.rankTier,
            isCurrentUser: item.isCurrentUser
        }));

        let currentUserStanding = null;
        if (currentUserId) {
            const inRanked = allRanked.find(u => u._internalUserId === currentUserId);
            if (inRanked) {
                currentUserStanding = {
                    rank: inRanked.rank,
                    name: inRanked.name,
                    points: inRanked.points,
                    activitiesCount: inRanked.activitiesCount,
                    rankTier: inRanked.rankTier,
                    isCurrentUser: true
                };
            } else {
                currentUserStanding = {
                    rank: allRanked.length + 1,
                    name: 'You',
                    points: 0,
                    activitiesCount: 0,
                    rankTier: computeRankTier(0),
                    isCurrentUser: true
                };
            }
        }

        return {
            period: selectedPeriod,
            leaderboard: topLeaders,
            currentUserStanding
        };
    }
}

// In-memory fallback tables for offline resilience when PostgreSQL daemon is unreachable
let inMemoryUserIdCounter = 1;
const inMemoryUsers = [];
const inMemoryProfiles = [];
const inMemoryCourseProgress = [];
const inMemoryActivities = [];
const inMemoryStreaks = [];
const inMemoryFeedback = [];

// Community Learning Resources in-memory stores
let inMemoryResourceIdCounter = 1;
let inMemoryRecIdCounter = 1;
let inMemoryContributorIdCounter = 1;
const inMemoryResources = [];
const inMemoryRecommendations = [];
const inMemoryEarlyContributors = [];
const inMemoryContributorProfiles = [];

function executeInMemoryFallbackQuery(text, params = []) {
    const clean = text.replace(/\s+/g, ' ').trim().toLowerCase();

    // 1a. SELECT FROM users WHERE provider_id = $1 AND auth_provider = $2
    if (clean.includes('from users') && clean.includes('where provider_id =')) {
        const pId = String(params[0]);
        const prov = String(params[1]);
        const user = inMemoryUsers.find(u => u.provider_id === pId && u.auth_provider === prov);
        return { rows: user ? [user] : [] };
    }

    // 1b. SELECT FROM users WHERE email = $1 OR LOWER(email) = LOWER($1)
    if (clean.includes('from users') && (clean.includes('where email =') || clean.includes('where lower(email) ='))) {
        const email = params[0] ? String(params[0]).toLowerCase() : '';
        const user = inMemoryUsers.find(u => u.email && u.email.toLowerCase() === email);
        return { rows: user ? [user] : [] };
    }

    // 1c. UPDATE users (social account linking / avatar)
    if (clean.startsWith('update users set auth_provider')) {
        const provider = params[0];
        const providerId = params[1];
        const avatarUrl = params[2];
        const id = parseInt(params[3], 10);
        const user = inMemoryUsers.find(u => u.id === id);
        if (user) {
            user.auth_provider = provider;
            user.provider_id = providerId;
            if (!user.avatar_url && avatarUrl) user.avatar_url = avatarUrl;
        }
        return { rows: user ? [user] : [] };
    }

    if (clean.startsWith('update users set avatar_url')) {
        const avatarUrl = params[0];
        const id = parseInt(params[1], 10);
        const user = inMemoryUsers.find(u => u.id === id);
        if (user) {
            user.avatar_url = avatarUrl;
        }
        return { rows: user ? [user] : [] };
    }

    // 2. SELECT FROM users WHERE id = $1
    if (clean.includes('from users') && clean.includes('where id =')) {
        const id = parseInt(params[0], 10);
        const user = inMemoryUsers.find(u => u.id === id);
        return { rows: user ? [user] : [] };
    }

    // 3. INSERT INTO users
    if (clean.startsWith('insert into users')) {
        const name = params[0];
        const email = String(params[1]).toLowerCase();
        const password_hash = params[2] || null;
        const auth_provider = params[3] || 'local';
        const provider_id = params[4] || null;
        const avatar_url = params[5] || null;
        const newUser = {
            id: inMemoryUserIdCounter++,
            name,
            email,
            password_hash,
            auth_provider,
            provider_id,
            avatar_url,
            created_at: new Date()
        };
        inMemoryUsers.push(newUser);
        return { rows: [newUser] };
    }

    // 4. SELECT FROM user_profiles
    if (clean.includes('from user_profiles') && clean.includes('where user_id =')) {
        const userId = parseInt(params[0], 10);
        const profile = inMemoryProfiles.find(p => p.user_id === userId);
        return { rows: profile ? [profile] : [] };
    }

    // 5. INSERT / UPSERT INTO user_profiles
    if (clean.startsWith('insert into user_profiles')) {
        const userId = parseInt(params[0], 10);
        const role = params[1];
        const interests = params[2];
        const learning_goal = params[3];
        let profile = inMemoryProfiles.find(p => p.user_id === userId);
        if (profile) {
            profile.role = role;
            profile.interests = interests;
            profile.learning_goal = learning_goal;
            profile.updated_at = new Date();
        } else {
            profile = {
                id: inMemoryProfiles.length + 1,
                user_id: userId,
                role,
                interests,
                learning_goal,
                completed_at: new Date(),
                updated_at: new Date()
            };
            inMemoryProfiles.push(profile);
        }
        return { rows: [profile] };
    }

    // 6. SELECT COUNT FROM courses
    if (clean.includes('select count(*) as total from courses') || clean.includes('select count(*) from courses')) {
        return { rows: [{ total: CURATED_COURSES.length, count: CURATED_COURSES.length }] };
    }

    // 7. SELECT FROM courses
    if (clean.includes('from courses')) {
        let list = CURATED_COURSES;
        const cat = params[0] || params[1];
        if (cat) {
            list = list.filter(c => c.category === cat);
        }
        return { rows: list };
    }

    // 8. SELECT FROM user_course_progress
    if (clean.includes('from user_course_progress')) {
        const userId = parseInt(params[0], 10);
        const userProgress = inMemoryCourseProgress.filter(p => p.user_id === userId);
        const in_progress_count = userProgress.filter(p => p.status === 'in_progress').length;
        const completed_count = userProgress.filter(p => p.status === 'completed').length;
        return {
            rows: [{ in_progress_count, completed_count }]
        };
    }

    // 9. INSERT / UPSERT user_course_progress
    if (clean.startsWith('insert into user_course_progress')) {
        const userId = parseInt(params[0], 10);
        const courseId = params[1];
        const status = params[2];
        let p = inMemoryCourseProgress.find(x => x.user_id === userId && x.course_id === courseId);
        if (p) {
            p.status = status;
            p.updated_at = new Date();
        } else {
            p = {
                id: inMemoryCourseProgress.length + 1,
                user_id: userId,
                course_id: courseId,
                status,
                updated_at: new Date()
            };
            inMemoryCourseProgress.push(p);
        }
        return { rows: [p] };
    }

    // 10. SELECT FROM user_learning_activities
    if (clean.includes('from user_learning_activities')) {
        const userId = parseInt(params[0], 10);
        const userActs = inMemoryActivities.filter(a => a.user_id === userId);
        return { rows: userActs };
    }

    // 11. INSERT user_learning_activities
    if (clean.startsWith('insert into user_learning_activities')) {
        const userId = parseInt(params[0], 10);
        const activity_type = params[1];
        const course_id = params[2];
        const title = params[3];
        const details = params[4];
        const act = {
            id: inMemoryActivities.length + 1,
            user_id: userId,
            activity_type,
            course_id,
            title,
            details,
            activity_date: new Date().toISOString().slice(0, 10),
            created_at: new Date()
        };
        inMemoryActivities.push(act);
        return { rows: [act] };
    }

    // 12. INSERT user_feedback
    if (clean.startsWith('insert into user_feedback')) {
        const userId = params[0] ? parseInt(params[0], 10) : null;
        const user_name = params[1] || 'Anonymous';
        const user_email = params[2] || '';
        const rating = parseInt(params[3], 10) || 5;
        const category = params[4] || 'General Feedback';
        const improvement_topics = params[5] || [];
        const clarity_rating = params[6] || '';
        const feedback_text = params[7] || '';
        const beta_tester_opt_in = Boolean(params[8]);

        const fb = {
            id: inMemoryFeedback.length + 1,
            user_id: userId,
            user_name,
            user_email,
            rating,
            category,
            improvement_topics,
            clarity_rating,
            feedback_text,
            beta_tester_opt_in,
            created_at: new Date()
        };
        inMemoryFeedback.push(fb);
        return { rows: [fb] };
    }

    // 13. INSERT point_transactions
    if (clean.startsWith('insert into point_transactions')) {
        const userId = parseInt(params[0], 10);
        const action_type = params[1];
        const points = parseInt(params[2], 10);
        const reference_id = params[3] || null;
        const description = params[4] || '';
        const activity_id = params[5] || null;

        const tx = {
            id: inMemoryPointTransactions.length + 1000,
            user_id: userId,
            action_type,
            points,
            reference_id,
            description,
            activity_id,
            created_at: new Date()
        };
        inMemoryPointTransactions.push(tx);
        return { rows: [tx] };
    }

    // Default fallback empty result
    return { rows: [] };
}

/**
 * Helper function to execute parameterized SQL queries safely.
 * If PostgreSQL is connected, executes against the pool.
 * If connection fails (e.g. offline dev), routes gracefully to in-memory tables.
 * 
 * @param {string} text - The SQL query text with parameter markers ($1, $2, ...)
 * @param {Array} params - The array of values to bind to the parameter markers
 * @returns {Promise<object>} Query result object from pg or in-memory fallback
 */
async function query(text, params) {
    try {
        return await pool.query(text, params);
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            return executeInMemoryFallbackQuery(text, params);
        }
        throw err;
    }
}

/**
 * Finds an existing user by email or provider_id, or creates a new user if not found.
 * If a user already exists with the same email, securely links the OAuth account.
 * 
 * @param {object} profile
 * @param {string} profile.name
 * @param {string} profile.email
 * @param {string} profile.provider - 'google'
 * @param {string} profile.providerId - Unique identifier from provider
 * @param {string} [profile.avatarUrl]
 * @returns {Promise<object>} Authenticated user record
 */
async function findOrCreateOAuthUser({ name, email, provider, providerId, avatarUrl }) {
    if (!email) {
        throw new Error('Email is required for social authentication');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name ? name.trim() : (cleanEmail.split('@')[0] || 'Learner');

    try {
        // 1. Check if user already exists by provider and providerId
        const existingProviderUser = await query(
            'SELECT id, name, email, auth_provider, provider_id, avatar_url, created_at FROM users WHERE provider_id = $1 AND auth_provider = $2',
            [providerId, provider]
        );

        if (existingProviderUser.rows.length > 0) {
            const user = existingProviderUser.rows[0];
            if (avatarUrl && !user.avatar_url) {
                await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, user.id]).catch(() => {});
                user.avatar_url = avatarUrl;
            }
            return user;
        }

        // 2. Check if user exists with this email (account linking)
        const existingEmailUser = await query(
            'SELECT id, name, email, auth_provider, provider_id, avatar_url, created_at FROM users WHERE LOWER(email) = LOWER($1)',
            [cleanEmail]
        );

        if (existingEmailUser.rows.length > 0) {
            const user = existingEmailUser.rows[0];
            await query(
                'UPDATE users SET auth_provider = $1, provider_id = $2, avatar_url = COALESCE(avatar_url, $3) WHERE id = $4',
                [provider, providerId, avatarUrl || null, user.id]
            );
            user.auth_provider = provider;
            user.provider_id = providerId;
            if (!user.avatar_url && avatarUrl) user.avatar_url = avatarUrl;
            return user;
        }

        // 3. User does not exist; insert new OAuth user without password_hash
        const insertResult = await query(
            `INSERT INTO users (name, email, password_hash, auth_provider, provider_id, avatar_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, email, auth_provider, provider_id, avatar_url, created_at`,
            [cleanName, cleanEmail, null, provider, providerId, avatarUrl || null]
        );

        return insertResult.rows[0];
    } catch (err) {
        console.error('❌ [findOrCreateOAuthUser Error]:', err.message);
        throw err;
    }
}

/**
 * ==========================================================================
 * COMMUNITY LEARNING RESOURCES: DATABASE HELPERS
 * ==========================================================================
 * These helper functions implement atomic transactions, duplicate detection,
 * recommendation tracking, top-3 early contributors, and privacy-protected profiles.
 * ==========================================================================
 */

/**
 * 1. YouTube Video ID Extractor & URL Validator
 * Extracts the unique 11-character video ID from any valid YouTube URL format:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * 
 * @param {string} url - User-provided YouTube link
 * @returns {string|null} 11-character video ID, or null if invalid
 */
function extractYouTubeVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();
    // Regular expression matching all official YouTube URL variations
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i;
    const match = cleanUrl.match(ytRegex);
    return match ? match[1] : null;
}

/**
 * 2. Duplicate Video Detection
 * Checks if a resource with the given YouTube video ID already exists in the database.
 * This ensures that duplicate submissions of the exact same video can be caught early
 * and converted into a recommendation vote instead of creating duplicate records.
 * 
 * @param {string} youtubeVideoId - The 11-character YouTube video ID
 * @returns {Promise<object|null>} Existing resource record or null
 */
async function findResourceByVideoId(youtubeVideoId) {
    if (!youtubeVideoId) return null;
    try {
        const result = await pool.query(
            `SELECT id, youtube_video_id, youtube_url, title, category, topic, description,
                    status, recommendation_count, submitted_by_user_id, created_at, updated_at
             FROM learning_resources
             WHERE youtube_video_id = $1 LIMIT 1;`,
            [youtubeVideoId]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
        // Fallback for offline development when PostgreSQL is not running
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            const found = inMemoryResources.find(r => r.youtube_video_id === youtubeVideoId);
            return found || null;
        }
        throw err;
    }
}

/**
 * 3. Atomic Initial Resource Creation with Submitter's First Recommendation
 * Requirement:
 * - The resource and its first recommendation MUST be created together in one transaction.
 * - Initial recommendation_count is set to 1 because the submitter is also the 1st recommender.
 * - The submitter is recorded as Rank 1 Early Contributor (🥇).
 * - If the submitter provided optional social links, they are saved with their explicit consent setting.
 * 
 * @param {object} params
 * @param {number} params.userId - Authenticated user ID
 * @param {string} params.youtubeVideoId - 11-character video ID
 * @param {string} params.youtubeUrl - Cleaned canonical URL
 * @param {string} params.title - Resource title
 * @param {string} params.category - Subject/category
 * @param {string} params.topic - Topic within category
 * @param {string} params.description - Short summary of what is taught
 * @param {string} [params.reason] - Optional: "Why do you recommend this?"
 * @param {object} [params.socialProfile] - Optional public social media links & opt-in consent
 * @returns {Promise<object>} Created resource record
 */
async function createResourceWithFirstRecommendation({
    userId,
    youtubeVideoId,
    youtubeUrl,
    title,
    category,
    topic,
    description,
    reason = '',
    socialProfile = null
}) {
    if (!userId) throw new Error('User ID is required to submit a resource.');
    if (!youtubeVideoId) throw new Error('Valid YouTube video ID is required.');
    if (!title || !category || !topic || !description) {
        throw new Error('Title, category, topic, and description are required.');
    }

    try {
        const client = await pool.connect();
        try {
            // Start atomic transaction
            await client.query('BEGIN');

            // 1. Insert the new learning resource with recommendation_count = 1
            const resResult = await client.query(
                `INSERT INTO learning_resources (
                    youtube_video_id, youtube_url, title, category, topic, description,
                    status, recommendation_count, submitted_by_user_id
                ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 1, $7)
                RETURNING id, youtube_video_id, youtube_url, title, category, topic, description,
                          status, recommendation_count, submitted_by_user_id, created_at, updated_at;`,
                [youtubeVideoId, youtubeUrl, title.trim(), category.trim(), topic.trim(), description.trim(), userId]
            );
            const newResource = resResult.rows[0];

            // 2. Insert the submitter's first recommendation in the same atomic transaction
            await client.query(
                `INSERT INTO resource_recommendations (resource_id, user_id, reason)
                 VALUES ($1, $2, $3);`,
                [newResource.id, userId, reason ? reason.trim() : null]
            );

            // 3. Record the submitter as Rank 1 Early Contributor (🥇)
            await client.query(
                `INSERT INTO resource_early_contributors (resource_id, user_id, contributor_rank)
                 VALUES ($1, $2, 1);`,
                [newResource.id, userId]
            );

            // 4. Save optional social profile with explicit opt-in privacy consent
            if (socialProfile) {
                const showSocial = Boolean(socialProfile.show_social_links !== undefined ? socialProfile.show_social_links : socialProfile.showSocialLinks);
                await client.query(
                    `INSERT INTO user_contributor_profiles (user_id, instagram, linkedin, github, other, show_social_links, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                     ON CONFLICT (user_id) DO UPDATE SET
                         instagram = COALESCE(EXCLUDED.instagram, user_contributor_profiles.instagram),
                         linkedin = COALESCE(EXCLUDED.linkedin, user_contributor_profiles.linkedin),
                         github = COALESCE(EXCLUDED.github, user_contributor_profiles.github),
                         other = COALESCE(EXCLUDED.other, user_contributor_profiles.other),
                         show_social_links = EXCLUDED.show_social_links,
                         updated_at = CURRENT_TIMESTAMP;`,
                    [
                        userId,
                        socialProfile.instagram ? socialProfile.instagram.trim() : null,
                        socialProfile.linkedin ? socialProfile.linkedin.trim() : null,
                        socialProfile.github ? socialProfile.github.trim() : null,
                        socialProfile.other ? socialProfile.other.trim() : null,
                        showSocial
                    ]
                );
            }

            // Commit atomic transaction
            await client.query('COMMIT');
            return newResource;
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }
    } catch (err) {
        // In-memory fallback for offline development
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            const resource = {
                id: inMemoryResourceIdCounter++,
                youtube_video_id: youtubeVideoId,
                youtube_url: youtubeUrl,
                title: title.trim(),
                category: category.trim(),
                topic: topic.trim(),
                description: description.trim(),
                status: 'pending',
                recommendation_count: 1,
                submitted_by_user_id: userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            inMemoryResources.push(resource);

            inMemoryRecommendations.push({
                id: inMemoryRecIdCounter++,
                resource_id: resource.id,
                user_id: userId,
                reason: reason ? reason.trim() : null,
                created_at: new Date().toISOString()
            });

            inMemoryEarlyContributors.push({
                id: inMemoryContributorIdCounter++,
                resource_id: resource.id,
                user_id: userId,
                contributor_rank: 1,
                created_at: new Date().toISOString()
            });

            if (socialProfile) {
                const showSocial = Boolean(socialProfile.show_social_links !== undefined ? socialProfile.show_social_links : socialProfile.showSocialLinks);
                const existingProf = inMemoryContributorProfiles.find(p => p.user_id === userId);
                if (existingProf) {
                    if (socialProfile.instagram) existingProf.instagram = socialProfile.instagram.trim();
                    if (socialProfile.linkedin) existingProf.linkedin = socialProfile.linkedin.trim();
                    if (socialProfile.github) existingProf.github = socialProfile.github.trim();
                    if (socialProfile.other) existingProf.other = socialProfile.other.trim();
                    existingProf.show_social_links = showSocial;
                    existingProf.updated_at = new Date().toISOString();
                } else {
                    inMemoryContributorProfiles.push({
                        user_id: userId,
                        instagram: socialProfile.instagram ? socialProfile.instagram.trim() : null,
                        linkedin: socialProfile.linkedin ? socialProfile.linkedin.trim() : null,
                        github: socialProfile.github ? socialProfile.github.trim() : null,
                        other: socialProfile.other ? socialProfile.other.trim() : null,
                        show_social_links: showSocial,
                        updated_at: new Date().toISOString()
                    });
                }
            }

            return resource;
        }
        throw err;
    }
}

/**
 * 4. Atomic Recommendation Addition for Existing Resource
 * Requirement:
 * - A user can only recommend a particular resource ONCE.
 * - Recommendation count is incremented on the backend only (never trusted from frontend).
 * - When reaching 100 UNIQUE recommendations, resource status transitions to 'candidate'.
 *   (It does NOT automatically become approved or published).
 * - The first 3 unique recommenders are recorded as early contributors:
 *   Rank 1 = 1st recommender, Rank 2 = 2nd recommender, Rank 3 = 3rd recommender.
 * 
 * @param {object} params
 * @param {number} params.resourceId - Resource ID to recommend
 * @param {number} params.userId - Authenticated user ID
 * @param {string} [params.reason] - Optional recommendation reason
 * @param {object} [params.socialProfile] - Optional contributor social links & opt-in consent
 * @returns {Promise<object>} Result containing recommendation status and updated count
 */
async function recommendExistingResource({
    resourceId,
    userId,
    reason = '',
    socialProfile = null
}) {
    if (!resourceId) throw new Error('Resource ID is required to recommend.');
    if (!userId) throw new Error('User ID is required to recommend.');

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Check if this user has already recommended this resource
            const existingRec = await client.query(
                `SELECT id FROM resource_recommendations
                 WHERE resource_id = $1 AND user_id = $2 LIMIT 1;`,
                [resourceId, userId]
            );

            if (existingRec.rows.length > 0) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    alreadyRecommended: true,
                    message: 'You have already recommended this learning resource.'
                };
            }

            // 2. Insert new recommendation row
            await client.query(
                `INSERT INTO resource_recommendations (resource_id, user_id, reason)
                 VALUES ($1, $2, $3);`,
                [resourceId, userId, reason ? reason.trim() : null]
            );

            // 3. Atomically increment recommendation count on the server
            const updateResult = await client.query(
                `UPDATE learning_resources
                 SET recommendation_count = recommendation_count + 1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1
                 RETURNING id, recommendation_count, status, title;`,
                [resourceId]
            );

            if (updateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                throw new Error('Resource not found.');
            }

            let { recommendation_count: newCount, status: currentStatus, title } = updateResult.rows[0];

            // 4. 100 UNIQUE Recommendations Rule:
            // When reaching 100 unique recommendations, mark as 'candidate' for moderation review.
            // IMPORTANT: It does NOT automatically become approved or published!
            if (newCount >= 100 && currentStatus === 'pending') {
                const statusUpdate = await client.query(
                    `UPDATE learning_resources
                     SET status = 'candidate', updated_at = CURRENT_TIMESTAMP
                     WHERE id = $1
                     RETURNING status;`,
                    [resourceId]
                );
                currentStatus = statusUpdate.rows[0].status;
            }

            // 5. Early Contributors: Check if this user qualifies as Rank 2 or Rank 3
            const userContributorCheck = await client.query(
                `SELECT id FROM resource_early_contributors
                 WHERE resource_id = $1 AND user_id = $2 LIMIT 1;`,
                [resourceId, userId]
            );

            if (userContributorCheck.rows.length === 0) {
                const countContributors = await client.query(
                    `SELECT COUNT(*) AS total FROM resource_early_contributors WHERE resource_id = $1;`,
                    [resourceId]
                );
                const currentRankCount = parseInt(countContributors.rows[0].total, 10);
                if (currentRankCount === 1) {
                    await client.query(
                        `INSERT INTO resource_early_contributors (resource_id, user_id, contributor_rank)
                         VALUES ($1, $2, 2)
                         ON CONFLICT DO NOTHING;`,
                        [resourceId, userId]
                    );
                } else if (currentRankCount === 2) {
                    await client.query(
                        `INSERT INTO resource_early_contributors (resource_id, user_id, contributor_rank)
                         VALUES ($1, $2, 3)
                         ON CONFLICT DO NOTHING;`,
                        [resourceId, userId]
                    );
                }
            }

            // 6. Save optional social profile with opt-in consent if provided
            if (socialProfile) {
                const showSocial = Boolean(socialProfile.show_social_links !== undefined ? socialProfile.show_social_links : socialProfile.showSocialLinks);
                await client.query(
                    `INSERT INTO user_contributor_profiles (user_id, instagram, linkedin, github, other, show_social_links, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                     ON CONFLICT (user_id) DO UPDATE SET
                         instagram = COALESCE(EXCLUDED.instagram, user_contributor_profiles.instagram),
                         linkedin = COALESCE(EXCLUDED.linkedin, user_contributor_profiles.linkedin),
                         github = COALESCE(EXCLUDED.github, user_contributor_profiles.github),
                         other = COALESCE(EXCLUDED.other, user_contributor_profiles.other),
                         show_social_links = EXCLUDED.show_social_links,
                         updated_at = CURRENT_TIMESTAMP;`,
                    [
                        userId,
                        socialProfile.instagram ? socialProfile.instagram.trim() : null,
                        socialProfile.linkedin ? socialProfile.linkedin.trim() : null,
                        socialProfile.github ? socialProfile.github.trim() : null,
                        socialProfile.other ? socialProfile.other.trim() : null,
                        showSocial
                    ]
                );
            }

            await client.query('COMMIT');
            return {
                success: true,
                alreadyRecommended: false,
                recommendationCount: newCount,
                status: currentStatus,
                isCandidate: newCount >= 100,
                message: `Thank you for recommending "${title}"!`
            };
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }
    } catch (err) {
        // In-memory fallback
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            const resource = inMemoryResources.find(r => r.id === parseInt(resourceId, 10));
            if (!resource) throw new Error('Resource not found.');

            const already = inMemoryRecommendations.some(
                rec => rec.resource_id === resource.id && rec.user_id === userId
            );
            if (already) {
                return {
                    success: false,
                    alreadyRecommended: true,
                    message: 'You have already recommended this learning resource.'
                };
            }

            inMemoryRecommendations.push({
                id: inMemoryRecIdCounter++,
                resource_id: resource.id,
                user_id: userId,
                reason: reason ? reason.trim() : null,
                created_at: new Date().toISOString()
            });

            resource.recommendation_count++;
            resource.updated_at = new Date().toISOString();

            if (resource.recommendation_count >= 100 && resource.status === 'pending') {
                resource.status = 'candidate';
            }

            const existingContrib = inMemoryEarlyContributors.some(
                c => c.resource_id === resource.id && c.user_id === userId
            );
            if (!existingContrib) {
                const contribCount = inMemoryEarlyContributors.filter(
                    c => c.resource_id === resource.id
                ).length;
                if (contribCount === 1) {
                    inMemoryEarlyContributors.push({
                        id: inMemoryContributorIdCounter++,
                        resource_id: resource.id,
                        user_id: userId,
                        contributor_rank: 2,
                        created_at: new Date().toISOString()
                    });
                } else if (contribCount === 2) {
                    inMemoryEarlyContributors.push({
                        id: inMemoryContributorIdCounter++,
                        resource_id: resource.id,
                        user_id: userId,
                        contributor_rank: 3,
                        created_at: new Date().toISOString()
                    });
                }
            }

            if (socialProfile) {
                const showSocial = Boolean(socialProfile.show_social_links !== undefined ? socialProfile.show_social_links : socialProfile.showSocialLinks);
                const existingProf = inMemoryContributorProfiles.find(p => p.user_id === userId);
                if (existingProf) {
                    if (socialProfile.instagram) existingProf.instagram = socialProfile.instagram.trim();
                    if (socialProfile.linkedin) existingProf.linkedin = socialProfile.linkedin.trim();
                    if (socialProfile.github) existingProf.github = socialProfile.github.trim();
                    if (socialProfile.other) existingProf.other = socialProfile.other.trim();
                    existingProf.show_social_links = showSocial;
                    existingProf.updated_at = new Date().toISOString();
                } else {
                    inMemoryContributorProfiles.push({
                        user_id: userId,
                        instagram: socialProfile.instagram ? socialProfile.instagram.trim() : null,
                        linkedin: socialProfile.linkedin ? socialProfile.linkedin.trim() : null,
                        github: socialProfile.github ? socialProfile.github.trim() : null,
                        other: socialProfile.other ? socialProfile.other.trim() : null,
                        show_social_links: showSocial,
                        updated_at: new Date().toISOString()
                    });
                }
            }

            return {
                success: true,
                alreadyRecommended: false,
                recommendationCount: resource.recommendation_count,
                status: resource.status,
                isCandidate: resource.recommendation_count >= 100,
                message: `Thank you for recommending "${resource.title}"!`
            };
        }
        throw err;
    }
}

/**
 * 5. Early Contributors Query with Strict Privacy Enforcement
 * Requirement:
 * - Displays the first three UNIQUE users who recommended the resource.
 * - Shows:
 *   🥇 First recommended by: User
 *   🥈 Second recommended by: User
 *   🥉 Third recommended by: User
 * - PRIVACY: NEVER exposes email, password, internal user IDs, or private data.
 * - OPT-IN: Only includes social links if the user explicitly enabled show_social_links.
 * 
 * @param {number} resourceId - The resource ID
 * @returns {Promise<Array>} List of up to 3 early contributor objects
 */
async function getEarlyContributorsForResource(resourceId) {
    try {
        const result = await pool.query(
            `SELECT 
                rec.contributor_rank,
                u.name AS contributor_name,
                COALESCE(cp.show_social_links, FALSE) AS show_social_links,
                CASE WHEN cp.show_social_links = TRUE THEN cp.instagram ELSE NULL END AS instagram,
                CASE WHEN cp.show_social_links = TRUE THEN cp.linkedin ELSE NULL END AS linkedin,
                CASE WHEN cp.show_social_links = TRUE THEN cp.github ELSE NULL END AS github,
                CASE WHEN cp.show_social_links = TRUE THEN cp.other ELSE NULL END AS other
             FROM resource_early_contributors rec
             JOIN users u ON u.id = rec.user_id
             LEFT JOIN user_contributor_profiles cp ON cp.user_id = rec.user_id
             WHERE rec.resource_id = $1
             ORDER BY rec.contributor_rank ASC
             LIMIT 3;`,
            [resourceId]
        );
        return result.rows;
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            const list = inMemoryEarlyContributors
                .filter(c => c.resource_id === parseInt(resourceId, 10))
                .sort((a, b) => a.contributor_rank - b.contributor_rank)
                .slice(0, 3)
                .map(c => {
                    const u = inMemoryUsers.find(user => user.id === c.user_id);
                    const cp = inMemoryContributorProfiles.find(p => p.user_id === c.user_id);
                    const showSocial = cp ? Boolean(cp.show_social_links) : false;
                    return {
                        contributor_rank: c.contributor_rank,
                        contributor_name: u ? u.name : 'Learner',
                        show_social_links: showSocial,
                        instagram: showSocial && cp ? cp.instagram : null,
                        linkedin: showSocial && cp ? cp.linkedin : null,
                        github: showSocial && cp ? cp.github : null,
                        other: showSocial && cp ? cp.other : null
                    };
                });
            return list;
        }
        throw err;
    }
}

/**
 * 6. Community Resources Discovery Query
 * Retrieves resources with filtering, sorting, pagination, and attached top-3 contributors.
 * 
 * Filters:
 * - Category: 'web_dev', 'python', 'ai_ml', 'data_science', 'programming', 'other', or 'all'
 * - Status: 'pending', 'candidate', 'approved', 'published' (default: all non-rejected)
 * 
 * Sorting:
 * - 'most_recommended': highest recommendation count first
 * - 'recently_added': newest resources first
 * - 'community_verified': approved/published first, then candidate, then pending
 * 
 * @param {object} options
 * @returns {Promise<Array>} List of resource records with early contributors
 */
async function getCommunityResources({
    category = 'all',
    sort = 'most_recommended',
    status = null,
    limit = 20,
    offset = 0,
    currentUserId = null
} = {}) {
    const validSorts = ['most_recommended', 'recently_added', 'community_verified'];
    const selectedSort = validSorts.includes(sort) ? sort : 'most_recommended';

    try {
        let sql = `
            SELECT lr.id, lr.youtube_video_id, lr.youtube_url, lr.title, lr.category,
                   lr.topic, lr.description, lr.status, lr.recommendation_count, lr.created_at,
                   u.name AS submitter_name
            FROM learning_resources lr
            JOIN users u ON u.id = lr.submitted_by_user_id
            WHERE 1=1
        `;
        const params = [];

        // Category filter
        if (category && category !== 'all') {
            params.push(category);
            sql += ` AND lr.category = $${params.length}`;
        }

        // Moderation status filter (exclude rejected from public discovery)
        if (status) {
            params.push(status);
            sql += ` AND lr.status = $${params.length}`;
        } else {
            sql += ` AND lr.status != 'rejected'`;
        }

        // Sorting options
        if (selectedSort === 'most_recommended') {
            sql += ` ORDER BY lr.recommendation_count DESC, lr.created_at DESC`;
        } else if (selectedSort === 'recently_added') {
            sql += ` ORDER BY lr.created_at DESC`;
        } else if (selectedSort === 'community_verified') {
            sql += ` ORDER BY CASE 
                        WHEN lr.status IN ('approved', 'published') THEN 1 
                        WHEN lr.status = 'candidate' THEN 2 
                        ELSE 3 
                     END, lr.recommendation_count DESC, lr.created_at DESC`;
        }

        params.push(parseInt(limit, 10) || 20);
        sql += ` LIMIT $${params.length}`;

        params.push(parseInt(offset, 10) || 0);
        sql += ` OFFSET $${params.length};`;

        const resResult = await pool.query(sql, params);
        const resources = resResult.rows;

        // Attach top 3 early contributors and check if current user recommended each
        for (const res of resources) {
            res.early_contributors = await getEarlyContributorsForResource(res.id);
            if (currentUserId) {
                const recCheck = await pool.query(
                    `SELECT id FROM resource_recommendations WHERE resource_id = $1 AND user_id = $2 LIMIT 1;`,
                    [res.id, currentUserId]
                );
                res.has_recommended = recCheck.rows.length > 0;
            } else {
                res.has_recommended = false;
            }
        }

        return resources;
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            let list = [...inMemoryResources];
            if (category && category !== 'all') {
                list = list.filter(r => r.category === category);
            }
            if (status) {
                list = list.filter(r => r.status === status);
            } else {
                list = list.filter(r => r.status !== 'rejected');
            }

            if (selectedSort === 'most_recommended') {
                list.sort((a, b) => b.recommendation_count - a.recommendation_count || new Date(b.created_at) - new Date(a.created_at));
            } else if (selectedSort === 'recently_added') {
                list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (selectedSort === 'community_verified') {
                const getWeight = (s) => (s === 'approved' || s === 'published' ? 1 : s === 'candidate' ? 2 : 3);
                list.sort((a, b) => getWeight(a.status) - getWeight(b.status) || b.recommendation_count - a.recommendation_count);
            }

            const page = list.slice(offset, offset + limit);
            for (const r of page) {
                const submitter = inMemoryUsers.find(u => u.id === r.submitted_by_user_id);
                r.submitter_name = submitter ? submitter.name : 'Learner';
                r.early_contributors = await getEarlyContributorsForResource(r.id);
                if (currentUserId) {
                    r.has_recommended = inMemoryRecommendations.some(
                        rec => rec.resource_id === r.id && rec.user_id === currentUserId
                    );
                } else {
                    r.has_recommended = false;
                }
            }
            return page;
        }
        throw err;
    }
}

/**
 * 7. Single Resource Retrieval by ID
 * 
 * @param {number} resourceId - The resource ID
 * @param {number} [currentUserId] - Optional authenticated user ID to check recommendation state
 * @returns {Promise<object|null>} Resource object with contributors or null
 */
async function getResourceById(resourceId, currentUserId = null) {
    try {
        const result = await pool.query(
            `SELECT lr.id, lr.youtube_video_id, lr.youtube_url, lr.title, lr.category,
                    lr.topic, lr.description, lr.status, lr.recommendation_count, lr.created_at,
                    u.name AS submitter_name
             FROM learning_resources lr
             JOIN users u ON u.id = lr.submitted_by_user_id
             WHERE lr.id = $1 LIMIT 1;`,
            [resourceId]
        );
        if (result.rows.length === 0) return null;
        const resource = result.rows[0];
        resource.early_contributors = await getEarlyContributorsForResource(resource.id);
        if (currentUserId) {
            const recCheck = await pool.query(
                `SELECT id FROM resource_recommendations WHERE resource_id = $1 AND user_id = $2 LIMIT 1;`,
                [resource.id, currentUserId]
            );
            resource.has_recommended = recCheck.rows.length > 0;
        } else {
            resource.has_recommended = false;
        }
        return resource;
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            const resource = inMemoryResources.find(r => r.id === parseInt(resourceId, 10));
            if (!resource) return null;
            const submitter = inMemoryUsers.find(u => u.id === resource.submitted_by_user_id);
            const copy = { ...resource, submitter_name: submitter ? submitter.name : 'Learner' };
            copy.early_contributors = await getEarlyContributorsForResource(copy.id);
            if (currentUserId) {
                copy.has_recommended = inMemoryRecommendations.some(
                    rec => rec.resource_id === copy.id && rec.user_id === currentUserId
                );
            } else {
                copy.has_recommended = false;
            }
            return copy;
        }
        throw err;
    }
}

/**
 * 8. Retrieve Contributor Social Profile & Privacy Settings
 * 
 * @param {number} userId - Authenticated user ID
 * @returns {Promise<object|null>} Contributor profile or null
 */
async function getUserContributorProfile(userId) {
    try {
        const result = await pool.query(
            `SELECT user_id, instagram, linkedin, github, other, show_social_links, updated_at
             FROM user_contributor_profiles
             WHERE user_id = $1 LIMIT 1;`,
            [userId]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            const prof = inMemoryContributorProfiles.find(p => p.user_id === userId);
            return prof || null;
        }
        throw err;
    }
}

/**
 * 9. Update Contributor Social Links & Visibility Consent
 * Allows the learner to update their optional social links and toggle visibility.
 * 
 * @param {number} userId - Authenticated user ID
 * @param {object} profile
 * @returns {Promise<object>} Updated profile
 */
async function updateContributorSocialProfile(userId, { instagram, linkedin, github, other, showSocialLinks, show_social_links }) {
    const showSocial = Boolean(show_social_links !== undefined ? show_social_links : showSocialLinks);
    try {
        const result = await pool.query(
            `INSERT INTO user_contributor_profiles (user_id, instagram, linkedin, github, other, show_social_links, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) DO UPDATE SET
                 instagram = EXCLUDED.instagram,
                 linkedin = EXCLUDED.linkedin,
                 github = EXCLUDED.github,
                 other = EXCLUDED.other,
                 show_social_links = EXCLUDED.show_social_links,
                 updated_at = CURRENT_TIMESTAMP
             RETURNING user_id, instagram, linkedin, github, other, show_social_links, updated_at;`,
            [
                userId,
                instagram ? instagram.trim() : null,
                linkedin ? linkedin.trim() : null,
                github ? github.trim() : null,
                other ? other.trim() : null,
                showSocial
            ]
        );
        return result.rows[0];
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            let prof = inMemoryContributorProfiles.find(p => p.user_id === userId);
            if (prof) {
                prof.instagram = instagram ? instagram.trim() : null;
                prof.linkedin = linkedin ? linkedin.trim() : null;
                prof.github = github ? github.trim() : null;
                prof.other = other ? other.trim() : null;
                prof.show_social_links = showSocial;
                prof.updated_at = new Date().toISOString();
            } else {
                prof = {
                    user_id: userId,
                    instagram: instagram ? instagram.trim() : null,
                    linkedin: linkedin ? linkedin.trim() : null,
                    github: github ? github.trim() : null,
                    other: other ? other.trim() : null,
                    show_social_links: showSocial,
                    updated_at: new Date().toISOString()
                };
                inMemoryContributorProfiles.push(prof);
            }
            return prof;
        }
        throw err;
    }
}

/**
 * 10. Moderation Status Updater
 * Transitions the resource across the 5 approved moderation stages:
 * 'pending' -> 'candidate' -> 'approved' -> 'published' (or 'rejected')
 * 
 * @param {number} resourceId - Resource ID
 * @param {string} newStatus - 'pending' | 'candidate' | 'approved' | 'rejected' | 'published'
 * @returns {Promise<object|null>} Updated resource or null
 */
async function updateResourceModerationStatus(resourceId, newStatus) {
    const validStatuses = ['pending', 'candidate', 'approved', 'rejected', 'published'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: "${newStatus}". Must be one of: ${validStatuses.join(', ')}`);
    }

    try {
        const result = await pool.query(
            `UPDATE learning_resources
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id, title, status, recommendation_count, updated_at;`,
            [newStatus, resourceId]
        );
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || (err.message && err.message.includes('connect'))) {
            const res = inMemoryResources.find(r => r.id === parseInt(resourceId, 10));
            if (!res) return null;
            res.status = newStatus;
            res.updated_at = new Date().toISOString();
            return {
                id: res.id,
                title: res.title,
                status: res.status,
                recommendation_count: res.recommendation_count,
                updated_at: res.updated_at
            };
        }
        throw err;
    }
}

module.exports = {
    pool,
    query,
    initDb,
    computeStreaksFromDates,
    recordLearningActivity,
    getUserStreakAndActivities,
    POINT_SCHEDULE,
    computeRankTier,
    awardPoints,
    getUserGamificationStats,
    getLeaderboard,
    findOrCreateOAuthUser,
    // Community Learning Resources exports
    extractYouTubeVideoId,
    findResourceByVideoId,
    createResourceWithFirstRecommendation,
    recommendExistingResource,
    getEarlyContributorsForResource,
    getCommunityResources,
    getResourceById,
    getUserContributorProfile,
    updateContributorSocialProfile,
    updateResourceModerationStatus
};


