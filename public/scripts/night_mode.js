(function() {
    updateNightModeButtonText();
})();

document.addEventListener('DOMContentLoaded', updateNightModeButtonText);

function nightModeButtonClick() {
    toggleTheme();
    updateNightModeButtonText();
}

function updateNightModeButtonText() {
    const theme = getCookie('data-theme');
    const buttonActivate = document.getElementById('themeToggleBtnActivate');
    const buttonDeactivate = document.getElementById('themeToggleBtnDeactivate');
    if (theme === "dark") {
        buttonActivate.style.display = "flex";    
        buttonDeactivate.style.display = "none";    
    }
    else {
        buttonActivate.style.display = "none";
        buttonDeactivate.style.display = "flex";    
    }
}

function toggleTheme() {
    const theme = getCookie('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(theme);
}
