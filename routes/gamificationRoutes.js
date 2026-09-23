/**
 * ==========================================================================
 * EduPath Gamification & Verified Leaderboard Routes
 * ==========================================================================
 * Purpose:
 * Provides endpoints for retrieving verified leaderboards (All-Time, Monthly, Weekly)
 * and learner gamification stats (Total Points, Rank Tier, Weekly/Monthly Points).
 *
 * Security:
 * - Direct point alteration from the frontend is strictly forbidden.
 * - Points can only ever be awarded through verified server-side learning handlers.
 * - User identification is strictly derived from verified session credentials.
 * ==========================================================================
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/gamification/leaderboard
 * Public route with optional authentication context:
 * Retrieves verified leaderboard rankings filtered by time period ('all', 'monthly', 'weekly').
 * If the requester has an active session, annotates their personal standing.
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const period = req.query.period || 'all';
        const limit = parseInt(req.query.limit, 10) || 10;
        const currentUserId = (req.session && req.session.userId) ? req.session.userId : null;

        const data = await db.getLeaderboard(period, limit, currentUserId);

        // Sanitize public response: Ensure internal database user IDs are strictly excluded
        const sanitizedLeaderboard = (data.leaderboard || []).map(entry => ({
            rank: entry.rank,
            name: entry.name,
            points: entry.points,
            activitiesCount: entry.activitiesCount,
            rankTier: entry.rankTier,
            isCurrentUser: Boolean(entry.isCurrentUser)
        }));

        let sanitizedStanding = null;
        if (data.currentUserStanding) {
            sanitizedStanding = {
                rank: data.currentUserStanding.rank,
                name: data.currentUserStanding.name,
                points: data.currentUserStanding.points,
                activitiesCount: data.currentUserStanding.activitiesCount,
                rankTier: data.currentUserStanding.rankTier,
                isCurrentUser: true
            };
        }

        return res.json({
            success: true,
            period: data.period,
            leaderboard: sanitizedLeaderboard,
            currentUserStanding: sanitizedStanding
        });

    } catch (error) {
        console.error('❌ [Leaderboard Route Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve verified leaderboard.'
        });
    }
});

/**
 * GET /api/gamification/stats
 * Protected route: Returns the authenticated user's verified gamification metrics:
 * - ⭐ Total Points
 * - 🏆 Current Rank (Tier + Leaderboard rank)
 * - 📅 Weekly Points (last 7 days)
 * - 📅 Monthly Points (last 30 days)
 * - 📜 Recent Point Transactions Ledger
 */
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const stats = await db.getUserGamificationStats(req.userId);

        return res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ [Gamification Stats Error]:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve gamification statistics.'
        });
    }
});

/**
 * GET /api/gamification/schedule
 * Public reference endpoint displaying point values for learning milestones.
 */
router.get('/schedule', (req, res) => {
    return res.json({
        success: true,
        pointSchedule: db.POINT_SCHEDULE,
        rules: {
            moduleCompleted: '100 points - awarded once per unique learning module',
            quizCompleted: '50 points - awarded once per topic per calendar day (subsequent attempts count as practice)',
            courseCompleted: '200 points - awarded once per completed course milestone',
            projectSubmitted: '150 points - awarded once per submitted capstone project',
            dailyActivityBonus: '10 points - automatically awarded on the first learning activity of each calendar day'
        }
    });
});

module.exports = router;
