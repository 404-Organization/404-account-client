// ShieldPass - API Service
const ApiService = {
    getToken() {
        return localStorage.getItem('auth_token');
    },

    async request(url, options = {}) {
        options.credentials = 'omit';
        options.headers = {
            'Accept': 'application/json',
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (options.body && typeof options.body === 'object') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${window.CONFIG.API_BASE_URL}${url}`, options);
            
            if (response.status === 401) {
                localStorage.removeItem('auth_token');
                window.dispatchEvent(new CustomEvent('app-unauthorized'));
                throw new Error('Session expired. Please sign in again.');
            }
            
            if (response.status === 204) {
                return null;
            }
            
            if (!response.ok) {
                let errorMsg = 'API request failed';
                try {
                    const err = await response.json();
                    errorMsg = err.message || err.error || errorMsg;
                } catch (e) {}
                throw new Error(errorMsg);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Request [${options.method || 'GET'}] ${url} failed:`, error);
            throw error;
        }
    },

    async fetchStats() {
        return this.request('/api/dashboard/stats');
    },

    async fetchAccounts(search = '') {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return this.request(`/api/accounts${query}`);
    },

    async getAccount(id) {
        return this.request(`/api/accounts/${id}`);
    },

    async createAccount(accountData) {
        return this.request('/api/accounts', {
            method: 'POST',
            body: accountData
        });
    },

    async updateAccount(id, accountData) {
        return this.request(`/api/accounts/${id}`, {
            method: 'PUT',
            body: accountData
        });
    },

    async deleteAccount(id) {
        return this.request(`/api/accounts/${id}`, {
            method: 'DELETE'
        });
    },

    async checkAuthStatus() {
        return this.request('/api/auth/me');
    },

    async login(username, password) {
        const response = await this.request('/api/auth/login', {
            method: 'POST',
            body: { username, password }
        });

        if (response && response.token) {
            localStorage.setItem('auth_token', response.token);
        }

        return response;
    },

    async logout() {
        const result = await this.request('/api/auth/logout', {
            method: 'POST'
        });
        localStorage.removeItem('auth_token');
        return result;
    }
};

window.ApiService = ApiService;
