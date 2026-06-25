// ShieldPass - Dashboard View Controller
const DashboardView = {
    async render(container) {
        container.innerHTML = `
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-info">
                        <h4>Total Credentials</h4>
                        <div class="stat-value">...</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fa-solid fa-key"></i>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <h4>Recently Active</h4>
                        <div class="stat-value">...</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>
                </div>
            </div>
            <div class="dashboard-bottom-grid" style="margin-top: 24px;">
                <div class="content-card">
                    <div class="card-header">
                        <h3>Recently Added</h3>
                        <a href="#accounts" class="btn btn-secondary">
                            <span>View All</span>
                            <i class="fa-solid fa-arrow-right"></i>
                        </a>
                    </div>
                    <div class="recent-list" id="recent-accounts-list">
                        <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                            <i class="fa-solid fa-circle-notch fa-spin"></i> Loading...
                        </div>
                    </div>
                </div>
            </div>
        `;

        try {
            const stats = await window.ApiService.fetchStats();
            
            // Update stats values
            container.querySelector('.stats-row').innerHTML = `
                <div class="stat-card">
                    <div class="stat-info">
                        <h4>Total Credentials</h4>
                        <div class="stat-value">${stats.totalAccounts}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fa-solid fa-key"></i>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <h4>Recently Added</h4>
                        <div class="stat-value">${stats.recentAccounts.length}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>
                </div>
            ]; // wait, typo here, will fix
            `;
            
            this.renderRecentAccounts(container.querySelector('#recent-accounts-list'), stats.recentAccounts);
        } catch (error) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fa-solid fa-circle-xmark"></i>
                    <span>Failed to load dashboard data: ${error.message}</span>
                </div>
            `;
        }
    },

    renderRecentAccounts(listContainer, accounts) {
        if (!accounts || accounts.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i class="fa-solid fa-vault" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                    No accounts stored yet. Click "View All" to add one!
                </div>
            `;
            return;
        }

        let html = '';
        accounts.forEach(account => {
            const initial = account.website ? account.website.charAt(0).toUpperCase() : '?';
            html += `
                <div class="recent-item">
                    <div class="recent-left">
                        <div class="recent-site-icon">
                            <span>${initial}</span>
                        </div>
                        <div class="recent-details">
                            <h5>${this.escapeHTML(account.website)}</h5>
                            <span>${this.escapeHTML(account.username)}</span>
                        </div>
                    </div>
                    <div class="recent-right">
                        <span class="time-stamp">${this.formatDate(account.createdAt)}</span>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

window.DashboardView = DashboardView;
