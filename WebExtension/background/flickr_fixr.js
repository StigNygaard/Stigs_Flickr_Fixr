globalThis.browser = globalThis.browser || globalThis.chrome;

globalThis.versionnumber = globalThis.versionnumber || (function Versionnumber() {  // major.minor.revision
    function current() {
        if (browser?.runtime) { // webextension versionnumber
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
        vparts.map(function (item) {
            return String(parseInt(item.trim(), 10))
        });
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

function messageHandler(request, sender, sendResponse) {
    if (request.msgtype === "flickrservice") {
        const url = new URL('https://api.flickr.com/services/rest/');
        url.searchParams.append('method', request.method);
        url.searchParams.append('api_key', request.fkey);
        url.searchParams.append('format', 'json');
        url.searchParams.append('nojsoncallback', '1');
        for (const [name, value] of Object.entries(request.options)) {
            if (value instanceof Array) {
                value.forEach(function(v) {
                    url.searchParams.append(name, v);
                });
            } else {
                url.searchParams.append(name, value);
            }
        }
        fetch(url.href, {credentials: 'include'})
            .then(function (response) {
                if (response.ok) {
                    if (response.headers.get('content-type')?.includes('application/json')) {
                        return response.json();
                    } else {
                        console.error('Response was not in expected json format: ' + response.headers.get('content-type'));
                        throw new Error('Response was not in expected json format.');
                    }
                } else {
                    console.error('Network response was not ok.');
                    throw new Error('Network response was not ok.');
                }
            })
            .then(
                function (content) {
                    // It's on purpose we use sendResponse() here. Makes it easier to work with Chrome it seems...
                    // https://developer.chrome.com/docs/extensions/reference/runtime/#example-content-msg
                    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage#addlistener_syntax
                    sendResponse(content);
                }
            );
        return true; // Important to tell the browser that we will use the sendResponse argument (in async above) after this listener (messageHandler) has returned
    } else {
        console.error("ERROR in messageHandler. Unexpected msgtype=" + request.msgtype);
        throw new Error("ERROR in messageHandler. Unexpected msgtype=" + request.msgtype);
    }
}


// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/onboarding_upboarding_offboarding_best_practices
// https://discourse.mozilla.org/t/best-way-to-do-install-update-uninstall-pages/40302
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled
// https://extensionworkshop.com/documentation/develop/onboard-upboard-offboard-users/
function installHandler({reason, temporary, previousVersion}) {
    console.log("Flickr Fixr extension version: " + browser.runtime.getManifest().version);
    console.log("Installation or update! details.reason: " + reason);
    console.log("details.temporary: " + temporary);
    switch (reason) {
        case 'update':
            console.log("Updated from details.previousVersion: " + previousVersion);
            break; // Show onboarding when updating or not?...
        case 'install':
            // browser.runtime.openOptionsPage();
            // browser.runtime.getURL()
            // browser.runtime.getManifest()
            // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Extension_pages
            browser.tabs.create({url: "/onboard/onboard.html"});
            break;
        case 'browser_update':
            break;
        case 'shared_module_update':
            break;
        default:
        // other?
    }
}

// MV3. action.onClicked used with "action":{} in manifest.json...
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/action/onClicked
browser.action.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
});
browser.action.setTitle({ title: "Open Options-page" });

browser.runtime.onMessage.addListener(messageHandler);
browser.runtime.onInstalled.addListener(installHandler);
