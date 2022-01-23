// (function() {
//     var _setTimeout = window.setTimeout;
//     window.setTimeout = function(...argslist) {
//         if(console) console.log("SetTimeout: ", ...argslist);
//         return _setTimeout.apply(this, argslist);  // <-- (null or this?)
//     };
// })();
// (function() {
//     var _setInterval = window.setInterval;
//     window.setInterval = function(...argslist) {
//         if(console) console.log("SetInterval: ", ...argslist);
//         return _setInterval.apply(this, argslist);  // <-- (null or this?)
//     };
// })();

(function() {
    let _setTimeout = window.setTimeout;
    window.setTimeout = function(...argslist) {
        if (document.body.dataset.slideshowspeed && argslist.length === 2 && argslist[0].name === 'bound handlePhotoChange' && argslist[1] == 5000) {
            argslist[1] = parseInt(document.body.dataset.slideshowspeed, 10) * 1000; // get value from DOM attribute
            // console.log("SetTimeout function: " + argslist[0].name + ", " + argslist[1]);
        }
        return _setTimeout.apply(this, argslist);  // <-- (null or this?)
    };
})();

// For both ManifestV2 and ManifestV3:
// https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions/9517879#9517879
