function clearState() {
    writeSaveToLocalStorage("currentState",{});
}

function readSaveFromLocalStorage(saveName) {
    const saveFile = localStorage.getItem(saveName);
    var saveData;
    if (saveFile) {
        try {
            saveData = JSON.parse(LZString.decompressFromBase64(saveFile));
        }
        catch {
            console.log("Save",saveName,"is incorrectly formatted:",saveFile)
            saveData = {};
        }
    }
    else {
        saveData = {};
    }
    return saveData;
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
        return JSON.stringify(Object.assign(
            {},
            readSaveFromLocalStorage("currentState"),
            readSaveFromLocalStorage("achievements"),
        ));
    }
  })

function renameLocalStorageSave(saveId, saveNameElementId) {
    let saveName = document.getElementById(saveNameElementId).value;

    let saveData = readSaveFromLocalStorage(saveId);
    saveData['name'] = saveName;
    writeSaveToLocalStorage(saveId,saveData)
}

document.addEventListener("localsaverestored", () => {
        console.log("The Local Save Restoration has been initiated.");
        });

function downloadLocalStorageSave(saveName) {
    navigator.clipboard.writeText(localStorage.getItem(saveName));
    alert("Save copied to clipboard!")
}

function downloadAllLocalStorageSave() {
    const items = { ...localStorage };
    delete items["htmx-history-cache"]
    navigator.clipboard.writeText(LZString.compressToBase64(JSON.stringify(items)));
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
        // See if this errs
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

function restoreAchievementsSave() {
    if (!window.confirm("Do you want to overwrite your current achievements by restoring them from the save?")) {
        return;
    }

    let save_input = document.getElementById("file_achievements");
    let save_string = save_input.value;
    try {
        // See if this errs
        JSON.parse(LZString.decompressFromBase64(save_string));
        localStorage.setItem("achievements", save_string);
    } catch (e) {
        alert("The given string is not a valid save!")
        return;
    }
    htmx.trigger(save_input, "localsaverestored");
}

function restoreAllSave() {
    if (!window.confirm("Do you want to overwrite all your current saves and achievements with the restored saves?")) {
        return;
    }

    let save_input = document.getElementById("file_all");
    let save_string = save_input.value;
    try {
        const items = JSON.parse(LZString.decompressFromBase64(save_string));
        localStorage.clear();
        for (entry of Object.entries(items)) {
            localStorage.setItem(entry[0], entry[1]);
        }
    } catch (e) {
        alert("The given string is not a valid save!")
        return;
    }
    htmx.trigger(save_input, "localsaverestored");
}

function migrateAchievements() {
    // Moves achievements to their dedicated slot (new in 0.9.4)
    if (!localStorage.getItem("achievements")) {
        let data = readSaveFromLocalStorage("currentState");
        let achievementData = Object.fromEntries(Object.entries(data).filter(([key,val]) => (/v_ac_.*/.test(key)))); 
        data = Object.fromEntries(Object.entries(data).filter(([key,val]) => !(/v_ac_.*/.test(key)))); 
        writeSaveToLocalStorage("achievements",achievementData)
        writeSaveToLocalStorage("currentState",data)
    }
}

migrateAchievements()
