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
        data[key] = parseInt(data[key] || 0) + parseInt(value.slice(1));
    }
    else if (value.startsWith("-")){
        data[key] = parseInt(data[key] || 0) - parseInt(value.slice(1));
    }
    else {
        data[key] = value;
    }
    if (key == "v_ac_b3_ch9_consolation" && data[key] == 5) {
        data["v_ac_b3_ch9_prize"] = 1;
    }
    writeSaveToLocalStorage(storageId,data);
}

function storeVariable(key,value) {
    if (key.startsWith("v_ac_")){
        let data = readSaveFromLocalStorage("achievements");
        if (data[key] != 2) {
            storeItem(key,value,"achievements");
        }
    }
    else {
        storeItem(key,value,"currentState");
    }
}


function initializeFontSizeSlider() {
    const fontSizeElem = document.getElementById("fontSize");
    const currentFontSize = document.documentElement.style.fontSize;
    if (currentFontSize) {
        const currentFontSizePx = parseFloat(currentFontSize.slice(0,-2));
        if (currentFontSizePx) {
            fontSizeElem.value = currentFontSizePx / 16;
            fontSizeElem.classList.remove("js-loading");
            return;
        }
    }
    fontSizeElem.value = 1;
    fontSizeElem.classList.remove("js-loading");
}

function updateFontSize() {
    const fontSizeElem = document.getElementById("fontSize");
    const fontSize = parseFloat(fontSizeElem.value);
    document.documentElement.style.setProperty("font-size",`${16*fontSize}px`);
    document.cookie = `fontsize=${16*fontSize}px`;
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

async function copyToClipboard(textToCopy) {
    // Navigator clipboard api needs a secure context (https)
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
    } else {
        // Use the 'out of viewport hidden text area' trick
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
            
        // Move textarea out of the viewport so it's not visible
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
            
        document.body.prepend(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
        } catch (error) {
            console.error(error);
        } finally {
            textArea.remove();
        }
    }
}


