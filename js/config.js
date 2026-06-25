// ShieldPass - Client Configuration
const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isNetlifyHost = ['404account.netlify.app', '404account888.netlify.app'].includes(window.location.hostname) || window.location.hostname.endsWith('.netlify.app');

const CONFIG = {
    API_BASE_URL: isLocalhost
        ? 'http://localhost:8080'
        : (isNetlifyHost ? 'https://four04-account-server-zfj4.onrender.com' : 'https://four04-account-server-zfj4.onrender.com')
};
window.CONFIG = CONFIG;
