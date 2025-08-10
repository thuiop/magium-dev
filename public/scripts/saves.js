function readSaveFromLocalStorage(saveName) {
    return JSON.parse(LZString.decompressFromBase64(localStorage.getItem(saveName)));
}

function writeSaveToLocalStorage(saveName,saveObject) {
    localStorage.setItem(saveName,LZString.compressToBase64(JSON.stringify(saveObject)));
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

    console.log(cookies)

    if (localStorage) {
        writeSaveToLocalStorage(saveName,cookies);
    }
    else {
        console.log("localStorage not supported");
    }
}

function loadGameFromLocalStorage(saveName) {
    if (localStorage) {
        const data = readSaveFromLocalStorage(saveName);
        clearState()
        Object.entries(data).forEach((entry) => storeItem(entry[0],entry[1]))
    }
    else {
        console.log("localStorage not supported");
    }
}

htmx.defineExtension('submitlocalstorage', {
    onEvent: function (name, evt) {
        if (name === "htmx:configRequest") {
            evt.detail.headers['Content-Type'] = "application/json"
        }
    },
    encodeParameters: function(xhr, parameters, elt) {
        xhr.overrideMimeType('text/json') // override default mime type
        let data = Object.assign({},localStorage)
        console.log("local Storage Data: ", data);
        Object.keys(data).forEach(function(key, index) {
            try {
                data[key] = JSON.parse(LZString.decompressFromBase64(data[key]));
            }
            catch {
                console.log("The following is not a JSON object: ", key);
            }
        });
        delete data["htmx-history-cache"]
        return (JSON.stringify(data))
    }
  })

function renameLocalStorageSave(saveName, saveNameId) {
    let save_name = document.getElementById(saveNameId).value;

    let data = readSaveFromLocalStorage(saveName);
    data['name'] = saveName;
    localStorage.setItem(saveName, JSON.stringify(data));
}

document.addEventListener("localsaverestored", () => {
        console.log("The Local Save Restoration has been initiated.");
        });

function downloadLocalStorageSave(saveName) {
    navigator.clipboard.writeText(localStorage.getItem(saveName));
    alert("Save copied to clipboard!")
}

// function to upload a savegame into local storage
function restoreLocalStorageSave(i, overwrite = false) {
    if (overwrite && !window.confirm("Do you want to overwrite your save by restoring the current save?")) {
        return;
    }

    let save_input = document.getElementById(`file_${i}`);
    let save_string = save_input.value;
    let plain_save_string = atob(save_string);
    if (plain_save_string[0] === "{") {
        try {
            let saveObject = JSON.parse(plain_save_string);
            writeSaveToLocalStorage(`save${i}`,saveObject);
        } catch (e) {
            alert("The given string is not a valid save!")
                return;
        }
    }
    else {
        try {
            JSON.parse(LZString.decompressFromBase64(save_string));
        } catch (e) {
            alert("The given string is not a valid save!")
                return;
        }

        localStorage.setItem(`save${i}`, save_string);
    }
    htmx.trigger(save_input, "localsaverestored");
}


