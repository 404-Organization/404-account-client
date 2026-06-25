// ShieldPass - Main App Coordinator & SPA Router

const App = {
    state: {
        isAuthenticated: false,
        username: null,
        currentRoute: ''
    },

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.checkInitialAuth();
    },

    cacheDOM() {
        this.loginContainer = document.getElementById('login-container');
        this.appContainer = document.getElementById('app-container');
        
        // Login form elements
        this.loginForm = document.getElementById('login-form');
        this.loginUsernameInput = document.getElementById('login-username');
        this.loginPasswordInput = document.getElementById('login-password');
        this.toggleLoginPassBtn = document.getElementById('toggle-login-pass');
        this.loginErrorAlert = document.getElementById('login-error');
        this.loginErrorMsg = document.getElementById('login-error-msg');
        
        // Register form elements
        this.registerForm = document.getElementById('register-form');
        this.registerUsernameInput = document.getElementById('register-username');
        this.registerPasswordInput = document.getElementById('register-password');
        this.toggleRegisterPassBtn = document.getElementById('toggle-register-pass');
        this.registerErrorAlert = document.getElementById('register-error');
        this.registerErrorMsg = document.getElementById('register-error-msg');
        this.registerSuccessAlert = document.getElementById('register-success');
        
        // Auth Toggle Links
        this.linkToRegister = document.getElementById('link-to-register');
        this.linkToLogin = document.getElementById('link-to-login');
        
        this.viewContent = document.getElementById('view-content');
        this.viewTitle = document.getElementById('view-title');
        this.userDisplayName = document.getElementById('user-display-name');
        
        this.logoutBtn = document.getElementById('btn-logout');
        this.sidebarToggleBtn = document.getElementById('sidebar-toggle');
        this.sidebar = document.querySelector('.sidebar');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        
        // Navigation links
        this.navLinks = {
            dashboard: document.getElementById('nav-dashboard'),
            accounts: document.getElementById('nav-accounts')
        };
    },

    bindEvents() {
        // Router listener
        window.addEventListener('hashchange', () => this.handleRouting());
        
        // Login submission
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register submission
        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Toggle Login Password visibility
        if (this.toggleLoginPassBtn) {
            this.toggleLoginPassBtn.addEventListener('click', () => {
                const type = this.loginPasswordInput.type === 'password' ? 'text' : 'password';
                this.loginPasswordInput.type = type;
                this.toggleLoginPassBtn.querySelector('i').className = type === 'password' 
                    ? 'fa-solid fa-eye' 
                    : 'fa-solid fa-eye-slash';
            });
        }

        // Toggle Register Password visibility
        if (this.toggleRegisterPassBtn) {
            this.toggleRegisterPassBtn.addEventListener('click', () => {
                const type = this.registerPasswordInput.type === 'password' ? 'text' : 'password';
                this.registerPasswordInput.type = type;
                this.toggleRegisterPassBtn.querySelector('i').className = type === 'password' 
                    ? 'fa-solid fa-eye' 
                    : 'fa-solid fa-eye-slash';
            });
        }

        // Toggle to Register Form
        if (this.linkToRegister) {
            this.linkToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.loginForm.classList.add('hidden');
                this.registerForm.classList.remove('hidden');
                this.registerUsernameInput.value = '';
                this.registerPasswordInput.value = '';
                this.registerErrorAlert.classList.add('hidden');
                this.registerSuccessAlert.classList.add('hidden');
            });
        }

        // Toggle to Login Form
        if (this.linkToLogin) {
            this.linkToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.registerForm.classList.add('hidden');
                this.loginForm.classList.remove('hidden');
                this.loginUsernameInput.value = '';
                this.loginPasswordInput.value = '';
                this.loginErrorAlert.classList.add('hidden');
            });
        }

        // Logout action
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Mobile Sidebar Toggle
        if (this.sidebarToggleBtn) {
            this.sidebarToggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        if (this.sidebarOverlay) {
            this.sidebarOverlay.addEventListener('click', () => this.closeSidebar());
        }

        // Close sidebar on navigate (for mobile layout)
        Object.values(this.navLinks).forEach(link => {
            if (link) {
                link.addEventListener('click', () => this.closeSidebar());
            }
        });

        // Global Unauthorized event listener (fired from API service on 401s)
        window.addEventListener('app-unauthorized', () => {
            this.showToast('Session expired. Please sign in again.', 'error');
            this.forceToLogin();
        });
    },

    async checkInitialAuth() {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            this.forceToLogin();
            return;
        }

        const result = await window.ApiService.checkAuthStatus();
        if (result && result.authenticated) {
            this.state.isAuthenticated = true;
            this.state.username = result.username;
            this.userDisplayName.textContent = result.username;
            
            this.loginContainer.classList.add('hidden');
            this.appContainer.classList.remove('hidden');
            
            // Redirect to active hash or dashboard
            const initialHash = window.location.hash || '#dashboard';
            window.location.hash = initialHash;
            this.handleRouting();
        } else {
            this.forceToLogin();
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        
        const username = this.loginUsernameInput.value.trim();
        const password = this.loginPasswordInput.value;
        const submitBtn = document.getElementById('btn-login-submit');
        
        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Authenticating...';
        this.loginErrorAlert.classList.add('hidden');

        try {
            const data = await window.ApiService.login(username, password);
            
            // Update app state
            this.state.isAuthenticated = true;
            this.state.username = data.username;
            this.userDisplayName.textContent = data.username;
            
            this.showToast(`Welcome back, ${data.username}!`, 'success');
            
            // Switch layouts
            this.loginContainer.classList.add('hidden');
            this.appContainer.classList.remove('hidden');
            
            // Clear credentials
            this.loginUsernameInput.value = '';
            this.loginPasswordInput.value = '';

            // Redirect
            window.location.hash = '#dashboard';
            this.handleRouting();
        } catch (error) {
            this.loginErrorMsg.textContent = error.message;
            this.loginErrorAlert.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = 'Sign In';
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        
        const username = this.registerUsernameInput.value.trim();
        const password = this.registerPasswordInput.value;
        const submitBtn = document.getElementById('btn-register-submit');
        
        submitBtn.disabled = true;
        submitBtn.querySelector('span').textContent = 'Registering...';
        this.registerErrorAlert.classList.add('hidden');
        this.registerSuccessAlert.classList.add('hidden');

        try {
            await window.ApiService.register(username, password);
            
            // Clear inputs
            this.registerUsernameInput.value = '';
            this.registerPasswordInput.value = '';
            
            // Show success alert
            this.registerSuccessAlert.classList.remove('hidden');
            this.showToast('Registration successful! Redirecting to login...', 'success');
            
            // Auto toggle to login after 2 seconds
            setTimeout(() => {
                this.registerForm.classList.add('hidden');
                this.loginForm.classList.remove('hidden');
                
                // Pre-fill the login username field with the registered username
                this.loginUsernameInput.value = username;
                this.loginPasswordInput.focus();
            }, 2000);
        } catch (error) {
            this.registerErrorMsg.textContent = error.message;
            this.registerErrorAlert.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = 'Sign Up';
        }
    },

    async handleLogout() {
        const success = await window.ApiService.logout();
        if (success) {
            this.showToast('You have been logged out successfully.', 'info');
        }
        this.forceToLogin();
    },

    toggleSidebar() {
        if (!this.sidebar) return;
        const isOpen = this.sidebar.classList.toggle('open');
        document.body.classList.toggle('mobile-sidebar-open', isOpen);
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.toggle('active', isOpen);
            this.sidebarOverlay.classList.toggle('hidden', !isOpen);
        }
    },

    closeSidebar() {
        if (!this.sidebar) return;
        this.sidebar.classList.remove('open');
        document.body.classList.remove('mobile-sidebar-open');
        if (this.sidebarOverlay) {
            this.sidebarOverlay.classList.remove('active');
            this.sidebarOverlay.classList.add('hidden');
        }
    },

    forceToLogin() {
        this.state.isAuthenticated = false;
        this.state.username = null;
        
        this.appContainer.classList.add('hidden');
        this.loginContainer.classList.remove('hidden');
        this.viewContent.innerHTML = '';
        this.closeSidebar();
        window.location.hash = '';
    },

    handleRouting() {
        if (!this.state.isAuthenticated) {
            this.forceToLogin();
            return;
        }

        const hash = window.location.hash || '#dashboard';
        this.state.currentRoute = hash;

        // Toggle navigation links active state
        Object.entries(this.navLinks).forEach(([key, link]) => {
            if (link) {
                if (hash === `#${key}`) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });

        // Set viewport content dynamically
        this.viewContent.className = 'view-content-fade'; // reset transition
        
        switch (hash) {
            case '#dashboard':
                this.viewTitle.textContent = 'Dashboard';
                window.DashboardView.render(this.viewContent);
                break;
            case '#accounts':
                this.viewTitle.textContent = 'Vault Accounts';
                window.AccountsView.render(this.viewContent);
                break;
            default:
                // Fallback to Dashboard
                window.location.hash = '#dashboard';
                break;
        }
    },

    // Global Toast Notification Helper
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-xmark';
        if (type === 'info') icon = 'fa-circle-info';
        
        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <div class="toast-message">${message}</div>
        `;
        
        container.appendChild(toast);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
};

// Global reference
window.showToast = (message, type) => App.showToast(message, type);

// Start application
document.addEventListener('DOMContentLoaded', () => App.init());
