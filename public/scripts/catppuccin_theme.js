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

const Theme = {
  LIGHT: "original-light",
  DARK: "original-dark",
  CAT_LIGHT: "catppuccin-light",
  CAT_DARK: "catppuccin-dark",
};

function setCatppuccinTheme(theme) {
    const root = document.documentElement;
    
    const isActive = root.classList.contains("theme-catppuccin");
    
    if (isActive) {
        root.classList.remove("theme-catppuccin");
        localStorage.setItem("catppuccinTheme", "off");
    } else {
        root.classList.add("theme-catppuccin");
        localStorage.setItem("catppuccinTheme", "on");
    }
}

function handleThemeChange(selectedValue) {
    if (selectedValue === Theme.DARK) {
        nightModeButtonClick();
    } else if (selectedValue === Theme.CAT_LIGHT || selectedValue === Theme.CAT_DARK) {
        setCatppuccinTheme(selectedValue);
    } else if (selectedValue === Theme.LIGHT) {
        setCatppuccinTheme("off"); // Or use a separate function for default themes
    }
}