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
        return fetch('https://api.flickr.com/services/rest/?method=' + request.method + '&api_key=' + request.fkey + '&format=json&nojsoncallback=1&' + optstr, { credentials: 'include' }).then(function (response) {    // { credentials: 'include' } or { credentials: 'same-origin' } ??
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
browser.runtime.onMessage.addListener(messageHandler);