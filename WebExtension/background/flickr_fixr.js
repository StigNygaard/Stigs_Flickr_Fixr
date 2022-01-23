var versionnumber = (function Versionnumber() {  // major.minor.revision
    function current() {
        if (browser && browser.runtime) { // webextension versionnumber
            return browser.runtime.getManifest().version;
        }
        // undefined
    }
    function compare(v1, v2) {
        if (typeof v2 === 'undefined') {
            v2 = v1;
            v1 = current();
        }
        let v1parts = v1.split('.');
        let v2parts = v2.split('.');
        while (v1parts.length < v2parts.length) v1parts.push(0);
        while (v2parts.length < v1parts.length) v2parts.push(0);
        for (let i = 0; i < v1parts.length; ++i) {
            if (parseInt(v1parts[i], 10) > parseInt(v2parts[i], 10)) {
                return 1;
            } else if (parseInt(v1parts[i], 10) < parseInt(v2parts[i], 10)) {
                return -1;
            }
        }
        return 0;
    }
    function parts(v, n) {
        if (typeof n === 'undefined') {
            n = v;
            v = current();
        }
        let vparts = v.split('.', n);
        vparts.map( function(item) {return String(parseInt(item.trim(),10))});
        while (vparts.length < n) vparts.push('0');
        return vparts.join('.');
    }
    function major(v) {
        if (typeof v === 'undefined') {
            v = current();
        }
        return parts(v, 1);
    }
    function minor(v) {
        if (typeof v === 'undefined') {
            v = current();
        }
        return parts(v, 2);
    }
    function revision(v) {
        if (typeof v === 'undefined') {
            v = current();
        }
        return parts(v, 3);
    }

    // API:
    return {
        current,
        compare,
        major,
        minor,
        revision
    };

})();

function messageHandler(request, sender, sendResponse) { // This is returning a Promise (because using sendResponse() is deprecated)
    // console.log("Message received from the content script: " + JSON.stringify(request));
    if (request.msgtype==="flickrservice") {
        let optstr = Object.entries(request.options).reduce(
            function(acc, v) {
                acc.push(v[0]+'='+v[1]); // key/value
                return acc;
            },
            []
        ).join('&');
        return fetch('https://api.flickr.com/services/rest/?method=' + request.method + '&api_key=' + request.fkey + '&format=json&nojsoncallback=1&' + optstr, { credentials: 'include' }).then(function (response) {
            if (response.ok) {
                if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
                    return response.json();
                }
                throw new Error('Response was not in expected json format.');
            }
            throw new Error('Network response was not ok.');
        });
    } else {
        console.log("ERROR in messageHandler. Unexpected msgtype="+request.msgtype);
        throw new Error("ERROR in messageHandler. Unexpected msgtype="+request.msgtype);
    }
}


// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/onboarding_upboarding_offboarding_best_practices
// https://discourse.mozilla.org/t/best-way-to-do-install-update-uninstall-pages/40302
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled
// https://extensionworkshop.com/documentation/develop/onboard-upboard-offboard-users/
function installHandler({ reason, temporary, previousVersion }) {
    console.log("Extension version: " + browser.runtime.getManifest().version);
    console.log("Installation or update! details.reason: " + reason);
    if (typeof temporary !== 'undefined') { // Ff55
        console.log("details.temporary: " + temporary); // true/false
    }
    switch(reason) {
        case 'update':
            if (typeof previousVersion !== 'undefined') { // Ff55
                console.log("Updated from details.previousVersion: " + previousVersion);
            }
            // break;
        case 'install':
            // browser.runtime.openOptionsPage();
            // browser.runtime.getURL()
            // browser.runtime.getManifest()
            // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Extension_pages
            browser.tabs.create({ url: "/onboard/onboard.html"});
            break;
        case 'browser_update':
            break;
        case 'shared_module_update':
            break;
        default:
        // other?
    }
}

browser.runtime.onMessage.addListener(messageHandler);
browser.runtime.onInstalled.addListener(installHandler);
