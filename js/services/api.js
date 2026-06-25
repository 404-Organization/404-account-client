// ShieldPass - Client-Side Cryptography & Zero-Knowledge Vault API

const LocalCrypto = {
    // Convert array buffer to hex string
    bufToHex(buf) {
        return Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    },

    // Convert hex string to array buffer
    hexToBuf(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes.buffer;
    },

    // Derive a key from password and salt using PBKDF2
    async deriveKey(password, saltBuffer) {
        const encoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 100000,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    // Encrypt string with password
    async encrypt(text, password) {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const key = await this.deriveKey(password, salt);
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(text)
        );

        return {
            salt: this.bufToHex(salt),
            iv: this.bufToHex(iv),
            ciphertext: this.bufToHex(encrypted)
        };
    },

    // Decrypt data with password
    async decrypt(encryptedObj, password) {
        const salt = this.hexToBuf(encryptedObj.salt);
        const iv = this.hexToBuf(encryptedObj.iv);
        const ciphertext = this.hexToBuf(encryptedObj.ciphertext);

        const key = await this.deriveKey(password, new Uint8Array(salt));
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(iv) },
            key,
            ciphertext
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }
};

const ApiService = {
    masterPassword: null,

    getMasterPassword() {
        if (this.masterPassword) return this.masterPassword;
        const cached = sessionStorage.getItem('shieldpass_master_password');
        if (cached) {
            this.masterPassword = cached;
            return cached;
        }
        return null;
    },

    setMasterPassword(password) {
        this.masterPassword = password;
        if (password) {
            sessionStorage.setItem('shieldpass_master_password', password);
        } else {
            sessionStorage.removeItem('shieldpass_master_password');
        }
    },

    isVaultInitialized() {
        return localStorage.getItem('shieldpass_vault_verification') !== null;
    },

    async initializeVault(username, password) {
        try {
            // 1. Encrypt verification token
            const verObj = await LocalCrypto.encrypt("ShieldPass-Verification-Token", password);
            // 2. Encrypt empty accounts array
            const accsObj = await LocalCrypto.encrypt("[]", password);
            
            // 3. Save to localStorage
            localStorage.setItem('shieldpass_vault_username', username);
            localStorage.setItem('shieldpass_vault_verification', JSON.stringify(verObj));
            localStorage.setItem('shieldpass_vault_accounts', JSON.stringify(accsObj));
            
            // 4. Log in
            this.setMasterPassword(password);
            localStorage.setItem('auth_token', 'local_token_dummy');
            return { success: true, username: username };
        } catch (error) {
            console.error("Vault initialization failed:", error);
            throw new Error("Failed to initialize vault: " + error.message);
        }
    },

    async login(username, password) {
        const verStr = localStorage.getItem('shieldpass_vault_verification');
        if (!verStr) {
            throw new Error('Vault not initialized. Please set up your Master Password first.');
        }
        
        try {
            const verObj = JSON.parse(verStr);
            const decrypted = await LocalCrypto.decrypt(verObj, password);
            if (decrypted !== "ShieldPass-Verification-Token") {
                throw new Error('Incorrect master password');
            }
        } catch (e) {
            throw new Error('Incorrect master password');
        }
        
        const storedUsername = localStorage.getItem('shieldpass_vault_username') || 'admin';
        this.setMasterPassword(password);
        localStorage.setItem('auth_token', 'local_token_dummy');
        return { token: 'local_token_dummy', username: storedUsername };
    },

    async logout() {
        this.setMasterPassword(null);
        localStorage.removeItem('auth_token');
        return true;
    },

    async checkAuthStatus() {
        const token = localStorage.getItem('auth_token');
        const pass = this.getMasterPassword();
        const username = localStorage.getItem('shieldpass_vault_username') || 'admin';
        
        if (token && pass) {
            return { authenticated: true, username: username };
        }
        return { authenticated: false };
    },

    async getDecryptedAccounts() {
        const pass = this.getMasterPassword();
        if (!pass) {
            throw new Error('Vault is locked. Please unlock first.');
        }
        const accsStr = localStorage.getItem('shieldpass_vault_accounts');
        if (!accsStr) {
            return [];
        }
        try {
            const accsObj = JSON.parse(accsStr);
            const decrypted = await LocalCrypto.decrypt(accsObj, pass);
            return JSON.parse(decrypted);
        } catch (e) {
            console.error("Failed to decrypt accounts:", e);
            throw new Error('Failed to decrypt vault. Key incorrect or data corrupted.');
        }
    },

    async saveEncryptedAccounts(accounts) {
        const pass = this.getMasterPassword();
        if (!pass) {
            throw new Error('Vault is locked. Please unlock first.');
        }
        const encrypted = await LocalCrypto.encrypt(JSON.stringify(accounts), pass);
        localStorage.setItem('shieldpass_vault_accounts', JSON.stringify(encrypted));
    },

    async fetchStats() {
        const accounts = await this.getDecryptedAccounts();
        const sortedRecent = accounts.slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        return {
            totalAccounts: accounts.length,
            recentAccounts: sortedRecent
        };
    },

    async fetchAccounts(search = '') {
        const accounts = await this.getDecryptedAccounts();
        if (!search) {
            return accounts.sort((a, b) => (a.website || '').localeCompare(b.website || ''));
        }
        const lowerSearch = search.toLowerCase();
        return accounts.filter(acc => 
            (acc.website && acc.website.toLowerCase().includes(lowerSearch)) || 
            (acc.username && acc.username.toLowerCase().includes(lowerSearch))
        ).sort((a, b) => (a.website || '').localeCompare(b.website || ''));
    },

    async getAccount(id) {
        const accounts = await this.getDecryptedAccounts();
        const account = accounts.find(acc => String(acc.id) === String(id));
        if (!account) {
            throw new Error(`Account not found with id: ${id}`);
        }
        return account;
    },

    async createAccount(accountData) {
        const accounts = await this.getDecryptedAccounts();
        const now = new Date().toISOString();
        const newAccount = {
            id: Date.now().toString(),
            website: accountData.website,
            username: accountData.username,
            password: accountData.password,
            note: accountData.note,
            createdAt: now,
            updatedAt: now
        };
        accounts.push(newAccount);
        await this.saveEncryptedAccounts(accounts);
        return newAccount;
    },

    async updateAccount(id, accountData) {
        const accounts = await this.getDecryptedAccounts();
        const idx = accounts.findIndex(acc => String(acc.id) === String(id));
        if (idx === -1) {
            throw new Error(`Account not found with id: ${id}`);
        }
        const now = new Date().toISOString();
        accounts[idx] = {
            ...accounts[idx],
            website: accountData.website,
            username: accountData.username,
            password: accountData.password,
            note: accountData.note,
            updatedAt: now
        };
        await this.saveEncryptedAccounts(accounts);
        return accounts[idx];
    },

    async deleteAccount(id) {
        let accounts = await this.getDecryptedAccounts();
        accounts = accounts.filter(acc => String(acc.id) !== String(id));
        await this.saveEncryptedAccounts(accounts);
        return null;
    },

    async importVault(backupData) {
        if (!backupData.shieldpass_vault_verification || !backupData.shieldpass_vault_accounts) {
            throw new Error('Invalid backup file format.');
        }
        localStorage.setItem('shieldpass_vault_username', backupData.shieldpass_vault_username || 'admin');
        localStorage.setItem('shieldpass_vault_verification', JSON.stringify(backupData.shieldpass_vault_verification));
        localStorage.setItem('shieldpass_vault_accounts', JSON.stringify(backupData.shieldpass_vault_accounts));
        return true;
    },

    async exportVault() {
        const username = localStorage.getItem('shieldpass_vault_username') || 'admin';
        const verStr = localStorage.getItem('shieldpass_vault_verification');
        const accsStr = localStorage.getItem('shieldpass_vault_accounts');
        
        if (!verStr || !accsStr) {
            throw new Error('Vault is not set up. Nothing to export.');
        }
        
        return {
            shieldpass_vault_username: username,
            shieldpass_vault_verification: JSON.parse(verStr),
            shieldpass_vault_accounts: JSON.parse(accsStr)
        };
    }
};

window.ApiService = ApiService;
