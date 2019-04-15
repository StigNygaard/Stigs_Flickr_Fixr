function msgHandler(request, sender, sendResponse) {
    // console.log("Message received from the content script: " + JSON.stringify(request));
    if (request.msgtype==="flickrservice") {
        return fetch('https://api.flickr.com/services/rest/?method=' + request.method + '&api_key=' + request.fkey + '&photo_id=' + request.options.photoId + '&format=json&nojsoncallback=1').then(function (response) {
            if (response.ok) {
                if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
                    return response.json();
                }
                throw new Error('Response was not in expected json format.');
            }
            throw new Error('Network response was not ok.');
        });
    } else {
        console.log("ERROR in msgHandler. Unexpected msgtype="+request.msgtype);
        throw new Error("ERROR in msgHandler. Unexpected msgtype="+request.msgtype);
    }
}
browser.runtime.onMessage.addListener(msgHandler);