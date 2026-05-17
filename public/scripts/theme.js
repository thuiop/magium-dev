const Theme = {
    LIGHT: "original-light",
    DARK: "original-dark",
    CAT_LIGHT: "catppuccin-light",
    CAT_DARK: "catppuccin-dark",
};

function checkIsDarkSchemePreferred() {
    return window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ?? false;
}

function setColour(selectedValue) {
    const root = document.querySelector(':root');
    var newMode;
    if (selectedValue === Theme.DARK || selectedValue === Theme.CAT_DARK) {
        newMode = "dark";
    } else if (selectedValue === Theme.LIGHT || selectedValue === Theme.CAT_LIGHT) {
        newMode = "light";
    } else {
        throw new Error("Theme not specified");
    }
    root.style.setProperty("color-scheme", newMode);
    localStorage.setItem("nightmode", newMode);
}

function setTheme(selectedValue) {
    const root = document.documentElement;
    
    // const isActive = root.classList.contains("theme-catppuccin");
    
    if (selectedValue === Theme.LIGHT || selectedValue === Theme.DARK) {
        if (root.classList.contains("theme-catppuccin"))
            root.classList.remove("theme-catppuccin");
    } else if (selectedValue === Theme.CAT_LIGHT || selectedValue === Theme.CAT_DARK) {
        if (!root.classList.contains("theme-catppuccin"))
            root.classList.add("theme-catppuccin");
    } else {
        throw new Error("Theme not specified");
    }
}

function handleThemeChange(selectedValue) {
    setColour(selectedValue);
    setTheme(selectedValue);

    localStorage.setItem("theme", selectedValue);
}
