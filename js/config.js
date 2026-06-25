// ShieldPass - Client Configuration
const CONFIG = {
    // Dynamic determination of backend base URL
    API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8080'
        : 'https://password-manager-backend.onrender.com' // Replace with your actual Render backend URL
};
window.CONFIG = CONFIG;
