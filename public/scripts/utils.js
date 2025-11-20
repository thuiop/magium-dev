function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
}

function storeItem(key,value,storageId) {
    let data = readSaveFromLocalStorage(storageId);
    value = value.toString();
    if (value.startsWith("+")){
        data[key] = (data[key] || 0) + parseInt(value.slice(1));
    }
    else if (value.startsWith("-")){
        data[key] = (data[key] || 0) - parseInt(value.slice(1));
    }
    else {
        data[key] = value;
    }
    writeSaveToLocalStorage(storageId,data);
}

function storeVariable(key,value) {
    if (key.startsWith("v_ac_")){
        let data = readSaveFromLocalStorage("achievements");
        if (data[key] != "2") {
            storeItem(key,value,"achievements");
        }
    }
    else {
        storeItem(key,value,"currentState");
    }
}

function navigateTo(url) {
    window.location.href = url;
}

function setResponseVariables(response) {
  window.scroll(0, 0);

  for (const [key, value] of Object.entries(response.setVariables)) {
      storeVariable(key,value)
  }
}

