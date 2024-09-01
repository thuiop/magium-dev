function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }
    return null;
}

var getCookies = function () {
    var pairs = document.cookie.split(";");
    var cookies = {};
    for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("=");
        cookies[(pair[0] + '').trim()] = unescape(pair.slice(1).join('='));
    }
    return cookies;
}

function storeItem(key, value) {
    document.cookie = key + "=" + value;
}

function cookieAdd(name, value) {
    const current_value = getCookie(name)
    storeItem(name, parseInt(current_value) + parseInt(value))
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


function setResponseCookies(response) {
    for (const [key, value] of Object.entries(response.set_variables)) {
        if (value.startsWith("+")) {
            cookieAdd(key, value.slice(1))
        } else {
            storeItem(key, value)
        }
    }
}

function saveGameToLocalStorage(saveName, overwrite = false) {
    if (overwrite && !window.confirm("Do you want to overwrite your save?")) {
        return;
    }

    let cookies = getCookies();
    const today = new Date();
    const curDateTime = today.toUTCString()
    cookies.date = curDateTime
    cookies.name = curDateTime

    if (localStorage) {
        localStorage.setItem(saveName, JSON.stringify(cookies));
    } else {
        console.log("localStorage not supported");
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


function loadGameFromLocalStorage(saveName) {
    if (localStorage) {
        const data = JSON.parse(localStorage.getItem(saveName));
        clearState()
        Object.entries(data).forEach((entry) => storeItem(entry[0], entry[1]))
    } else {
        console.log("localStorage not supported");
    }
}

htmx.defineExtension('submitlocalstorage', {
    onEvent: function (name, evt) {
        if (name === "htmx:configRequest") {
            evt.detail.headers['Content-Type'] = "application/json"
        }
    },
    encodeParameters: function (xhr, parameters, elt) {
        xhr.overrideMimeType('text/json') // override default mime type
        let data = Object.assign({}, localStorage)
        console.log("local Storage Data: ", data);
        Object.keys(data).forEach(function (key, index) {
            try {
                data[key] = JSON.parse(data[key]);
            } catch {
                console.log("The following is not a JSON object: ", key);
            }
        });
        delete data["htmx-history-cache"]
        return (JSON.stringify(data))
    }
})
