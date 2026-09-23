/**
 * ==========================================================================
 * EduPath - Frontend Interactive Logic
 * ==========================================================================
 * Description:
 * This script provides beginner-friendly, vanilla JavaScript interactions
 * for the EduPath prototype website without any external libraries or backend.
 *
 * Table of Contents:
 * 1. Notification Helper (Lightweight toast notification for learner feedback)
 * 2. Smooth Navigation & Scroll Spy (Smooth anchor links and active tab highlighting)
 * 3. Course Category Interactions (Friendly feedback when exploring subjects)
 * 4. Resource Link Interactions (Safe handling and guidance for study resources)
 * 5. Learning Progress Preview (Prototype-only interactive progress simulation)
 * 6. Auth & Action Placeholders (Gentle notices for upcoming features)
 * 7. Initialization (Attaches all event listeners when the page is loaded)
 * ==========================================================================
 */

/**
 * Displays a temporary, non-intrusive notification banner at the bottom of the screen.
 * 
 * What it does: Creates and displays a feedback box, then automatically removes it after 3.5 seconds.
 * What input it uses: A string message (text to display).
 * What it changes: Temporarily creates and removes a DOM element inside the document body.
 */
function showNotification(message) {
    // Check if an existing notification exists to prevent clutter
    const existingNotification = document.querySelector('.edupath-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create the notification element using pure DOM methods
    const notification = document.createElement('div');
    notification.className = 'edupath-notification';
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.textContent = message;

    // Apply basic inline styles directly to guarantee visibility without altering style.css
    notification.style.position = 'fixed';
    notification.style.bottom = '24px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#1e293b';
    notification.style.color = '#f8fafc';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '10px';
    notification.style.border = '1px solid rgba(99, 102, 241, 0.4)';
    notification.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
    notification.style.fontSize = '0.9rem';
    notification.style.zIndex = '9999';
    notification.style.transition = 'opacity 0.3s ease';
    notification.style.maxWidth = '90%';
    notification.style.textAlign = 'center';

    document.body.appendChild(notification);

    // Auto-remove notification after 3.5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3500);
}

/**
 * Configures smooth scrolling for all internal page navigation links.
 * 
 * What it does: Intercepts clicks on links with '#', finds the matching section, and scrolls smoothly.
 * What input it uses: All anchor elements ('a') whose href attribute begins with '#'.
 * What it changes: The browser window scroll position.
 */
function setupSmoothNavigation() {
    const internalLinks = document.querySelectorAll('a[href^="#"]');

    internalLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const targetId = link.getAttribute('href');

            // Ignore placeholder links that don't point to an actual section ID
            if (!targetId || targetId === '#' || targetId === '#login' || targetId === '#signup') {
                return;
            }

            const targetSection = document.querySelector(targetId);

            // If the targeted element exists on the page, scroll to it smoothly
            if (targetSection) {
                event.preventDefault();
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Keep browser URL hash synchronized for bookmarking and history
                if (window.history && window.history.pushState) {
                    window.history.pushState(null, '', targetId);
                }
            }
        });
    });
}

/**
 * Highlights navigation links when their corresponding section is in view.
 * 
 * What it does: Watches which section is currently on screen and updates the .active class on the navbar link.
 * What input it uses: All <section> elements that have an id, #footer-contact, and all .nav-link elements.
 * What it changes: Adds or removes the 'active' class and 'aria-current' attribute on matching navigation links.
 */
function setupScrollSpy() {
    const sections = document.querySelectorAll('main > section[id], #footer-contact');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!('IntersectionObserver' in window) || sections.length === 0) {
        return;
    }

    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const activeId = entry.target.getAttribute('id');

                navLinks.forEach((link) => {
                    const linkHref = link.getAttribute('href');
                    if (linkHref === `#${activeId}`) {
                        link.classList.add('active');
                        link.setAttribute('aria-current', 'page');
                    } else {
                        link.classList.remove('active');
                        link.removeAttribute('aria-current');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach((section) => {
        sectionObserver.observe(section);
    });
}

/**
 * Handles interactions for the Learning Category cards.
 * 
 * What it does: Informs the student about the selected category track and guides them to resources.
 * What input it uses: '.btn-card-explore' buttons inside category cards.
 * What it changes: Displays a helpful guidance notification.
 */
function setupCourseCategoryInteractions() {
    const exploreButtons = document.querySelectorAll('.btn-card-explore');

    exploreButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            // Find the category title from the parent card
            const card = button.closest('.category-card');
            const cardTitleElement = card ? card.querySelector('.card-title') : null;
            const categoryName = cardTitleElement ? cardTitleElement.textContent.trim() : 'this category';

            // Show friendly feedback for the learner
            showNotification(`Exploring "${categoryName}". Check out the recommended study resources below!`);
        });
    });
}

/**
 * Handles external resource links with safe opening and helpful hints.
 * 
 * What it does: Ensures external educational links open safely in a new tab and gives quick learner guidance.
 * What input it uses: '.btn-resource-visit' and '.btn-resource-info' links.
 * What it changes: Opens verified external resources safely and shows educational hints.
 */
function setupResourceInteractions() {
    // "Visit Resource" buttons
    const resourceLinks = document.querySelectorAll('.btn-resource-visit');
    resourceLinks.forEach((link) => {
        link.addEventListener('click', () => {
            const card = link.closest('.resource-card');
            const resourceNameElement = card ? card.querySelector('.resource-name') : null;
            const resourceName = resourceNameElement ? resourceNameElement.textContent.trim() : 'resource';

            showNotification(`Opening ${resourceName} in a new tab. Happy studying!`);
        });
    });

    // "Learn More" buttons
    const infoButtons = document.querySelectorAll('.btn-resource-info');
    infoButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            const whySection = document.getElementById('why-edupath');
            if (whySection) {
                whySection.scrollIntoView({ behavior: 'smooth' });
                showNotification('Learn how EduPath helps you organize external study materials!');
            }
        });
    });
}

/**
 * Simulates a frontend-only gamification progress update.
 * 
 * What it does: Allows beginners to click the progress preview card to simulate completing a lesson.
 * What input it uses: Clicks on '.progress-preview-card'.
 * What it changes: Updates the completion percentage, progress bar width, and points (prototype only).
 */
function setupProgressPreviewInteraction() {
    const progressCard = document.querySelector('.progress-preview-card');
    if (!progressCard) {
        return;
    }

    // Prototype demo state values (Stored only in browser memory, no backend)
    let currentPercent = 68;
    let currentPoints = 1450;
    let currentStreak = 7;

    // Make the card visually indicate it can be clicked for a demo
    progressCard.style.cursor = 'pointer';
    progressCard.setAttribute('title', 'Click to simulate completing a practice lesson! (Prototype Preview)');

    progressCard.addEventListener('click', () => {
        // Increment progress for demonstration
        if (currentPercent < 100) {
            currentPercent += 8;
            currentPoints += 50;
        } else {
            // Reset back to base state when full
            currentPercent = 68;
            currentPoints = 1450;
        }

        // Update progress bar fill width and ARIA attributes
        const progressBarFill = progressCard.querySelector('.progress-bar-fill');
        const progressBarContainer = progressCard.querySelector('.progress-bar-container');
        if (progressBarFill) {
            progressBarFill.style.width = `${currentPercent}%`;
        }
        if (progressBarContainer) {
            progressBarContainer.setAttribute('aria-valuenow', currentPercent);
        }

        // Update metric labels
        const metricValues = progressCard.querySelectorAll('.metric-value');
        if (metricValues.length >= 3) {
            // Metric 2 is the progress percentage
            metricValues[1].textContent = `${currentPercent}% Completed`;
            // Metric 3 is points
            metricValues[2].textContent = `${currentPoints.toLocaleString()} XP`;
        }

        showNotification(`[Prototype Demo] Lesson completed! Progress: ${currentPercent}% | Points: ${currentPoints} XP`);
    });
}

/**
 * ==========================================================================
 * Authentication Controller (Frontend Fetch & Session Management)
 * ==========================================================================
 */

/**
 * Sets up the accessible modal dialog and tab switching between Login and Sign Up.
 */
function setupAuthModal() {
    const modal = document.getElementById('auth-modal');
    const navLoginBtn = document.getElementById('nav-login-btn');
    const navSignupBtn = document.getElementById('nav-signup-btn');
    const closeBtn = document.getElementById('auth-modal-close');
    const tabLoginBtn = document.getElementById('tab-login-btn');
    const tabSignupBtn = document.getElementById('tab-signup-btn');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error-banner');
    const signupError = document.getElementById('signup-error-banner');

    if (!modal) return;

    function switchToTab(tabName) {
        if (loginError) loginError.classList.add('hidden');
        if (signupError) signupError.classList.add('hidden');

        if (tabName === 'login') {
            tabLoginBtn.classList.add('active');
            tabLoginBtn.setAttribute('aria-selected', 'true');
            tabSignupBtn.classList.remove('active');
            tabSignupBtn.setAttribute('aria-selected', 'false');
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            tabSignupBtn.classList.add('active');
            tabSignupBtn.setAttribute('aria-selected', 'true');
            tabLoginBtn.classList.remove('active');
            tabLoginBtn.setAttribute('aria-selected', 'false');
            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    }

    if (navLoginBtn) {
        navLoginBtn.addEventListener('click', () => {
            switchToTab('login');
            modal.showModal();
        });
    }

    if (navSignupBtn) {
        navSignupBtn.addEventListener('click', () => {
            switchToTab('signup');
            modal.showModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.close();
        });
    }

    if (tabLoginBtn) tabLoginBtn.addEventListener('click', () => switchToTab('login'));
    if (tabSignupBtn) tabSignupBtn.addEventListener('click', () => switchToTab('signup'));

    // Close when clicking dialog backdrop
    modal.addEventListener('click', (event) => {
        const rect = modal.getBoundingClientRect();
        const isInDialog = (
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
            modal.close();
        }
    });
}

/**
 * Handles form submissions for Login and Sign Up with server-side API integration.
 */
function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error-banner');
    const signupError = document.getElementById('signup-error-banner');
    const modal = document.getElementById('auth-modal');

    // 1. Handle Login Form Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (loginError) loginError.classList.add('hidden');

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const submitBtn = document.getElementById('login-submit-btn');

            if (!email || !password) {
                if (loginError) {
                    loginError.textContent = 'Please provide both your email and password.';
                    loginError.classList.remove('hidden');
                }
                return;
            }

            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (loginError) {
                        loginError.textContent = data.error || 'Invalid credentials.';
                        loginError.classList.remove('hidden');
                    }
                    return;
                }

                // Successful login
                loginForm.reset();
                if (modal) modal.close();
                updateAuthState(data.user, data.onboardingCompleted);
                showNotification(data.message || 'Logged in successfully!');

            } catch (err) {
                if (loginError) {
                    loginError.textContent = 'Unable to connect to the authentication server. Please ensure the backend is running.';
                    loginError.classList.remove('hidden');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    // 2. Handle Sign Up Form Submit
    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (signupError) signupError.classList.add('hidden');

            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            const submitBtn = document.getElementById('signup-submit-btn');

            // Client-side quick validation checks
            if (!name || !email || !password || !confirmPassword) {
                if (signupError) {
                    signupError.textContent = 'All registration fields are required.';
                    signupError.classList.remove('hidden');
                }
                return;
            }

            if (password.length < 8) {
                if (signupError) {
                    signupError.textContent = 'Password must be at least 8 characters long.';
                    signupError.classList.remove('hidden');
                }
                return;
            }

            if (password !== confirmPassword) {
                if (signupError) {
                    signupError.textContent = 'Passwords do not match. Please verify.';
                    signupError.classList.remove('hidden');
                }
                return;
            }

            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name, email, password, confirmPassword })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (signupError) {
                        signupError.textContent = data.error || 'Failed to create account.';
                        signupError.classList.remove('hidden');
                    }
                    return;
                }

                // Successful signup
                signupForm.reset();
                if (modal) modal.close();
                // Brand new user has not completed 3-step onboarding yet
                updateAuthState(data.user, false);
                showNotification(data.message || 'Account created successfully!');

            } catch (err) {
                if (signupError) {
                    signupError.textContent = 'Unable to connect to the authentication server. Please ensure the backend is running.';
                    signupError.classList.remove('hidden');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
}

/**
 * Handles user logout by invalidating the HTTP-only session cookie.
 */
function setupLogout() {
    const logoutBtn = document.getElementById('nav-logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                const data = await response.json();
                updateAuthState(null);
                showNotification(data.message || 'You have been logged out.');
            } catch (err) {
                showNotification('Could not complete logout request.');
            }
        });
    }
}

/**
 * Checks for an existing user session or OAuth redirect callback parameters
 * when the page initially loads.
 */
async function checkAuthSession() {
    // 1. Process OAuth redirect parameters if returning from Google OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const authError = urlParams.get('error');

    if (authStatus === 'google_success') {
        showNotification('🎉 Successfully signed in with Google! Welcome to EduPath.');
        // Clean URL cleanly without triggering page reload
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authError) {
        const errorMsg = urlParams.get('message') || 'Authentication failed. Please try again.';
        showNotification(`⚠️ Google Sign-In: ${decodeURIComponent(errorMsg)}`);
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.loggedIn && data.user) {
                updateAuthState(data.user, data.onboardingCompleted);
            }
        }
    } catch (err) {
        // Backend offline; keep in guest state
    }
}

let currentUser = null;

/**
 * Updates UI state across navbar and dashboard based on login status.
 */
function updateAuthState(user, onboardingCompleted) {
    currentUser = user;
    const loginBtn = document.getElementById('nav-login-btn');
    const signupBtn = document.getElementById('nav-signup-btn');
    const userGreeting = document.getElementById('user-greeting');
    const greetingUsername = document.getElementById('greeting-username');
    const dashboardProfileCard = document.getElementById('dashboard-profile-card');
    const dashboardActivityCard = document.getElementById('dashboard-activity-card');

    if (user) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (signupBtn) signupBtn.classList.add('hidden');
        if (userGreeting) userGreeting.classList.remove('hidden');
        if (greetingUsername) greetingUsername.textContent = `👋 Hi, ${user.name}`;
        if (dashboardActivityCard) dashboardActivityCard.classList.remove('hidden');

        // Fetch and populate protected dashboard data
        loadProtectedDashboard();

        // If onboarding has not been completed, prompt the user with the 3-step onboarding modal
        if (onboardingCompleted === false) {
            openOnboardingModal();
        }
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (signupBtn) signupBtn.classList.remove('hidden');
        if (userGreeting) userGreeting.classList.add('hidden');
        if (dashboardProfileCard) dashboardProfileCard.classList.add('hidden');
        if (dashboardActivityCard) dashboardActivityCard.classList.add('hidden');
    }

    // Pre-populate feedback inputs if user is logged in
    const fbNameInput = document.getElementById('feedback-name-input');
    const fbEmailInput = document.getElementById('feedback-email-input');
    if (user) {
        if (fbNameInput && !fbNameInput.value) fbNameInput.value = user.name;
        if (fbEmailInput && !fbEmailInput.value) fbEmailInput.value = user.email;
    }

    // Refresh courses with the updated user authentication status
    loadCourses(currentCourseCategory, currentCourseStatus);

    // Refresh community resources with the updated user authentication status
    if (typeof loadCommunityResources === 'function') {
        loadCommunityResources();
    }
}

/**
 * Human-readable label maps for role, goal, and tech interests
 */
const ROLE_LABELS = {
    'student': '🎓 Student',
    'professional': '💼 Working Professional',
    'career_switcher': '🔄 Career Switcher',
    'hobbyist': '💡 Self-Taught / Hobbyist'
};

const GOAL_LABELS = {
    'job': '💼 Land a Tech Job / Internship',
    'projects': '🚀 Build Real-World Projects',
    'upskill': '📈 Upskill for Current Career',
    'explore': '💡 Learn Coding for Fun & Curiosity'
};

const INTEREST_LABELS = {
    'web_dev': '🌐 Web Development',
    'python': '🐍 Python Programming',
    'ai_ml': '🤖 AI & Machine Learning',
    'data_science': '📊 Data Science & Analytics',
    'cybersecurity': '🔒 Cybersecurity',
    'mobile_dev': '📱 Mobile App Development'
};

/**
 * Renders the authenticated user's onboarding profile on the dashboard card.
 */
function renderDashboardProfile(profile) {
    const card = document.getElementById('dashboard-profile-card');
    const roleDisplay = document.getElementById('profile-role-display');
    const goalDisplay = document.getElementById('profile-goal-display');
    const interestsDisplay = document.getElementById('profile-interests-display');

    if (!card) return;

    if (profile) {
        card.classList.remove('hidden');
        if (roleDisplay) roleDisplay.textContent = ROLE_LABELS[profile.role] || profile.role;
        if (goalDisplay) goalDisplay.textContent = GOAL_LABELS[profile.learningGoal] || profile.learningGoal;

        if (interestsDisplay && Array.isArray(profile.interests)) {
            interestsDisplay.innerHTML = '';
            profile.interests.forEach(key => {
                const tag = document.createElement('span');
                tag.className = 'profile-tag';
                tag.textContent = INTEREST_LABELS[key] || key;
                interestsDisplay.appendChild(tag);
            });
        }
    } else {
        card.classList.remove('hidden');
        if (roleDisplay) roleDisplay.textContent = 'Not set yet';
        if (goalDisplay) goalDisplay.textContent = 'Not set yet';
        if (interestsDisplay) {
            interestsDisplay.innerHTML = '<span class="profile-tag" style="background: rgba(255,255,255,0.05); color: var(--color-text-muted);">Complete onboarding to see your customized topics</span>';
        }
    }
}

/**
 * Renders verified learning activities on the Recent Activity timeline.
 */
function renderRecentActivities(activities) {
    const feedContainer = document.getElementById('activity-feed-list');
    if (!feedContainer) return;

    if (!activities || activities.length === 0) {
        feedContainer.innerHTML = `
            <div class="activity-empty-state">
                <div class="activity-empty-icon">🌱</div>
                <div class="activity-empty-text">No recent learning activities yet.</div>
                <div class="activity-empty-hint">Complete a course module, take a quick quiz, or submit a project to ignite your streak!</div>
            </div>
        `;
        return;
    }

    const activityConfig = {
        'module_completed': { icon: '📝', badge: 'Module', badgeClass: 'activity-badge-module' },
        'quiz_completed': { icon: '🧠', badge: 'Quiz', badgeClass: 'activity-badge-quiz' },
        'course_completed': { icon: '🎓', badge: 'Course Milestone', badgeClass: 'activity-badge-course' },
        'project_submitted': { icon: '🚀', badge: 'Capstone Project', badgeClass: 'activity-badge-project' }
    };

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const html = activities.map(act => {
        const type = act.activity_type || act.activityType || 'module_completed';
        const cfg = activityConfig[type] || { icon: '⭐', badge: 'Milestone', badgeClass: 'activity-badge-module' };
        const title = escapeHtml(act.title || 'Learning Milestone');
        const courseTitle = act.course_title ? `From: ${escapeHtml(act.course_title)}` : '';

        let dateLabel = 'Today';
        const rawDate = act.activity_date || act.activityDate;
        if (rawDate) {
            const dateStr = String(rawDate).slice(0, 10);
            if (dateStr === todayStr) {
                dateLabel = 'Today';
            } else if (dateStr === yesterdayStr) {
                dateLabel = 'Yesterday';
            } else {
                dateLabel = dateStr;
            }
        }

        return `
            <div class="activity-feed-item">
                <div class="activity-item-main">
                    <span class="activity-feed-icon">${cfg.icon}</span>
                    <div class="activity-feed-content">
                        <strong class="activity-feed-title">${title}</strong>
                        ${courseTitle ? `<span class="activity-feed-sub">${courseTitle}</span>` : ''}
                    </div>
                </div>
                <div class="activity-item-aside">
                    <span class="activity-type-badge ${cfg.badgeClass}">${cfg.badge}</span>
                    <span class="activity-feed-date">${dateLabel}</span>
                </div>
            </div>
        `;
    }).join('');

    feedContainer.innerHTML = html;
}

/**
 * Loads and displays data from the protected /api/dashboard endpoint.
 */
async function loadProtectedDashboard() {
    try {
        const response = await fetch('/api/dashboard', {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.learner) {
                const progressSection = document.getElementById('progress-preview');
                if (progressSection) {
                    const tag = progressSection.querySelector('#dashboard-section-tag') || progressSection.querySelector('.section-tag');
                    if (tag) {
                        tag.textContent = `Personalized Dashboard: ${data.learner.name}`;
                    }
                }

                // 1. Update streak metrics
                const streakEl = document.getElementById('dashboard-streak-value');
                const longestStreakEl = document.getElementById('dashboard-longest-streak-value');
                const streakStatusTag = document.getElementById('dashboard-streak-status-tag');

                const currentStreak = data.learner.currentStreak !== undefined ? data.learner.currentStreak : (data.learner.currentStreakDays || 0);
                const longestStreak = data.learner.longestStreak !== undefined ? data.learner.longestStreak : currentStreak;

                if (streakEl) streakEl.textContent = `${currentStreak} ${currentStreak === 1 ? 'Day' : 'Days'} Active`;
                if (longestStreakEl) longestStreakEl.textContent = `⚡ Longest: ${longestStreak} ${longestStreak === 1 ? 'Day' : 'Days'}`;

                if (streakStatusTag) {
                    if (data.learner.streakActiveToday) {
                        streakStatusTag.textContent = '✅ Active Today';
                        streakStatusTag.className = 'streak-status-tag active';
                    } else {
                        streakStatusTag.textContent = '⏳ Activity Needed Today';
                        streakStatusTag.className = 'streak-status-tag pending';
                    }
                }

                // 2. Update Course Progress & Breakdown
                const progressValEl = document.getElementById('dashboard-progress-value');
                const progressFillEl = document.getElementById('dashboard-progress-fill');
                const coursesCountLabel = document.getElementById('dashboard-courses-count-label');
                const inProgressCountEl = document.getElementById('dashboard-in-progress-count');
                const completedCountEl = document.getElementById('dashboard-completed-count');

                const inProgress = data.learner.coursesInProgress || 0;
                const completed = data.learner.coursesCompleted || 0;
                const total = data.learner.totalCourses || 12;

                if (coursesCountLabel) coursesCountLabel.textContent = `${completed} of ${total} Completed`;
                if (inProgressCountEl) inProgressCountEl.textContent = `${inProgress} In Progress`;
                if (completedCountEl) completedCountEl.textContent = `${completed} Completed`;
                if (progressValEl) progressValEl.textContent = `${data.learner.overallProgressPercent}% Completed`;
                
                if (progressFillEl) {
                    progressFillEl.style.width = `${data.learner.overallProgressPercent}%`;
                    const container = progressFillEl.parentElement;
                    if (container) container.setAttribute('aria-valuenow', data.learner.overallProgressPercent);
                }

                // 3. Update Points & Rank (Verified Gamification System)
                const totalPointsEl = document.getElementById('dashboard-total-points-value');
                const weeklyBadge = document.getElementById('dashboard-weekly-points-badge');
                const monthlyBadge = document.getElementById('dashboard-monthly-points-badge');
                const rankTierEl = document.getElementById('dashboard-rank-tier-value');
                const rankTierPill = document.getElementById('dashboard-rank-tier-pill');
                const leaderboardPosEl = document.getElementById('dashboard-leaderboard-pos');

                const totalPts = data.learner.totalPoints !== undefined ? data.learner.totalPoints : (data.learner.totalPointsXp || 0);
                const weeklyPts = data.learner.weeklyPoints !== undefined ? data.learner.weeklyPoints : 0;
                const monthlyPts = data.learner.monthlyPoints !== undefined ? data.learner.monthlyPoints : 0;
                const rankInfo = data.learner.currentRank || { title: data.learner.rankTier || 'Novice', badge: data.learner.tierRank || '🌱 Novice', rankNumber: 'Tier V' };
                const rankPos = data.learner.leaderboardPosition || 1;

                if (totalPointsEl) totalPointsEl.textContent = `${totalPts} ⭐`;
                if (weeklyBadge) weeklyBadge.textContent = `📅 Week: ${weeklyPts} pts`;
                if (monthlyBadge) monthlyBadge.textContent = `📅 Month: ${monthlyPts} pts`;
                if (rankTierEl) rankTierEl.textContent = rankInfo.badge || rankInfo.title;
                if (rankTierPill) rankTierPill.textContent = rankInfo.rankNumber || 'Tier V';
                if (leaderboardPosEl) leaderboardPosEl.textContent = `#${rankPos} Leaderboard`;

                // 4. Render customized profile info
                renderDashboardProfile(data.learner.profile);

                // 5. Render recent learning activities
                renderRecentActivities(data.learner.recentActivities);

                // 6. Refresh Leaderboard display
                if (typeof loadLeaderboard === 'function') {
                    loadLeaderboard(currentLeaderboardPeriod);
                }
            }
        }
    } catch (err) {
        console.warn('Dashboard data could not be fetched:', err);
    }
}

// ==========================================================================
// COURSES & LEARNING SYSTEM LOGIC
// ==========================================================================
let currentCourseCategory = 'all';
let currentCourseStatus = 'all';
let allLoadedCourses = [];

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function loadCourses(category = 'all', status = 'all') {
    currentCourseCategory = category;
    currentCourseStatus = status;

    const grid = document.getElementById('courses-grid');
    if (!grid) return;

    try {
        let url = '/api/courses';
        if (category !== 'all') {
            url += `?category=${encodeURIComponent(category)}`;
        }

        const response = await fetch(url, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed with status: ${response.status}`);
        }

        const data = await response.json();
        allLoadedCourses = data.courses || [];

        renderCourseCards(allLoadedCourses, status);

    } catch (err) {
        console.warn('Could not load courses from backend:', err);
        grid.innerHTML = `
            <div class="courses-empty-state">
                <p>⚠️ Unable to fetch courses right now. Please verify server connection.</p>
            </div>
        `;
    }
}

function renderCourseCards(courses, statusFilter) {
    const grid = document.getElementById('courses-grid');
    if (!grid) return;

    let filtered = courses;
    if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="courses-empty-state">
                <p>🔍 No courses match your selected filter. Try choosing "All Topics" or "All Statuses".</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(course => {
        const safeTitle = escapeHtml(course.title);
        const safeDesc = escapeHtml(course.description);
        const safeProvider = escapeHtml(course.provider);
        const safeType = escapeHtml(course.type);
        const safeUrl = escapeHtml(course.url);
        const diffClass = `difficulty-${(course.difficulty || 'beginner').toLowerCase()}`;

        return `
            <article class="course-module-card status-${course.status}" data-id="${course.id}" data-category="${course.category}">
                <div class="course-card-top">
                    <div class="course-badges-row">
                        <span class="course-provider-badge">${safeProvider}</span>
                        <span class="course-difficulty-badge ${diffClass}">${course.difficulty}</span>
                    </div>
                    <h3 class="course-module-title">${safeTitle}</h3>
                    <span class="course-type-pill">📚 ${safeType}</span>
                    <p class="course-module-desc">${safeDesc}</p>
                </div>
                <div class="course-card-bottom">
                    <div class="course-status-control">
                        <label class="status-control-label" for="status-${course.id}">Status:</label>
                        <select class="course-status-select" id="status-${course.id}" data-course-id="${course.id}" data-prev-status="${course.status}">
                            <option value="not_started" ${course.status === 'not_started' ? 'selected' : ''}>⭕ Not Started</option>
                            <option value="in_progress" ${course.status === 'in_progress' ? 'selected' : ''}>⏳ In Progress</option>
                            <option value="completed" ${course.status === 'completed' ? 'selected' : ''}>✅ Completed</option>
                        </select>
                    </div>
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="btn-course-visit" title="Open verified resource in new tab">
                        Go to Resource ↗
                    </a>
                </div>
            </article>
        `;
    }).join('');

    // Attach status select change listeners
    const selects = grid.querySelectorAll('.course-status-select');
    selects.forEach(select => {
        select.addEventListener('change', async () => {
            const courseId = select.getAttribute('data-course-id');
            const prevStatus = select.getAttribute('data-prev-status') || 'not_started';
            const newStatus = select.value;

            if (!currentUser) {
                // Not authenticated; prompt to log in and restore selector
                select.value = prevStatus;
                const authModal = document.getElementById('auth-modal');
                if (authModal && typeof authModal.showModal === 'function') {
                    authModal.showModal();
                }
                showNotification('🔒 Please login or sign up to save your course learning progress!');
                return;
            }

            // User is authenticated; send progress update
            try {
                select.disabled = true;
                const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/progress`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ status: newStatus })
                });

                const resData = await res.json();

                if (!res.ok) {
                    select.value = prevStatus;
                    showNotification(resData.error || 'Failed to update course status.');
                    return;
                }

                // Update card visual status class
                select.setAttribute('data-prev-status', newStatus);
                const card = select.closest('.course-module-card');
                if (card) {
                    card.classList.remove('status-not_started', 'status-in_progress', 'status-completed');
                    card.classList.add(`status-${newStatus}`);
                }

                showNotification(resData.message || `Course status updated to ${newStatus.replace('_', ' ')}.`);

                // Update local model
                const item = allLoadedCourses.find(c => c.id === courseId);
                if (item) item.status = newStatus;

                // Refresh dashboard stats live
                loadProtectedDashboard();

            } catch (err) {
                select.value = prevStatus;
                showNotification('Network error while updating progress. Please try again.');
            } finally {
                select.disabled = false;
            }
        });
    });
}

function setupCoursesSystem() {
    // 1. Initial courses load
    loadCourses('all', 'all');

    // 2. Category filter buttons
    const catButtons = document.querySelectorAll('.btn-course-filter');
    catButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            catButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            const category = btn.getAttribute('data-category') || 'all';
            loadCourses(category, currentCourseStatus);
        });
    });

    // 3. Status filter buttons
    const statusButtons = document.querySelectorAll('.btn-status-filter');
    statusButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            statusButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const status = btn.getAttribute('data-status') || 'all';
            currentCourseStatus = status;
            renderCourseCards(allLoadedCourses, status);
        });
    });

    // 4. Explore Category clicks in Section 3
    const exploreButtons = document.querySelectorAll('.btn-card-explore[data-category-target]');
    exploreButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetCat = btn.getAttribute('data-category-target');
            if (targetCat) {
                const matchingTab = document.querySelector(`.btn-course-filter[data-category="${targetCat}"]`);
                if (matchingTab) {
                    catButtons.forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-selected', 'false');
                    });
                    matchingTab.classList.add('active');
                    matchingTab.setAttribute('aria-selected', 'true');
                }
                loadCourses(targetCat, currentCourseStatus);
            }
        });
    });
}

/**
 * Current active step within the 3-step onboarding flow (1, 2, or 3).
 */
let currentOnboardingStep = 1;

/**
 * Shows the target onboarding step pane and updates step indicators and action buttons.
 */
function showOnboardingStep(stepNumber) {
    currentOnboardingStep = stepNumber;
    const modal = document.getElementById('onboarding-modal');
    if (!modal) return;

    // 1. Update step indicator styling
    const indicators = modal.querySelectorAll('.onboarding-step-indicator');
    indicators.forEach(ind => {
        const step = parseInt(ind.getAttribute('data-step'), 10);
        if (step === stepNumber) {
            ind.classList.add('active');
        } else {
            ind.classList.remove('active');
        }
    });

    // 2. Toggle panes
    const panes = [
        document.getElementById('onboarding-step-1'),
        document.getElementById('onboarding-step-2'),
        document.getElementById('onboarding-step-3')
    ];

    panes.forEach((pane, idx) => {
        if (pane) {
            if (idx + 1 === stepNumber) {
                pane.classList.remove('hidden');
            } else {
                pane.classList.add('hidden');
            }
        }
    });

    // 3. Update action buttons
    const prevBtn = document.getElementById('onboarding-prev-btn');
    const nextBtn = document.getElementById('onboarding-next-btn');
    const submitBtn = document.getElementById('onboarding-submit-btn');
    const errorBanner = document.getElementById('onboarding-error-banner');

    if (errorBanner) {
        errorBanner.classList.add('hidden');
        errorBanner.textContent = '';
    }

    if (prevBtn) {
        if (stepNumber === 1) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }
    }

    if (nextBtn && submitBtn) {
        if (stepNumber === 3) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
    }
}

/**
 * Opens the 3-step onboarding dialog modal starting at step 1.
 */
function openOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    if (modal) {
        showOnboardingStep(1);
        if (typeof modal.showModal === 'function') {
            modal.showModal();
        }
    }
}

/**
 * Sets up all event listeners for the 3-step onboarding modal.
 */
function setupOnboardingModal() {
    const modal = document.getElementById('onboarding-modal');
    const closeBtn = document.getElementById('onboarding-modal-close');
    const prevBtn = document.getElementById('onboarding-prev-btn');
    const nextBtn = document.getElementById('onboarding-next-btn');
    const submitBtn = document.getElementById('onboarding-submit-btn');
    const editBtn = document.getElementById('btn-edit-onboarding');
    const errorBanner = document.getElementById('onboarding-error-banner');

    if (!modal) return;

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.close();
        });
    }

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openOnboardingModal();
        });
    }

    // Close when clicking the semi-transparent dialog backdrop
    modal.addEventListener('click', (e) => {
        const rect = modal.getBoundingClientRect();
        const isInDialog = (
            rect.top <= e.clientY &&
            e.clientY <= rect.top + rect.height &&
            rect.left <= e.clientX &&
            e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
            modal.close();
        }
    });

    // Handle "Back" navigation
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentOnboardingStep > 1) {
                showOnboardingStep(currentOnboardingStep - 1);
            }
        });
    }

    // Handle "Continue" navigation with validation per step
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentOnboardingStep === 1) {
                const roleChecked = document.querySelector('input[name="user_role"]:checked');
                if (!roleChecked) {
                    if (errorBanner) {
                        errorBanner.textContent = 'Please select a role to continue.';
                        errorBanner.classList.remove('hidden');
                    }
                    return;
                }
                showOnboardingStep(2);
            } else if (currentOnboardingStep === 2) {
                const interestsChecked = document.querySelectorAll('input[name="user_interests"]:checked');
                if (interestsChecked.length === 0) {
                    if (errorBanner) {
                        errorBanner.textContent = 'Please select at least one topic you are interested in.';
                        errorBanner.classList.remove('hidden');
                    }
                    return;
                }
                showOnboardingStep(3);
            }
        });
    }

    // Handle final submission of onboarding data
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const roleEl = document.querySelector('input[name="user_role"]:checked');
            const goalEl = document.querySelector('input[name="learning_goal"]:checked');
            const interestEls = document.querySelectorAll('input[name="user_interests"]:checked');

            const role = roleEl ? roleEl.value : null;
            const learning_goal = goalEl ? goalEl.value : null;
            const interests = Array.from(interestEls).map(el => el.value);

            if (!role || !learning_goal || interests.length === 0) {
                if (errorBanner) {
                    errorBanner.textContent = 'Please complete all steps before saving.';
                    errorBanner.classList.remove('hidden');
                }
                return;
            }

            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving profile...';

            try {
                // Send request with session cookie credentials
                // Notice: No user_id is passed; the server identifies the user strictly via session
                const response = await fetch('/api/onboarding', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ role, interests, learning_goal })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (errorBanner) {
                        errorBanner.textContent = data.error || 'Failed to save learning profile.';
                        errorBanner.classList.remove('hidden');
                    }
                    return;
                }

                // Success
                modal.close();
                showNotification(data.message || 'Learning profile saved successfully!');
                loadProtectedDashboard();

            } catch (err) {
                if (errorBanner) {
                    errorBanner.textContent = 'Unable to connect to the server. Please check your connection.';
                    errorBanner.classList.remove('hidden');
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
}

/**
 * Handles topic preference filtering for the News Nexus section.
 * 
 * What it does: Shows or hides news cards based on the selected category (All, Tech, Gaming, Politics, Science).
 * What input it uses: '.btn-topic-filter' buttons and '.news-card' elements.
 * What it changes: Toggles the '.hidden' class on cards and updates button active/selected state.
 */
function setupNewsFilter() {
    const filterButtons = document.querySelectorAll('.btn-topic-filter');
    const newsCards = document.querySelectorAll('.news-card');

    if (filterButtons.length === 0 || newsCards.length === 0) {
        return;
    }

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            // Update active state on filter buttons
            filterButtons.forEach((btn) => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });

            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');

            const selectedCategory = button.getAttribute('data-category');

            // Filter news cards according to chosen topic
            let visibleCount = 0;
            newsCards.forEach((card) => {
                const cardCategory = card.getAttribute('data-category');
                if (selectedCategory === 'all' || cardCategory === selectedCategory) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });

            showNotification(`Showing ${visibleCount} articles for "${button.textContent.trim()}".`);
        });
    });
}

/**
 * Simulates an auto-updating news feed tracking top searched current topics.
 * 
 * What it does: Periodically (and on button click) refreshes the feed timestamp and gives feedback.
 * What input it uses: '#news-refresh-btn' and '#news-update-timestamp'.
 * What it changes: Updates the timestamp text and triggers an update toast.
 */
function setupNewsAutoUpdate() {
    const refreshBtn = document.getElementById('news-refresh-btn');
    const timestampElement = document.getElementById('news-update-timestamp');

    function refreshNewsFeed(manual = false) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (timestampElement) {
            timestampElement.textContent = `Updated at ${timeString}`;
        }

        if (manual) {
            showNotification('🔄 [News Nexus] Live feed updated! Top searched stories refreshed.');
        }
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshNewsFeed(true);
        });
    }

    // Auto-update simulation every 60 seconds
    setInterval(() => {
        refreshNewsFeed(false);
    }, 60000);
}

/**
 * Handles clicking "Knowledge Takeaway" buttons on news cards.
 * 
 * What it does: Gives learners a concise summary of what knowledge to gain from each article.
 * What input it uses: '.btn-news-takeaway' elements and their data attributes.
 * What it changes: Displays a friendly educational takeaway popup.
 */
function setupNewsTakeaways() {
    const takeawayButtons = document.querySelectorAll('.btn-news-takeaway');

    takeawayButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const title = button.getAttribute('data-title') || 'Knowledge Takeaway';
            const takeaway = button.getAttribute('data-takeaway') || 'Keep exploring and expanding your knowledge!';

            showNotification(`💡 [${title}]: ${takeaway}`);
        });
    });
}

// ==========================================================================
// KNOWLEDGE CHECK QUIZ & CAPSTONE PROJECT SUBMISSION (Streak Boosters)
// ==========================================================================

const QUIZ_BANKS = {
    'web_dev': {
        name: 'Web Development',
        questions: [
            {
                q: "Which HTML5 semantic element is intended for self-contained, independently distributable content?",
                options: ["<article>", "<section>", "<div>", "<aside>"],
                answer: 0
            },
            {
                q: "In modern CSS layouts, which declaration achieves responsive columns without media queries?",
                options: ["grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))", "display: flex; flex-direction: column", "float: left; width: 33%", "position: absolute; left: 0"],
                answer: 0
            },
            {
                q: "What does calling the JavaScript fetch() function return?",
                options: ["A Promise that resolves to a Response object", "A JSON object directly", "An XMLHttpRequest instance", "A synchronized buffer"],
                answer: 0
            }
        ]
    },
    'python': {
        name: 'Python Programming',
        questions: [
            {
                q: "Which of the following built-in collection types in Python is immutable?",
                options: ["Tuple", "List", "Dictionary", "Set"],
                answer: 0
            },
            {
                q: "What is the primary role of a Python virtual environment (venv)?",
                options: ["To isolate project-specific dependencies and prevent global conflicts", "To compile Python into native assembly", "To optimize multi-threaded CPU speed", "To enforce PEP 8 indentation"],
                answer: 0
            },
            {
                q: "Which keyword creates an iterator/generator function in Python?",
                options: ["yield", "return", "generate", "lambda"],
                answer: 0
            }
        ]
    },
    'ai_ml': {
        name: 'AI & Machine Learning',
        questions: [
            {
                q: "What is the primary goal of Supervised Machine Learning?",
                options: ["To learn a mapping function from input features to known target outputs", "To cluster unlabelled datasets without guidance", "To reward an agent through trial-and-error actions", "To compress weights without loss"],
                answer: 0
            },
            {
                q: "Which optimization algorithm is standard for minimizing loss functions in neural models?",
                options: ["Gradient Descent / Adam", "Binary Search", "Dijkstra's Algorithm", "Random Sampling"],
                answer: 0
            },
            {
                q: "What issue arises when a model achieves near 100% training accuracy but fails on test data?",
                options: ["Overfitting", "Underfitting", "Data Drift", "Quantization"],
                answer: 0
            }
        ]
    }
};

let currentQuizTopic = 'web_dev';

function setupQuizModal() {
    const modal = document.getElementById('quiz-modal');
    const openBtn = document.getElementById('btn-open-quiz');
    const closeBtn = document.getElementById('quiz-modal-close');
    const topicButtons = document.querySelectorAll('.btn-quiz-topic');
    const questionsContainer = document.getElementById('quiz-questions-container');
    const quizForm = document.getElementById('quiz-form');
    const resultBanner = document.getElementById('quiz-result-banner');
    const submitBtn = document.getElementById('quiz-submit-btn');

    if (!modal) return;

    function renderQuestions(topicKey) {
        currentQuizTopic = topicKey;
        const topic = QUIZ_BANKS[topicKey];
        if (!topic || !questionsContainer) return;

        if (resultBanner) {
            resultBanner.classList.add('hidden');
            resultBanner.textContent = '';
        }

        const html = topic.questions.map((item, qIdx) => `
            <div class="quiz-question-card">
                <h4 class="quiz-question-title">${qIdx + 1}. ${escapeHtml(item.q)}</h4>
                <div class="quiz-options-list">
                    ${item.options.map((opt, optIdx) => `
                        <label class="quiz-option-label">
                            <input type="radio" name="quiz_q_${qIdx}" value="${optIdx}" required>
                            <span>${escapeHtml(opt)}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `).join('');

        questionsContainer.innerHTML = html;
    }

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (!currentUser) {
                const authModal = document.getElementById('auth-modal');
                if (authModal) authModal.showModal();
                showNotification('🔒 Please log in or sign up to take quizzes and build your daily streak!');
                return;
            }
            renderQuestions(currentQuizTopic);
            modal.showModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.close());
    }

    topicButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            topicButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const topic = btn.getAttribute('data-topic') || 'web_dev';
            renderQuestions(topic);
        });
    });

    if (quizForm) {
        quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const topic = QUIZ_BANKS[currentQuizTopic];
            if (!topic) return;

            let score = 0;
            const total = topic.questions.length;

            topic.questions.forEach((q, idx) => {
                const selected = quizForm.querySelector(`input[name="quiz_q_${idx}"]:checked`);
                if (selected && parseInt(selected.value, 10) === q.answer) {
                    score++;
                }
            });

            const originalText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving activity...';
            }

            try {
                const response = await fetch('/api/activities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        activityType: 'quiz_completed',
                        courseId: currentQuizTopic === 'web_dev' ? 'web-cs50w' : currentQuizTopic === 'python' ? 'py-cs50p' : 'ai-cs50-ai',
                        title: `Completed ${topic.name} Knowledge Check (${score}/${total})`,
                        details: { topic: currentQuizTopic, score, total }
                    })
                });

                const data = await response.json();

                if (resultBanner) {
                    resultBanner.className = 'quiz-result-banner success';
                    resultBanner.textContent = `🎯 Scored ${score}/${total} (${Math.round((score/total)*100)}%)! Milestone recorded for your daily streak.`;
                    resultBanner.classList.remove('hidden');
                }

                showNotification(`🎉 Knowledge Check completed! Current streak: ${data.streaks ? data.streaks.currentStreak : 1} days.`);
                loadProtectedDashboard();

                setTimeout(() => {
                    modal.close();
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }, 1600);

            } catch (err) {
                showNotification('Could not save quiz activity. Please check your connection.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }
}

function setupProjectModal() {
    const modal = document.getElementById('project-modal');
    const openBtn = document.getElementById('btn-open-project');
    const closeBtn = document.getElementById('project-modal-close');
    const form = document.getElementById('project-form');
    const errorBanner = document.getElementById('project-error-banner');
    const submitBtn = document.getElementById('project-submit-btn');

    if (!modal) return;

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (!currentUser) {
                const authModal = document.getElementById('auth-modal');
                if (authModal) authModal.showModal();
                showNotification('🔒 Please log in or sign up to submit projects and track your streak!');
                return;
            }
            if (errorBanner) errorBanner.classList.add('hidden');
            if (form) form.reset();
            modal.showModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.close());
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorBanner) errorBanner.classList.add('hidden');

            const courseId = document.getElementById('project-course-select').value;
            const title = document.getElementById('project-title-input').value.trim();
            const url = document.getElementById('project-url-input').value.trim();
            const notes = document.getElementById('project-notes-input').value.trim();

            if (!title || !url) {
                if (errorBanner) {
                    errorBanner.textContent = 'Project title and repository URL are required.';
                    errorBanner.classList.remove('hidden');
                }
                return;
            }

            const originalText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting project...';
            }

            try {
                const response = await fetch('/api/activities', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        activityType: 'project_submitted',
                        courseId,
                        title: `Submitted Capstone: ${title}`,
                        details: { projectTitle: title, url, notes }
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    if (errorBanner) {
                        errorBanner.textContent = data.error || 'Failed to submit project.';
                        errorBanner.classList.remove('hidden');
                    }
                    return;
                }

                showNotification(`🚀 Capstone Project submitted! Current streak: ${data.streaks ? data.streaks.currentStreak : 1} days.`);
                loadProtectedDashboard();
                modal.close();

            } catch (err) {
                if (errorBanner) {
                    errorBanner.textContent = 'Network error while submitting project.';
                    errorBanner.classList.remove('hidden');
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }
}

// ==========================================================================
// FEEDBACK & WEBSITE IMPROVEMENT FORM LOGIC
// ==========================================================================

const RATING_DESCRIPTIONS = {
    1: '⭐ 1 Star - Needs Substantial Work',
    2: '⭐⭐ 2 Stars - Fair, Needs Improvement',
    3: '⭐⭐⭐ 3 Stars - Good & Helpful',
    4: '⭐⭐⭐⭐ 4 Stars - Great Experience!',
    5: '⭐⭐⭐⭐⭐ 5 Stars - Outstanding & Inspiring!'
};

function setupFeedbackForm() {
    const form = document.getElementById('feedback-form');
    const stars = document.querySelectorAll('.btn-star');
    const ratingValueInput = document.getElementById('feedback-rating-value');
    const ratingLabel = document.getElementById('rating-feedback-label');
    const commentsInput = document.getElementById('feedback-comments-input');
    const charCounter = document.getElementById('feedback-char-count');
    const successBanner = document.getElementById('feedback-success-banner');
    const submitBtn = document.getElementById('feedback-submit-btn');

    if (!form) return;

    let selectedRating = 5;

    function updateStarsDisplay(rating, isHover = false) {
        stars.forEach((star, index) => {
            const starNum = index + 1;
            if (isHover) {
                if (starNum <= rating) {
                    star.classList.add('hovered');
                } else {
                    star.classList.remove('hovered');
                }
            } else {
                star.classList.remove('hovered');
                if (starNum <= rating) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            }
        });

        if (ratingLabel) {
            ratingLabel.textContent = RATING_DESCRIPTIONS[rating] || `Rating: ${rating} of 5`;
        }
    }

    // Set initial 5-star state
    updateStarsDisplay(5);

    // Attach star interactions
    stars.forEach(star => {
        const rating = parseInt(star.getAttribute('data-rating'), 10);

        star.addEventListener('click', () => {
            selectedRating = rating;
            if (ratingValueInput) ratingValueInput.value = rating;
            updateStarsDisplay(selectedRating, false);
        });

        star.addEventListener('mouseenter', () => {
            updateStarsDisplay(rating, true);
        });
    });

    const starContainer = document.getElementById('star-rating-group');
    if (starContainer) {
        starContainer.addEventListener('mouseleave', () => {
            updateStarsDisplay(selectedRating, false);
        });
    }

    // Character counter for comments textarea
    if (commentsInput && charCounter) {
        commentsInput.addEventListener('input', () => {
            const len = commentsInput.value.length;
            charCounter.textContent = `${len} / 2000 characters`;
        });
    }

    // Handle Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const rating = parseInt(ratingValueInput.value, 10) || selectedRating || 5;
        const category = document.getElementById('feedback-category-select').value;
        const comments = commentsInput.value.trim();
        const name = document.getElementById('feedback-name-input').value.trim();
        const email = document.getElementById('feedback-email-input').value.trim();
        const betaTesterOptIn = document.getElementById('feedback-beta-optin').checked;

        // Collect checked improvement topics
        const topicCheckboxes = form.querySelectorAll('input[name="improvement_topic"]:checked');
        const improvementTopics = Array.from(topicCheckboxes).map(cb => cb.value);

        // Collect clarity rating
        const clarityChecked = form.querySelector('input[name="clarity_rating"]:checked');
        const clarityRating = clarityChecked ? clarityChecked.value : 'very_clear';

        if (!comments) {
            showNotification('⚠️ Please share your feedback or suggestions in the text area.');
            return;
        }

        const originalBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting feedback...';
        }

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    rating,
                    category,
                    improvementTopics,
                    clarityRating,
                    comments,
                    name,
                    email,
                    betaTesterOptIn
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showNotification(data.error || 'Could not submit feedback.');
                return;
            }

            if (successBanner) {
                successBanner.classList.remove('hidden');
                successBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            showNotification('🎉 Thank you! Your feedback and improvement suggestions have been saved.');

            // Reset form fields while preserving name/email if user is logged in
            form.reset();
            selectedRating = 5;
            if (ratingValueInput) ratingValueInput.value = 5;
            updateStarsDisplay(5);
            if (charCounter) charCounter.textContent = '0 / 2000 characters';

            if (currentUser) {
                const fbName = document.getElementById('feedback-name-input');
                const fbEmail = document.getElementById('feedback-email-input');
                if (fbName) fbName.value = currentUser.name;
                if (fbEmail) fbEmail.value = currentUser.email;
            }

        } catch (err) {
            showNotification('Network error while sending feedback. Please try again.');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
}

// ==========================================================================
// GAMIFICATION & VERIFIED LEADERBOARD SYSTEM
// ==========================================================================
let currentLeaderboardPeriod = 'all';

/**
 * Loads verified leaderboard data from the server and renders podium + rankings table.
 * 
 * @param {string} period - 'all' | 'monthly' | 'weekly'
 */
async function loadLeaderboard(period = 'all') {
    currentLeaderboardPeriod = period;
    const podiumContainer = document.getElementById('leaderboard-podium');
    const tableBody = document.getElementById('leaderboard-table-body');
    const userBanner = document.getElementById('leaderboard-user-banner');

    try {
        const response = await fetch(`/api/gamification/leaderboard?period=${period}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to fetch leaderboard');
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Leaderboard fetch unsuccessful');

        const leaders = data.leaderboard || [];

        // 1. Render Top 3 Podium Highlights
        renderLeaderboardPodium(leaders, podiumContainer);

        // 2. Render Full Ranking Table
        renderLeaderboardTable(leaders, tableBody);

        // 3. Render Current User Quick Standing Banner
        if (data.currentUserStanding && currentUser) {
            if (userBanner) {
                userBanner.classList.remove('hidden');
                const nameEl = document.getElementById('user-banner-name');
                const tierEl = document.getElementById('user-banner-tier');
                const rankEl = document.getElementById('user-banner-rank');
                const pointsEl = document.getElementById('user-banner-points');
                const subtextEl = document.getElementById('user-banner-subtext');

                const standing = data.currentUserStanding;
                if (nameEl) nameEl.textContent = currentUser.name || 'You';
                if (tierEl) tierEl.textContent = standing.rankTier ? standing.rankTier.badge : '🌱 Novice';
                if (rankEl) rankEl.textContent = `#${standing.rank}`;
                if (pointsEl) pointsEl.textContent = `${standing.points} ⭐`;
                if (subtextEl) {
                    if (standing.rank <= 3) {
                        subtextEl.textContent = '🎉 Incredible achievement! You are currently on the community podium!';
                    } else {
                        subtextEl.textContent = 'Complete modules (+100), quizzes (+50), and projects (+150) to climb higher!';
                    }
                }
            }
        } else if (userBanner) {
            userBanner.classList.add('hidden');
        }

    } catch (err) {
        console.warn('⚠️ [Leaderboard Load Warning]:', err.message);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty-cell">
                        Unable to load leaderboard. Please check your connection.
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Renders Top 3 Podium Cards (Gold #1 in center, Silver #2, Bronze #3)
 */
function renderLeaderboardPodium(leaders, container) {
    if (!container) return;

    if (leaders.length === 0) {
        container.innerHTML = '';
        return;
    }

    const first = leaders.find(l => l.rank === 1);
    const second = leaders.find(l => l.rank === 2);
    const third = leaders.find(l => l.rank === 3);

    // Visual Order: 2nd place (left), 1st place (center), 3rd place (right)
    const podiumSlots = [
        { data: second, rank: 2, medal: '🥈', label: '2nd Place', class: 'rank-2' },
        { data: first, rank: 1, medal: '🥇', label: '1st Place', class: 'rank-1', crown: '👑 Leader' },
        { data: third, rank: 3, medal: '🥉', label: '3rd Place', class: 'rank-3' }
    ];

    container.innerHTML = podiumSlots.map(slot => {
        if (!slot.data) {
            return `
                <div class="podium-card ${slot.class}">
                    <div class="podium-medal">${slot.medal}</div>
                    <div class="podium-name">—</div>
                    <div class="podium-tier">Unclaimed</div>
                    <div class="podium-points">0 ⭐</div>
                </div>
            `;
        }

        const l = slot.data;
        const name = escapeHtml(l.name) + (l.isCurrentUser ? ' <span class="badge-you">You</span>' : '');
        const tierBadge = l.rankTier ? l.rankTier.badge : '🌱 Novice';
        const crownHtml = slot.crown ? `<div class="podium-crown-badge">${slot.crown}</div>` : '';

        return `
            <div class="podium-card ${slot.class}">
                ${crownHtml}
                <div class="podium-medal">${slot.medal}</div>
                <div class="podium-name">${name}</div>
                <div class="podium-tier">${tierBadge}</div>
                <div class="podium-points">${l.points} ⭐</div>
                <div class="podium-activities">${l.activitiesCount} verified activities</div>
            </div>
        `;
    }).join('');
}

/**
 * Renders the full leaderboard table rows
 */
function renderLeaderboardTable(leaders, tbody) {
    if (!tbody) return;

    if (leaders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty-cell">
                    🌱 No learning activity recorded for this timeframe yet. Be the first to earn points!
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = leaders.map(l => {
        let rankPillClass = 'rank-pill-other';
        if (l.rank === 1) rankPillClass = 'rank-pill-1';
        else if (l.rank === 2) rankPillClass = 'rank-pill-2';
        else if (l.rank === 3) rankPillClass = 'rank-pill-3';

        const rowHighlightClass = l.isCurrentUser ? 'table-row-current-user' : '';
        const nameDisplay = escapeHtml(l.name) + (l.isCurrentUser ? ' <span class="badge-you">You</span>' : '');
        const tierBadge = l.rankTier ? l.rankTier.badge : '🌱 Novice';

        return `
            <tr class="${rowHighlightClass}">
                <td class="col-rank">
                    <span class="rank-pill ${rankPillClass}">${l.rank}</span>
                </td>
                <td class="col-learner">
                    <strong>${nameDisplay}</strong>
                </td>
                <td class="col-tier">
                    <span class="tier-badge-cell">${tierBadge}</span>
                </td>
                <td class="col-milestones">
                    ${l.activitiesCount} Verified Milestones
                </td>
                <td class="col-points">
                    <span class="points-badge">${l.points} ⭐</span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Initializes period filter tabs and initial leaderboard fetching.
 */
function setupLeaderboardSystem() {
    const periodButtons = document.querySelectorAll('.btn-period-tab');

    periodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            periodButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');

            const period = btn.getAttribute('data-period') || 'all';
            loadLeaderboard(period);
        });
    });

    // Initial load
    loadLeaderboard('all');
}

/**
 * ==========================================================================
 * COMMUNITY LEARNING RESOURCES FRONTEND CONTROLLER
 * ==========================================================================
 * Purpose:
 * Connects the Community Learning Resources UI with the backend API:
 * - Fetches and renders peer-recommended study materials with category/sort filters.
 * - Handles "+ Recommend a Study Resource" form submission with validation.
 * - Supports instant unique recommendations with "✓ Recommended" state toggle.
 * - Opens detailed resource preview with Top 3 Early Contributors podium
 *   and privacy-protected social handles.
 * - Provides YouTube video embed only for approved/published resources.
 * ==========================================================================
 */

let currentCommunityCategory = 'all';
let currentCommunitySort = 'most_recommended';

/**
 * Loads and renders community resources from GET /api/community-resources
 */
async function loadCommunityResources() {
    const container = document.getElementById('community-resources-container');
    if (!container) return;

    // 1. Loading state
    container.innerHTML = `
        <div class="community-loading-state">
            <div class="loading-spinner"></div>
            <p>Loading community resources...</p>
        </div>
    `;

    try {
        const queryParams = new URLSearchParams({
            category: currentCommunityCategory,
            sort: currentCommunitySort
        });

        const response = await fetch(`/api/community-resources?${queryParams.toString()}`, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();
        const resources = (data && Array.isArray(data.resources)) ? data.resources : [];

        // 2. Empty state
        if (resources.length === 0) {
            container.innerHTML = `
                <div class="community-empty-state">
                    <span class="community-state-icon">💡</span>
                    <h3>No community resources yet</h3>
                    <p>Be the first to recommend a useful YouTube study video for this category!</p>
                    <button type="button" class="btn-primary" id="btn-empty-recommend">+ Recommend a Resource</button>
                </div>
            `;
            const emptyBtn = document.getElementById('btn-empty-recommend');
            if (emptyBtn) {
                emptyBtn.addEventListener('click', openSuggestResourceModal);
            }
            return;
        }

        // 3. Render Resource Cards Grid
        let gridHtml = '<div class="community-grid">';

        resources.forEach(r => {
            const videoId = escapeHtml(r.youtube_video_id || '');
            const title = escapeHtml(r.title || 'Untitled Resource');
            const topic = escapeHtml(r.topic || 'General Topic');
            const description = escapeHtml(r.description || 'No description provided.');
            const categoryName = escapeHtml(formatCategoryLabel(r.category));
            const recCount = parseInt(r.recommendation_count, 10) || 1;
            const hasRecommended = Boolean(r.has_recommended);

            // Verification & Status Badges
            let statusBadge = '<span class="comm-status-badge status-pending">🌱 Community Suggested</span>';
            let candidateNotice = '';

            if (r.status === 'candidate') {
                statusBadge = '<span class="comm-status-badge status-candidate" title="100+ students recommended this resource. Pending moderation review.">🎓 Community Verified Candidate</span>';
                candidateNotice = '<small class="candidate-notice-pill">100+ students recommended this resource.</small>';
            } else if (r.status === 'approved') {
                statusBadge = '<span class="comm-status-badge status-approved">✅ Community Approved</span>';
            } else if (r.status === 'published') {
                statusBadge = '<span class="comm-status-badge status-published">🏆 Featured Resource</span>';
            }

            // Thumbnail URL
            const thumbUrl = videoId
                ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                : 'images/game-animated-bg.gif';

            gridHtml += `
                <article class="community-card" data-resource-id="${r.id}">
                    <div class="community-card-thumbnail">
                        <img src="${thumbUrl}" alt="${title}" loading="lazy" onerror="this.src='images/game-animated-bg.gif'">
                        <span class="comm-yt-badge">▶ YouTube</span>
                        <span class="comm-category-badge">${categoryName}</span>
                    </div>

                    <div class="community-card-body">
                        <div class="comm-status-row">
                            ${statusBadge}
                            ${candidateNotice}
                        </div>

                        <h3 class="community-card-title">${title}</h3>
                        <div class="community-card-topic">${topic}</div>
                        <p class="community-card-desc">${description}</p>

                        <div class="community-card-footer">
                            <div class="comm-rec-counter-row">
                                <span class="comm-rec-counter" id="rec-count-${r.id}" title="${recCount} unique student recommendation${recCount === 1 ? '' : 's'}">
                                    ⭐ ${formatRecommendationCount(recCount)}
                                </span>
                            </div>

                            <div class="comm-card-actions">
                                ${hasRecommended
                                    ? `<button type="button" class="btn-comm-recommend recommended" disabled>✓ Recommended</button>`
                                    : `<button type="button" class="btn-comm-recommend" data-resource-id="${r.id}">⭐ Recommend (+1)</button>`
                                }
                                <button type="button" class="btn-comm-details" data-resource-id="${r.id}">Details &amp; Early Top 3</button>
                            </div>
                        </div>
                    </div>
                </article>
            `;
        });

        gridHtml += '</div>';
        container.innerHTML = gridHtml;

    } catch (err) {
        console.error('❌ [loadCommunityResources Error]:', err);
        // 4. Error state
        container.innerHTML = `
            <div class="community-error-state">
                <span class="community-state-icon">⚠️</span>
                <h3>Unable to load community resources</h3>
                <p>Please check your connection and try again.</p>
                <button type="button" class="btn-secondary btn-community-retry" id="btn-retry-community">Retry</button>
            </div>
        `;
        const retryBtn = document.getElementById('btn-retry-community');
        if (retryBtn) {
            retryBtn.addEventListener('click', loadCommunityResources);
        }
    }
}

/**
 * Helper to format unique recommendation count according to UX requirements:
 * "1 student recommended this"
 * "7 students recommended this"
 * "100 students recommended this"
 */
function formatRecommendationCount(count) {
    const num = parseInt(count, 10) || 0;
    if (num === 1) {
        return '1 student recommended this';
    }
    return `${num.toLocaleString()} students recommended this`;
}

/**
 * Format category identifier into human-readable label
 */
function formatCategoryLabel(cat) {
    const map = {
        'web_dev': 'Web Development',
        'python': 'Python',
        'ai_ml': 'AI/ML',
        'data_science': 'Data Science',
        'programming': 'Programming',
        'other': 'Other'
    };
    return map[cat] || (cat ? cat.replace('_', ' ') : 'General');
}

/**
 * Handles recommending an existing resource via POST /api/community-resources/:id/recommend
 */
async function handleRecommendResource(resourceId, btn) {
    if (!currentUser) {
        showNotification('🔒 Please log in or sign up to recommend learning resources!');
        const authModal = document.getElementById('auth-modal');
        if (authModal && typeof authModal.showModal === 'function') {
            authModal.showModal();
        }
        return;
    }

    if (btn.disabled || btn.classList.contains('recommended')) {
        return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Recommending...';

    try {
        const response = await fetch(`/api/community-resources/${resourceId}/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (response.status === 409 || data.alreadyRecommended) {
            btn.classList.add('recommended');
            btn.textContent = '✓ Recommended';
            showNotification(data.error || 'You have already recommended this learning resource.');
            return;
        }

        if (!response.ok || !data.success) {
            btn.disabled = false;
            btn.textContent = originalText;
            showNotification(data.error || 'Failed to submit recommendation.');
            return;
        }

        // Successfully recommended!
        btn.classList.add('recommended');
        btn.textContent = '✓ Recommended';

        // Update counter on the card directly
        const count = data.recommendation_count !== undefined ? data.recommendation_count : 1;
        const counterEl = document.getElementById(`rec-count-${resourceId}`);
        if (counterEl) {
            counterEl.textContent = `⭐ ${formatRecommendationCount(count)}`;
        }

        // Update counter in modal if open
        const modalCounterEl = document.getElementById(`modal-rec-count-${resourceId}`);
        if (modalCounterEl) {
            modalCounterEl.textContent = `⭐ ${formatRecommendationCount(count)}`;
        }

        showNotification(data.message || '🎉 Thank you for your recommendation!');

        // If resource reached candidate status (100 unique votes), update card badge
        if (data.isCandidate) {
            const card = document.querySelector(`.community-card[data-resource-id="${resourceId}"]`);
            if (card) {
                const statusRow = card.querySelector('.comm-status-row');
                if (statusRow) {
                    statusRow.innerHTML = `
                        <span class="comm-status-badge status-candidate" title="100+ students recommended this resource. Pending moderation review.">🎓 Community Verified Candidate</span>
                        <small class="candidate-notice-pill">100+ students recommended this resource.</small>
                    `;
                }
            }
        }
    } catch (err) {
        console.error('❌ [handleRecommendResource Error]:', err);
        btn.disabled = false;
        btn.textContent = originalText;
        showNotification('Network error while recommending. Please check your connection.');
    }
}

/**
 * Opens the "Recommend a Study Resource" submission modal
 */
function openSuggestResourceModal() {
    if (!currentUser) {
        showNotification('🔒 Please log in or sign up to recommend learning resources!');
        const authModal = document.getElementById('auth-modal');
        if (authModal && typeof authModal.showModal === 'function') {
            authModal.showModal();
        }
        return;
    }

    const modal = document.getElementById('community-resource-modal');
    const form = document.getElementById('community-resource-form');
    const errorBanner = document.getElementById('community-form-error');

    if (form) form.reset();
    if (errorBanner) {
        errorBanner.textContent = '';
        errorBanner.classList.add('hidden');
    }

    if (modal && typeof modal.showModal === 'function') {
        modal.showModal();
    }
}

/**
 * Handles submission of new community resource form
 */
async function handleSuggestResourceFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = document.getElementById('comm-submit-btn');
    const errorBanner = document.getElementById('community-form-error');

    if (!currentUser) {
        showNotification('🔒 Please log in or sign up to recommend learning resources!');
        const authModal = document.getElementById('auth-modal');
        if (authModal && typeof authModal.showModal === 'function') {
            authModal.showModal();
        }
        return;
    }

    const youtubeUrl = (document.getElementById('comm-youtube-url')?.value || '').trim();
    const category = (document.getElementById('comm-category')?.value || '').trim();
    const title = (document.getElementById('comm-title')?.value || '').trim();
    const topic = (document.getElementById('comm-topic')?.value || '').trim();
    const description = (document.getElementById('comm-description')?.value || '').trim();
    const reason = (document.getElementById('comm-reason')?.value || '').trim();

    // Social profile fields (optional)
    const github = (document.getElementById('comm-social-github')?.value || '').trim();
    const linkedin = (document.getElementById('comm-social-linkedin')?.value || '').trim();
    const instagram = (document.getElementById('comm-social-instagram')?.value || '').trim();
    const other = (document.getElementById('comm-social-other')?.value || '').trim();
    const showSocialLinks = Boolean(document.getElementById('comm-social-optin')?.checked);

    if (errorBanner) {
        errorBanner.textContent = '';
        errorBanner.classList.add('hidden');
    }

    if (!youtubeUrl) {
        if (errorBanner) {
            errorBanner.textContent = 'Please enter a valid YouTube video URL.';
            errorBanner.classList.remove('hidden');
        }
        return;
    }

    if (!category) {
        if (errorBanner) {
            errorBanner.textContent = 'Please select a subject or category.';
            errorBanner.classList.remove('hidden');
        }
        return;
    }

    if (!title || title.length < 3) {
        if (errorBanner) {
            errorBanner.textContent = 'Please provide a title with at least 3 characters.';
            errorBanner.classList.remove('hidden');
        }
        return;
    }

    const finalTopic = topic || 'Educational Overview';
    const finalDescription = (description && description.length >= 10)
        ? description
        : (description ? `${description} - Recommended study material.` : 'Educational video tutorial recommended by an EduPath community learner.');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }

    try {
        const payload = {
            youtube_url: youtubeUrl,
            category,
            title,
            topic: finalTopic,
            description: finalDescription,
            reason,
            social_profile: {
                github,
                linkedin,
                instagram,
                other,
                show_social_links: showSocialLinks
            }
        };

        const response = await fetch('/api/community-resources', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.status === 401) {
            const modal = document.getElementById('community-resource-modal');
            if (modal) modal.close();
            showNotification('🔒 Session expired. Please log in again.');
            const authModal = document.getElementById('auth-modal');
            if (authModal) authModal.showModal();
            return;
        }

        if (response.status === 409 || data.alreadyRecommended) {
            if (errorBanner) {
                errorBanner.textContent = data.error || 'You have already recommended this learning resource.';
                errorBanner.classList.remove('hidden');
            }
            showNotification(data.error || 'You have already recommended this learning resource.');
            return;
        }

        if (!response.ok || !data.success) {
            if (errorBanner) {
                errorBanner.textContent = data.error || 'Failed to submit learning resource.';
                errorBanner.classList.remove('hidden');
            }
            showNotification(data.error || 'Failed to submit learning resource.');
            return;
        }

        // Success!
        const modal = document.getElementById('community-resource-modal');
        if (modal) modal.close();

        // Format success toast with real backend count
        const recCount = data.resource?.recommendation_count;
        const countSuffix = recCount !== undefined
            ? ` (${formatRecommendationCount(recCount)})`
            : '';
        showNotification((data.message || '🎉 Thank you! Resource recommended to the community.') + countSuffix);
        form.reset();

        // If the submitted resource's category is filtered out, reset category to 'all' so it is visible
        if (currentCommunityCategory !== 'all' && data.resource?.category && data.resource.category !== currentCommunityCategory) {
            currentCommunityCategory = 'all';
            const allBtn = document.querySelector('#community-category-filters .btn-community-filter[data-category="all"]');
            if (allBtn) {
                document.querySelectorAll('#community-category-filters .btn-community-filter').forEach(b => b.classList.remove('active'));
                allBtn.classList.add('active');
            }
        }

        // Refresh the community resource cards immediately
        await loadCommunityResources();

        // Highlight and scroll the newly recommended resource card into view
        if (data.resource && data.resource.id) {
            const targetCard = document.querySelector(`.community-card[data-resource-id="${data.resource.id}"]`);
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                targetCard.classList.add('pulse-highlight');
                setTimeout(() => targetCard.classList.remove('pulse-highlight'), 3000);
            }
        }

    } catch (err) {
        console.error('❌ [handleSuggestResourceFormSubmit Error]:', err);
        if (errorBanner) {
            errorBanner.textContent = 'Network error while submitting. Please check your connection and try again.';
            errorBanner.classList.remove('hidden');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Recommend Resource';
        }
    }
}

/**
 * Opens and populates the Resource Details & Early Contributors modal
 */
async function openResourceDetailsModal(resourceId) {
    const modal = document.getElementById('community-resource-details-modal');
    const body = document.getElementById('comm-details-body');
    if (!modal || !body) return;

    body.innerHTML = `
        <div class="community-loading-state">
            <div class="loading-spinner"></div>
            <p>Loading resource details and early contributors...</p>
        </div>
    `;

    if (typeof modal.showModal === 'function') {
        modal.showModal();
    }

    try {
        const [resDetails, resContributors] = await Promise.all([
            fetch(`/api/community-resources/${resourceId}`, { headers: { 'Accept': 'application/json' } }),
            fetch(`/api/community-resources/${resourceId}/contributors`, { headers: { 'Accept': 'application/json' } })
        ]);

        if (!resDetails.ok) {
            throw new Error('Resource not found');
        }

        const detailsData = await resDetails.json();
        const contributorsData = await resContributors.json();

        const r = detailsData.resource;
        const contributors = (contributorsData && Array.isArray(contributorsData.contributors))
            ? contributorsData.contributors
            : [];

        const videoId = escapeHtml(r.youtube_video_id || '');
        const title = escapeHtml(r.title || 'Untitled Resource');
        const topic = escapeHtml(r.topic || 'General Topic');
        const description = escapeHtml(r.description || 'No description provided.');
        const categoryName = escapeHtml(formatCategoryLabel(r.category));
        const recCount = parseInt(r.recommendation_count, 10) || 1;

        // Video Player: Embed YouTube ONLY if approved or published.
        // If pending or candidate, provide thumbnail + normal "Watch on YouTube" button.
        let mediaHtml = '';
        if (r.status === 'approved' || r.status === 'published') {
            mediaHtml = `
                <div class="comm-video-wrapper">
                    <iframe src="https://www.youtube-nocookie.com/embed/${videoId}?rel=0" 
                            title="${title}" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen></iframe>
                </div>
            `;
        } else {
            mediaHtml = `
                <div class="comm-preview-box">
                    <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${title}" class="comm-preview-img">
                    <div class="comm-preview-overlay">
                        <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener noreferrer" class="btn-primary btn-watch-yt">
                            ▶ Watch on YouTube
                        </a>
                    </div>
                </div>
            `;
        }

        // Status pill
        let statusBadge = '<span class="comm-status-badge status-pending">🌱 Community Suggested</span>';
        if (r.status === 'candidate') {
            statusBadge = '<span class="comm-status-badge status-candidate">🎓 Community Verified Candidate</span>';
        } else if (r.status === 'approved') {
            statusBadge = '<span class="comm-status-badge status-approved">✅ Community Approved</span>';
        } else if (r.status === 'published') {
            statusBadge = '<span class="comm-status-badge status-published">🏆 Featured Resource</span>';
        }

        // Contributors podium list (Rank 1, 2, 3)
        const rankMedals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        let contributorsHtml = '';

        if (contributors.length === 0) {
            contributorsHtml = '<p class="comm-no-social">No contributors recorded yet.</p>';
        } else {
            contributorsHtml = '<div class="comm-contributors-list">';
            contributors.forEach(c => {
                const medal = rankMedals[c.contributor_rank] || '⭐';
                const name = escapeHtml(c.contributor_name || 'Learner');
                const showSocial = Boolean(c.show_social_links);

                let socialChipsHtml = '';
                if (showSocial) {
                    if (c.github) {
                        socialChipsHtml += `<a href="https://github.com/${encodeURIComponent(c.github.replace('@', ''))}" target="_blank" rel="noopener noreferrer" class="comm-social-chip">GitHub</a>`;
                    }
                    if (c.linkedin) {
                        const lkUrl = c.linkedin.startsWith('http') ? c.linkedin : `https://${c.linkedin}`;
                        socialChipsHtml += `<a href="${encodeURI(lkUrl)}" target="_blank" rel="noopener noreferrer" class="comm-social-chip">LinkedIn</a>`;
                    }
                    if (c.instagram) {
                        socialChipsHtml += `<a href="https://instagram.com/${encodeURIComponent(c.instagram.replace('@', ''))}" target="_blank" rel="noopener noreferrer" class="comm-social-chip">Instagram</a>`;
                    }
                    if (c.other) {
                        const otUrl = c.other.startsWith('http') ? c.other : `https://${c.other}`;
                        socialChipsHtml += `<a href="${encodeURI(otUrl)}" target="_blank" rel="noopener noreferrer" class="comm-social-chip">Web</a>`;
                    }
                }

                if (!socialChipsHtml) {
                    socialChipsHtml = '<span class="comm-no-social">Private Profile</span>';
                }

                contributorsHtml += `
                    <div class="comm-contributor-row">
                        <div class="comm-contributor-rank-name">
                            <span class="comm-rank-badge">${medal}</span>
                            <span>${name}</span>
                        </div>
                        <div class="comm-social-links-row">
                            ${socialChipsHtml}
                        </div>
                    </div>
                `;
            });
            contributorsHtml += '</div>';
        }

        body.innerHTML = `
            ${mediaHtml}

            <div class="comm-details-meta">
                <div class="comm-details-status-row">
                    ${statusBadge}
                    <span class="comm-category-badge" style="position:static;">${categoryName}</span>
                    <strong id="modal-rec-count-${r.id}" class="comm-details-rec-count" style="color:var(--color-sand);" title="${recCount} unique student recommendation${recCount === 1 ? '' : 's'}">⭐ ${formatRecommendationCount(recCount)}</strong>
                </div>

                <h3 class="comm-details-title">${title}</h3>
                <div class="community-card-topic" style="margin-bottom:0.75rem;">Topic: ${topic}</div>
                <p class="comm-details-desc">${description}</p>

                ${r.status === 'candidate' ? `
                    <div class="comm-reason-callout" style="border-color:#f59e0b;">
                        🎓 <strong>Community Verified Candidate:</strong> 100+ students recommended this resource. It is currently under review by EduPath moderators before direct embed approval.
                    </div>
                ` : ''}

                <div class="comm-contributors-card">
                    <h4 class="comm-contributors-title">🏆 First 3 Early Contributors</h4>
                    <p class="comm-contributors-subtitle">Honoring the first three learners to discover and recommend this study material.</p>
                    ${contributorsHtml}
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-top:1.5rem;">
                    <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size:0.9rem;">
                        ↗ Watch on YouTube
                    </a>
                    ${r.has_recommended
                        ? `<button type="button" class="btn-comm-recommend recommended" disabled>✓ You Recommended This</button>`
                        : `<button type="button" class="btn-comm-recommend" id="btn-modal-recommend-${r.id}" data-resource-id="${r.id}">⭐ Recommend (+1)</button>`
                    }
                </div>
            </div>
        `;

        // Attach recommend click in modal if active
        const modalRecBtn = document.getElementById(`btn-modal-recommend-${r.id}`);
        if (modalRecBtn) {
            modalRecBtn.addEventListener('click', async () => {
                await handleRecommendResource(r.id, modalRecBtn);
                // Also update the card on the main page if present
                const mainCardBtn = document.querySelector(`.btn-comm-recommend[data-resource-id="${r.id}"]`);
                if (mainCardBtn) {
                    mainCardBtn.classList.add('recommended');
                    mainCardBtn.textContent = '✓ Recommended';
                    mainCardBtn.disabled = true;
                }
            });
        }

    } catch (err) {
        console.error('❌ [openResourceDetailsModal Error]:', err);
        body.innerHTML = `
            <div class="community-error-state">
                <span class="community-state-icon">⚠️</span>
                <h3>Unable to load resource details</h3>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

/**
 * Initializes listeners and state for Community Learning Resources section
 */
function setupCommunityResourcesSystem() {
    // 1. Category Filter Buttons
    const categoryBtns = document.querySelectorAll('#community-category-filters .btn-community-filter');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCommunityCategory = btn.getAttribute('data-category') || 'all';
            loadCommunityResources();
        });
    });

    // 2. Sort Filter Buttons
    const sortBtns = document.querySelectorAll('#community-sort-filters .btn-community-sort');
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCommunitySort = btn.getAttribute('data-sort') || 'most_recommended';
            loadCommunityResources();
        });
    });

    // 3. Open Suggestion Modal Button
    const openModalBtn = document.getElementById('btn-open-suggest-modal');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', openSuggestResourceModal);
    }

    // 4. Modal Close Buttons
    const suggestCloseBtn = document.getElementById('community-modal-close');
    const suggestModal = document.getElementById('community-resource-modal');
    if (suggestCloseBtn && suggestModal) {
        suggestCloseBtn.addEventListener('click', () => suggestModal.close());
        // Backdrop click to close
        suggestModal.addEventListener('click', (event) => {
            const rect = suggestModal.getBoundingClientRect();
            const isInDialog = (
                rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX && event.clientX <= rect.left + rect.width
            );
            if (!isInDialog) suggestModal.close();
        });
    }

    const detailsCloseBtn = document.getElementById('comm-details-close');
    const detailsModal = document.getElementById('community-resource-details-modal');
    if (detailsCloseBtn && detailsModal) {
        detailsCloseBtn.addEventListener('click', () => detailsModal.close());
        detailsModal.addEventListener('click', (event) => {
            const rect = detailsModal.getBoundingClientRect();
            const isInDialog = (
                rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
                rect.left <= event.clientX && event.clientX <= rect.left + rect.width
            );
            if (!isInDialog) detailsModal.close();
        });
    }

    // 5. Submit Form Listener
    const suggestForm = document.getElementById('community-resource-form');
    if (suggestForm) {
        suggestForm.addEventListener('submit', handleSuggestResourceFormSubmit);
    }

    // 6. Event Delegation for Community Resource Grid (Recommend & Details clicks)
    const container = document.getElementById('community-resources-container');
    if (container) {
        container.addEventListener('click', (event) => {
            const recBtn = event.target.closest('.btn-comm-recommend');
            if (recBtn && !recBtn.disabled) {
                const resId = recBtn.getAttribute('data-resource-id');
                if (resId) handleRecommendResource(parseInt(resId, 10), recBtn);
                return;
            }

            const detailsBtn = event.target.closest('.btn-comm-details');
            if (detailsBtn) {
                const resId = detailsBtn.getAttribute('data-resource-id');
                if (resId) openResourceDetailsModal(parseInt(resId, 10));
                return;
            }
        });
    }

    // 7. Initial Load
    loadCommunityResources();
}

/**
 * Main application initialization function.
 * Ensures the HTML document is fully parsed before attaching event listeners.
 */
function initializeEduPath() {
    setupSmoothNavigation();
    setupScrollSpy();
    setupCourseCategoryInteractions();
    setupResourceInteractions();
    setupProgressPreviewInteraction();
    setupAuthModal();
    setupAuthForms();
    setupOnboardingModal();
    setupCoursesSystem();
    setupQuizModal();
    setupProjectModal();
    setupFeedbackForm();
    setupLeaderboardSystem();
    setupLogout();
    checkAuthSession();
    setupNewsFilter();
    setupNewsAutoUpdate();
    setupNewsTakeaways();
    setupCommunityResourcesSystem();
}

// Ensure DOM is ready before executing initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEduPath);
} else {
    initializeEduPath();
}
