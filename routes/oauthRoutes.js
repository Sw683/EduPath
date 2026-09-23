/**
 * ==========================================================================
 * EduPath OAuth 2.0 Social Authentication Controller
 * ==========================================================================
 * Purpose:
 * Provides secure server-side OAuth 2.0 Authorization Code Grant flows for
 * social identity providers.
 *
 * Current Provider: Google
 *
 * Security Principles:
 * 1. OAuth secrets (GOOGLE_CLIENT_SECRET) never reach client-side scripts.
 * 2. Cryptographic state parameter (32-byte hex) generated per request to
 *    prevent Cross-Site Request Forgery (CSRF).
 * 3. Token exchange is executed strictly backend-to-backend via HTTPS.
 * 4. User profile data is verified against the provider's official userinfo API.
 * 5. Established sessions use HTTP-only, SameSite: lax cookies (connect.sid).
 * ==========================================================================
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

/**
 * Returns true if Google OAuth credentials have been provisioned in .env
 */
function isGoogleOAuthConfigured() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) return false;
    if (clientId.includes('your_google_client_id') || clientSecret.includes('your_google_client_secret')) {
        return false;
    }
    return true;
}

/**
 * Resolves the callback redirect URL for Google OAuth
 */
function getGoogleCallbackUrl(req) {
    if (process.env.GOOGLE_CALLBACK_URL) {
        return process.env.GOOGLE_CALLBACK_URL;
    }
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${protocol}://${host}/api/auth/google/callback`;
}

/**
 * GET /api/auth/google
 * Initiates the Google OAuth 2.0 Authorization Code flow.
 * Generates a unique state token, binds it to req.session, and redirects the user
 * to Google's OAuth consent screen.
 */
router.get('/google', (req, res) => {
    try {
        // 1. Generate cryptographically strong random state token for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        req.session.oauthState = state;
        req.session.oauthProvider = 'google';

        // 2. Determine redirect destination based on whether credentials are configured
        if (!isGoogleOAuthConfigured()) {
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ [Google OAuth] Credentials are not configured in production.');
                return res.redirect('/?error=oauth_unavailable&message=Google+Sign-In+is+currently+unavailable.');
            }

            console.log('ℹ️ [Google OAuth] Running in Development Simulation Mode (credentials placeholder/unconfigured).');
            // Save session before redirecting to simulation callback
            return req.session.save((err) => {
                if (err) {
                    console.error('❌ [OAuth State Save Error]:', err);
                    return res.redirect('/?error=session_error&message=Could+not+initialize+session.');
                }
                const callbackUrl = `/api/auth/google/callback?code=mock_google_auth_code_dev&state=${encodeURIComponent(state)}`;
                return res.redirect(callbackUrl);
            });
        }

        const callbackUrl = getGoogleCallbackUrl(req);
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
        googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', 'openid profile email');
        googleAuthUrl.searchParams.set('state', state);
        googleAuthUrl.searchParams.set('access_type', 'offline');
        googleAuthUrl.searchParams.set('prompt', 'consent');

        return req.session.save((err) => {
            if (err) {
                console.error('❌ [OAuth State Save Error]:', err);
                return res.redirect('/?error=session_error&message=Could+not+initialize+OAuth+session.');
            }
            return res.redirect(googleAuthUrl.toString());
        });

    } catch (error) {
        console.error('❌ [Google OAuth Initiation Error]:', error);
        return res.redirect('/?error=oauth_init_failed&message=Failed+to+start+Google+sign+in.');
    }
});

/**
 * GET /api/auth/google/callback
 * Handles the redirect back from Google with authorization code and state.
 * Validates CSRF state token, exchanges code for access token via back-channel HTTPS,
 * queries Google's UserInfo API, and creates/links the user account.
 */
router.get('/google/callback', async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        // 1. Check if user cancelled or Google returned an error
        if (error) {
            console.warn('⚠️ [Google OAuth User Cancelled or Error]:', error, error_description);
            const msg = encodeURIComponent(error_description || 'Google sign-in was cancelled.');
            return res.redirect(`/?error=oauth_denied&message=${msg}`);
        }

        // 2. Validate state token to prevent CSRF attacks
        const savedState = req.session ? req.session.oauthState : null;
        if (!state || !savedState || state !== savedState) {
            console.warn('⚠️ [Google OAuth CSRF Warning] State mismatch or missing session state.');
            return res.status(403).redirect('/?error=invalid_state&message=Security+check+failed.+Please+try+again.');
        }

        // Clear one-time state token from session
        delete req.session.oauthState;
        delete req.session.oauthProvider;

        // 3. Ensure authorization code exists
        if (!code) {
            return res.redirect('/?error=missing_code&message=No+authorization+code+received+from+Google.');
        }

        let userProfile = null;

        // 4. Token Exchange & Profile Retrieval
        if (code === 'mock_google_auth_code_dev') {
            // Strictly forbid mock simulation in production or when live credentials are set
            if (process.env.NODE_ENV === 'production' || isGoogleOAuthConfigured()) {
                console.warn('⚠️ [Google OAuth] Mock authorization code rejected in production.');
                return res.redirect('/?error=invalid_code&message=Invalid+authorization+code.');
            }
            // Development Simulation Profile
            userProfile = {
                name: 'Google Learner',
                email: 'google.learner@example.com',
                sub: 'google-sub-mock-123456789',
                picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
            };
        } else {
            // Live Google OAuth Token Exchange
            const callbackUrl = getGoogleCallbackUrl(req);

            const tokenParams = new URLSearchParams({
                code: String(code),
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: callbackUrl,
                grant_type: 'authorization_code'
            });

            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: tokenParams.toString()
            });

            if (!tokenResponse.ok) {
                const tokenErrText = await tokenResponse.text();
                console.error('❌ [Google Token Exchange Error]:', tokenResponse.status, tokenErrText);
                return res.redirect('/?error=token_exchange_failed&message=Could+not+verify+Google+credentials.');
            }

            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            if (!accessToken) {
                return res.redirect('/?error=missing_access_token&message=No+access+token+returned+from+Google.');
            }

            // Fetch user info from Google's UserInfo API
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!userInfoResponse.ok) {
                console.error('❌ [Google UserInfo Fetch Error]:', userInfoResponse.status);
                return res.redirect('/?error=userinfo_failed&message=Could+not+fetch+Google+profile.');
            }

            userProfile = await userInfoResponse.json();
        }

        // 5. Verify email is present
        if (!userProfile || !userProfile.email) {
            return res.redirect('/?error=missing_email&message=Google+did+not+provide+an+email+address.');
        }

        // 6. Upsert user in database (link if existing email, or create new)
        const user = await db.findOrCreateOAuthUser({
            name: userProfile.name || userProfile.email.split('@')[0],
            email: userProfile.email,
            provider: 'google',
            providerId: userProfile.sub || userProfile.id || `google-${Date.now()}`,
            avatarUrl: userProfile.picture || null
        });

        // 7. Establish server session
        req.session.userId = user.id;
        req.session.userName = user.name;

        // Save session and redirect to frontend with success parameter
        return req.session.save((err) => {
            if (err) {
                console.error('❌ [Session Save Error after OAuth]:', err);
                return res.redirect('/?error=session_error&message=Could+not+establish+session.');
            }
            console.log(`✅ [Google OAuth Login Success] User ${user.name} (${user.email}) logged in.`);
            return res.redirect('/?auth=google_success');
        });

    } catch (error) {
        console.error('❌ [Google OAuth Callback Exception]:', error);
        return res.redirect('/?error=server_error&message=An+internal+error+occurred+during+Google+sign+in.');
    }
});

module.exports = router;
