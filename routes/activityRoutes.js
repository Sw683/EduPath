/**
 * ==========================================================================
 * EduPath Learning Activity & Streak Routes
 * ==========================================================================
 * Purpose:
 * Provides endpoints for tracking meaningful learning activities (module completed,
 * quiz completed, course completed, project submitted), calculating authentic daily
 * streaks, preventing duplicate streak inflation, and retrieving recent activity feeds.
 *
 * Security:
 * - All activity and streak routes require authentication via requireAuth.
 * - User identity is strictly derived from req.userId (session), never client parameters.
 * - Input validation guarantees activityType matches whitelisted values.
 * ==========================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const VALID_ACTIVITY_TYPES = [
    'module_completed',
    'quiz_completed',
    'course_completed',
    'project_submitted'
];

/**
 * POST /api/activities
 * Protected route: Records a meaningful learning activity for the authenticated user.
 * Recalculates current and longest streaks based on distinct calendar days.
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const { activityType, courseId, title, details } = req.body;

        // 1. Validate activity type
        if (!activityType || !VALID_ACTIVITY_TYPES.includes(activityType.trim().toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: `Invalid activityType. Allowed types: ${VALID_ACTIVITY_TYPES.join(', ')}.`
            });
        }

        const normalizedType = activityType.trim().toLowerCase();

        // 2. Validate title
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Activity title is required.'
            });
        }

        const cleanTitle = title.trim().slice(0, 255);
        const cleanCourseId = courseId && typeof courseId === 'string' ? courseId.trim().slice(0, 100) : null;
        const cleanDetails = details && typeof details === 'object' ? details : {};

        // 3. Record learning activity with deduplication
        const result = await db.recordLearningActivity(
            req.userId,
            normalizedType,
            cleanCourseId,
            cleanTitle,
            cleanDetails
        );

        // 4. Award verified points according to official point schedule
        // Strictly prevents duplicate and repeated point exploitation
        let pointResult = null;
        try {
            const refId = cleanCourseId || (cleanDetails && (cleanDetails.topic || cleanDetails.courseCategory)) || normalizedType;
            pointResult = await db.awardPoints(
                req.userId,
                normalizedType,
                refId,
                cleanTitle,
                result.activity ? result.activity.id : null
            );
        } catch (ptsErr) {
            console.warn('⚠️ [Points Award Warning]:', ptsErr.message);
        }

        let friendlyMessage = '';
        switch (normalizedType) {
            case 'module_completed':
                friendlyMessage = 'Module completed! +100 points earned.';
                break;
            case 'quiz_completed':
                friendlyMessage = 'Quiz completed! +50 points earned.';
                break;
            case 'course_completed':
                friendlyMessage = 'Congratulations! Course milestone completed! +200 points earned.';
                break;
            case 'project_submitted':
                friendlyMessage = 'Capstone project successfully submitted! +150 points earned.';
                break;
            default:
                friendlyMessage = 'Learning activity recorded.';
        }

        if (pointResult && pointResult.dailyBonusAwarded) {
            friendlyMessage += ' (+10 Daily learning activity bonus awarded!)';
        }

        if (result.isDuplicate) {
            friendlyMessage += ' (Streak activity already counted for today)';
        }

        return res.status(201).json({
            success: true,
            message: friendlyMessage,
            isDuplicate: result.isDuplicate,
            activity: result.activity,
            streaks: result.streaks,
            gamification: {
                awarded: pointResult ? pointResult.awarded : false,
                pointsAwarded: pointResult ? pointResult.pointsAwarded : 0,
                dailyBonusAwarded: pointResult ? pointResult.dailyBonusAwarded : false,
                reason: pointResult ? pointResult.reason : null,
                stats: pointResult ? pointResult.stats : null
            }
        });

    } catch (error) {
        console.error('❌ [Record Activity Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to record learning activity.'
        });
    }
});

/**
 * GET /api/activities/recent
 * Protected route: Returns the authenticated user's recent learning activities.
 */
router.get('/recent', requireAuth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const boundedLimit = Math.min(Math.max(limit, 1), 50);

        const data = await db.getUserStreakAndActivities(req.userId, boundedLimit);

        return res.json({
            success: true,
            count: data.recentActivities.length,
            activities: data.recentActivities,
            streaks: data.streaks
        });
    } catch (error) {
        console.error('❌ [Get Activities Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Could not retrieve learning activities.'
        });
    }
});

/**
 * GET /api/activities/streak
 * Protected route: Returns the authenticated user's current and longest streak stats.
 */
router.get('/streak', requireAuth, async (req, res) => {
    try {
        const data = await db.getUserStreakAndActivities(req.userId, 1);
        return res.json({
            success: true,
            streaks: data.streaks
        });
    } catch (error) {
        console.error('❌ [Get Streak Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Could not retrieve streak metrics.'
        });
    }
});

module.exports = router;
