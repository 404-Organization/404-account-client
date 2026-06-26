// ShieldPass - Accounts View Controller
const AccountsView = {
    container: null,
    cardsContainer: null,
    searchTimeout: null,

    isActiveRender(renderRequestId) {
        return !renderRequestId || !window.App || window.App.state.renderRequestId === renderRequestId;
    },

    async render(container, renderRequestId = 0) {
        this.container = container;
        container.innerHTML = `
            <div class="accounts-page-header">
                <div class="search-bar">
                    <i class="fa-solid fa-magnifying-glass search-icon"></i>
                    <input type="text" id="accounts-search" placeholder="Search by website or username..." autocomplete="off">
                </div>
                <button id="btn-add-account" class="btn btn-primary">
                    <i class="fa-solid fa-plus"></i>
                    <span>Add Account</span>
                </button>
            </div>
            
            <div id="accounts-cards-grid" class="accounts-grid">
                <div style="text-align: center; padding: 40px; grid-column: 1/-1; color: var(--text-secondary);">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px;"></i> Loading accounts...
                </div>
            </div>
        `;

        this.cardsContainer = container.querySelector('#accounts-cards-grid');

        // Initial Load
        await this.loadAccounts('', renderRequestId);
        if (!this.isActiveRender(renderRequestId)) return;

        // Attach listeners
        this.attachEventListeners();
    },

    async loadAccounts(searchQuery = '', renderRequestId = 0) {
        if (!this.cardsContainer) return;

        try {
            const accounts = await window.ApiService.fetchAccounts(searchQuery);
            if (!this.isActiveRender(renderRequestId)) return;
            this.renderCards(accounts);
        } catch (error) {
            if (!this.isActiveRender(renderRequestId)) return;
            this.cardsContainer.innerHTML = `
                <div class="alert alert-danger" style="grid-column: 1/-1;">
                    <i class="fa-solid fa-circle-xmark"></i>
                    <span>Failed to load accounts: ${error.message}</span>
                </div>
            `;
        }
    },

    renderCards(accounts) {
        if (!this.cardsContainer) return;

        if (!accounts || accounts.length === 0) {
            this.cardsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fa-solid fa-vault"></i>
                    </div>
                    <h4>No Accounts Found</h4>
                    <p>No passwords match your search query or your vault is empty.</p>
                    <button class="btn btn-secondary btn-sm" id="btn-empty-add">
                        <i class="fa-solid fa-plus"></i>
                        <span>Add First Account</span>
                    </button>
                </div>
            `;
            const emptyAddBtn = this.cardsContainer.querySelector('#btn-empty-add');
            if (emptyAddBtn) {
                emptyAddBtn.addEventListener('click', () => this.openAddModal());
            }
            return;
        }

        let html = '';
        accounts.forEach(account => {
            const initial = account.website ? account.website.charAt(0).toUpperCase() : '?';
            const notesText = account.note ? this.escapeHTML(account.note) : '<i>No notes saved</i>';
            const dateStr = this.formatDate(account.updatedAt || account.createdAt);

            html += `
                <div class="account-card" data-id="${account.id}">
                    <div class="account-card-header">
                        <div class="site-avatar">${initial}</div>
                        <div class="site-info">
                            <h3 class="site-name" title="${this.escapeHTML(account.website)}">${this.escapeHTML(account.website)}</h3>
                        </div>
                    </div>
                    
                    <div class="account-card-body">
                        <div class="credential-row">
                            <div class="credential-field">
                                <span class="credential-label">Username / Email</span>
                                <span class="credential-value" id="username-${account.id}">${this.escapeHTML(account.username)}</span>
                            </div>
                            <div class="credential-actions">
                                <button type="button" class="btn-icon btn-copy-username" data-id="${account.id}" title="Copy Username">
                                    <i class="fa-solid fa-copy"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="credential-row">
                            <div class="credential-field">
                                <span class="credential-label">Password</span>
                                <span class="credential-value masked-password" id="password-${account.id}" data-password="${this.escapeHTML(account.password)}">••••••••••••</span>
                            </div>
                            <div class="credential-actions">
                                <button type="button" class="btn-icon btn-toggle-password" data-id="${account.id}" title="Reveal Password">
                                    <i class="fa-solid fa-eye"></i>
                                </button>
                                <button type="button" class="btn-icon btn-copy-password" data-id="${account.id}" title="Copy Password">
                                    <i class="fa-solid fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="card-notes">${notesText}</div>

                    <div class="account-card-footer">
                        <span class="update-time">Updated: ${dateStr}</span>
                        <div class="card-action-buttons">
                            <button type="button" class="btn-icon btn-edit" data-id="${account.id}" title="Edit Account">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button type="button" class="btn-icon btn-icon-danger btn-delete" data-id="${account.id}" title="Delete Account">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        this.cardsContainer.innerHTML = html;
    },

    attachEventListeners() {
        if (!this.container || !this.cardsContainer) return;

        // Real-time Search Input with Debounce
        const searchInput = this.container.querySelector('#accounts-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.loadAccounts(e.target.value);
                }, 300);
            });
        }

        // Add Account Button
        const addBtn = this.container.querySelector('#btn-add-account');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openAddModal());
        }

        // Card Actions (Event Delegation)
        this.cardsContainer.addEventListener('click', async (e) => {
            const copyUsernameBtn = e.target.closest('.btn-copy-username');
            const copyPasswordBtn = e.target.closest('.btn-copy-password');
            const togglePasswordBtn = e.target.closest('.btn-toggle-password');
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');

            if (copyUsernameBtn) {
                const id = copyUsernameBtn.dataset.id;
                const username = this.cardsContainer.querySelector(`#username-${id}`).textContent;
                this.copyToClipboard(username, 'Username');
            }

            if (copyPasswordBtn) {
                const id = copyPasswordBtn.dataset.id;
                const password = this.cardsContainer.querySelector(`#password-${id}`).dataset.password;
                this.copyToClipboard(password, 'Password');
            }

            if (togglePasswordBtn) {
                const id = togglePasswordBtn.dataset.id;
                const passwordEl = this.cardsContainer.querySelector(`#password-${id}`);
                const icon = togglePasswordBtn.querySelector('i');
                const isMasked = passwordEl.classList.contains('masked-password');

                if (isMasked) {
                    passwordEl.textContent = passwordEl.dataset.password;
                    passwordEl.classList.remove('masked-password');
                    icon.className = 'fa-solid fa-eye-slash';
                } else {
                    passwordEl.textContent = '••••••••••••';
                    passwordEl.classList.add('masked-password');
                    icon.className = 'fa-solid fa-eye';
                }
            }

            if (editBtn) {
                const id = editBtn.dataset.id;
                this.openEditModal(id);
            }

            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                this.confirmDelete(id);
            }
        });

        // Setup Modal Events (Once)
        this.setupModalEvents();
    },

    // Modal Control
    openAddModal() {
        const modal = document.getElementById('account-modal');
        const form = document.getElementById('account-form');
        
        document.getElementById('modal-title').textContent = 'Add New Account';
        document.getElementById('account-id').value = '';
        form.reset();

        // Reset password input toggle state
        const passwordInput = document.getElementById('acc-password');
        passwordInput.type = 'password';
        document.getElementById('toggle-acc-pass').querySelector('i').className = 'fa-solid fa-eye';

        modal.classList.remove('hidden');
    },

    async openEditModal(id) {
        try {
            const account = await window.ApiService.getAccount(id);
            const modal = document.getElementById('account-modal');
            
            document.getElementById('modal-title').textContent = 'Edit Account';
            document.getElementById('account-id').value = account.id;
            
            document.getElementById('acc-website').value = account.website;
            document.getElementById('acc-username').value = account.username;
            document.getElementById('acc-password').value = account.password;
            document.getElementById('acc-note').value = account.note || '';

            // Reset password toggle state
            const passwordInput = document.getElementById('acc-password');
            passwordInput.type = 'password';
            document.getElementById('toggle-acc-pass').querySelector('i').className = 'fa-solid fa-eye';

            modal.classList.remove('hidden');
        } catch (error) {
            window.showToast(`Failed to fetch account details: ${error.message}`, 'error');
        }
    },

    closeModal() {
        const modal = document.getElementById('account-modal');
        modal.classList.add('hidden');
    },

    setupModalEvents() {
        const modal = document.getElementById('account-modal');
        const closeBtn = document.getElementById('btn-modal-close');
        const cancelBtn = document.getElementById('btn-modal-cancel');
        const form = document.getElementById('account-form');
        const togglePassBtn = document.getElementById('toggle-acc-pass');
        const genPassBtn = document.getElementById('gen-acc-pass');

        // Close actions
        const closeActions = [closeBtn, cancelBtn];
        closeActions.forEach(btn => {
            if (btn) {
                // Remove old event listener if present (overwrite by recreating elements or standard check)
                btn.onclick = () => this.closeModal();
            }
        });

        // Overlay click close
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        };

        // Form Submit
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                
                const id = document.getElementById('account-id').value;
                const accountData = {
                    website: document.getElementById('acc-website').value.trim(),
                    username: document.getElementById('acc-username').value.trim(),
                    password: document.getElementById('acc-password').value,
                    note: document.getElementById('acc-note').value.trim() || null
                };

                const submitBtn = document.getElementById('btn-modal-submit');
                const submitSpan = submitBtn.querySelector('span');
                const originalText = submitSpan.textContent;
                submitSpan.textContent = 'Saving...';
                submitBtn.disabled = true;

                try {
                    if (id) {
                        await window.ApiService.updateAccount(id, accountData);
                        window.showToast('Account updated successfully!', 'success');
                    } else {
                        await window.ApiService.createAccount(accountData);
                        window.showToast('Account created successfully!', 'success');
                    }
                    this.closeModal();
                    
                    // Refresh current listing
                    const searchInput = this.container.querySelector('#accounts-search');
                    await this.loadAccounts(searchInput ? searchInput.value : '');
                } catch (error) {
                    window.showToast(`Error: ${error.message}`, 'error');
                } finally {
                    submitSpan.textContent = originalText;
                    submitBtn.disabled = false;
                }
            };
        }

        // Toggle Modal Password View
        if (togglePassBtn) {
            togglePassBtn.onclick = () => {
                const passInput = document.getElementById('acc-password');
                const icon = togglePassBtn.querySelector('i');
                if (passInput.type === 'password') {
                    passInput.type = 'text';
                    icon.className = 'fa-solid fa-eye-slash';
                } else {
                    passInput.type = 'password';
                    icon.className = 'fa-solid fa-eye';
                }
            };
        }

        // Generate Password Button
        if (genPassBtn) {
            genPassBtn.onclick = () => {
                const generatedPassword = this.generateSecurePassword();
                const passInput = document.getElementById('acc-password');
                passInput.value = generatedPassword;
                passInput.type = 'text'; // Show generated password immediately
                
                // Update eye icon state
                const icon = togglePassBtn.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-eye-slash';
                
                window.showToast('Secure password generated!', 'info');
            };
        }
    },

    async confirmDelete(id) {
        const confirmMsg = "Are you sure you want to delete this credential? This action cannot be undone.";
        if (confirm(confirmMsg)) {
            try {
                await window.ApiService.deleteAccount(id);
                window.showToast('Account deleted successfully.', 'success');
                
                // Refresh list
                const searchInput = this.container.querySelector('#accounts-search');
                await this.loadAccounts(searchInput ? searchInput.value : '');
            } catch (error) {
                window.showToast(`Failed to delete account: ${error.message}`, 'error');
            }
        }
    },

    // Password generator helper
    generateSecurePassword(length = 16) {
        const lowercase = "abcdefghijklmnopqrstuvwxyz";
        const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const numbers = "0123456789";
        const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        const allChars = lowercase + uppercase + numbers + symbols;
        
        let password = "";
        const array = new Uint32Array(length);
        window.crypto.getRandomValues(array);
        
        // Ensure at least one of each type is in password
        password += lowercase[array[0] % lowercase.length];
        password += uppercase[array[1] % uppercase.length];
        password += numbers[array[2] % numbers.length];
        password += symbols[array[3] % symbols.length];
        
        for (let i = 4; i < length; i++) {
            password += allChars[array[i] % allChars.length];
        }
        
        // Shuffle password
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    },

    async copyToClipboard(text, label) {
        try {
            await navigator.clipboard.writeText(text);
            window.showToast(`${label} copied to clipboard!`, 'success');
        } catch (err) {
            window.showToast(`Failed to copy ${label}`, 'error');
        }
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
};

window.AccountsView = AccountsView;
