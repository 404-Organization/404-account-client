// ShieldPass - Client Configuration
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isNetlifyHost = window.location.hostname.endsWith('.netlify.app') || window.location.hostname === '404account.netlify.app';

const CONFIG = {
    API_BASE_URL: isLocalhost
        ? 'http://localhost:8080'
        : (isNetlifyHost ? 'https://four04-account-server.onrender.com' : 'https://four04-account-server.onrender.com')
};
window.CONFIG = CONFIG;
