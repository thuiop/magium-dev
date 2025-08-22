function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
}

function storeItem(key,value) {
    let data = readSaveFromLocalStorage("currentState")
    value = value.toString();
    if (value.startsWith("+")){
        data[key] = (data[key] || 0) + parseInt(value.slice(1))
    }
    else if (value.startsWith("-")){
        data[key] = (data[key] || 0) - parseInt(value.slice(1))
    }
    else {
        data[key] = value;
    }
    writeSaveToLocalStorage("currentState",data)
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

function navigateTo(url) {
    window.location.href = url;
}

function scrollToTop() {
  window.scroll(0, 0);
}

function setResponseVariables(response) {
  scrollToTop();

  for (const [key, value] of Object.entries(response.setVariables)) {
      storeItem(key,value)
  }
}

