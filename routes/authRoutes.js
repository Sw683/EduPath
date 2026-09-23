/**
 * ==========================================================================
 * Authentication & Protected Dashboard Routes
 * ==========================================================================
 * Purpose:
 * Provides endpoints for user registration, authentication, session
 * lifecycle management, and protected dashboard data access.
 *
 * Security:
 * - Passwords are never stored in plain text (hashed with bcrypt, 12 rounds).
 * - Generic error messages prevent user enumeration.
 * - Sensitive database credentials and session secrets are managed via .env.
 * - Endpoints sanitize and validate all incoming inputs.
 * ==========================================================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Rate limiting for authentication endpoints to prevent brute-force & account-creation abuse
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 10, // Max 10 attempts per IP per window
    standardHeaders: true, // Return standard RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    message: {
        success: false,
        error: 'Too many login attempts from this IP. Please try again after 15 minutes.'
    }
});

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1-hour window
    max: 10, // Max 10 account creations per IP per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many account creation attempts from this IP. Please try again after an hour.'
    }
});

// Simple regex for basic email format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/signup
 * Registers a new learner account with name, email, and password.
 */
router.post('/signup', signupLimiter, async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // 1. Validate required fields
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'All fields (name, email, password, confirm password) are required.'
            });
        }

        const trimmedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        // 2. Validate name length
        if (trimmedName.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Name must be at least 2 characters long.'
            });
        }

        // 3. Validate email format
        if (!EMAIL_REGEX.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address.'
            });
        }

        // 4. Validate password length
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters long.'
            });
        }

        // 5. Validate passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords do not match. Please verify your password.'
            });
        }

        // 6. Check if email already exists in database
        const existingUserResult = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [normalizedEmail]
        );

        if (existingUserResult.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'An account with this email already exists. Please log in.'
            });
        }

        // 7. Hash the password securely with bcrypt (12 salt rounds)
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 8. Insert the new user into PostgreSQL
        const insertUserQuery = `
            INSERT INTO users (name, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, name, email, created_at;
        `;
        const result = await db.query(insertUserQuery, [trimmedName, normalizedEmail, passwordHash]);
        const newUser = result.rows[0];

        // 9. Automatically create user session upon successful registration
        req.session.userId = newUser.id;
        req.session.userName = newUser.name;

        return res.status(201).json({
            success: true,
            message: 'Welcome to EduPath! Your account was created successfully.',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('❌ [Signup Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'An internal server error occurred while creating your account.'
        });
    }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and establishes an HTTP-only session.
 */
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate presence of inputs
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please enter both email and password.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 2. Query user by email
        const userResult = await db.query(
            'SELECT id, name, email, password_hash FROM users WHERE email = $1',
            [normalizedEmail]
        );

        // If user not found, return generic message to prevent email enumeration
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password.'
            });
        }

        const user = userResult.rows[0];

        // 3. Compare provided password against stored bcrypt hash
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password.'
            });
        }

        // 4. Establish session on successful password match
        req.session.userId = user.id;
        req.session.userName = user.name;

        // Check if user has already completed the 3-step onboarding
        const profileCheck = await db.query(
            'SELECT id FROM user_profiles WHERE user_id = $1',
            [user.id]
        );
        const hasCompletedOnboarding = profileCheck.rows.length > 0;

        return res.json({
            success: true,
            message: `Welcome back, ${user.name}!`,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            onboardingCompleted: hasCompletedOnboarding
        });

    } catch (error) {
        console.error('❌ [Login Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'An internal server error occurred during login.'
        });
    }
});

/**
 * POST /api/auth/logout
 * Destroys the server session and clears the session cookie.
 */
router.post('/logout', (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: 'Could not log out. Please try again.'
                });
            }
            res.clearCookie('connect.sid');
            return res.json({
                success: true,
                message: 'You have been logged out safely.'
            });
        });
    } else {
        return res.json({
            success: true,
            message: 'No active session.'
        });
    }
});

/**
 * Allowed enum values for onboarding validation
 */
const VALID_ROLES = ['student', 'professional', 'career_switcher', 'hobbyist'];
const VALID_GOALS = ['job', 'projects', 'upskill', 'explore'];
const VALID_INTERESTS = ['web_dev', 'python', 'ai_ml', 'data_science', 'cybersecurity', 'mobile_dev'];

/**
 * POST /api/onboarding
 * Saves or updates onboarding data (role, interests, learning goal) for the authenticated user.
 * Protected by requireAuth middleware.
 */
router.post('/onboarding', requireAuth, async (req, res) => {
    try {
        const { role, interests, learning_goal } = req.body;

        // 1. Validate presence and value of role
        if (!role || typeof role !== 'string' || !VALID_ROLES.includes(role.trim().toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid role selected. Must be one of: ${VALID_ROLES.join(', ')}.`
            });
        }

        // 2. Validate interests array
        if (!Array.isArray(interests) || interests.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please select at least one interest.'
            });
        }

        const sanitizedInterests = interests
            .filter(item => typeof item === 'string')
            .map(item => item.trim().toLowerCase());

        const hasInvalidInterest = sanitizedInterests.some(item => !VALID_INTERESTS.includes(item));
        if (hasInvalidInterest || sanitizedInterests.length === 0) {
            return res.status(400).json({
                success: false,
                error: `Interests contain invalid options. Allowed options: ${VALID_INTERESTS.join(', ')}.`
            });
        }

        // 3. Validate learning goal
        if (!learning_goal || typeof learning_goal !== 'string' || !VALID_GOALS.includes(learning_goal.trim().toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid learning goal selected. Must be one of: ${VALID_GOALS.join(', ')}.`
            });
        }

        const normalizedRole = role.trim().toLowerCase();
        const normalizedGoal = learning_goal.trim().toLowerCase();

        // 4. Parameterized SQL upsert using the verified session userId
        // Zero trust in frontend: req.userId is extracted strictly from req.session.userId by requireAuth
        const upsertQuery = `
            INSERT INTO user_profiles (user_id, role, interests, learning_goal, updated_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) DO UPDATE SET
                role = EXCLUDED.role,
                interests = EXCLUDED.interests,
                learning_goal = EXCLUDED.learning_goal,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, user_id, role, interests, learning_goal, completed_at, updated_at;
        `;

        const result = await db.query(upsertQuery, [
            req.userId,
            normalizedRole,
            sanitizedInterests,
            normalizedGoal
        ]);

        const profile = result.rows[0];

        return res.json({
            success: true,
            message: 'Your learning profile has been saved successfully!',
            profile: {
                role: profile.role,
                interests: profile.interests,
                learningGoal: profile.learning_goal,
                completedAt: profile.completed_at,
                updatedAt: profile.updated_at
            }
        });

    } catch (error) {
        console.error('❌ [Onboarding Save Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save onboarding information.'
        });
    }
});

/**
 * GET /api/onboarding
 * Retrieves the saved onboarding profile for the authenticated user.
 */
router.get('/onboarding', requireAuth, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT role, interests, learning_goal, completed_at, updated_at FROM user_profiles WHERE user_id = $1',
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                completed: false,
                profile: null
            });
        }

        const row = result.rows[0];
        return res.json({
            success: true,
            completed: true,
            profile: {
                role: row.role,
                interests: row.interests,
                learningGoal: row.learning_goal,
                completedAt: row.completed_at,
                updatedAt: row.updated_at
            }
        });
    } catch (error) {
        console.error('❌ [Onboarding Fetch Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve onboarding details.'
        });
    }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user profile and onboarding status.
 */
router.get('/me', async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.json({
            loggedIn: false,
            user: null,
            onboardingCompleted: false
        });
    }

    try {
        const userResult = await db.query(
            'SELECT id, name, email, auth_provider, avatar_url, created_at FROM users WHERE id = $1',
            [req.session.userId]
        );

        if (userResult.rows.length === 0) {
            return res.json({
                loggedIn: false,
                user: null,
                onboardingCompleted: false
            });
        }

        const profileResult = await db.query(
            'SELECT role, interests, learning_goal FROM user_profiles WHERE user_id = $1',
            [req.session.userId]
        );

        const hasProfile = profileResult.rows.length > 0;
        const profile = hasProfile ? profileResult.rows[0] : null;

        return res.json({
            loggedIn: true,
            user: userResult.rows[0],
            onboardingCompleted: hasProfile,
            profile: profile ? {
                role: profile.role,
                interests: profile.interests,
                learningGoal: profile.learning_goal
            } : null
        });
    } catch (error) {
        console.error('❌ [Auth/Me Error]:', error);
        return res.status(500).json({
            loggedIn: false,
            error: 'Failed to verify session.'
        });
    }
});

/**
 * GET /api/dashboard
 * Protected route: Returns personalized learner dashboard data.
 * Guarded by the requireAuth middleware.
 */
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const userResult = await db.query(
            'SELECT id, name, email, auth_provider, avatar_url, created_at FROM users WHERE id = $1',
            [req.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found.'
            });
        }

        const user = userResult.rows[0];

        // Fetch onboarding profile if present
        const profileResult = await db.query(
            'SELECT role, interests, learning_goal, completed_at FROM user_profiles WHERE user_id = $1',
            [req.userId]
        );
        const profile = profileResult.rows[0] || null;

        // Fetch real course progress metrics from user_course_progress
        let inProgressCount = 0;
        let completedCount = 0;
        let totalCourses = 12;

        try {
            const statsResult = await db.query(`
                SELECT
                    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) AS in_progress_count,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_count
                FROM user_course_progress
                WHERE user_id = $1
            `, [req.userId]);

            const totalResult = await db.query('SELECT COUNT(*) AS total FROM courses');
            if (totalResult.rows.length > 0 && parseInt(totalResult.rows[0].total, 10) > 0) {
                totalCourses = parseInt(totalResult.rows[0].total, 10);
            }

            if (statsResult.rows.length > 0) {
                inProgressCount = parseInt(statsResult.rows[0].in_progress_count, 10) || 0;
                completedCount = parseInt(statsResult.rows[0].completed_count, 10) || 0;
            }
        } catch (queryErr) {
            // Keep defaults if table is still initializing
        }

        // Fetch real streak and recent learning activities
        let streakData = {
            streaks: { currentStreak: 0, longestStreak: 0, streakActiveToday: false, lastActivityDate: null },
            recentActivities: []
        };
        try {
            streakData = await db.getUserStreakAndActivities(req.userId, 10);
        } catch (streakErr) {
            console.warn('⚠️ [Dashboard Streak Warning]:', streakErr.message);
        }

        // Fetch verified gamification stats (Total, Weekly, Monthly points, Rank Tier, Leaderboard placement)
        let gamificationStats = {
            totalPoints: 0,
            weeklyPoints: 0,
            monthlyPoints: 0,
            currentRank: db.computeRankTier(0),
            leaderboardPosition: 1,
            recentTransactions: []
        };
        try {
            gamificationStats = await db.getUserGamificationStats(req.userId);
        } catch (gamifyErr) {
            console.warn('⚠️ [Dashboard Gamification Warning]:', gamifyErr.message);
        }

        const calculatedPercent = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

        // Return personalized learner metrics
        return res.json({
            success: true,
            learner: {
                id: user.id,
                name: user.name,
                email: user.email,
                joinedDate: user.created_at,
                currentStreakDays: streakData.streaks.currentStreak,
                currentStreak: streakData.streaks.currentStreak,
                longestStreak: streakData.streaks.longestStreak,
                streakActiveToday: streakData.streaks.streakActiveToday,
                lastActivityDate: streakData.streaks.lastActivityDate,
                overallProgressPercent: calculatedPercent,
                totalPoints: gamificationStats.totalPoints,
                weeklyPoints: gamificationStats.weeklyPoints,
                monthlyPoints: gamificationStats.monthlyPoints,
                currentRank: gamificationStats.currentRank,
                rankTier: gamificationStats.currentRank.title,
                tierRank: gamificationStats.currentRank.badge,
                leaderboardPosition: gamificationStats.leaderboardPosition,
                totalPointsXp: gamificationStats.totalPoints,
                coursesInProgress: inProgressCount,
                coursesCompleted: completedCount,
                totalCourses: totalCourses,
                recentActivities: streakData.recentActivities,
                recentPointTransactions: gamificationStats.recentTransactions,
                profile: profile ? {
                    role: profile.role,
                    interests: profile.interests,
                    learningGoal: profile.learning_goal,
                    completedAt: profile.completed_at
                } : null
            }
        });
    } catch (error) {
        console.error('❌ [Dashboard Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Could not load dashboard data.'
        });
    }
});

/**
 * POST /api/feedback
 * Stores learner feedback and website improvement responses in PostgreSQL.
 * Open to both authenticated users and guests.
 */
router.post('/feedback', async (req, res) => {
    try {
        const {
            rating,
            category,
            improvementTopics,
            clarityRating,
            comments,
            name,
            email,
            betaTesterOptIn
        } = req.body;

        // 1. Validate rating
        const numRating = parseInt(rating, 10);
        if (isNaN(numRating) || numRating < 1 || numRating > 5) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid rating between 1 and 5 stars.'
            });
        }

        // 2. Validate comments
        if (!comments || typeof comments !== 'string' || comments.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please share your thoughts or suggestions in the comments field.'
            });
        }

        const userId = req.session && req.session.userId ? req.session.userId : null;
        let userName = name && typeof name === 'string' ? name.trim().slice(0, 100) : '';
        let userEmail = email && typeof email === 'string' ? email.trim().slice(0, 255) : '';

        // If authenticated and no name/email provided, fill from user session
        if (userId && (!userName || !userEmail)) {
            try {
                const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [userId]);
                if (userRes.rows.length > 0) {
                    if (!userName) userName = userRes.rows[0].name;
                    if (!userEmail) userEmail = userRes.rows[0].email;
                }
            } catch (e) {
                // Keep provided
            }
        }

        const cleanCategory = category && typeof category === 'string' ? category.trim().slice(0, 50) : 'General Feedback';
        const cleanTopics = Array.isArray(improvementTopics) ? improvementTopics.map(t => String(t).slice(0, 80)) : [];
        const cleanClarity = clarityRating && typeof clarityRating === 'string' ? clarityRating.trim().slice(0, 50) : '';
        const cleanComments = comments.trim().slice(0, 2000);
        const cleanOptIn = Boolean(betaTesterOptIn);

        const insertQuery = `
            INSERT INTO user_feedback (
                user_id, user_name, user_email, rating, category,
                improvement_topics, clarity_rating, feedback_text, beta_tester_opt_in
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, rating, category, created_at;
        `;

        const result = await db.query(insertQuery, [
            userId,
            userName || 'Anonymous Learner',
            userEmail,
            numRating,
            cleanCategory,
            cleanTopics,
            cleanClarity,
            cleanComments,
            cleanOptIn
        ]);

        return res.status(201).json({
            success: true,
            message: 'Thank you for your valuable feedback! Your thoughts directly influence our development roadmap.',
            feedbackId: result.rows[0] ? result.rows[0].id : null
        });

    } catch (error) {
        console.error('❌ [Feedback Submission Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to record feedback. Please try again.'
        });
    }
});

module.exports = router;

