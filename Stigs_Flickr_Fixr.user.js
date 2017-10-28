// ==UserScript==
// @name        Stig's Flickr Fixr
// @namespace   dk.rockland.userscript.flickr.fixr
// @description Show photographer's albums on photostream-pages, Increase display-size and quality of "old" uploads, Photographer's other photos by tag-links, Links to album-map and album-comments, Actually show a geotagged photo on the associated map, Top-pagers - And more to come?...
// @author      Stig Nygaard, http://www.rockland.dk, https://www.flickr.com/photos/stignygaard/
// @homepageURL http://www.rockland.dk/userscript/flickr/fixr/
// @supportURL  https://www.flickr.com/groups/flickrhacks/discuss/72157655601688753/
// @icon        http://www.rockland.dk/img/fixr32.png
// @icon64      http://www.rockland.dk/img/fixr64.png
// @match       https://*.flickr.com/*
// @version     2017.10.28.1
// @run-at      document-start
// @grant       dummy
// @noframes
// ==/UserScript==

// CHANGELOG - The most important updates/versions:
var changelog = [
    {version: '2017.10.28.0', description: 'Workarounds for a couple of shortcomings in early versions of new/upcoming Greasemonkey 4 WebExtension.'},
    {version: '2017.07.31.0', description: 'New feature: Adding a Google Maps link on geotagged photos. Also: Removing unused code. Development code now in GitHub repository: https://github.com/StigNygaard/Stigs_Flickr_Fixr'},
    {version: '2016.08.04.0', description: '"Scale icon" now in color to signal if down-scale necessary to align with size of notes-area. If Orange, click it to downscale/align image.'},
    {version: '2016.06.12.3', description: 'An "un-scale button" to align image-size with (native) notes (on photo-pages, but not in lightbox mode).'},
    {version: '2016.06.07.1', description: 'Quickly disabling the script\'s notes-feature, because OFFICIAL NATIVE NOTES-SUPPORT IS BACK ON FLICKR !!! :-) :-)'},
    {version: '2016.03.11.1', description: 'A link to "recent uploads page" added on the Explore page. Ctrl-click fix for opening tabs in background on search pages (Firefox-only problem?).'},
    {version: '2016.02.09.0', description: 'New feature: Link to Explore Calendar added to Explore page (To the right for now, but might move it to top-menu later?).'},
    {version: '2016.02.06.2', description: 'New feature: Top-pagers! Hover the mouse in the center just above photostreams to show a pagination-bar.'},
    {version: '2016.02.05.1', description: 'Adding a little "bling" to the album-column.'},
    {version: '2016.01.30.0', description: 'Killing the terrible annoying sign-up box that keeps popping up if you are *not* logged in on Flickr. Also fixes for and fine-tuning of the notes-support.'},
    {version: '2016.01.24.3', description: 'New feature: Updating notes on photos! Besides displaying, you can now also Create, Edit and Delete notes (in a "hacky" and slightly restricted but generally usable way)'},
    {version: '2015.12.05.2', description: 'Photo-notes support now includes displaying formatting and active links.'},
    {version: '2015.12.03.2', description: 'New feature: Basic "beta" support for the good old photo-notes (read-only, no formatting/links).'},
    {version: '2015.11.28.1', description: 'New feature: Album-headers are now updated with links to album-map and album-comments.'},
    {version: '2015.08.26.4', description: 'Initial release version. Photo scale/replace, album column and tag-feature.'}
];

var DEBUG = false;
function log(s) {
    if (DEBUG && window.console) {
        window.console.log(s);
    }
}
if (DEBUG) {
    if ('loading' === document.readyState) {
        log("This userscript is running at document-start time.");
    } else {
        log("This userscript is running with document.readyState: " + document.readyState);
    }
    window.addEventListener('DOMContentLoaded', function(){log('(onDOMContentLoaded)');}, false);
    window.addEventListener('focus', function(){log('(onfocus)');}, false);
    window.addEventListener('load', function(){log('(onload)');}, false);
    window.addEventListener('pageshow', function(){log('(onpageshow)');}, false);
    window.addEventListener('resize', function(){log('(onresize)');}, false);
    window.addEventListener('hashchange', function(){log('(onhashchange)');}, false);
    window.addEventListener('blur', function(){log('(onblur)');}, false);
}


// FIXR page-tracker
var fixr = fixr || {
    context: {
        pageType: '',
        pageSubType: '',
        userId: '',
        photographerId: '', // value might be delayed (If uninitialized, try call initPhotographerId())
        photographerIcon: '',
        photographerAlias: '', // (pathalias) bonus-info sometimes initialized (from url) when initializing photoId or albumId
        photographerName: '',
        photoId: '',
        albumId: '',
        groupId: '',
        galleryId: ''
    },
    content: null,
    pageactionsCount: 0,
    timerResizeActionDelayed: 0,
    onPageHandlers: [],
    onResizeHandlers: [],
    onFocusHandlers: [],
    runningDirty: function() { // In-development and extra experiments enabled?
        return (DEBUG && (fixr.context.userId==='10259776@N00'));
    },
    timer: {
        _test: 0 // TODO
    },
    clock: {
        _d: null,
        _pst: null, // Pacific Standard Time
        _explore: null,
        tick: function () {
            this._d = new Date();
            this._pst = new Date(this._d);
            this._pst.setHours(this._d.getHours() - 8); // PST = UTC-08
            this._explore = new Date(this._d);
            this._explore.setHours(this._d.getHours() - 28); // Explore beat, yesterday UTC-4
            // this._y.setDate(this._y.getDate() - 1);
            return this._pst;
        },
        pst: function () { // yyyy-mm-dd tt:mm PST
            return (this._pst || this.tick()).toISOString().substring(0,16).replace('T',' ')+' PST';
        },
        explore: function () { // yyyy-mm-dd tt:mm Explore beat!
            if (this._explore===null) {
                this.tick();
            }
            return this._explore.toISOString().substring(0,16).replace('T',' ')+' Explore beat!';
        }
    },
    initUserId: function () {
        if (window.auth && window.auth.user && window.auth.user.nsid) {
            fixr.context.userId = window.auth.user.nsid;
            return true;
        }
        return false;
    },
    initPhotographerName: function () {
        if (fixr.content.querySelector('a.owner-name')) {
            fixr.context.photographerName = fixr.content.querySelector('a.owner-name').textContent;
            return true;
        }
        return false;
    },
    initPhotographerId: function () { // photographer/attribution id
        var elem;
        if (document.querySelector('div.photostream-page-view')) {
            // photostream
            elem = document.querySelector('div.photostream-page-view div.fluid-photostream-coverphoto-view div.avatar.person');
        } else if (document.querySelector('div.photo-page-scrappy-view')) {
            // photopage
            elem = document.querySelector('div.photo-page-scrappy-view div.sub-photo-view div.avatar.person');
        } else if (document.querySelector('div.photo-page-lightbox-scrappy-view')) {
            // photopage lightbox
            elem = document.querySelector('div.photo-page-lightbox-scrappy-view div.photo-well-view div.photo-attribution div.avatar.person');
        } else if (document.querySelector('div.album-page-view')) {
            // album page
            elem = document.querySelector('div.album-page-view div.album-container div.album-header-view div.album-attribution div.avatar.person');
        } else {
            log('we do not look for photographerId on this page');
            return true;
        }
        // album oversigt
        // etc...
        // men minus f.eks. favorites oversigt!
        if (!elem) {
            log('fixr.initPhotographerId() - Attribution elem NOT found - returning false');
            return false;
        } // re-run a little later???
        log('fixr.initPhotographerId() - Attribution elem found');
        // (div.avatar.person).style.backgroundImage=url(https://s.yimg.com/pw/images/buddyicon07_r.png#44504567@N00)
        //                    .style.backgroundImage=url(//c4.staticflickr.com/8/7355/buddyicons/10259776@N00_r.jpg?1372021232#10259776@N00)
        if (elem.style.backgroundImage) {
            log('fixr.initPhotographerId() - elem has style.backgroundImage "' + elem.style.backgroundImage + '", now looking for the attribution id...');
            var pattern = /url[^#\?]+(\/\/[^#\?]+\.com\/[^#\?]+\/buddyicon[^\?\#]+)[^#]*#(\d+\@N\d{2})/i;
            // var pattern = /\/buddyicons\/(\d+\@N\d{2})\D+/i;
            var result = elem.style.backgroundImage.match(pattern);
            if (result) {
                log('fixr.initPhotographerId() - Attribution pattern match found: ' + result[0]);
                log('fixr.initPhotographerId() - the attribution icon is ' + result[1]);
                log('fixr.initPhotographerId() - the attribution id is ' + result[2]);
                fixr.context.photographerIcon = result[1];
                fixr.context.photographerId = result[2];
            } else {
                log('fixr.initPhotographerId() - attribution pattern match not found');
                return false;
            }
        } else {
            log('fixr.initPhotographerId() - elem.style.backgroundImage not found');
            return false;
        }
        log('fixr.initPhotographerId() - returning true...');
        return true;
    },
    initPhotoId: function () { // Photo Id
        //  *flickr.com/photos/user/PId/*
        var pattern = /^\/photos\/([^\/]+)\/([\d]{2,})/i;
        var result = window.location.pathname.match(pattern);
        if (result) {
            log('url match med photoId=' + result[2]);
            log('url match med photographerAlias=' + result[1]);
            fixr.context.photoId = result[2];
            fixr.context.photographerAlias = result[1];
            return true;
        } else {
            log('*** initPhotoId() returnerer false! reg-pattern fandt ikke match i pathname='+window.location.pathname);
        }
        return false;
    },
    initAlbumId: function () {
        //  *flickr.com/photos/user/albums/AId/*
        //  *flickr.com/photos/user/sets/AId/*
        var pattern = /^\/photos\/([^\/]+)\/albums\/([\d]{2,})/i;
        var result = window.location.pathname.match(pattern);
        if (!result) {
            pattern = /^\/photos\/([^\/]+)\/sets\/([\d]{2,})/i;
            result = window.location.pathname.match(pattern);
        }
        if (result) {
            log('url match med albumId=' + result[2]);
            log('url match med photographerAlias=' + result[1]);
            fixr.context.albumId = result[2];
            fixr.context.photographerAlias = result[1];
            return true;
        }
        return false;
    },
    pageActions: function () {
        fixr.clock.tick();
        if (fixr.content) {
            log('fixr.pageActions() has started with fixr.content defined');
        } else {
            log('fixr.pageActions() was called, but fixr.content NOT defined');
            return;
        }
        fixr.pageactionsCount++;
        for (var p in fixr.context) {  // reset context on new page
            if (fixr.context.hasOwnProperty(p)) {
                fixr.context[p] = '';
            }
        }
        if (fixr.content.querySelector('div.photostream-page-view')) {
            if (fixr.content.querySelector('div.slideshow-view')) {
                fixr.context.pageType = 'PHOTOSTREAM SLIDESHOW';
            } else {
                fixr.context.pageType = 'PHOTOSTREAM';
            }
        } else if (fixr.content.querySelector('div.photo-page-scrappy-view')) {
            fixr.context.pageType = 'PHOTOPAGE';
            if (fixr.content.querySelector('div.vr-overlay-view') && fixr.content.querySelector('div.vr-overlay-view').hasChildNodes()) {
                fixr.context.pageSubType = 'VR'; // maybe I can find a better way to detect, not sure how reliable this is?
            } else if (fixr.content.querySelector('div.videoplayer')) {
                fixr.context.pageSubType='VIDEO';
            } else {
                fixr.context.pageSubType='PHOTO';
            }
        } else if (fixr.content.querySelector('div.photo-page-lightbox-scrappy-view')) {
            fixr.context.pageType = 'PHOTOPAGE LIGHTBOX';
            if (fixr.content.querySelector('div.vr-overlay-view') && fixr.content.querySelector('div.vr-overlay-view').hasChildNodes()) {
                fixr.context.pageSubType='VR'; // VR-mode currently not supported in lightbox?
            } else if (fixr.content.querySelector('div.videoplayer')) {
                fixr.context.pageSubType='VIDEO';
            } else {
                fixr.context.pageSubType='PHOTO';
            }
        } else if (fixr.content.querySelector('div.albums-list-page-view')) {
            fixr.context.pageType = 'ALBUMSLIST';
        } else if (fixr.content.querySelector('div.album-page-view')) {
            if (fixr.content.querySelector('div.slideshow-view')) {
                fixr.context.pageType = 'ALBUM SLIDESHOW';
            } else {
                fixr.context.pageType = 'ALBUM';
            }
        } else if (fixr.content.querySelector('div.cameraroll-page-view')) {
            fixr.context.pageType = 'CAMERAROLL';
        } else if (fixr.content.querySelector('div.explore-page-view')) {
            fixr.context.pageType = 'EXPLORE';
        } else if (fixr.content.querySelector('div.favorites-page-view')) {
            if (fixr.content.querySelector('div.slideshow-view')) {
                fixr.context.pageType = 'FAVORITES SLIDESHOW';
            } else {
                fixr.context.pageType = 'FAVORITES';
            }
        } else if (fixr.content.querySelector('div.groups-list-view')) {
            fixr.context.pageType = 'GROUPSLIST'; // personal grouplist
        } else if (fixr.content.querySelector('div#activityFeed')) { // id=main i stedet for id=fixr.content
            fixr.context.pageType = 'ACTIVITYFEED'; // aka. front page -> UPDATES ?
        } else if (fixr.content.querySelector('div#allsizes-photo')) {
            fixr.context.pageType = 'SIZES'; // View all sizes - page
        } else {
            // fixr.context.pageType = ''; // unknown
        }

        log('fixr.context.pageType = ' + fixr.context.pageType);
        log('fixr.context.pageSubType = '+fixr.context.pageSubType);
        if (fixr.initUserId()) {
            log('fixr.initUserId() returned with succes: '+fixr.context.userId);
        } else {
            log('fixr.initUserId() returned FALSE!');
        }
        if (fixr.initPhotographerId()) {
            log('fixr.initPhotographerId() returned true in first try...');
        } else {
            log('fixr.initPhotographerId() returned false - re-running delayed...');
            setTimeout(fixr.initPhotographerId, 1800);
        }
        if (fixr.initPhotoId()) {
            log('fixr.initPhotoId() returned true in first try...');
        } else {
            log('fixr.initPhotoId() returned false - re-running delayed...');
            setTimeout(fixr.initPhotoId, 1500);
        }
        if (fixr.initAlbumId()) {
            log('fixr.initAlbumId() returned true in first try...');
        }
        if (fixr.initPhotographerName()) {
            log('fixr.initPhotographerName() returned true in first try...');
        } else {
            setTimeout(fixr.initPhotographerName, 1500);
        }

        // Now run the page handlers....
        if (fixr.onPageHandlers && fixr.onPageHandlers !== null && fixr.onPageHandlers.length) {
            log('We have ' + fixr.onPageHandlers.length + ' onPage handlers starting now...');
            for (var f = 0; f < fixr.onPageHandlers.length; f++) {
                fixr.onPageHandlers[f]();
            }
        }
    },
    setupContent: function () {
        if (document.getElementById('content')) {
            fixr.content = document.getElementById('content');
        } else if (document.getElementById('main')) {
            fixr.content = document.getElementById('main');    // frontpage
        }
        if (fixr.content && fixr.content.id) {
            log('fixr.content.id = ' + fixr.content.id);
        } else {
            log('content or main element NOT found!');
        }
    },
    runPageActionsIfMissed: function () {
        if (fixr.pageactionsCount === 0) {
            log('Vi kører fixr.pageActions() på bagkant via onload...');
            fixr.setupContent();
            if (fixr.content === null) {
                log('Vi kan IKKE køre fixr.pageActions() på bagkant, da fixr.content ikke er defineret');
                return;
            }
            fixr.pageActions();
        } else {
            log('ej nødvendigt at køre fixr.pageActions() på bagkant i dette tilfælde...');
        }
    },
    runDelayedPageActionsIfMissed: function () {
        setTimeout(fixr.runPageActionsIfMissed, 2000);
    },
    resizeActions: function () {
        if (fixr.onResizeHandlers && fixr.onResizeHandlers !== null && fixr.onResizeHandlers.length) {
            for (var f = 0; f < fixr.onResizeHandlers.length; f++) {
                fixr.onResizeHandlers[f]();
            }
        }
    },
    resizeActionsDelayed: function () { // or "preburner"
        clearTimeout(fixr.timerResizeActionDelayed);
        fixr.timerResizeActionDelayed = setTimeout(fixr.resizeActions, 250);
    },
    focusActions: function () {
        if (fixr.onFocusHandlers && fixr.onFocusHandlers !== null && fixr.onFocusHandlers.length) {
            for (var f = 0; f < fixr.onFocusHandlers.length; f++) {
                fixr.onFocusHandlers[f]();
            }
        }
    },
    setupObserver: function () {
        log('fixr.setupObserve INITIALIZATION START');
        fixr.setupContent();
        if (fixr.content === null) {
            log('Init fails because content not defined');
            return;
        }
        // create an observer instance
        var observer = new MutationObserver(function (mutations) {
            log('NEW PAGE MUTATION!');
            //mutations.forEach(function(mutation) {
            //  log('MO: '+mutation.type); // might check for specific type of "mutations" (MutationRecord)
            //});
            fixr.pageActions();
        }); // MutationObserver end
        // configuration of the observer:
        var config = {attributes: false, childList: true, subtree: false, characterData: false};
        observer.observe(fixr.content, config);
        log('fixr.setupObserve INITIALIZATION DONE');
    },
    init: function (onPageHandlerArray, onResizeHandlerArray, onFocusHandlerArray) {
        // General page-change observer setup:
        if (document.readyState === 'interactive') { // already late?
            fixr.setupObserver();
        }
        window.addEventListener('DOMContentLoaded', fixr.setupObserver, false); // Page on DOMContentLoaded
        window.addEventListener('load', fixr.runDelayedPageActionsIfMissed, false); // Page on load
        window.addEventListener('resize', fixr.resizeActionsDelayed, false); // også på resize
        window.addEventListener('focus', fixr.focusActions, false);
        if (onPageHandlerArray && onPageHandlerArray !== null && onPageHandlerArray.length) {
            fixr.onPageHandlers = onPageHandlerArray; // Replace by adding with a one-by-one by "helper" for flexibility?
        }
        if (onResizeHandlerArray && onResizeHandlerArray !== null && onResizeHandlerArray.length) {
            fixr.onResizeHandlers = onResizeHandlerArray; // Replace by adding with a one-by-one by "helper" for flexibility?
        }
        if (onFocusHandlerArray && onFocusHandlerArray !== null && onFocusHandlerArray.length) {
            fixr.onFocusHandlers = onFocusHandlerArray;
        }
    }
};
// FIXR page-tracker end


var _timerMaplink = 0;
function updateMapLink() {
    if (fixr.context.pageType !== 'PHOTOPAGE') {
        return; // exit if not photopage
    }
    log('updateMapLink() running at readystate=' + document.readyState + ' and with photoId=' + fixr.context.photoId);
    if (fixr.context.photoId) {
        var maplink = fixr.content.querySelector('a.static-maps');
        if (maplink) {
            if (maplink.getAttribute('href') && (maplink.getAttribute('href').indexOf('map/?') > 0) && (maplink.getAttribute('href').indexOf('&photo=') === -1)) {
                maplink.setAttribute('href', maplink.getAttribute('href') + '&photo=' + fixr.context.photoId);
                log('link is updated by updateMapLink() at readystate=' + document.readyState);
                try {
                    var lat = maplink.getAttribute('href').match(/Lat=(\-?[\d\.]+)/i)[1];
                    var lon = maplink.getAttribute('href').match(/Lon=(\-?[\d\.]+)/i)[1];
                    fixr.content.querySelector('li.c-charm-item-location').insertAdjacentHTML('beforeend', '<div class="location-data-container"><a href="https://www.google.com/maps/search/?api=1&amp;query=' + lat + ',' + lon + '">Show location on Google Maps</a></div>');
                }
                catch (e) {
                    log('Failed creating Google Maps link: ' + e);
                }
            } else {
                log('link NOT updated by updateMapLink(). Invalid element or already updated. readystate=' + document.readyState);
            }
        } else {
            log('NO maplink found at readystate=' + document.readyState + '. Re-try later?');
        }
    } else {
        log('NO photoId found at readystate=' + document.readyState);
    }
}
function updateMapLinkDelayed() {
    if (fixr.context.pageType !== 'PHOTOPAGE') {
        return;
    } // exit if not photopage
    log('updateMapLinkDelayed() running... with pageType=' + fixr.context.pageType);
    //clearTimeout(_timerMaplink);
    _timerMaplink = setTimeout(updateMapLink, 2000); // make maplink work better on photopage
}

var album = { // cache to avoid repeating requests
    albumId: '',
    commentCount: 0
};
function updateAlbumCommentCount() {
    var _reqAlbumComments = null;
    if (window.XMLHttpRequest) {
        _reqAlbumComments = new XMLHttpRequest();
        if (typeof _reqAlbumComments.overrideMimeType !== 'undefined') {
            _reqAlbumComments.overrideMimeType('text/html');
        }

        _reqAlbumComments.onreadystatechange = function () {
            if (_reqAlbumComments.readyState === 4 && _reqAlbumComments.status === 200) {
                log('_reqAlbumComments returned status=' + _reqAlbumComments.status);
                var doc = document.implementation.createHTMLDocument("sizeDoc");
                doc.documentElement.innerHTML = _reqAlbumComments.responseText;
                album.albumId = fixr.context.albumId;
                album.commentCount = -1;
                var e = doc.body.querySelectorAll('span.LinksNew b.Here');
                if (e && e.length === 1) {
                    var n = parseInt(e[0].textContent, 10);
                    if (isNaN(n)) {
                        album.commentCount = 0;
                    } else {
                        album.commentCount = n;
                    }
                } else {
                    album.commentCount = -1;
                    log('b.Here??? ');
                }
                if (document.getElementById('albumCommentCount')) {
                    if (album.commentCount === -1) {
                        document.getElementById('albumCommentCount').innerHTML = '?';
                    } else {
                        document.getElementById('albumCommentCount').innerHTML = '' + album.commentCount;
                    }
                } else {
                    log('albumCommentCount element not found');
                }
            } else {
                // wait for the call to complete
            }
        };

        if (fixr.context.albumId === album.albumId && fixr.context.albumId !== '' && album.commentCount !== -1) {
            log('Usinging CACHED album count!...');
            document.getElementById('albumCommentCount').innerHTML = '' + album.commentCount;
        } else if (fixr.context.albumId !== '') {
            var url = 'https://www.flickr.com/photos/' + (fixr.context.photographerAlias !== '' ? fixr.context.photographerAlias : fixr.context.photographerId) + '/albums/' + fixr.context.albumId + '/comments/';
            _reqAlbumComments.open('GET', url, true);
            _reqAlbumComments.send(null);
        } else {
            log('albumId not initialized');
        }
    } else {
        log('understøtter ikke XMLHttpRequest');
    }
}

var albums = { // cache albums to avoid repeating requests
    ownerId: '',
    html: '',
    count: 0
};
function getAlbumlist() {
    var _reqAlbumlist = null;
    if (window.XMLHttpRequest) {
        _reqAlbumlist = new XMLHttpRequest();
        if (typeof _reqAlbumlist.overrideMimeType !== 'undefined') {
            _reqAlbumlist.overrideMimeType('text/html');
        }

        _reqAlbumlist.onreadystatechange = function () {
            if (_reqAlbumlist.readyState === 4 && _reqAlbumlist.status === 200) {
                log('_reqAlbumlist returned status=' + _reqAlbumlist.status); // + ', \ntext:\n' + _reqAlbumlist.responseText);
                var doc = document.implementation.createHTMLDocument("sizeDoc");
                doc.documentElement.innerHTML = _reqAlbumlist.responseText;

                albums.ownerId = fixr.context.photographerId;
                albums.html = '';
                albums.count = 0;
                var e = doc.body.querySelectorAll('div.photo-list-album-view');
                var imgPattern = /url\([\'\"]*([^\)\'\"]+)(\.[jpgtifn]{3,4})[\'\"]*\)/i;
                if (e && e.length > 0) {
                    albums.count = e.length;
                    for (var i = 0; i < Math.min(10, e.length); i++) {
                        var imgUrl = '';
                        //log(e[i].outerHTML);
                        //log('A7 (' + i + ') : ' + e[i].style.backgroundImage);
                        // var result = e[i].style.backgroundImage.match(imgPattern); // strangely not working in Chrome
                        var result = (e[i].outerHTML).match(imgPattern); // quick work-around for above (works for now)
                        if (result) {
                            // imgUrl = result[1].replace(/_[a-z]$/, '') + '_s' + result[2];
                            imgUrl = result[1].replace(/_[a-z]$/, '') + '_q' + result[2];
                            log('imgUrl=' + imgUrl);
                        } else {
                            log('No match on imgPattern');
                        }
                        var a = e[i].querySelector('a[href][title]'); // sub-element
                        if (a && a !== null) {
                            log('Album title: ' + a.title);
                            log('Album url: ' + a.getAttribute('href'));
                            albums.html += '<div><a href="//www.flickr.com' + a.getAttribute('href') + '"><img src="' + imgUrl + '" class="asquare" alt="" /><div style="margin:0 0 .8em 0">' + a.title + '</div></a></div>';
                        } else {
                            log('a element not found?');
                        }
                    }
                } else if (e) {
                    if (doc.body.querySelector('h3')) {
                        albums.html = '<div  style="margin:0 0 .8em 0">'+doc.body.querySelector('h3').textContent+'</div>';
                    }
                } else {
                    log('(e UNdefined) Problem reading albums or no albums??? : ' + _reqAlbumlist.responseText );
                }
                if (document.getElementById('albumTeaser')) {
                    document.getElementById('albumTeaser').innerHTML = '<div style="margin:0 0 .8em 0">Albums</div>' + albums.html + '<div><i><a href="/photos/' + (fixr.context.photographerAlias !== '' ? fixr.context.photographerAlias : fixr.context.photographerId) + '/albums/">' + (albums.count > 10 ? 'More albums...' : (albums.count === 0 ? 'No albums found...' : '')) + '</a></i></div>';
                } else {
                    log('albumTeaser NOT FOUND!?!');
                }
            } else {
                // wait for the call to complete
            }
        };

        if (fixr.context.photographerId === albums.ownerId && fixr.context.photographerId !== '') {
            log('Using CACHED albumlist!...');
            document.getElementById('albumTeaser').innerHTML = '<div style="margin:0 0 .8em 0">Albums</div>' + albums.html + '<div><i><a href="/photos/' + (fixr.context.photographerAlias !== '' ? fixr.context.photographerAlias : fixr.context.photographerId) + '/albums/">' + (albums.count > 10 ? 'More albums...' : (albums.count === 0 ? 'No albums found...' : '')) + '</a></i></div>';
        } else if (fixr.context.photographerId) {
            var url = 'https://www.flickr.com/photos/' + (fixr.context.photographerAlias !== '' ? fixr.context.photographerAlias : fixr.context.photographerId) + '/albums';
            _reqAlbumlist.open('GET', url, true);
            _reqAlbumlist.send(null);
        } else {
            log('Attribution user (photographer) not found');
        }
    } else {
        log('understøtter ikke XMLHttpRequest');
    }
}
function albumTeaser() {
    if (fixr.context.pageType !== 'PHOTOSTREAM') {
        return; // exit if not photostream
    }
    log('albumTeaser() running');
    var dpc = document.querySelector('div.photolist-container');
    if (!dpc) {
        return;
    }
    // to-do: check om personlig photostream?
    // to-do: check padding-right er mindst 130px?
    log('AlbumTeaser found div.photolist-container');
    if (!document.getElementById('albumTeaser')) {
        dpc.style.position = "relative";
        dpc.insertAdjacentHTML('afterbegin', '<div id="albumTeaser" style="border:none;margin:0;padding:0;position:absolute;top:0;right:10px;width:100px"></div>');
    }
    if (document.getElementById('albumTeaser')) {
        getAlbumlist();  // også check på fixr.context.photographerId ?
    }
}
var _timerAlbumTeaserDelayed;
function albumTeaserDelayed() {
    if (fixr.context.pageType !== 'PHOTOSTREAM') {
        return; // exit if not photostream
    }
    log('albumTeaserDelayed() running...');
    clearTimeout(_timerAlbumTeaserDelayed);
    _timerAlbumTeaserDelayed = setTimeout(albumTeaser, 1500);
}

function exploreCalendar() {
    if (fixr.context.pageType !== 'EXPLORE') {
        return; // exit if not explore/interestingness
    }
    log('exploreCalendar() running');
    var dtr = document.querySelector('div.title-row');
    if (!dtr) {
        return;
    }
    log('exploreCalendar found div.photo-list-view');
    if (!document.getElementById('exploreCalendar')) {
        dtr.style.position = "relative";
        var exploreMonth = fixr.clock.explore().substring(0,7).replace('-','/');
        dtr.insertAdjacentHTML('afterbegin', '<div id="exploreCalendar" style="border:none;margin:0;padding:0;position:absolute;top:38px;right:-120px;width:100px"><div style="margin:0 0 .8em 0">Explore more...</div><a title="Explore Calendar" href="https://www.flickr.com/explore/interesting/' + exploreMonth + '/"><img src="https://c2.staticflickr.com/2/1701/24895062996_78719dec15_o.jpg" class="asquare" style="width:75px;height:59px" alt="" /><div style="margin:0 0 .8em 0">Explore Calendar</div></a><a title="If you are an adventurer and want to explore something different than everybody else..." href="https://www.flickr.com/search/?text=&view_all=1&media=photos&content_type=1&dimension_search_mode=min&height=640&width=640&safe_search=2&sort=date-posted-desc&min_upload_date='+(Math.floor(Date.now()/1000)-7200)+'"><img src="https://c2.staticflickr.com/2/1617/25534100345_b4a3fe78f1_o.jpg" class="asquare" style="width:75px;height:59px" alt="" /><div style="margin:0 0 .8em 0">Fresh uploads</div></a></div>');
        log('San Francisco UTC-8: ' + fixr.clock.pst());
        log('Explore Beat (Yesterday, UTC-4): ' + fixr.clock.explore());
        if (document.querySelector('div.title-row h3')) {
            document.querySelector('div.title-row h3').title = fixr.clock.explore() + ' - ' + fixr.clock.pst();
        }
    }
}
var _timerExploreCalendarDelayed;
function exploreCalendarDelayed() {
    if (fixr.context.pageType !== 'EXPLORE') {
        return; // exit if not explore/interestingness
    }
    log('albumTeaserDelayed() running...');
    clearTimeout(_timerExploreCalendarDelayed);
    _timerExploreCalendarDelayed = setTimeout(exploreCalendar, 1500);
}

function ctrlClick(e) {
    var elem, evt = e ? e : event;
    if (evt.srcElement)  elem = evt.srcElement;
    else if (evt.target) elem = evt.target;
    if (evt.ctrlKey) {
        log('Ctrl clicked. Further scripted click-event handling canceled. Allow the default ctrl-click handling in my browser.');
        evt.stopPropagation();
    }
}
function ctrlClicking() {
    // if (navigator.userAgent.search(/gecko\/20/i)>-1) { // Firefox/gecko-only ctrl click tab fix
        var plv = document.querySelectorAll('div.photo-list-view');
        for (var i = 0; i < plv.length; i++) {
            log('ctrlClicking(): plv['+i+'] found!');
            // Allow me to open tabs in background by ctrl-click in Firefox:
            plv[i].parentNode.addEventListener('click', ctrlClick, true);
        }
    // }
}
var _timerCtrlClicking;
function ctrlClickingDelayed() {
    log('ctrlClickingDelayed() running...');
    clearTimeout(_timerCtrlClicking);
    _timerCtrlClicking = setTimeout(ctrlClicking, 1500);
}

var scaler = {
    photoId: '',
    photoOrientation: '',
    mf: null,   // document.querySelector('img.main-photo') for (re-)re-scale
    lrf: null,  // document.querySelector('img.low-res-photo') for (re-)re-scale
    maxSizeUrl: '',
    orgUrl: '',
    hasOriginal: false,
    scaleToWidth: 0,
    scaleToHeight: 0,
    postAction: function() {
        log('scaler.postAction'); // dummy-function to be replaced
    },
    run: function () {
        if (fixr.context.pageType !== 'PHOTOPAGE' && fixr.context.pageType !== 'PHOTOPAGE LIGHTBOX') {
            return; // exit if not photopage or lightbox
        }
        if (fixr.context.pageSubType !== 'PHOTO') {
            log('Exiting scaler because fixr.context.pageSubType='+fixr.context.pageSubType);
            return; // exit if subtype VR or VIDEO
        }
        log('scaler.run() running...');
        // var that = this;
        var unscale = function () {
            log('Unscale button clicked!...');
            // sizes (and position?) from div.photo-notes-scrappy-view
            var dims = document.querySelector('div.photo-notes-scrappy-view');
            scaler.mf.width = parseInt(dims.style.width,10);
            scaler.mf.height = parseInt(dims.style.height,10);
            // unscale/rest, and...
            var trash = document.querySelector('div.unscaleBtn');
            if (trash && trash.parentNode) {
                trash.removeEventListener('click',unscale);
                trash.parentNode.removeChild(trash);
            }
        };
        var addUnscaleBtn = function() {
            if (fixr.context.pageType !== 'PHOTOPAGE') {
                return; // exit if not photopage
            }
            /*
            if (!notes.photo.allowNotes) {
                log('Notes not supported on this photo');
                return;
            }
            */
            if (!document.querySelector('.show-add-tags')) {
                log('Adding notes (and tagging) apparently not allowed/possible'); // photographer doesn't allow, user not logged in, or...?
                // return;
            }
            log('scaler.addUnscaleBtn() running');
            var panel = document.querySelector('div.photo-well-media-scrappy-view');
            var notesview = document.querySelector('div.photo-notes-scrappy-view');
            if (panel && !panel.querySelector('div.unscaleBtn')) {
                log('scaler.addUnscaleBtn: adding option to div.height-controller');
                panel.insertAdjacentHTML('afterbegin', '<div class="unscaleBtn" style="position:absolute;right:20px;top:15px;font-size:16px;margin-right:16px;color:#FFF;z-index:3000"><img id="unscaleBtnId" src="https://farm9.staticflickr.com/8566/28150041264_a8b591c2a6_o.png" alt="Un-scale" title="This photo has been up-scaled by Stig\'s Flickr Fixr. Click here to be sure image-size is aligned with notes area" /></div>');
                log ('scaler.addUnscaleBtn: adding click event listner on div.unscaleBtn');
                panel.querySelector('div.unscaleBtn').addEventListener('click',unscale, false);
            } else {
                log('scaler.addUnscaleBtn: div.height-controller not found OR unscaleBtn already defined');
            }
            var unscaleBtnElem = document.getElementById('unscaleBtnId');
            if (unscaleBtnElem && parseInt(notesview.style.width,10)) {
                if (scaler.mf.width === parseInt(notesview.style.width, 10)) { // Green icon
                    unscaleBtnElem.title = "This photo has been up-scaled by Stig\'s Flickr Fixr. It appears Flickr was able to align the notes-area with scaled photo. You should be able to view and create notes correctly scaled and aligned on the upscaled photo.";
                    unscaleBtnElem.src = 'https://farm9.staticflickr.com/8879/28767704565_17560d791f_o.png';
                } else { // Orange icon/button
                    unscaleBtnElem.title = "This photo has been up-scaled by Stig\'s Flickr Fixr. It appears the notes-area is UNALIGNED with the upscaled image. Please click here to align image-size to the notes-area before studying or creating notes on this image.";
                    unscaleBtnElem.src = 'https://farm9.staticflickr.com/8687/28690535161_19b3a34578_o.png';
                }
            }
        };
        var scale = function () { // Do the actual scaling
            if (fixr.context.pageType !== 'PHOTOPAGE' && fixr.context.pageType !== 'PHOTOPAGE LIGHTBOX') {
                return;
            } // exit if not photopage or lightbox
            log('scaler.scale() running... (scale to:' + scaler.scaleToWidth + 'x' + scaler.scaleToHeight + ')');
            scaler.mf = document.querySelector('img.main-photo');  // for en sikkerheds skyld
            scaler.lrf = document.querySelector('img.low-res-photo');  // for en sikkerheds skyld
            if (scaler.mf && scaler.mf !== null && scaler.lrf && scaler.lrf !== null && scaler.scaleToWidth > 0 && scaler.scaleToHeight > 0) {
                log('[scaler] do scaling WORK. Height from ' + scaler.mf.height + ' to ' + scaler.scaleToHeight);
                scaler.mf.height = scaler.scaleToHeight;
                log('[scaler] do scaling WORK. Width from ' + scaler.mf.width + ' to ' + scaler.scaleToWidth);
                scaler.mf.width = scaler.scaleToWidth;
                scaler.lrf.height = scaler.mf.height;
                scaler.lrf.width = scaler.mf.width;
            }
            addUnscaleBtn();
            scaler.postAction('notes on scaled photo');
        };
        var replace = function () { // and (re-)scale?
            if (fixr.context.pageType !== 'PHOTOPAGE' && fixr.context.pageType !== 'PHOTOPAGE LIGHTBOX') {
                return; // exit if not photopage or lightbox
            }
            log('[scaler] scaler.run.replace() running...');
            scaler.mf = document.querySelector('img.main-photo');  // for en sikkerheds skyld
            if (scaler.mf && scaler.mf !== null && scaler.maxSizeUrl !== '') {
                if (scaler.mf.height>=640 || scaler.mf.width>=640) { // dirty hack to work-around a bug
                    scaler.mf.src = scaler.maxSizeUrl; // Replace! only if original (maxSizeUrl should be orgUrl)
                } else {
                    log('[scaler] Second thoughts. Do not replace this photo with original because unlikely needed here (bug work-around for small screens).');
                }
                scale();
            }
        };
        var getSizes = function () {
            log('[scaler] scaler.run.getSizes() running...');
            var _reqAllSizes = null;
            if (window.XMLHttpRequest) {
                _reqAllSizes = new XMLHttpRequest();
                if (typeof _reqAllSizes.overrideMimeType !== 'undefined') {
                    _reqAllSizes.overrideMimeType('text/html');
                }
                _reqAllSizes.onreadystatechange = function () {
                    if (_reqAllSizes.readyState === 4 && _reqAllSizes.status === 200) {
                        log('[scaler] _reqAllSizes returned status=' + _reqAllSizes.status); // + ', \ntext:\n' + _reqAllSizes.responseText);
                        var doc = document.implementation.createHTMLDocument("sizeDoc");
                        doc.documentElement.innerHTML = _reqAllSizes.responseText;

                        var sizelist = doc.body.querySelectorAll('ol.sizes-list li ol li');
                        var largest = null;
                        var largesttext = '';
                        while(!largest && sizelist.length>0) {
                            if (sizelist[sizelist.length-1].textContent.replace(/\s+/g,'')==='') {
                                sizelist.pop(); // remove last
                            } else {
                                log('[scaler] Found LARGEST size: '+sizelist[sizelist.length-1].textContent.replace(/\s+/g,''));
                                largest = sizelist[sizelist.length-1];
                                largesttext = largest.textContent.replace(/\s+/g,'');
                            }
                        }
                        if (largest.querySelector('a')) {
                            // list has link to _PAGE_ for showing largest image, thus it cannot be the original we already see ON the page!
                            log ('[scaler] Sizes-page/o has link to _PAGE_ for showing largest image, thus it cannot be the largest/original we already see ON the page!');
                            scaler.orgUrl = '';
                            scaler.maxSizeUrl = '';
                            scaler.hasOriginal = false;
                        } else if (doc.body.querySelector('div#allsizes-photo>img')) {
                            scaler.orgUrl = doc.body.querySelector('div#allsizes-photo>img').src;
                            scaler.hasOriginal = true;
                            scaler.maxSizeUrl = doc.body.querySelector('div#allsizes-photo>img').src;
                            log('[scaler] Largest/original image: ' + scaler.maxSizeUrl);
                        } else {
                            log('[scaler] UNEXPECTED situation. Assuming NO original available');
                            scaler.orgUrl = '';
                            scaler.maxSizeUrl = '';
                            scaler.hasOriginal = false;
                        }
                        var r = /\((\d+)x(\d+)\)$/;
                        var res = largesttext.match(r);
                        if (res !== null) {
                            if (scaler.photoOrientation === 'h' && parseInt(res[1],10)<parseInt(res[2],10)) {
                                log('[scaler] Photo has been rotated from vertical to horizontal - Should NOT use the original here!');
                                scaler.orgUrl = '';
                                scaler.maxSizeUrl = '';
                                scaler.hasOriginal = false;
                            } else if (scaler.photoOrientation === 'v' && parseInt(res[1],10)>parseInt(res[2],10)) {
                                log('[scaler] Photo has been rotated from horizontal to vertical - Should NOT use the original here!');
                                scaler.orgUrl = '';
                                scaler.maxSizeUrl = '';
                                scaler.hasOriginal = false;
                            }
                        } else {
                            log('[scaler] No match???');
                        }
                        if (scaler.hasOriginal) {
                            log('[scaler] Scale and replace using Original found from XMLHttpRequest');
                            // do some caching here?...
                            replace();
                        }
                    } else {
                        // wait for the call to complete
                    }
                };
                var url = 'https://www.flickr.com/photos/' + (fixr.context.photographerAlias !== '' ? fixr.context.photographerAlias : fixr.context.photographerId) + '/' + fixr.context.photoId + '/sizes/o';
                _reqAllSizes.open('GET', url, true);
                _reqAllSizes.send(null);
            } else {
                log('[scaler] understøtter ikke XMLHttpRequest');
            }
        };
        if (scaler.photoId === '') {
            scaler.photoId = fixr.context.photoId;
        } else if (scaler.photoId !== fixr.context.photoId) {
            scaler.photoId = fixr.context.photoId;
            scaler.photoOrientation = '';
            scaler.mf = null;
            scaler.lrf = null;
            scaler.maxSizeUrl = '';
            scaler.orgUrl = '';
            scaler.hasOriginal = false;
            scaler.scaleToWidth = 0;
            scaler.scaleToHeight = 0;
        }
        var roomHeight = 0;
        var roomWidth = 0;
        var roomPaddingHeight = 0;
        var roomPaddingWidth = 0;

        // Fortsæt kun hvis PhotoId!!!?

        var dpev = document.querySelector('div.photo-engagement-view');
        var pwv = document.querySelector('div.photo-well-view');
        if (pwv) {
            log('[scaler] height-controller: height=' + pwv.clientHeight + ' (padding=70?), width=' + pwv.clientWidth + ' (padding=80?).'); // hc.style.padding: 20px 40px 50px
            if (roomHeight === 0) {
                roomHeight = pwv.clientHeight;
            }
            if (roomWidth === 0) {
                roomWidth = pwv.clientWidth;
            }
            roomPaddingHeight += (parseInt(window.getComputedStyle(pwv, null).getPropertyValue('padding-top'), 10) + parseInt(window.getComputedStyle(pwv, null).getPropertyValue('padding-bottom'), 10));
            roomPaddingWidth += (parseInt(window.getComputedStyle(pwv, null).getPropertyValue('padding-left'), 10) + parseInt(window.getComputedStyle(pwv, null).getPropertyValue('padding-right'), 10));
        }
        var hc = document.querySelector('div.height-controller');
        if (hc) {
            log('[scaler] height-controller: height=' + hc.clientHeight + ' (padding=70?), width=' + hc.clientWidth + ' (padding=80?).'); // hc.style.padding: 20px 40px 50px
            if (roomHeight === 0) {
                roomHeight = hc.clientHeight;
            }
            if (roomWidth === 0) {
                roomWidth = hc.clientWidth;
            }
            roomPaddingHeight += (parseInt(window.getComputedStyle(hc, null).getPropertyValue('padding-top'), 10) + parseInt(window.getComputedStyle(hc, null).getPropertyValue('padding-bottom'), 10));
            roomPaddingWidth += (parseInt(window.getComputedStyle(hc, null).getPropertyValue('padding-left'), 10) + parseInt(window.getComputedStyle(hc, null).getPropertyValue('padding-right'), 10));
        }
        var pwmsv = document.querySelector('div.photo-well-media-scrappy-view');
        if (pwmsv) {
            log('[scaler] div.photo-well-media-scrappy-view: height=' + pwmsv.clientHeight + ' (padding=70?), width=' + pwmsv.clientWidth + ' (padding=80?).'); // pwmsv.style.padding: 20px 40px 50px
            if (roomHeight === 0) {
                roomHeight = pwmsv.clientHeight;
            }
            if (roomWidth === 0) {
                roomWidth = pwmsv.clientWidth;
            }
            roomPaddingHeight += (parseInt(window.getComputedStyle(pwmsv, null).getPropertyValue('padding-top'), 10) + parseInt(window.getComputedStyle(pwmsv, null).getPropertyValue('padding-bottom'), 10));
            roomPaddingWidth += (parseInt(window.getComputedStyle(pwmsv, null).getPropertyValue('padding-left'), 10) + parseInt(window.getComputedStyle(pwmsv, null).getPropertyValue('padding-right'), 10));
        }
        scaler.mf = document.querySelector('img.main-photo');
        scaler.lrf = document.querySelector('img.low-res-photo');
        // var zl = document.querySelector('img.zoom-large'); // currently not used
        // var zs = document.querySelector('img.zoom-small'); // currently not used
        if (scaler.mf) {
            log('[scaler] main-photo: h=' + scaler.mf.height + ', w=' + scaler.mf.width + '.  -  Room: (h=' + (roomHeight - roomPaddingHeight) + ',w=' + (roomWidth - roomPaddingWidth) + ')');
            if (scaler.mf.width>scaler.mf.height) {
                scaler.photoOrientation = 'h'; // horisontal
            } else {
                scaler.photoOrientation = 'v'; // vertical
            }
            if (roomPaddingWidth === 0) { // hack
                roomPaddingWidth = 120;
                log('[scaler] roomPaddingWidth=120 hack used');
            }
            if (((roomHeight - roomPaddingHeight) > scaler.mf.height + 5) && ((roomWidth - roomPaddingWidth) > scaler.mf.width + 5)) {
                log('[scaler] ALLRIGHT - WE ARE READY FOR SCALING!...');
                if (((roomHeight - roomPaddingHeight) / scaler.mf.height) < ((roomWidth - roomPaddingWidth) / scaler.mf.width)) {
                    scaler.scaleToWidth = Math.floor(scaler.mf.width * ((roomHeight - roomPaddingHeight) / scaler.mf.height));
                    scaler.scaleToHeight = roomHeight - roomPaddingHeight;
                } else {
                    scaler.scaleToHeight = Math.floor(scaler.mf.height * ((roomWidth - roomPaddingWidth) / scaler.mf.width));
                    scaler.scaleToWidth = roomWidth - roomPaddingWidth;
                }
                log('[scaler] now calling scale()... [' + scaler.scaleToWidth + ', ' + scaler.scaleToWidth + ']');
                scale();
                log('[scaler] ...AND CONTINUE LOOKING FOR ORIGINAL...');
                if (dpev && scaler.photoOrientation==='h' && document.querySelector('ul.sizes')) { // if (document.querySelector('ul.sizes')) -> PHOTOPAGE in normal mode (if vertical (bigger) risk for rotated, which are better handled by getSizes())
                    var org = document.querySelector('ul.sizes li.Original a.download-image-size');
                    if (org) { // quick access når vi bladrer?
                        scaler.hasOriginal = true; // ??? kun hvis original
                        scaler.maxSizeUrl = (org.href).replace(/^https\:/i, '').replace(/_d\./i, '.');
                        // ... do some scaling here?...
                        replace();
                    } else {
                        // vi kan finde original "inline"
                        var target = document.querySelector('div.photo-engagement-view');
                        // if(!target) return; ???
                        if (target) {
                            var observer = new MutationObserver(function (mutations) {
                                mutations.forEach(function (mutation) {
                                    log('[scaler] MO size: ' + mutation.type); // might check for specific "mutations"?
                                });
                                var org = document.querySelector('ul.sizes li.Original a.download-image-size');
                                if (org) {
                                    scaler.hasOriginal = true; // ??? kun hvis original
                                    scaler.maxSizeUrl = (org.href).replace(/^https\:/i, '').replace(/_d\./i, '.');
                                    log('[scaler] Original photo found, now replacing');
                                    // ... do some scaling here?...
                                    replace();
                                } else {
                                    log('[scaler] Original photo not available for download on this photographer. Re-scale just in case...');
                                    scale(); // ???
                                }
                                observer.disconnect();
                            });
                            // configuration of the observer:
                            var config = {attributes: false, childList: true, subtree: false, characterData: false};
                            observer.observe(target, config);
                        }
                    }
                } else { // PHOTOPAGE (likely) in LIGHTBOX mode
                    getSizes(); // resize (& replace) from/when size-list
                }
            } else {
                log('[scaler] Scaling NOT relevant');
            }
            scaler.postAction('notes on unscaled photo'); // look for notes (not (yet?) scaled)
        }
    }
};

function insertStyle() {
    if (!document.getElementById('fixrStyle')) {
        var style = document.createElement('style');
        style.type = 'text/css';
        style.id = 'fixrStyle';
        style.innerHTML = 'ul.tags-list>li.tag>a.fixrTag,ul.tags-list>li.autotag>a.fixrTag{display:none;} ul.tags-list>li.tag:hover>a.fixrTag,ul.tags-list>li.autotag:hover>a.fixrTag{display:inline;} ' +
                          '.album-map-icon{background:url("https://c2.staticflickr.com/6/5654/23426346485_334afa6e8f_o_d.png") no-repeat;height:21px;width:24px;top:6px;left:3px} .album-comments-icon{background:url("https://s.yimg.com/uy/build/images/icons-1x-s2fb29ad15b.png") -32px -460px no-repeat;height:21px;width:24px;top:6px;left:3px} ' +
                          '.unscaleBtn:hover{cursor:pointer} ' +
                          'img.asquare {width:75px;height:75px;border:none;margin:0;padding:0;transition:all 0.3s ease} a:hover>img.asquare{transform:scale(1.3)} ' +
                          '.signup-footer, .signup-footer-view{display:none} ' +
                          '#topPaginationContainer{width:250px;height:40px;margin:0 auto;position:absolute;top:0;left:0;right:0;border:none} #topPagination{width:720px;margin:0;position:absolute;top:0;left:-235px;text-align:center;z-index:10;display:none;border:none;padding:10px 0 10px 0;overflow:hidden} .album-toolbar-content #topPagination{top:-16px} .group-pool-subheader-view #topPagination{top:-7px} .title-row #topPagination{width:830px;left:-290px;top:-12px} #topPaginationContainer:hover #topPagination{display:block} ';
        document.getElementsByTagName('head')[0].appendChild(style);
        log('fixrStyle has been ADDED');
    } else {
        log('fixrStyle was already present');
    }
}

function topPagination() {
    log('topPagination()');
    var bottomPagination = document.querySelector('.pagination-view');
    if (!bottomPagination) {
        bottomPagination = document.querySelector('.explore-pagination');
    }
    if (bottomPagination && !document.getElementById('topPagination')) {
        if (bottomPagination.childElementCount>0) {
            var topPagination = bottomPagination.cloneNode(true);
            topPagination.id = 'topPagination';
            var topPaginationContainer = document.createElement('div');
            topPaginationContainer.id = 'topPaginationContainer';
            topPaginationContainer.appendChild(topPagination);
            var topbar = document.querySelector('.fluid-magic-tools-view');
            if (!topbar) topbar = document.querySelector('.album-toolbar-content');
            if (!topbar) topbar = document.querySelector('.group-pool-subheader-view');
            if (!topbar) topbar = document.querySelector('.title-row');
            if (topbar) {
                log('topPagination: root found, inserting container');
                topbar.appendChild(topPaginationContainer);
            }
        }
    }
}
function albumExtras() { // links to album's map and comments
    if (fixr.context.pageType !== 'ALBUM') {
        return; // exit if not albumpage
    }
    if (fixr.context.albumId) {
        log('albumsExtra() med album=' + fixr.context.albumId);
    } else {
        log('Exit albumsExtra(). Mangler albumId');
        return;
    }
    var elist = document.querySelector('div.album-engagement-view');
    if (elist && !document.getElementById('albumCommentCount')) {
        // map-link:
        var mapdiv = document.createElement('div');
        mapdiv.className = 'create-book-container';
        mapdiv.title = 'Album on map';
        mapdiv.style.textAlign = 'center';
        mapdiv.innerHTML = '<a href="/photos/' + fixr.context.photographerAlias + '/albums/' + fixr.context.albumId + '/map/" style="font-size:14px;color:#FFF;"><span title="Album on map" class="album-map-icon"></span></a>';
        elist.appendChild(mapdiv);
        // comments-link:
        var comurl = '/photos/' + fixr.context.photographerAlias + '/albums/' + fixr.context.albumId + '/comments/';
        var cmdiv = document.createElement('div');
        cmdiv.className = 'create-book-container';
        cmdiv.title = 'Comments';
        cmdiv.style.textAlign = 'center';
        cmdiv.innerHTML = '<a href="' + comurl + '" style="font-size:14px;color:#FFF;"><span title="Album comments" class="album-comments-icon" id="albumCommentCount"></span></a>';
        elist.appendChild(cmdiv);
        updateAlbumCommentCount();
    }
}
function updateTags() {
    if (fixr.context.pageType !== 'PHOTOPAGE') {
        return; // exit if not photopage
    }
    if (fixr.context.photographerAlias==='') {
        fixr.initPhotoId();
    }
    if (fixr.context.photographerId==='') {
        fixr.initPhotographerId();
    }
    if (fixr.context.photographerName==='') {
        fixr.initPhotographerName();
    }
    log('updateTags() med photographerAlias='+fixr.context.photographerAlias+', photographerId='+fixr.context.photographerId+' og photographerName='+fixr.context.photographerName);
    if (document.querySelector('ul.tags-list')) {
        var tags = document.querySelectorAll('ul.tags-list>li');
        if (tags && tags !== null && tags.length > 0) {
            for (var i = 0; i < tags.length; i++) {
                var atag = tags[i].querySelector('a[title][href*="/photos/tags/"],a[title][href*="?tags="],a[title][href*="?q="]');
                if (atag) {
                    var realtag = (atag.href.match(/((\/tags\/)|(\?tags\=)|(\?q\=))([\S]+)$/i))[5];
                    if (!(tags[i].querySelector('a.fixrTag'))) {
                        var icon = fixr.context.photographerIcon.match(/^([^_]+)(_\w)?\.[jpgntif]{3,4}$/)[1] + '' + fixr.context.photographerIcon.match(/^[^_]+(_\w)?(\.[jpgntif]{3,4})$/)[2]; // do we know for sure it is square?
                        tags[i].insertAdjacentHTML('afterbegin', '<a class="fixrTag" href="/photos/' + (fixr.context.photographerAlias !== '' ? fixr.context.photographerAlias : fixr.context.photographerId) + '/tags/' + realtag + '/" title="' + atag.title + ' by ' + fixr.context.photographerName + '"><img src="' + icon + '" style="width:1em;height:1em;margin:0;padding:0;position:relative;top:3px" alt="*" /></a>');
                    }
                }
            }
        } else {
            log('no tags defined (yet?)');
        }
    } else {
        log('taglist container not found');
    }
}
function updateTagsDelayed() {
    log('updateTagsDelayed() running... with pageType=' + fixr.context.pageType);
    //clearTimeout(_timerMaplink);
    if (fixr.context.pageType === 'PHOTOPAGE') {
        setTimeout(updateTags, 2000);
        setTimeout(updateTags, 3500); // Twice. Those tags are sometimes a bit slow emerging
    }
}

function shootingSpaceballs() {
    // Enable image context-menu on "View sizes" page by removing overlaying div.
    // This is *not* meant as a tool for unauthorized copying and distribution of other peoples photos.
    // Please respect image ownership and copyrights!
    if (fixr.context.pageType === 'SIZES') {
        var trash = document.querySelector('div.spaceball');
        while (trash && trash.parentNode) {
            trash.parentNode.removeChild(trash);
            trash = document.querySelector('div.spaceball');
        }
    }
}

if (window.location.href.indexOf('flickr.com\/services\/api\/explore\/')>-1) {
    // We are on Flickr API Explorer (WAS used for note handling before Flickr returned native note-support) and outside "normal" flickr page flow. fixr wont do here...
} else {
    // FIXR fixr.init([onPageHandlers], [onResizeHandlers], [onFocusHandlers])
    fixr.init([scaler.run, insertStyle, ctrlClicking, albumExtras, topPagination, shootingSpaceballs, ctrlClickingDelayed, exploreCalendarDelayed, albumTeaserDelayed, updateMapLinkDelayed, updateTagsDelayed], [scaler.run], []);
}
