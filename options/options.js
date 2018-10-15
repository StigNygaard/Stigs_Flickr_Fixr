let defaults = {
    scaler: true,
    albumExtras: true,
    topPagination: true,
    shootingSpaceballs: true,
    orderWarning: true,
    topMenuItems: true,
    photoDates: true,
    ctrlClicking: (browser && browser.runtime && browser.runtime.getURL("./").includes("moz-extension://")), // default enabled for firefox
    exploreCalendar: true,
    albumTeaser: true,
    updateMapLink: true,
    updateTags: true
};

function saveOptions(e) {
    e.preventDefault();
    browser.storage.local.set({
        scaler: document.querySelector("#scaler").checked,
        albumExtras: document.querySelector("#albumExtras").checked,
        topPagination: document.querySelector("#topPagination").checked,
        shootingSpaceballs: document.querySelector("#shootingSpaceballs").checked,
        orderWarning: document.querySelector("#orderWarning").checked,
        topMenuItems: document.querySelector("#topMenuItems").checked,
        photoDates: document.querySelector("#photoDates").checked,
        ctrlClicking: document.querySelector("#ctrlClicking").checked,
        exploreCalendar: document.querySelector("#exploreCalendar").checked,
        albumTeaser: document.querySelector("#albumTeaser").checked,
        updateMapLink: document.querySelector("#updateMapLink").checked,
        updateTags: document.querySelector("#updateTags").checked
    });
}

function withOptionsDo(handler) {
    function onError(error) {
        console.log(`Error: ${error}`);
    }
    function setCurrentChoice(result) {
        // Merge default with loaded values
        result = Object.assign(defaults, result);
        return result;
    }
    var getting = browser.storage.local.get();
    getting.then(setCurrentChoice, onError).then(handler);
}

function handlerInitOptionsPage(options) {
    // restore options:
    document.querySelector("#scaler").checked = options.scaler;
    document.querySelector("#albumExtras").checked = options.albumExtras;
    document.querySelector("#topPagination").checked = options.topPagination;
    document.querySelector("#shootingSpaceballs").checked = options.shootingSpaceballs;
    document.querySelector("#orderWarning").checked = options.orderWarning;
    document.querySelector("#topMenuItems").checked = options.topMenuItems;
    document.querySelector("#photoDates").checked = options.photoDates;
    document.querySelector("#ctrlClicking").checked= options.ctrlClicking;
    document.querySelector("#exploreCalendar").checked = options.exploreCalendar;
    document.querySelector("#albumTeaser").checked = options.albumTeaser;
    document.querySelector("#updateMapLink").checked = options.updateMapLink;
    document.querySelector("#updateTags").checked = options.updateTags;
    // enable submit
    document.querySelector("form#fixroptions").addEventListener("submit", saveOptions);
}

function initializeOptionsPage() {
    if (document.querySelector('form#fixroptions')) { // Only run if Options page
        withOptionsDo(handlerInitOptionsPage);
    }
}

// options page only:
window.addEventListener("DOMContentLoaded", initializeOptionsPage);
