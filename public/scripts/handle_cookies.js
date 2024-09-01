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
    let pair;
    for (let i = 0; i < pairs.length; i++) {
        pair = pairs[i].split("=");
        cookies[(pair[0] + '').trim()] = unescape(pair.slice(1).join('='));
    }
    return cookies;
};

function storeItem(key, value) {
    document.cookie = key + "=" + value;
}

function cookieAdd(name, value) {
    const current_value = getCookie(name)
    storeItem(name, parseInt(current_value) + parseInt(value))
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
