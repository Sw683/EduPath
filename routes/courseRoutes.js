/**
 * ==========================================================================
 * Course & Learning System Routes
 * ==========================================================================
 * Purpose:
 * Provides endpoints for retrieving curated educational courses across
 * Web Development, Python Programming, and AI & Machine Learning, and
 * managing authenticated user progress tracking (not_started, in_progress, completed).
 *
 * Security:
 * - Progress updates require authentication via requireAuth middleware.
 * - User identity is strictly derived from req.userId (session), never client parameters.
 * - All queries use parameterized inputs to prevent SQL injection.
 * ==========================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const VALID_STATUSES = ['not_started', 'in_progress', 'completed'];
const VALID_CATEGORIES = ['web_dev', 'python', 'ai_ml'];

/**
 * Fallback static course list if PostgreSQL is initializing or offline.
 */
const FALLBACK_COURSES = [
    {
        id: 'web-cs50w',
        category: 'web_dev',
        title: "Harvard CS50's Web Programming with Python and JavaScript",
        description: 'Dive deep into modern full-stack web applications with Python, JavaScript, SQL, APIs, and scalable architectural patterns.',
        provider: 'Harvard / CS50',
        url: 'https://cs50.harvard.edu/web/',
        type: 'Interactive University Course',
        difficulty: 'Intermediate',
        status: 'not_started'
    },
    {
        id: 'web-mdn-basics',
        category: 'web_dev',
        title: 'MDN Web Docs: Web Development Curriculum',
        description: 'The definitive open learning guide covering semantic HTML5 structure, responsive modern CSS layouts, and dynamic vanilla JavaScript.',
        provider: 'Official Documentation (Mozilla)',
        url: 'https://developer.mozilla.org/en-US/docs/Learn',
        type: 'Official Documentation & Guides',
        difficulty: 'Beginner',
        status: 'not_started'
    },
    {
        id: 'web-coursera-meta',
        category: 'web_dev',
        title: 'Meta Front-End Developer Professional Certificate',
        description: 'Industry certificate focused on building interactive web interfaces, version control with Git, and component architecture.',
        provider: 'Coursera (Meta)',
        url: 'https://www.coursera.org/professional-certificates/meta-front-end-developer',
        type: 'Accredited Specialization',
        difficulty: 'Beginner',
        status: 'not_started'
    },
    {
        id: 'web-youtube-netninja',
        category: 'web_dev',
        title: 'Modern JavaScript & Web Engineering Roadmaps',
        description: 'Visual code-alongs and practical project walkthroughs explaining DOM manipulation, async functions, APIs, and modern tooling.',
        provider: 'YouTube (The Net Ninja)',
        url: 'https://www.youtube.com/@NetNinja',
        type: 'Video Series & Walkthroughs',
        difficulty: 'Beginner to Intermediate',
        status: 'not_started'
    },
    {
        id: 'py-cs50p',
        category: 'python',
        title: "Harvard CS50's Introduction to Programming with Python (CS50P)",
        description: 'Learn programming fundamentals in Python: functions, variables, conditionals, loops, exceptions, unit tests, and file handling.',
        provider: 'Harvard / CS50',
        url: 'https://cs50.harvard.edu/python/',
        type: 'Interactive University Course',
        difficulty: 'Beginner',
        status: 'not_started'
    },
    {
        id: 'py-coursera-michigan',
        category: 'python',
        title: 'Python for Everybody Specialization',
        description: 'Learn foundational programming concepts, data structures, networked APIs, and relational database operations using Python.',
        provider: 'Coursera (Univ of Michigan)',
        url: 'https://www.coursera.org/specializations/python',
        type: 'Accredited Specialization',
        difficulty: 'Beginner',
        status: 'not_started'
    },
    {
        id: 'py-official-docs',
        category: 'python',
        title: 'Official Python 3 Tutorial & Standard Library Docs',
        description: 'The authoritative reference and tutorial directly from the Python Software Foundation explaining built-in modules and syntax.',
        provider: 'Official Documentation (Python PSF)',
        url: 'https://docs.python.org/3/tutorial/',
        type: 'Official Documentation & Reference',
        difficulty: 'Beginner to Intermediate',
        status: 'not_started'
    },
    {
        id: 'py-youtube-corey',
        category: 'python',
        title: 'Python OOP & Practical Software Engineering',
        description: 'Deep dives into object-oriented Python, classes, virtual environments, decorators, generators, and clean code practices.',
        provider: 'YouTube (Corey Schafer)',
        url: 'https://www.youtube.com/@coreyms',
        type: 'Video Series & Deep Dives',
        difficulty: 'Intermediate',
        status: 'not_started'
    },
    {
        id: 'ai-cs50-ai',
        category: 'ai_ml',
        title: "Harvard CS50's Introduction to Artificial Intelligence with Python",
        description: 'Explore core algorithms and principles of modern AI: graph search, knowledge representation, Bayesian networks, and neural models.',
        provider: 'Harvard / CS50',
        url: 'https://cs50.harvard.edu/ai/',
        type: 'Interactive University Course',
        difficulty: 'Intermediate',
        status: 'not_started'
    },
    {
        id: 'ai-coursera-deeplearning',
        category: 'ai_ml',
        title: 'Machine Learning Specialization by Andrew Ng',
        description: 'World-renowned foundational program teaching supervised learning, regression, classification, decision trees, and neural networks.',
        provider: 'Coursera (DeepLearning.AI)',
        url: 'https://www.coursera.org/specializations/machine-learning-introduction',
        type: 'Master Specialization',
        difficulty: 'Beginner to Intermediate',
        status: 'not_started'
    },
    {
        id: 'ai-google-mlcc',
        category: 'ai_ml',
        title: 'Google Machine Learning Crash Course & Docs',
        description: 'Fast-paced, practical introduction to machine learning featuring video lectures, interactive Colabs, and real-world case studies.',
        provider: 'Official Documentation (Google Developers)',
        url: 'https://developers.google.com/machine-learning/crash-course',
        type: 'Official Documentation & Interactive Tutorials',
        difficulty: 'Intermediate',
        status: 'not_started'
    },
    {
        id: 'ai-youtube-statquest',
        category: 'ai_ml',
        title: 'StatQuest Machine Learning & Neural Network Fundamentals',
        description: 'Visual step-by-step breakdowns of machine learning algorithms, cross-validation, gradient descent, and statistical intuition.',
        provider: 'YouTube (StatQuest with Josh Starmer)',
        url: 'https://www.youtube.com/@statquest',
        type: 'Video Series & Visual Concepts',
        difficulty: 'Beginner',
        status: 'not_started'
    }
];

/**
 * GET /api/courses
 * Retrieves curated courses, optionally filtered by category.
 * If user is authenticated, returns their individual progress status.
 */
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        const normalizedCategory = category ? category.trim().toLowerCase() : null;

        const userId = req.session && req.session.userId ? req.session.userId : null;

        let queryText = '';
        let queryParams = [];

        if (userId) {
            queryText = `
                SELECT c.id, c.category, c.title, c.description, c.provider, c.url, c.type, c.difficulty,
                       COALESCE(p.status, 'not_started') AS status,
                       p.updated_at AS status_updated_at
                FROM courses c
                LEFT JOIN user_course_progress p ON c.id = p.course_id AND p.user_id = $1
                WHERE ($2::varchar IS NULL OR c.category = $2)
                ORDER BY c.category, c.difficulty, c.title;
            `;
            queryParams = [userId, normalizedCategory];
        } else {
            queryText = `
                SELECT c.id, c.category, c.title, c.description, c.provider, c.url, c.type, c.difficulty,
                       'not_started' AS status,
                       NULL AS status_updated_at
                FROM courses c
                WHERE ($1::varchar IS NULL OR c.category = $1)
                ORDER BY c.category, c.difficulty, c.title;
            `;
            queryParams = [normalizedCategory];
        }

        const result = await db.query(queryText, queryParams);

        if (result.rows.length === 0 && !normalizedCategory) {
            // Database empty or not yet seeded; use fallback
            return res.json({
                success: true,
                count: FALLBACK_COURSES.length,
                courses: FALLBACK_COURSES
            });
        }

        return res.json({
            success: true,
            count: result.rows.length,
            courses: result.rows
        });

    } catch (error) {
        console.warn('⚠️ [Courses Fetch Fallback]:', error.message);
        // Fallback gracefully so frontend always displays content
        let filtered = FALLBACK_COURSES;
        if (req.query.category) {
            filtered = filtered.filter(c => c.category === req.query.category.trim().toLowerCase());
        }
        return res.json({
            success: true,
            count: filtered.length,
            courses: filtered
        });
    }
});

/**
 * GET /api/courses/:courseId
 * Retrieves a single course with current progress.
 */
router.get('/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.session && req.session.userId ? req.session.userId : null;

        const result = await db.query(`
            SELECT c.*, COALESCE(p.status, 'not_started') AS status
            FROM courses c
            LEFT JOIN user_course_progress p ON c.id = p.course_id AND p.user_id = $1
            WHERE c.id = $2
        `, [userId, courseId]);

        if (result.rows.length === 0) {
            const fallback = FALLBACK_COURSES.find(c => c.id === courseId);
            if (!fallback) {
                return res.status(404).json({ success: false, error: 'Course not found.' });
            }
            return res.json({ success: true, course: fallback });
        }

        return res.json({ success: true, course: result.rows[0] });

    } catch (error) {
        const fallback = FALLBACK_COURSES.find(c => c.id === req.params.courseId);
        if (fallback) {
            return res.json({ success: true, course: fallback });
        }
        return res.status(500).json({ success: false, error: 'Failed to retrieve course.' });
    }
});

/**
 * PATCH /api/courses/:courseId/progress
 * Updates learning status for a specific course ('not_started', 'in_progress', 'completed').
 * Guarded by requireAuth middleware.
 */
router.patch('/:courseId/progress', requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { status } = req.body;

        // 1. Validate status input
        if (!status || !VALID_STATUSES.includes(status.trim().toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`
            });
        }

        const normalizedStatus = status.trim().toLowerCase();

        // 2. Upsert progress into PostgreSQL
        // Notice: req.userId is extracted from verified session, never trusted from client
        const upsertQuery = `
            INSERT INTO user_course_progress (user_id, course_id, status, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, course_id) DO UPDATE SET
                status = EXCLUDED.status,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, user_id, course_id, status, updated_at;
        `;

        const result = await db.query(upsertQuery, [req.userId, courseId, normalizedStatus]);
        const record = result.rows ? result.rows[0] : { course_id: courseId, status: normalizedStatus, updated_at: new Date() };

        // 3. Automatically record meaningful learning activity & recalculate streaks
        let activityResult = null;
        let pointResult = null;

        if (normalizedStatus === 'completed' || normalizedStatus === 'in_progress') {
            const activityType = normalizedStatus === 'completed' ? 'course_completed' : 'module_completed';
            const courseObj = FALLBACK_COURSES.find(c => c.id === courseId);
            const courseTitle = courseObj ? courseObj.title : `Course: ${courseId}`;
            const actionText = normalizedStatus === 'completed' ? 'Finished Course Milestone' : 'Started Learning Module';

            try {
                activityResult = await db.recordLearningActivity(
                    req.userId,
                    activityType,
                    courseId,
                    `${actionText}: ${courseTitle}`,
                    { status: normalizedStatus, courseCategory: courseObj ? courseObj.category : null }
                );

                // Award verified points according to the gamification schedule
                pointResult = await db.awardPoints(
                    req.userId,
                    activityType,
                    courseId,
                    `${actionText}: ${courseTitle}`,
                    activityResult && activityResult.activity ? activityResult.activity.id : null
                );
            } catch (actErr) {
                console.warn('⚠️ [Auto-record Activity/Points Warning]:', actErr.message);
            }
        }

        let feedbackMsg = `Learning progress updated to "${normalizedStatus.replace('_', ' ')}".`;
        if (pointResult && pointResult.awarded) {
            feedbackMsg += ` +${pointResult.pointsAwarded} points verified!`;
        }

        return res.json({
            success: true,
            message: feedbackMsg,
            progress: {
                courseId: record.course_id,
                status: record.status,
                updatedAt: record.updated_at
            },
            streaks: activityResult ? activityResult.streaks : null,
            gamification: pointResult ? {
                awarded: pointResult.awarded,
                pointsAwarded: pointResult.pointsAwarded,
                dailyBonusAwarded: pointResult.dailyBonusAwarded,
                stats: pointResult.stats
            } : null
        });

    } catch (error) {
        console.error('❌ [Progress Update Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to update course progress in database.'
        });
    }
});

module.exports = router;
