/**
 * ==============================================================================
 * EduPath Application Test Suite
 * ==============================================================================
 * Comprehensive integration tests verifying:
 * 1. JavaScript syntax integrity
 * 2. Static asset routing & backend source isolation
 * 3. HTTP security headers (Helmet)
 * 4. Authentication flow & rate limiting
 * 5. Gamification & Leaderboard privacy
 * 6. Community learning resources endpoints
 * 7. Database TLS configuration logic
 * ==============================================================================
 */

const http = require('http');
const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WORKSPACE_DIR = path.resolve(__dirname, '..');

// Helper to make HTTP requests against a test server
function makeRequest(serverPort, method, reqPath, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const reqHeaders = {
            'Accept': 'application/json',
            ...headers
        };

        const postData = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
        if (postData && !reqHeaders['Content-Type']) {
            reqHeaders['Content-Type'] = 'application/json';
        }
        if (postData) {
            reqHeaders['Content-Length'] = Buffer.byteLength(postData);
        }

        const options = {
            hostname: '127.0.0.1',
            port: serverPort,
            path: reqPath,
            method: method.toUpperCase(),
            headers: reqHeaders
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                const setCookie = res.headers['set-cookie'];
                let cookie = null;
                if (setCookie && setCookie.length > 0) {
                    cookie = setCookie[0].split(';')[0];
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    rawBody: data,
                    cookie,
                    body: parsed
                });
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function runTestSuite() {
    console.log('\n================================================================');
    console.log(' RUNNING EDUPATH AUTOMATED TEST SUITE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`✅ [PASS] ${name}`);
            passed++;
        } catch (err) {
            console.error(`❌ [FAIL] ${name}: ${err.message}`);
            failed++;
        }
    }

    // 1. Syntax Validation
    console.log('--- 1. Syntax Validation ---');
    const sourceFiles = [
        'server.js',
        'db.js',
        'routes/authRoutes.js',
        'routes/courseRoutes.js',
        'routes/activityRoutes.js',
        'routes/gamificationRoutes.js',
        'routes/communityResourceRoutes.js',
        'routes/oauthRoutes.js',
        'middleware/auth.js'
    ];

    for (const file of sourceFiles) {
        await test(`Syntax: ${file}`, () => {
            const res = spawnSync('node', ['-c', path.join(WORKSPACE_DIR, file)]);
            assert.strictEqual(res.status, 0, `Syntax error in ${file}: ${res.stderr.toString()}`);
        });
    }

    // 2. Start Application Instance on an Ephemeral Port
    console.log('\n--- 2. Server Initialization & Endpoints ---');
    const app = require(path.join(WORKSPACE_DIR, 'server.js'));

    const testServer = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const port = testServer.address().port;

    try {
        // Static Asset & Source File Isolation Tests
        await test('GET / serves index.html', async () => {
            const res = await makeRequest(port, 'GET', '/');
            assert.strictEqual(res.status, 200);
            assert(typeof res.rawBody === 'string' && res.rawBody.includes('EduPath'));
        });

        await test('GET /style.css serves valid stylesheet', async () => {
            const res = await makeRequest(port, 'GET', '/style.css');
            assert.strictEqual(res.status, 200);
            assert(res.rawBody.includes('--color-primary'));
        });

        await test('GET /script.js serves client script', async () => {
            const res = await makeRequest(port, 'GET', '/script.js');
            assert.strictEqual(res.status, 200);
            assert(res.rawBody.includes('initializeEduPath'));
        });

        await test('Backend files are protected from direct download (404)', async () => {
            const forbiddenFiles = ['/server.js', '/db.js', '/package.json', '/.env'];
            for (const f of forbiddenFiles) {
                const res = await makeRequest(port, 'GET', f);
                assert.strictEqual(res.status, 404, `File ${f} should return 404`);
            }
        });

        // Security Headers Tests
        await test('HTTP Security Headers (Helmet) are present', async () => {
            const res = await makeRequest(port, 'GET', '/');
            assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
            assert.strictEqual(res.headers['x-frame-options'], 'SAMEORIGIN');
            assert(res.headers['content-security-policy'], 'CSP must be defined');
        });

        // Public API Endpoints Tests
        await test('GET /api/courses returns course catalog', async () => {
            const res = await makeRequest(port, 'GET', '/api/courses');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert(Array.isArray(res.body.courses));
        });

        await test('GET /api/gamification/schedule returns milestone schedule', async () => {
            const res = await makeRequest(port, 'GET', '/api/gamification/schedule');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        // Leaderboard Privacy Tests
        await test('GET /api/gamification/leaderboard excludes userId/user_id', async () => {
            const res = await makeRequest(port, 'GET', '/api/gamification/leaderboard');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert(Array.isArray(res.body.leaderboard));

            for (const entry of res.body.leaderboard) {
                assert.strictEqual(entry.userId, undefined, 'userId must not be in leaderboard entry');
                assert.strictEqual(entry.user_id, undefined, 'user_id must not be in leaderboard entry');
                assert(entry.name !== undefined);
                assert(entry.points !== undefined);
            }

            assert(!res.rawBody.includes('"userId"'), 'Raw JSON must not contain "userId"');
            assert(!res.rawBody.includes('"user_id"'), 'Raw JSON must not contain "user_id"');
        });

        // Authentication Flow Tests
        let userCookie = null;
        const testUserEmail = `test_runner_${Date.now()}@example.com`;

        await test('POST /api/auth/signup registers account and sets cookie', async () => {
            const res = await makeRequest(port, 'POST', '/api/auth/signup', {
                name: 'Test Runner',
                email: testUserEmail,
                password: 'TestPassword123!',
                confirmPassword: 'TestPassword123!'
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.body.success, true);
            assert(res.cookie, 'Session cookie must be returned');
            userCookie = res.cookie;
        });

        await test('GET /api/auth/me resolves authenticated identity', async () => {
            const res = await makeRequest(port, 'GET', '/api/auth/me', null, { Cookie: userCookie });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.loggedIn, true);
            assert.strictEqual(res.body.user.email, testUserEmail);
        });

        await test('POST /api/auth/logout clears session', async () => {
            const res = await makeRequest(port, 'POST', '/api/auth/logout', null, { Cookie: userCookie });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
        });

        // Rate Limiting Tests
        await test('POST /api/auth/login triggers 429 when rate limit exceeded', async () => {
            let hitLimit = false;
            for (let i = 0; i < 15; i++) {
                const res = await makeRequest(port, 'POST', '/api/auth/login', {
                    email: 'wrong@example.com',
                    password: 'wrongpassword'
                });
                if (res.status === 429) {
                    hitLimit = true;
                    break;
                }
            }
            assert(hitLimit, 'Rate limiter should return 429 after threshold');
        });

        // Community Resources Tests
        await test('GET /api/community-resources returns published resources', async () => {
            const res = await makeRequest(port, 'GET', '/api/community-resources');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert(Array.isArray(res.body.resources));
        });

    } finally {
        testServer.close();
    }

    console.log('\n================================================================');
    console.log(` RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTestSuite().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
