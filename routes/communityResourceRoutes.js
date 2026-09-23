/**
 * ==========================================================================
 * Community Learning Resources Routes
 * ==========================================================================
 * Purpose:
 * Exposes RESTful endpoints for students to recommend educational YouTube videos,
 * discover top community-voted resources, track the top-3 early contributors with
 * strict privacy controls, and enable admin moderation.
 *
 * Security:
 * - Mutating actions require authentication via requireAuth middleware.
 * - User identity is strictly derived from req.userId (session), NEVER from req.body.
 * - All YouTube URLs and user text fields are validated and sanitized on the server.
 * - Moderation status updates are strictly protected by requireAdmin middleware.
 * - No private user data (email, password, internal IDs) is ever exposed.
 * ==========================================================================
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Valid categories allowed for community resources
const VALID_CATEGORIES = ['web_dev', 'python', 'ai_ml', 'data_science', 'programming', 'other'];

// Valid moderation statuses
const VALID_STATUSES = ['pending', 'candidate', 'approved', 'rejected', 'published'];

/**
 * Timing-safe string comparison to prevent side-channel timing attacks
 */
function safeCompareKeys(providedKey, expectedKey) {
    if (!providedKey || !expectedKey) return false;
    if (typeof providedKey !== 'string' || typeof expectedKey !== 'string') return false;

    const bufA = Buffer.from(providedKey);
    const bufB = Buffer.from(expectedKey);

    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Admin Authorization Middleware
 * Ensures only authenticated administrators can change resource moderation status.
 * Accepts either:
 * 1. An active session with isAdmin === true or role === 'admin'
 * 2. A secure x-admin-key header matching the server's ADMIN_KEY configuration (no fallback)
 */
function requireAdmin(req, res, next) {
    const adminKey = req.headers['x-admin-key'];
    const configuredKey = process.env.ADMIN_KEY ? process.env.ADMIN_KEY.trim() : null;

    const isSessionAdmin = Boolean(req.session && (req.session.isAdmin === true || req.session.role === 'admin'));
    // If ADMIN_KEY is not explicitly set in the environment, API-key authentication is completely disabled
    const isApiKeyAdmin = Boolean(configuredKey && safeCompareKeys(adminKey, configuredKey));

    if (isSessionAdmin || isApiKeyAdmin) {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: 'Forbidden: Administrator privileges required to perform moderation actions.'
    });
}

/**
 * Helper to sanitize plain text inputs (trim and length bounds)
 */
function sanitizeText(str, maxLength = 255) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
}

/**
 * ==========================================================================
 * 1. POST /api/community-resources
 * ==========================================================================
 * Suggest a new YouTube educational resource, or increment recommendations if
 * the video has already been submitted by another student (duplicate detection).
 *
 * Auth: Required
 * Status: 201 Created (new resource) | 200 OK (existing resource recommended) | 400 Bad Request | 409 Conflict
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const {
            youtube_url,
            youtubeUrl,
            title,
            category,
            topic,
            description,
            reason,
            social_profile,
            socialProfile
        } = req.body;

        const rawUrl = youtube_url || youtubeUrl;
        let rawSocial = social_profile || socialProfile || null;
        if (rawSocial && typeof rawSocial === 'object') {
            const isOptIn = Boolean(rawSocial.show_social_links !== undefined ? rawSocial.show_social_links : rawSocial.showSocialLinks);
            rawSocial = {
                ...rawSocial,
                showSocialLinks: isOptIn,
                show_social_links: isOptIn
            };
        }

        // 1. Validate YouTube URL
        if (!rawUrl || typeof rawUrl !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'A valid YouTube video URL is required.'
            });
        }

        const videoId = db.extractYouTubeVideoId(rawUrl);
        if (!videoId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid YouTube link. Please provide a standard watch link, youtu.be link, or shorts link.'
            });
        }

        // Canonical clean YouTube URL format
        const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // 2. Check for Duplicate Video in Database
        const existingResource = await db.findResourceByVideoId(videoId);

        if (existingResource) {
            // Video already exists in the system: convert submission into a recommendation vote
            const recResult = await db.recommendExistingResource({
                resourceId: existingResource.id,
                userId: req.userId,
                reason: sanitizeText(reason, 1000),
                socialProfile: rawSocial
            });

            if (recResult.alreadyRecommended) {
                return res.status(409).json({
                    success: false,
                    alreadyRecommended: true,
                    error: 'You have already recommended this learning resource.',
                    resource: existingResource
                });
            }

            return res.status(200).json({
                success: true,
                isNew: false,
                message: `This resource was already suggested by another learner! Your recommendation vote has been added.`,
                resource: {
                    id: existingResource.id,
                    title: existingResource.title,
                    recommendation_count: recResult.recommendationCount,
                    status: recResult.status,
                    isCandidate: recResult.isCandidate
                }
            });
        }

        // 3. Validate Required Fields for New Resource Creation
        const cleanTitle = sanitizeText(title, 255);
        const cleanCategory = sanitizeText(category, 50).toLowerCase();
        const cleanTopic = sanitizeText(topic, 100);
        const cleanDescription = sanitizeText(description, 2000);
        const cleanReason = sanitizeText(reason, 1000);

        if (!cleanTitle || cleanTitle.length < 3) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a descriptive title for this resource (at least 3 characters).'
            });
        }

        if (!cleanCategory || !VALID_CATEGORIES.includes(cleanCategory)) {
            return res.status(400).json({
                success: false,
                error: `Invalid category. Allowed categories: ${VALID_CATEGORIES.join(', ')}.`
            });
        }

        if (!cleanTopic) {
            return res.status(400).json({
                success: false,
                error: 'Please provide the topic or concept taught by this resource.'
            });
        }

        if (!cleanDescription || cleanDescription.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a short description (at least 10 characters) explaining what this video teaches.'
            });
        }

        // 4. Create the Resource Atomically (Sets recommendation_count = 1 and Rank 1 early contributor)
        const newResource = await db.createResourceWithFirstRecommendation({
            userId: req.userId,
            youtubeVideoId: videoId,
            youtubeUrl: canonicalUrl,
            title: cleanTitle,
            category: cleanCategory,
            topic: cleanTopic,
            description: cleanDescription,
            reason: cleanReason,
            socialProfile: rawSocial
        });

        // 5. Fetch early contributor record to return in the response
        const contributors = await db.getEarlyContributorsForResource(newResource.id);
        newResource.early_contributors = contributors;
        newResource.has_recommended = true;

        return res.status(201).json({
            success: true,
            isNew: true,
            message: 'Learning resource suggested successfully! You are honored as the #1 Early Contributor.',
            resource: newResource
        });
    } catch (err) {
        console.error('❌ [POST /api/community-resources Error]:', err.message);
        return res.status(500).json({
            success: false,
            error: 'An unexpected error occurred while submitting the learning resource.'
        });
    }
});

/**
 * ==========================================================================
 * 2. POST /api/community-resources/:id/recommend
 * ==========================================================================
 * Recommend an existing community learning resource.
 *
 * Auth: Required
 * Status: 200 OK | 404 Not Found | 409 Conflict (already recommended)
 */
router.post('/:id/recommend', requireAuth, async (req, res) => {
    try {
        const resourceId = parseInt(req.params.id, 10);
        if (isNaN(resourceId) || resourceId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid resource ID.'
            });
        }

        const { reason, social_profile, socialProfile } = req.body || {};
        let rawSocial = social_profile || socialProfile || null;
        if (rawSocial && typeof rawSocial === 'object') {
            const isOptIn = Boolean(rawSocial.show_social_links !== undefined ? rawSocial.show_social_links : rawSocial.showSocialLinks);
            rawSocial = {
                ...rawSocial,
                showSocialLinks: isOptIn,
                show_social_links: isOptIn
            };
        }

        const result = await db.recommendExistingResource({
            resourceId,
            userId: req.userId,
            reason: sanitizeText(reason, 1000),
            socialProfile: rawSocial
        });

        if (result.alreadyRecommended) {
            return res.status(409).json({
                success: false,
                alreadyRecommended: true,
                error: 'You have already recommended this learning resource.'
            });
        }

        return res.status(200).json({
            success: true,
            message: result.message,
            recommendation_count: result.recommendationCount,
            status: result.status,
            isCandidate: result.isCandidate
        });
    } catch (err) {
        if (err.message && err.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Learning resource not found.'
            });
        }
        console.error('❌ [POST /api/community-resources/:id/recommend Error]:', err.message);
        return res.status(500).json({
            success: false,
            error: 'An unexpected error occurred while recommending the resource.'
        });
    }
});

/**
 * ==========================================================================
 * 3. GET /api/community-resources
 * ==========================================================================
 * Discover community resources with category filters, sorting, and pagination.
 *
 * Query Params:
 * - category: 'all' | 'web_dev' | 'python' | 'ai_ml' | 'data_science' | 'programming' | 'other'
 * - sort: 'most_recommended' | 'recently_added' | 'community_verified'
 * - status: 'pending' | 'candidate' | 'approved' | 'published'
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 *
 * Auth: Public (attaches has_recommended if session exists)
 * Status: 200 OK
 */
router.get('/', async (req, res) => {
    try {
        const { category = 'all', sort = 'most_recommended', status = null, limit = 20, offset = 0 } = req.query;

        const currentUserId = req.session && req.session.userId ? req.session.userId : null;

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const resources = await db.getCommunityResources({
            category: String(category).toLowerCase(),
            sort: String(sort).toLowerCase(),
            status: status ? String(status).toLowerCase() : null,
            limit: safeLimit,
            offset: safeOffset,
            currentUserId
        });

        return res.status(200).json({
            success: true,
            count: resources.length,
            limit: safeLimit,
            offset: safeOffset,
            resources
        });
    } catch (err) {
        console.error('❌ [GET /api/community-resources Error]:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to load community resources.'
        });
    }
});

/**
 * ==========================================================================
 * 4. GET /api/community-resources/my-profile
 * ==========================================================================
 * Retrieve the authenticated learner's contributor profile and privacy preferences.
 * NOTE: Placed BEFORE /:id to prevent route shadowing.
 *
 * Auth: Required
 * Status: 200 OK
 */
router.get('/my-profile', requireAuth, async (req, res) => {
    try {
        const profile = await db.getUserContributorProfile(req.userId);

        return res.status(200).json({
            success: true,
            profile: profile || {
                user_id: req.userId,
                instagram: null,
                linkedin: null,
                github: null,
                other: null,
                show_social_links: false
            }
        });
    } catch (err) {
        console.error('❌ [GET /api/community-resources/my-profile Error]:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve contributor profile.'
        });
    }
});

/**
 * ==========================================================================
 * 5. PUT /api/community-resources/my-profile
 * ==========================================================================
 * Update the authenticated learner's optional contributor social links
 * and toggle public visibility consent.
 * NOTE: Placed BEFORE /:id to prevent route shadowing.
 *
 * Auth: Required
 * Status: 200 OK | 400 Bad Request
 */
router.put('/my-profile', requireAuth, async (req, res) => {
    try {
        const {
            instagram,
            linkedin,
            github,
            other,
            show_social_links,
            showSocialLinks
        } = req.body || {};

        const showConsent = Boolean(show_social_links !== undefined ? show_social_links : showSocialLinks);

        const updatedProfile = await db.updateContributorSocialProfile(req.userId, {
            instagram: sanitizeText(instagram, 150),
            linkedin: sanitizeText(linkedin, 255),
            github: sanitizeText(github, 150),
            other: sanitizeText(other, 255),
            showSocialLinks: showConsent
        });

        return res.status(200).json({
            success: true,
            message: 'Contributor profile updated successfully.',
            profile: updatedProfile
        });
    } catch (err) {
        console.error('❌ [PUT /api/community-resources/my-profile Error]:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to update contributor profile.'
        });
    }
});

/**
 * ==========================================================================
 * 6. GET /api/community-resources/:id
 * ==========================================================================
 * Retrieve a single resource by ID with early contributors and recommendation state.
 *
 * Auth: Public
 * Status: 200 OK | 404 Not Found
 */
router.get('/:id', async (req, res) => {
    try {
        const resourceId = parseInt(req.params.id, 10);
        if (isNaN(resourceId) || resourceId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid resource ID.'
            });
        }

        const currentUserId = req.session && req.session.userId ? req.session.userId : null;
        const resource = await db.getResourceById(resourceId, currentUserId);

        if (!resource) {
            return res.status(404).json({
                success: false,
                error: 'Learning resource not found.'
            });
        }

        return res.status(200).json({
            success: true,
            resource
        });
    } catch (err) {
        console.error('❌ [GET /api/community-resources/:id Error]:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve learning resource.'
        });
    }
});

/**
 * ==========================================================================
 * 7. GET /api/community-resources/:id/contributors
 * ==========================================================================
 * Retrieve the top 3 early contributors for a specific resource.
 * Adheres strictly to user privacy preferences (no email/password/ID exposed;
 * social links only visible if show_social_links is true).
 *
 * Auth: Public
 * Status: 200 OK | 400 Bad Request
 */
router.get('/:id/contributors', async (req, res) => {
    try {
        const resourceId = parseInt(req.params.id, 10);
        if (isNaN(resourceId) || resourceId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid resource ID.'
            });
        }

        const contributors = await db.getEarlyContributorsForResource(resourceId);

        return res.status(200).json({
            success: true,
            resourceId,
            contributors
        });
    } catch (err) {
        console.error('❌ [GET /api/community-resources/:id/contributors Error]:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve early contributors.'
        });
    }
});

/**
 * ==========================================================================
 * 8. PATCH /api/community-resources/:id/status
 * ==========================================================================
 * Admin moderation endpoint to update the review state of a community resource:
 * 'pending' -> 'candidate' -> 'approved' -> 'published' (or 'rejected')
 *
 * Auth: Admin Only (requireAdmin middleware)
 * Status: 200 OK | 400 Bad Request | 403 Forbidden | 404 Not Found
 */
router.patch('/:id/status', requireAdmin, async (req, res) => {
    try {
        const resourceId = parseInt(req.params.id, 10);
        if (isNaN(resourceId) || resourceId <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid resource ID.'
            });
        }

        const { status } = req.body || {};
        const cleanStatus = status ? String(status).trim().toLowerCase() : '';

        if (!cleanStatus || !VALID_STATUSES.includes(cleanStatus)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`
            });
        }

        const updated = await db.updateResourceModerationStatus(resourceId, cleanStatus);

        if (!updated) {
            return res.status(404).json({
                success: false,
                error: 'Learning resource not found.'
            });
        }

        return res.status(200).json({
            success: true,
            message: `Resource status successfully updated to "${cleanStatus}".`,
            resource: updated
        });
    } catch (err) {
        console.error('❌ [PATCH /api/community-resources/:id/status Error]:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Failed to update resource moderation status.'
        });
    }
});

module.exports = router;
