function catppuccinThemeButtonClick() {
    toggleCatppuccinTheme();
    updateCatppuccinThemeButtonText();
}

function updateCatppuccinThemeButtonText() {
    const buttonActivate = document.getElementById('catThemeBtnActivate');
    const buttonDeactivate = document.getElementById('catThemeBtnDeactivate');
    if (buttonActivate === null) {
        return;
    }
    
    if (document.documentElement.classList.contains('theme-catppuccin')) {
        buttonActivate.style.display = "none";
        buttonDeactivate.style.display = "flex";
    } else {
        buttonActivate.style.display = "flex";
        buttonDeactivate.style.display = "none";
    }
}

function toggleCatppuccinTheme() {
    const root = document.documentElement; // Use documentElement, not querySelector(':root')
    
    const isActive = root.classList.contains("theme-catppuccin");
    
    if (isActive) {
        root.classList.remove("theme-catppuccin");
        localStorage.setItem("catppuccinTheme", "off");
    } else {
        root.classList.add("theme-catppuccin");
        localStorage.setItem("catppuccinTheme", "on");
    }
}
