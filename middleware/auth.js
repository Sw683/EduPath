/**
 * ==========================================================================
 * Authentication Middleware
 * ==========================================================================
 * Purpose:
 * Guards protected routes by verifying that an active session exists.
 *
 * Security:
 * - Does NOT trust any user_id provided by frontend request bodies or queries.
 * - Relies entirely on the encrypted, HTTP-only server session cookie (req.session.userId).
 * ==========================================================================
 */

function requireAuth(req, res, next) {
    // Verify that the user has an active session created during login/signup
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Please log in to view this content.'
        });
    }

    // Attach verified user ID from the session to the request object
    req.userId = req.session.userId;
    next();
}

module.exports = {
    requireAuth
};
