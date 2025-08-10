function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
}

const getCookies = function () {
    const pairs = document.cookie.split(";");
    const cookies = {};
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split("=");
        cookies[(pair[0] + '').trim()] = unescape(pair.slice(1).join('='));
    }
    return cookies;
};

function cookieSet(key,value) {
    document.cookie = key+"="+value+";path=/";
}

function cookieAdd(name,value) {
    const current_value = getCookie(name) || 0
    cookieSet(name,parseInt(current_value)+parseInt(value))
}

function storeItem(key,value) {
      value = value.toString();
      if (value.startsWith("+")){
          cookieAdd(key,value.slice(1))
      }
      else if (value.startsWith("-")){
          cookieAdd(key,-parseInt(value.slice(1)))
      }
      else {
          cookieSet(key,value)
      }
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

function setResponseCookies(response) {
  scrollToTop();

  for (const [key, value] of Object.entries(response.setVariables)) {
      storeItem(key,value)
  }
}

function clearState() {
    document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
        if (/v_.*/.test(name) && !(/.*_ac_.*/.test(name))) {
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
    });
}


