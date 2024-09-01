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
