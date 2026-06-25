// ShieldPass - API Service
const ApiService = {
    async request(url, options = {}) {
        options.credentials = 'include'; // Ensure JSESSIONID session cookie is included
        options.headers = {
            'Accept': 'application/json',
            ...options.headers
        };
        
        if (options.body && typeof options.body === 'object') {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${window.CONFIG.API_BASE_URL}${url}`, options);
            
            if (response.status === 401) {
                // Dispatch unauthorized event to trigger app redirection to login
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
        return this.request('/api/auth/login', {
            method: 'POST',
            body: { username, password }
        });
    },

    async logout() {
        return this.request('/api/auth/logout', {
            method: 'POST'
        });
    }
};

window.ApiService = ApiService;
