function isFirefox() {
    return !!((typeof browser !== 'undefined') && browser.runtime && browser.runtime?.getURL("./").startsWith("moz-extension://"));
}

function init() {
    if (document.getElementById('verstr')) document.getElementById('verstr').textContent = browser.runtime.getManifest().version;
    if (document.getElementById('ffo') && isFirefox()) document.getElementById('ffo').style.display = 'block';
    document.querySelectorAll('.settings').forEach((elm) => {
        elm.addEventListener('click', () => browser.runtime.openOptionsPage())
    });
}

window.addEventListener('DOMContentLoaded', init);
