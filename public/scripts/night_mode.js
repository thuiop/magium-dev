function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.cookie = 'data-theme=' + theme;
}

// On page load, set the theme based on the cookie
document.addEventListener('DOMContentLoaded', () => {
    const theme = getCookie('data-theme') || 'light'; // Default to 'light' if no cookie is found
    setTheme(theme);
});

(function () {
    updateNightModeButtonText();
})();

document.addEventListener('DOMContentLoaded', updateNightModeButtonText);

function nightModeButtonClick() {
    toggleTheme();
    updateNightModeButtonText();
}

function updateNightModeButtonText() {
    const theme = getCookie('data-theme');
    const button = document.getElementById('themeToggleBtn');
    button.textContent = theme === 'dark' ? 'Deactivate night mode' : 'Activate night mode';
}

function toggleTheme() {
    const theme = getCookie('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(theme);
}