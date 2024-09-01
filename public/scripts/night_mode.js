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