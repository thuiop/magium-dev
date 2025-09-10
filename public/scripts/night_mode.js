(function() {
    updateNightModeButtonText();
})();

document.addEventListener('DOMContentLoaded', updateNightModeButtonText);

function checkIsDarkSchemePreferred() {
    return window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ?? false;
}

function nightModeButtonClick() {
    toggleTheme();
    updateNightModeButtonText();
}

function updateNightModeButtonText() {
    const buttonActivate = document.getElementById('themeToggleBtnActivate');
    const buttonDeactivate = document.getElementById('themeToggleBtnDeactivate');
    if (buttonActivate === null) {
        return;
    }
    const root = document.querySelector(':root');
    const currentMode = root.style.getPropertyValue("color-scheme");
    // For some reason it sometimes is an empty string instead of "light dark"
    const currentModeIsDefault = currentMode === "light dark" || currentMode === "";
    if (currentMode === "dark" || (currentModeIsDefault && checkIsDarkSchemePreferred())) {
        buttonActivate.style.display = "none";
        buttonDeactivate.style.display = "flex";    
    }
    else {
        buttonActivate.style.display = "flex";    
        buttonDeactivate.style.display = "none";    
    }
}

function toggleTheme() {
    const root = document.querySelector(':root');
    const currentMode = root.style.getPropertyValue("color-scheme");
    var newMode;
    if (currentMode === "light dark") {
        newMode = dark;
    }
    else {
        newMode = currentMode === "dark" ? "light" : "dark"
    }
    root.style.setProperty("color-scheme", newMode);
    localStorage.setItem("nightmode", newMode);
}

htmx.defineExtension('submitnightmode', {
    onEvent: function (name, evt) {
        if (name === "htmx:configRequest") {
            evt.detail.headers['Content-Type'] = "application/json"
        }
    },
    encodeParameters: function(xhr, parameters, elt) {
        xhr.overrideMimeType('text/json') // override default mime type
        const root = document.querySelector(':root');
        const currentMode = root.style.getPropertyValue("color-scheme");
        const currentModeIsDefault = currentMode === "light dark" || currentMode === "";
        return JSON.stringify({"nightmode":currentMode === "dark" || (currentModeIsDefault && checkIsDarkSchemePreferred()) ? "dark" : "light"});
    }
  })
