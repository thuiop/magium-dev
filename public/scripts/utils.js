function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
}

function storeItem(key,value) {
    document.cookie = key+"="+value;
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.cookie = 'data-theme=' + theme;
}

// On page load, set the theme based on the cookie
document.addEventListener('DOMContentLoaded', () => {
    const theme = getCookie('data-theme') || 'light'; // Default to 'light' if no cookie is found
    setTheme(theme);
});

function toggleTheme() {
    const theme = getCookie('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(theme);
}

function navigateTo(url) {
    window.location.href = url;
}