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
// @version     2016.08.04.1
// @grant       none
// @run-at      document-start
// @noframes
// ==/UserScript==

// CHANGELOG - The most important updates/versions:
var changelog = [
    {version: '2016.08.04.0', description: '"Scale icon" now in color to signal if down-scale necessary to align with size of notes-area. If Orange, click it to downscale/align image.'},
    {version: '2016.06.12.3', description: 'An "un-scale button" to align image-size with (native) notes (on photo-pages, but not in lightbox mode).'},
    {version: '2016.06.12.0', description: 'Fixing replace with original had stopped working in some situations.'},
    {version: '2016.06.07.1', description: 'Quickly disabling the script\'s notes-feature, because OFFICIAL NATIVE NOTES-SUPPORT IS BACK ON FLICKR !!! :-) :-)'},
    {version: '2016.03.21.1', description: 'Improving the robustness of the tag-links feature.'},
    {version: '2016.03.11.1', description: 'A link to "recent uploads page" added on the Explore page. Ctrl-click fix for opening tabs in background on search pages (Firefox-only problem?).'},
    {version: '2016.02.14.1', description: 'Fixing a couple of issues related to scale/replace photos (Including avoid using original if photo has been rotated after upload).'},
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

// todo: advanced downscale-button, pre-cache images, original video options, customizable ???

var DEBUG = true;
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
var allowUpdateNotesViaAPIExplorer = true; // Allow support for Create, Edit and Delete photo-notes using Flickr's API Explorer interface


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

var notes = {
    photo: { // cache photo data to avoid repeating requests
        photoId: '',
        notes: [],
        allowNotes: false, // public&safe photos only
        json: ''
    },
    create: {
        area: null,
        startX: 0,
        startY: 0,
        stopX: 0,
        stopY: 0,
        hotspot: null,
        init: function () {
            log(' *** notes.create.init()');
            if (document.querySelector('div.photo-well-media-scrappy-view') && !document.getElementById('area')) {
                // document.querySelector('div.photo-well-media-scrappy-view').insertAdjacentHTML('afterbegin', '<div id="area" style="position:absolute;left:0;top:0;width:400px;height:400px;border:1px solid #F00;z-index:6000"></div>');
                document.querySelector('div.photo-well-media-scrappy-view').insertAdjacentHTML('afterbegin', '<div id="area" title="Click and drag to define comment hotspot..." style="position:absolute;left:-1px;top:49px;cursor:crosshair;width:'+parseInt(document.querySelector('img.main-photo').getAttribute('width'),10)+'px;height:'+parseInt(document.querySelector('img.main-photo').getAttribute('height'),10)+'px;border:1px solid #F00;z-index:6000"></div>');
                notes.create.area = document.getElementById('area');
                log(' *** area inserted!!');
            }
            notes.create.area.addEventListener("mousedown", notes.create.start, false);
        },
        start: function (e) {
            var elem, evt = e ? e : event;
            if (evt.srcElement)  elem = evt.srcElement;
            else if (evt.target) elem = evt.target;
            if (elem.id && elem.id === 'area') {  // same element?
                notes.create.startX = evt.offsetX;
                notes.create.startY = evt.offsetY;
                notes.create.area.addEventListener("mouseup", notes.create.stop, false);
                notes.create.area.addEventListener("mousemove", notes.create.move, false);
                log('Start: evt.offsetX=' + notes.create.startX + ', evt.offsetY=' + notes.create.startY);
                elem.innerHTML = '<div id="noteHotspot" style="border:1px solid #F00;margin:0;padding:0;position:absolute;top:' + notes.create.startY + 'px;left:' + notes.create.startX + 'px;width:0;height:0" ></div>';
                notes.create.hotspot = document.getElementById('noteHotspot');
            } else {
                log(' *** unexpected elem for start note creation?: '+elem.className); // for pokker, "+" er klikket, ikke drag-start...
            }
            return false;
        },
        move: function (e) {
            var elem, evt = e ? e : event;
            if (evt.srcElement)  elem = evt.srcElement;
            else if (evt.target) elem = evt.target;
            notes.create.area.removeEventListener("mousedown", notes.create.start);
            if (elem.id && elem.id === 'area') {
                if ((Math.abs(evt.offsetX - notes.create.startX)>1) && (Math.abs(evt.offsetY - notes.create.startY)>1)) {
                    notes.create.stopX = evt.offsetX;
                    notes.create.stopY = evt.offsetY;
                } else {
                    return;
                }
            } else if (elem.id && elem.id === 'noteHotspot') {
                if ((Math.abs(notes.create.startX + evt.offsetX - notes.create.startX)>1) && (Math.abs(notes.create.startY + evt.offsetY - notes.create.startY)>1)) {
                    notes.create.stopX = notes.create.startX + evt.offsetX;
                    notes.create.stopY = notes.create.startY + evt.offsetY;
                } else {
                    return;
                }
            } else {
                return false;
            }
            log('Move: evt.offsetX=' + notes.create.stopX + ', evt.offsetY=' + notes.create.stopY);
            notes.create.hotspot.style.left = Math.min(notes.create.startX, notes.create.stopX) + 'px';
            notes.create.hotspot.style.top = Math.min(notes.create.startY, notes.create.stopY) + 'px';
            notes.create.hotspot.style.width = Math.abs(notes.create.stopX - notes.create.startX) + 'px';
            notes.create.hotspot.style.height = Math.abs(notes.create.stopY - notes.create.startY) + 'px';
            return false;
        },
        stop: function (e) {
            var elem, evt = e ? e : event;
            if (evt.srcElement)  elem = evt.srcElement;
            else if (evt.target) elem = evt.target;
            notes.create.area.removeEventListener("mousemove", notes.create.move);
            notes.create.area.removeEventListener("mouseup", notes.create.stop);
            if (elem.id && elem.id === 'area') {
                //notes.create.stopX = evt.offsetX;
                //notes.create.stopY = evt.offsetY;
            } else if (elem.id && elem.id === 'noteHotspot') {
                //notes.create.stopX = notes.create.startX + evt.offsetX;
                //notes.create.stopY = notes.create.startY + evt.offsetY;
            } else {
                return false;
            }
            log('Stop: evt.offsetX=' + evt.offsetX + ', evt.offsetY=' + evt.offsetY);
            notes.create.hotspot.style.left = Math.min(notes.create.startX, notes.create.stopX) + 'px';
            notes.create.hotspot.style.top = Math.min(notes.create.startY, notes.create.stopY) + 'px';
            notes.create.hotspot.style.width = Math.max(Math.abs(notes.create.stopX - notes.create.startX)) + 'px';
            notes.create.hotspot.style.height = Math.max(Math.abs(notes.create.stopY - notes.create.startY)) + 'px';
            notes.createNoteDlg(notes.create.startX, notes.create.startY, notes.create.stopX, notes.create.stopY); // open dialog
            // To-do: clean-up?
            return false;
        }

    },
    updateNotesInit: function() {
        if (fixr.context.pageType !== 'PHOTOPAGE') {
            return; // exit if not photopage
        }
        if (!notes.photo.allowNotes) {
            log('Notes not supported on this photo');
            return;
        }
        if (!document.querySelector('.show-add-tags')) {
            log('Adding notes (and tagging) apparently not allowed/possible'); // photographer doesn't allow, user not logged in, or...?
            return;
        }
        log(' *** notes.updateNotesInit()');
        var panel = document.querySelector('div.photo-well-media-scrappy-view');
        if (panel && !panel.querySelector('div.addNote')) {
            log('notes.updateNotesInit: adding option to div.height-controller');
            panel.insertAdjacentHTML('afterbegin', '<div class="addNote" style="position:absolute;right:20px;top:15px;font-size:16px;margin-right:16px;color:#FFF;z-index:3000"><img src="https://c2.staticflickr.com/2/1680/24467540082_f296118dd3_o.png" alt="Add note" title="Add note" /></div>');
            log ('adding click event listner on div.addNote');
            panel.querySelector('div.addNote').addEventListener('click',notes.create.init, false);
        } else {
            log('notes.updateNotesInit: div.height-controller not found OR addNote already defined');
        }
    },
    updateNotesInitDelayed: function() {
        setTimeout(notes.updateNotesInit, 2000); // a little delay seems to be good - sometimes
    },
    showNotes: function () {
        fixr.initPhotoId(); // make sure is set...
        if(notes.photo.photoId !== fixr.context.photoId) {
            log('Ups, aborting. We were about to show the wrong notes - showNotes()');
            return;
        }
        var container = document.querySelector('div.photo-well-media-scrappy-view');
        if (container && container.classList) {
            container.classList.add('shownotes');
        }
    },
    hideNotes: function() {
        var container = document.querySelector('div.photo-well-media-scrappy-view');
        if (container && container.classList) {
            container.classList.remove('shownotes');
        }
    },
    clearNotesZ: function () {
        var nn = document.querySelectorAll('div.notebrd1');
        for (var j = 0; j < nn.length; j++) {
            nn[j].style.zIndex = '';
        }
    },
    levelNotesZ: function () {
        var nn = document.querySelectorAll('div.notebrd1');
        for (var i = 0; i < nn.length; i++) {
            nn[i].style.zIndex = '1000';
        }
        setTimeout(notes.clearNotesZ, 500);
    },
    _updateNoteUrl: '',   // general update noteS url?
    updateNote: function() {
        notes._updateNoteUrl = notes._updateNoteUrl + '&enable_note_text=on&param_note_text=' + encodeURIComponent(document.getElementById('editable').value.replace(/\n/g,'&#13;&#10;'));
        window.location = notes._updateNoteUrl;
    },
    deleteNote: function (e) {
        var elem, evt = e ? e:event;
        if (evt.srcElement)  elem = evt.srcElement;
        else if (evt.target) elem = evt.target;
        var n = parseInt(elem.id.substring(10),10);
        window.location = 'https://www.flickr.com/services/api/explore/flickr.photos.notes.delete?enable_note_id=on&param_note_id='+ notes.photo.notes[n].id + '&fixr='+encodeURIComponent(window.location.href);
    },
    fixrNote: function() {
        log('fixr-button i notes-editor');
        var ta = document.querySelector('#noteEditor textarea');
        // if possible, save cursor-position
        if (ta) {
            ta.value += '  [<a href="https://www.flickr.com/groups/flickrhacks/discuss/72157655601688753/">?</a>]';
            ta.focus();
            // TODO: set/restore cursor position?
        }
    },
    closeEditNoteDlg: function() {
        if (document.getElementById('noteEditor')) {
            var oldnode = document.getElementById('noteEditor');
            oldnode.parentNode.removeChild(oldnode);
            if (document.getElementById('noteHotspot')) {
                oldnode = document.getElementById('noteHotspot');
                oldnode.parentNode.removeChild(oldnode);
            }
            if (document.getElementById('area')) {
                oldnode = document.getElementById('area');
                oldnode.parentNode.removeChild(oldnode);
            }
        }
    },
    editNoteDlg: function (e) { // create dialog
        var elem, evt = e ? e:event;
        if (evt.srcElement)  elem = evt.srcElement;
        else if (evt.target) elem = evt.target;
        notes.closeEditNoteDlg();
        if (elem.classList.contains('editNoteBtn')) {
            var n = parseInt(elem.id.substring(8),10);
            var pwmsv = document.querySelector('div.photo-well-media-scrappy-view');
            var ta = document.createElement('textarea'); // content
            ta.wrap = 'on';
            //ta.autofocus = true;
            // ta.style = 'width:294px;height:200px'; // Chrome and Opera ignore this?
            ta.setAttribute('style', 'width:294px;height:200px');
            ta.defaultValue = notes.photo.notes[n]._content;
            ta.id = 'editable';
            pwmsv.insertAdjacentHTML('afterbegin', '<div id="noteEditor" style="position:absolute;top:'+((scaler.mf.height-200)/2+30)+'px;left:'+(scaler.mf.width-300)/2+'px;min-width:300px;z-index:8000;background-color:#FEC;border:1px solid #000;margin:0;padding:3px">'+ta.outerHTML+'<div><button id="fixrNoteBtn" style="float:right" class="noteBtn" title="Add hint/link to tell about Stigs Flickr Fixr for displaying notes on photos">Fix<b style="color:#ff099f">r</b></button><button id="updateNoteBtn" class="noteBtn">Update...</button> <button id="cancelNoteEditorBtn" class="noteBtn">Cancel</button></div></div>');
            // Cancel på note editor
            notes._updateNoteUrl = 'https://www.flickr.com/services/api/explore/flickr.photos.notes.edit?enable_note_id=on&param_note_id='+ notes.photo.notes[n].id + '&enable_note_x=on&param_note_x='+ notes.photo.notes[n].x + '&enable_note_y=on&param_note_y=' + notes.photo.notes[n].y + '&enable_note_w=on&param_note_w=' + notes.photo.notes[n].w + '&enable_note_h=on&param_note_h=' + notes.photo.notes[n].h + '&fixr='+encodeURIComponent(window.location.href);
            document.getElementById('cancelNoteEditorBtn').addEventListener('click',notes.closeEditNoteDlg,false);
            document.getElementById('updateNoteBtn').addEventListener('click',notes.updateNote,false);
            document.getElementById('fixrNoteBtn').addEventListener('click',notes.fixrNote,false);
            if (document.querySelector('#noteEditor textarea')) {
                document.querySelector('#noteEditor textarea').focus();
            }
        }
    },
    createNoteDlg: function(x0, y0, x1, y1) { // dialog (startx,starty,stopx,stopy)
        // transform x0, y0, x1, y1 by factor? (and transform/put upper left coordinates first)
        // get content (textarea)
        // create url (unless cancel)
        // clean-up
        // update by url (if not cancel)
        notes.closeEditNoteDlg();
        var pwmsv = document.querySelector('div.photo-well-media-scrappy-view');
        var ta = document.createElement('textarea'); // content
        ta.wrap = 'on';
        //ta.autofocus = true;
        // ta.style = 'width:294px;height:200px'; // Chrome and Opera ignore this?
        ta.setAttribute('style', 'width:294px;height:200px');
        ta.defaultValue = '';
        //if (fixr.runningDirty()) {
        //    ta.defaultValue = ' [<a href="https://www.flickr.com/groups/flickrhacks/discuss/72157655601688753/">*</a>]';
        //}
        ta.id = 'editable';
        var note_x, note_y, note_w, note_h;
        var scalefactor = 1;
        if (parseInt(document.querySelector('img.main-photo').getAttribute('width'),10)>=parseInt(document.querySelector('img.main-photo').getAttribute('height'),10)) {
            scalefactor = parseInt(document.querySelector('img.main-photo').getAttribute('width'),10)/500;
        } else {
            scalefactor = parseInt(document.querySelector('img.main-photo').getAttribute('height'),10)/500;
        }
        if(x0<=x1) {
            note_x = Math.max(0,x0/scalefactor-1);
            note_w = Math.max(1,(x1-x0)/scalefactor) + 4;
        } else {
            note_x = Math.max(0,x1/scalefactor-1);
            note_w = Math.max(1,(x0-x1)/scalefactor) + 4;
        }
        if(y0<=y1) {
            note_y = Math.max(0,y0/scalefactor-1);
            note_h = Math.max(1,(y1-y0)/scalefactor) + 4;
        } else {
            note_y = Math.max(0,y1/scalefactor-1);
            note_h = Math.max(1,(y0-y1)/scalefactor) + 4;
        }
        if ((note_x+note_w)*scalefactor>parseInt(document.querySelector('img.main-photo').getAttribute('width'),10)) {
            note_x=parseInt(document.querySelector('img.main-photo').getAttribute('width'),10)/scalefactor-note_w;
        }
        if ((note_y+note_h)*scalefactor>parseInt(document.querySelector('img.main-photo').getAttribute('height'),10)) {
            note_y=parseInt(document.querySelector('img.main-photo').getAttribute('height'),10)/scalefactor-note_h;
        }
        pwmsv.insertAdjacentHTML('afterbegin', '<div id="noteEditor" style="position:absolute;top:'+((scaler.mf.height-200)/2+30)+'px;left:'+(scaler.mf.width-300)/2+'px;min-width:300px;z-index:8000;background-color:#FEC;border:1px solid #000;margin:0;padding:3px">'+ta.outerHTML+'<div><button id="fixrNoteBtn" style="float:right" class="noteBtn" title="Add hint/link to tell about Stigs Flickr Fixr for displaying notes on photos">Fix<b style="color:#ff099f">r</b></button><button id="updateNoteBtn" class="noteBtn">Create...</button> <button id="cancelNoteEditorBtn" class="noteBtn">Cancel</button></div></div>');
        // Cancel på note editor
        notes._updateNoteUrl = 'https://www.flickr.com/services/api/explore/flickr.photos.notes.add?enable_photo_id=on&param_photo_id='+ fixr.context.photoId + '&enable_note_x=on&param_note_x='+ Math.floor(note_x) + '&enable_note_y=on&param_note_y=' + Math.floor(note_y) + '&enable_note_w=on&param_note_w=' + Math.floor(note_w) + '&enable_note_h=on&param_note_h=' + Math.floor(note_h) + '&fixr='+encodeURIComponent(window.location.href);
        document.getElementById('cancelNoteEditorBtn').addEventListener('click',notes.closeEditNoteDlg,false);
        document.getElementById('updateNoteBtn').addEventListener('click',notes.updateNote,false);
        document.getElementById('fixrNoteBtn').addEventListener('click',notes.fixrNote,false);
        if (document.querySelector('#noteEditor textarea')) {
            document.querySelector('#noteEditor textarea').focus();
        }
    },
    renderNotes: function() {
        var scalefactor = 1;
        if (parseInt(document.querySelector('img.main-photo').getAttribute('width'),10)>=parseInt(document.querySelector('img.main-photo').getAttribute('height'),10)) {
            scalefactor = parseInt(document.querySelector('img.main-photo').getAttribute('width'),10)/500;
        } else {
            scalefactor = parseInt(document.querySelector('img.main-photo').getAttribute('height'),10)/500;
        }
        // Slet alle eksisterende noter først (kan blive genereret multiple gange ved skalering)
        var oldnode = document.querySelector('div.notebrd1');
        while (oldnode && oldnode.parentNode) {
            oldnode.parentNode.removeChild(oldnode);
            oldnode = document.querySelector('div.notebrd1');
        }
        if (DEBUG && notes.photo.notes.length>0) {
            log('You might also see notes at: http://dh.elsewhere.org/mbedr/?p=' + fixr.context.photoId + '&fmt=Medium&v');
        }

        notes.photo.notes.sort(function(a,b){return (a.w*a.h)-(b.w*b.h);});
        fixr.initPhotoId(); // make sure is set...
        if(notes.photo.photoId !== fixr.context.photoId) {
            log('Ups, aborting. We were about to render the wrong notes - renderNotes()');
            return;
        }
        for (var i=0; i<notes.photo.notes.length; i++) // notes=obj.photo.notes.note
        {
            var n = notes.photo.notes[i];
            var div = document.createElement('div'); // content
            // if(i===0) log(encodeURIComponent(n._content));
            div.innerHTML = n._content.replace(/\n/g, '<br />') + '<div style="text-align:right"><i>- <a href="https://www.flickr.com/photos/' + n.author + '/">' + n.authorname + '</a></i></div>';
            div.className = 'ncontent';
            div.style.top = Math.floor(parseInt(n.h, 10) * scalefactor) - 2 + 'px';
            div.style.left = '2px';
            div.id = 'notetext'+i;
            if (allowUpdateNotesViaAPIExplorer) {
                // For public&safe photos where notes can be read: Create notes on (almost?) any photos, delete any note on own photos(?), edit own notes...
                if (fixr.context.userId) {
                    // Allow create note (however not from here!)
                }
                if (fixr.context.userId===n.author) {
                    // Allow update own notes
                    div.innerHTML += '<div style="margin-top:.75em"><button id="editNote'+i+'" class="editNoteBtn noteBtn">Edit</button> <button id="deleteNote'+i+'" class="deleteNoteBtn noteBtn">Delete...</button></div>';
                } else if (fixr.context.photographerId===fixr.context.userId) {
                    // Allow Delete on any note on own photos
                    div.innerHTML += '<div style="margin-top:.75em"><button id="deleteNote'+i+'" class="deleteNoteBtn noteBtn">Delete...</button></div>';
                }
            }
            document.querySelector('div.photo-well-media-scrappy-view').insertAdjacentHTML('afterbegin', '<div class="notebrd1" style="width:' + Math.floor(parseInt(n.w, 10) * scalefactor) + 'px;height:' + Math.floor(parseInt(n.h, 10) * scalefactor) + 'px;top:' + (50 + Math.floor(parseInt(n.y, 10) * scalefactor)) + 'px;left:' + Math.floor(parseInt(n.x, 10) * scalefactor) + 'px;"><div class="notebrd2" style="height:' + (Math.floor(parseInt(n.h, 10) * scalefactor)-2) + 'px;width:' + (Math.floor(parseInt(n.w, 10) * scalefactor)-2) + 'px;">'+ div.outerHTML +'</div></div>');
        }
        notes.showNotes();
        // adjust size of note's textboxes:
        var im = document.querySelector('img.main-photo');
        var tn = 0;
        var te= document.getElementById('notetext'+tn);
        while(te) {
            te.style.visibility = 'hidden';
            te.style.display = 'block';
            if(te.clientHeight>100 && im.clientWidth>150) {
                te.style.width = Math.min(im.clientWidth,250)+'px';
            }
            if(te.clientHeight>im.clientHeight && im.clientWidth>250) {
                te.style.width = Math.min(im.clientWidth,400)+'px';
            }
            if((te.clientHeight+20)>im.clientHeight) {
                te.style.height = (im.clientHeight)-20+'px';
                te.style.overflow = 'auto';
            }
            var tb = (parseInt(te.parentNode.parentNode.style.top,10) + parseInt(te.style.top,10) + te.clientHeight - 50 + 7);
            if(tb>im.clientHeight) {
                te.style.top = parseInt(te.style.top,10) - (tb - im.clientHeight) + 'px';
            }
            var tr = (parseInt(te.parentNode.parentNode.style.left,10) + parseInt(te.style.left,10) + te.clientWidth + 7);
            if(tr>im.clientWidth) {
                te.style.left = parseInt(te.style.left,10) - (tr - im.clientWidth) + 'px';
            }        te.style.display = '';
            te.style.visibility = 'visible';

            te = document.getElementById('notetext'+(++tn));
        }
        setTimeout(notes.hideNotes, 1000);
        // click listener on hot rectangles
        var bb = document.querySelectorAll('.notebrd1');
        for(var b=0; b < bb.length; b++) {
            bb[b].addEventListener('click',notes.levelNotesZ,false);
        }
        // click listener on note Edit buttons
        var eb = document.querySelectorAll('.editNoteBtn');
        for(b=0; b < eb.length; b++) {
            eb[b].addEventListener('click',notes.editNoteDlg,false);
        }
        // click listener on note Delete buttons
        var db = document.querySelectorAll('.deleteNoteBtn');
        for(b=0; b < db.length; b++) {
            db[b].addEventListener('click',notes.deleteNote,false);
        }
    },
    _wsGetPhotoInfoLock: 0,  // Date.now();
    wsGetPhotoInfo: function () { // Call Flickr REST API to get photo info incl. eventual photo-notes
        var diff = 0 + Date.now() - notes._wsGetPhotoInfoLock;
        if ((notes._wsGetPhotoInfoLock > 0) && (diff < 50)) {
            log('Skipping wsGetPhotoInfo() because already running?: ' + diff);
            // *** maybe add a check to see if we are still on same photo? !!!
            return;
        }

        var _reqGetPhotoInfo = null;
        if (window.XMLHttpRequest) {
            _reqGetPhotoInfo = new XMLHttpRequest();
            if (typeof _reqGetPhotoInfo.overrideMimeType !== 'undefined') {
                _reqGetPhotoInfo.overrideMimeType('application/json');
            }
            _reqGetPhotoInfo.onreadystatechange = function () {
                if (_reqGetPhotoInfo.readyState === 4 && _reqGetPhotoInfo.status === 200) {
                    // do something with the results
                    log('webservice photos.getInfo returned status=' + _reqGetPhotoInfo.status);
                    // log('webservice photos.getInfo returned status=' + _reqGetPhotoInfo.status + ', text: ' + _reqGetPhotoInfo.responseText);

                    notes.photo.json = _reqGetPhotoInfo.responseText;
                    notes.photo.notes = [];

                    var obj = JSON.parse(_reqGetPhotoInfo.responseText);
                    if (obj.stat === "ok") {
                        log("flickr.photos.getInfo returned ok");
                        notes.photo.allowNotes = true;
                        if (obj.photo && obj.photo.id) {
                            notes.photo.photoId = obj.photo.id;
                            log('Notes fetched for ' + notes.photo.photoId);
                            if (obj.photo && obj.photo.notes && obj.photo.notes && obj.photo.notes.note && obj.photo.notes.note.length > 0) {
                                log("looks like there are " + obj.photo.notes.note.length + " notes on this photo");
                                notes.photo.notes = obj.photo.notes.note;
                                setTimeout(notes.renderNotes, 50); // a little delay seems to be good - sometimes
                            } else {
                                log('No notes or not accessible');
                            }
                            // start initUpdateNotes
                            if (allowUpdateNotesViaAPIExplorer) {
                                notes.updateNotesInitDelayed();
                            }
                        }
                    } else {
                        log('flickr.photos.getInfo returned an ERROR: obj.stat='+obj.stat+', obj.code='+obj.code+', obj.message='+obj.message);
                        // failed, and notes should probably not be createable either!!!
                        notes.photo.allowNotes = false;
                    }
                    notes._wsGetPhotoInfoLock = 0;
                } else {
                    // wait for the call to complete
                }
            };

            notes._wsGetPhotoInfoLock = Date.now();
            _reqGetPhotoInfo.open('GET', 'https://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=9b8140dc97b93a5c80751a9dad552bd4&photo_id=' + fixr.context.photoId + '&format=json&nojsoncallback=1', true);
            _reqGetPhotoInfo.send(null);
        } else {
            log('understøtter ikke XMLHttpRequest');
        }
    },
    initNotes: function (logtext) {
        if (fixr.context.pageType === 'PHOTOPAGE' && fixr.context.pageSubType === 'PHOTO') { // Photopage with photos only (not video or vr)
            log("initNotes(): " + fixr.context.photoId + ( logtext ? ': ' + logtext : '' ));
            if (fixr.context.photoId) {
                if (fixr.context.photoId === notes.photo.photoId) {
                    log('render cached notes');
                    setTimeout(notes.renderNotes, 100); // a little delay seems to be good - sometimes
                    // start initUpdateNotes
                    if (allowUpdateNotesViaAPIExplorer) {
                        notes.updateNotesInitDelayed();
                    }
                } else {
                    log('render notes via flickr.photos.getInfo api method');
                    notes.wsGetPhotoInfo(); // wsGetPhotoInfo also calls renderNotes()
                }
            }
        } else {
            log('Exiting initNotes() because: fixr.context.pageType='+fixr.context.pageType+' and fixr.context.pageSubType='+fixr.context.pageSubType);
        }
    }
};



function apiExplorePreburner() {
    log('Running apiExplorerPreburner()');
    var ss = window.location.search.substring(1);
    var pp = ss.split('&');
    var fixr = ''; // no, it's another fixr
    var fixrr = '';
    var i = 0;
    for(i=0; i<pp.length; i++) {
        if (pp[i].indexOf('fixr=')===0) {
            fixr = pp[i].substring(5);
        }
        if (pp[i].indexOf('fixrr=')===0) {
            fixrr = pp[i].substring(6);
        }
    }
    if ((fixr||fixrr) && document.getElementById('Main')) {
        var f = document.getElementById('Main').querySelectorAll('form');
        if (f.length>0) {
            if(f[0].action.indexOf('?')===-1) {
                f[0].action += ('?fixrr='+fixr);
            }
        }
        for(i=0; i<pp.length; i++) {
            var p = pp[i].split('=');
            if(p.length===2 && document.getElementById(p[0])) {
                if(document.getElementById(p[0]).type==='checkbox') {
                    document.getElementById(p[0]).checked = true;
                } else {
                    document.getElementById(p[0]).value = decodeURIComponent(p[1]);
                }
            }
        }
        if (document.getElementById('signfull')) {
            document.getElementById('signfull').checked = true; // default, just to be sure
        }
        var div = document.createElement('div'); // content
        div.style.position = 'absolute';
        div.style.top = '0';
        div.style.right = '0';
        div.style.width = '260px';
        div.style.border = '1px solid #000';
        div.style.margin = '0';
        div.style.padding = '0 4px';
        div.style.backgroundColor = '#FEC';
        div.id = 'fixrInfo';
        if (fixr) { // ready to submit
            div.innerHTML = '<img src="http://www.rockland.dk/img/fixr64.png" style="width:64px;height:64px;display:block;float:right;border:none" /><h2>Step 1 of 2</h2><p>Simply submit this form with the pre-filled content to update notes on the <a href="'+decodeURIComponent(fixr)+'">photopage</a>:</p><p><button onclick="document.forms[1].submit();">Submit (Call method...)</button></p>';
        } else if (fixrr) { // ready to return to photopage
            div.innerHTML = '<img src="http://www.rockland.dk/img/fixr64.png" style="width:64px;height:64px;display:block;float:right;border:none" /><h2>Step 2 of 2</h2><p>Unless an error has occured, you can now return to an <a href="'+decodeURIComponent(fixrr)+'">updated photopage</a>:</p><p><form action="'+decodeURIComponent(fixrr)+'"><input type="submit" value="Return to photo"></form></p>';
        }
        document.getElementById('Main').insertAdjacentHTML('afterbegin',div.outerHTML);
    }
}

if (window.location.href.indexOf('flickr.com\/services\/api\/explore\/flickr.photos.notes.')>-1) {
    // We are on Flickr API Explorer for note handling and outside "normal" flickr page flow. fixr wont do here...
    // window.addEventListener('load', apiExplorePreburner, false);
} else {
    // scaler.postAction = notes.initNotes; // update notes after scaling
    // FIXR fixr.init([onPageHandlers], [onResizeHandlers], [onFocusHandlers])
    fixr.init([scaler.run, insertStyle, ctrlClicking, albumExtras, topPagination, shootingSpaceballs, ctrlClickingDelayed, exploreCalendarDelayed, albumTeaserDelayed, updateMapLinkDelayed, updateTagsDelayed], [scaler.run], [/*notes.initNotes*/]);
}
