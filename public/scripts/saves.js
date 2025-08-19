function clearState() {
    let data = readSaveFromLocalStorage("currentState");
    data = Object.entries(data).filter((keyval) => {
        let key = keyval[0];
        return (/v_.*/.test(key) && !(/.*_ac_.*/.test(key))); 
    })
    saveGameToLocalStorage("currentState")
}

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

    if (localStorage) {
        let data = readSaveFromLocalStorage("currentState");
        const today = new Date();
        const curDateTime = today.toUTCString()
        data.date = curDateTime
        data.name = curDateTime

        writeSaveToLocalStorage(saveName,data);
    }
    else {
        console.log("localStorage not supported");
    }
}

function loadGameFromLocalStorage(saveName) {
    if (localStorage) {
        const data = readSaveFromLocalStorage(saveName);
        writeSaveToLocalStorage("currentState",data);
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
        Object.keys(data).forEach(function(key, index) {
            try {
                data[key] = JSON.parse(LZString.decompressFromBase64(data[key]));
            }
            catch {
                console.log("The following is not a JSON object: ", key);
            }
        });
        delete data["htmx-history-cache"]
        return JSON.stringify(data)
    }
  })


htmx.defineExtension('submitcurrentstate', {
    onEvent: function (name, evt) {
        if (name === "htmx:configRequest") {
            evt.detail.headers['Content-Type'] = "application/json"
        }
    },
    encodeParameters: function(xhr, parameters, elt) {
        xhr.overrideMimeType('text/json') // override default mime type
        return LZString.decompressFromBase64(localStorage.getItem("currentState"));
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
    try {
        JSON.parse(LZString.decompressFromBase64(save_string));
        localStorage.setItem(`save${i}`, save_string);
    } catch (e) {
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
    }
    htmx.trigger(save_input, "localsaverestored");
}


