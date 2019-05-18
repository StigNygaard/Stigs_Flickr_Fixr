var versionnumber = { // major.minor.revision
    current: function () {
        if (browser && browser.runtime) { // webextension versionnumber
            return browser.runtime.getManifest().version;
        }
        // undefined
    },
    compare: function (v1, v2) {
        if (typeof v2 === 'undefined') {
            v2 = v1;
            v1 = versionnumber.current();
        }
        var v1parts = v1.split('.');
        var v2parts = v2.split('.');
        while (v1parts.length < v2parts.length) v1parts.push(0);
        while (v2parts.length < v1parts.length) v2parts.push(0);
        for (var i = 0; i < v1parts.length; ++i) {
            if (parseInt(v1parts[i], 10) > parseInt(v2parts[i], 10)) {
                return 1;
            } else if (parseInt(v1parts[i], 10) < parseInt(v2parts[i], 10)) {
                return -1;
            }
        }
        return 0;
    },
    parts: function (v, n) {
        if (typeof n === 'undefined') {
            n = v;
            v = versionnumber.current();
        }
        var vparts = v.split('.', n);
        vparts.map( function(item) {return String(parseInt(item.trim(),10))});
        while (vparts.length < n) vparts.push('0');
        return vparts.join('.');
    },
    major: function (v) {
        if (typeof v === 'undefined') {
            v = versionnumber.current();
        }
        return versionnumber.parts(v, 1);
    },
    minor: function (v) {
        if (typeof v === 'undefined') {
            v = versionnumber.current();
        }
        return versionnumber.parts(v, 2);
    },
    revision: function (v) {
        if (typeof v === 'undefined') {
            v = versionnumber.current();
        }
        return versionnumber.parts(v, 3);
    }
};

function messageHandler(request, sender, sendResponse) {
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


function installHandler(details) {
    console.log("Extension version: " + browser.runtime.getManifest().version);
    console.log("Installation or update! details.reason: " + details.reason);
    if (typeof details.temporary !== 'undefined') { // Ff55
        console.log("details.temporary: " + details.temporary); // true/false
    }
    switch(details.reason) {
        case 'install':
            break;
        case 'update':
            if (typeof details.previousVersion !== 'undefined') { // Ff55
                console.log("Updated from details.previousVersion: " + details.previousVersion);
            }
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
