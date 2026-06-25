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
        this.loginForm = document.getElementById('login-form');
        
        // Login elements
        this.loginTitle = document.getElementById('login-title');
        this.loginSubtitle = document.getElementById('login-subtitle');
        this.labelUsername = document.getElementById('label-username');
        this.labelPassword = document.getElementById('label-password');
        this.loginUsernameInput = document.getElementById('login-username');
        this.loginPasswordInput = document.getElementById('login-password');
        this.toggleLoginPassBtn = document.getElementById('toggle-login-pass');
        this.loginErrorAlert = document.getElementById('login-error');
        this.loginErrorMsg = document.getElementById('login-error-msg');
        this.loginSubmitBtn = document.getElementById('btn-login-submit');
        
        // Import / Export / Reset links
        this.linkImportVault = document.getElementById('link-import-vault');
        this.inputImportFile = document.getElementById('input-import-file');
        this.linkResetVault = document.getElementById('link-reset-vault');
        
        this.viewContent = document.getElementById('view-content');
        this.viewTitle = document.getElementById('view-title');
        this.userDisplayName = document.getElementById('user-display-name');
        
        this.logoutBtn = document.getElementById('btn-logout');
        this.exportBtn = document.getElementById('btn-export');
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

        // Import Backup Click
        if (this.linkImportVault) {
            this.linkImportVault.addEventListener('click', (e) => {
                e.preventDefault();
                this.inputImportFile.click();
            });
        }

        // Import Backup File Selected
        if (this.inputImportFile) {
            this.inputImportFile.addEventListener('change', (e) => this.handleImportBackup(e));
        }

        // Export Backup Click
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.handleExportBackup());
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

        // Global Unauthorized event listener (fired from API service on 401s / vault lock)
        window.addEventListener('app-unauthorized', () => {
            this.showToast('Vault locked. Please open it again.', 'error');
            this.forceToLogin();
        });
    },

    async checkInitialAuth() {
        this.updateLoginVaultMode();
        
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

    updateLoginVaultMode() {
        const initialized = window.ApiService.isVaultInitialized();
        if (initialized) {
            // Unlock Vault mode
            this.loginTitle.textContent = "Unlock Vault";
            this.loginSubtitle.textContent = "Nhập mật khẩu chủ để mở khóa két sắt bảo mật.";
            this.labelUsername.textContent = "Vault Username";
            this.loginUsernameInput.value = localStorage.getItem('shieldpass_vault_username') || "admin";
            this.loginUsernameInput.readOnly = true;
            this.labelPassword.textContent = "Master Password";
            this.loginPasswordInput.placeholder = "Nhập mật khẩu chủ";
            this.loginSubmitBtn.querySelector('span').textContent = "Mở khóa Vault";
            this.loginSubmitBtn.querySelector('i').className = "fa-solid fa-unlock";
            if (this.linkResetVault) this.linkResetVault.classList.remove('hidden');
        } else {
            // Setup Vault mode (Register)
            this.loginTitle.textContent = "Setup Vault";
            this.loginSubtitle.textContent = "Thiết lập mật khẩu chủ để tạo két sắt bảo mật local-first.";
            this.labelUsername.textContent = "Vault Username (Tên tài khoản)";
            this.loginUsernameInput.value = "admin";
            this.loginUsernameInput.readOnly = false;
            this.loginUsernameInput.placeholder = "e.g. admin, user...";
            this.labelPassword.textContent = "Create Master Password (Mật khẩu chủ)";
            this.loginPasswordInput.placeholder = "Nhập mật khẩu chủ (mật khẩu này sẽ dùng để mã hóa két sắt)";
            this.loginSubmitBtn.querySelector('span').textContent = "Tạo két sắt mới";
            this.loginSubmitBtn.querySelector('i').className = "fa-solid fa-vault";
            if (this.linkResetVault) this.linkResetVault.classList.add('hidden');
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        
        const username = this.loginUsernameInput.value.trim();
        const password = this.loginPasswordInput.value;
        const submitBtn = this.loginSubmitBtn;
        
        const initialized = window.ApiService.isVaultInitialized();
        
        submitBtn.disabled = true;
        const btnSpan = submitBtn.querySelector('span');
        const btnIcon = submitBtn.querySelector('i');
        const originalText = btnSpan.textContent;
        const originalIconClass = btnIcon.className;
        
        btnSpan.textContent = initialized ? 'Unlocking...' : 'Initializing...';
        btnIcon.className = 'fa-solid fa-circle-notch fa-spin';
        this.loginErrorAlert.classList.add('hidden');

        try {
            if (!initialized) {
                // Initialize Vault (Register)
                const data = await window.ApiService.initializeVault(username, password);
                this.state.isAuthenticated = true;
                this.state.username = data.username;
                this.userDisplayName.textContent = data.username;
                
                this.showToast('Két sắt bảo mật đã được khởi tạo thành công!', 'success');
            } else {
                // Unlock Vault (Login)
                const data = await window.ApiService.login(username, password);
                this.state.isAuthenticated = true;
                this.state.username = data.username;
                this.userDisplayName.textContent = data.username;
                
                this.showToast('Mở khóa két sắt thành công!', 'success');
            }
            
            // Switch layouts
            this.loginContainer.classList.add('hidden');
            this.appContainer.classList.remove('hidden');
            
            // Clear credentials input
            this.loginPasswordInput.value = '';

            // Redirect
            window.location.hash = '#dashboard';
            this.handleRouting();
        } catch (error) {
            this.loginErrorMsg.textContent = error.message;
            this.loginErrorAlert.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            btnSpan.textContent = originalText;
            btnIcon.className = originalIconClass;
        }
    },

    async handleLogout() {
        const success = await window.ApiService.logout();
        if (success) {
            this.showToast('Két sắt đã được khóa.', 'info');
        }
        this.forceToLogin();
    },

    async handleImportBackup(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                await window.ApiService.importVault(data);
                this.showToast('Nhập file sao lưu thành công! Bạn có thể mở khóa két sắt bằng mật khẩu nguyên bản.', 'success');
                
                // Clear input
                this.inputImportFile.value = '';
                
                // Refresh login page
                this.updateLoginVaultMode();
            } catch (err) {
                this.showToast('Lỗi khi nhập file sao lưu: ' + err.message, 'error');
                this.inputImportFile.value = '';
            }
        };
        reader.readAsText(file);
    },

    async handleExportBackup() {
        try {
            const data = await window.ApiService.exportVault();
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `shieldpass_vault_backup_${data.shieldpass_vault_username || 'admin'}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showToast('Tải file sao lưu (.json) thành công! Hãy lưu trữ file này cẩn thận.', 'success');
        } catch (err) {
            this.showToast('Lỗi khi xuất file sao lưu: ' + err.message, 'error');
        }
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
        this.updateLoginVaultMode();
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
