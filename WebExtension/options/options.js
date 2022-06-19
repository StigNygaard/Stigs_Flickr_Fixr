let defaults = {
    scaler: true,
    albumExtras: true,
    topPagination: true,
    shootingSpaceballs: true,
    orderWarning: true,
    topMenuItems: true,
    newsfeedLinks: true,
    photoDates: true,
    ctrlClicking: ((typeof browser !== 'undefined') && browser.runtime && browser.runtime.getURL("./").includes("moz-extension://")), // default enabled for firefox
    exploreCalendar: true,
    albumTeaser: true,
    insertGMapLink: true,
    updateTags: true,
    updateTags_tagmode: "updateTags_hover",
    slideshowSpeedControl: true,
    slideshowSpeedControl_value: '5'
};

function saveOptions(e) {
    e.preventDefault();
    browser.storage.local.set({
        scaler: document.querySelector("form#fixroptions #scaler").checked,
        albumExtras: document.querySelector("form#fixroptions #albumExtras").checked,
        topPagination: document.querySelector("form#fixroptions #topPagination").checked,
        shootingSpaceballs: document.querySelector("form#fixroptions #shootingSpaceballs").checked,
        orderWarning: document.querySelector("form#fixroptions #orderWarning").checked,
        topMenuItems: document.querySelector("form#fixroptions #topMenuItems").checked,
        newsfeedLinks: document.querySelector("form#fixroptions #newsfeedLinks").checked,
        photoDates: document.querySelector("form#fixroptions #photoDates").checked,
        ctrlClicking: document.querySelector("form#fixroptions #ctrlClicking").checked,
        exploreCalendar: document.querySelector("form#fixroptions #exploreCalendar").checked,
        albumTeaser: document.querySelector("form#fixroptions #albumTeaser").checked,
        insertGMapLink: document.querySelector("form#fixroptions #insertGMapLink").checked,
        updateTags: document.querySelector("form#fixroptions #updateTags").checked,
        updateTags_tagmode: document.querySelector('form#fixroptions input[name="updateTags_tagmode"]:checked').value,
        slideshowSpeedControl: document.querySelector("form#fixroptions #slideshowSpeedControl").checked,
        slideshowSpeedControl_value: document.querySelector('form#fixroptions input#slideshowSpeedControl_value').value
    }); // then ( "saved ok" message? )
}

function withOptionsDo(handler) {
    function onError(error) {
        console.log(`Error: ${error}`);
        return defaults;
    }
    function setCurrentChoice(result) {
        // Merge default with loaded values:
        return Object.assign(defaults, result);
    }
    var getting = browser.storage.local.get();
    getting.then(setCurrentChoice, onError).then(handler);
}

function displaySlideshowSpeed() {
    document.getElementById('slideshowSpeed').innerText = document.querySelector("form#fixroptions #slideshowSpeedControl_value").value;
}

function handlerInitOptionsPage(options) {
    // restore options:
    document.querySelector("form#fixroptions #scaler").checked = options.scaler;
    document.querySelector("form#fixroptions #albumExtras").checked = options.albumExtras;
    document.querySelector("form#fixroptions #topPagination").checked = options.topPagination;
    document.querySelector("form#fixroptions #shootingSpaceballs").checked = options.shootingSpaceballs;
    document.querySelector("form#fixroptions #orderWarning").checked = options.orderWarning;
    document.querySelector("form#fixroptions #topMenuItems").checked = options.topMenuItems;
    document.querySelector("form#fixroptions #newsfeedLinks").checked = options.newsfeedLinks;
    document.querySelector("form#fixroptions #photoDates").checked = options.photoDates;
    document.querySelector("form#fixroptions #ctrlClicking").checked= options.ctrlClicking;
    document.querySelector("form#fixroptions #exploreCalendar").checked = options.exploreCalendar;
    document.querySelector("form#fixroptions #albumTeaser").checked = options.albumTeaser;
    document.querySelector("form#fixroptions #insertGMapLink").checked = options.insertGMapLink;
    document.querySelector("form#fixroptions #updateTags").checked = options.updateTags;
    document.getElementById(options.updateTags_tagmode).checked = true;
    document.querySelector("form#fixroptions #slideshowSpeedControl").checked = options.slideshowSpeedControl;
    document.querySelector("form#fixroptions #slideshowSpeedControl_value").value = options.slideshowSpeedControl_value;

    displaySlideshowSpeed();
    // enable submit:
    document.querySelector("form#fixroptions").addEventListener("input", saveOptions);
}

function initializeOptionsPage() {
    if (document.querySelector('div#fixroptionspage form#fixroptions')) { // Only run if Options page
        document.querySelector('div#fixroptionspage #verstr').textContent = browser.runtime.getManifest().version;
        document.getElementById('slideshowSpeedControl_value').addEventListener('input', displaySlideshowSpeed);
        if ((typeof browser !== 'undefined') && browser.runtime && browser.runtime.getURL("./").includes("moz-extension://")) { // if firefox...
            document.body.classList.add("isFirefox");
        }
        withOptionsDo(handlerInitOptionsPage);
    }
}

window.addEventListener("DOMContentLoaded", initializeOptionsPage);
