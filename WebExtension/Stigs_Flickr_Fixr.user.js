// ==UserScript==
// @name        Stig's Flickr Fixr
// @namespace   dk.rockland.userscript.flickr.fixr
// @description Show photographer's albums on photostream-pages, Increase display-size and quality of "old" uploads, Photographer's other photos by tag-links, Links to album-map and album-comments, Actually show a geotagged photo on the associated map, Top-pagers - And more to come?...
// @author      Stig Nygaard, https://www.rockland.dk, https://www.flickr.com/photos/stignygaard/
// @homepageURL https://www.flickr.com/groups/flickrhacks/discuss/72157655601688753/
// @supportURL  https://www.flickr.com/groups/flickrhacks/discuss/72157655601688753/
// @icon        https://raw.githubusercontent.com/StigNygaard/Stigs_Flickr_Fixr/master/WebExtension/icons/fixr32.png
// @icon64      https://raw.githubusercontent.com/StigNygaard/Stigs_Flickr_Fixr/master/WebExtension/icons/fixr64.png
// @match       https://*.flickr.com/*
// @match       *://*.flickr.net/*
// @exclude     *://api.flickr.com/*
// @exclude     *://identify.flickr.com/*
// @exclude     *://*.flickr.com/signin/*
// @exclude     *://*.flickr.com/signup/*
// @exclude     *://*.flickr.com/account/*
// @version     2022.03.11.0
// @run-at      document-start
// @grant       none
// @noframes
// ==/UserScript==

// CHANGELOG - The most recent or important updates/versions:
var changelog = [
    {version: '2022.03.11.0', description: 'Adapt to Flickr changes, to fix issue on photopages.'},
    {version: '2022.01.23.0', description: 'Control slideshow speed (Supported in webextension - not supported in userscript version of Flickr Fixr)'},
    {version: '2021.11.14.0', description: 'Fix broken tag-feature - and more...'},
    {version: '2021.01.29.0', description: 'Fix broken icon paths which probably prevented userscript installing/updating. I still recommend installing browser extension instead of userscript, I keep forgetting making sure userscript still works.'},
    {version: '2020.06.22.0', description: 'Removing 90% of map-fix for showing geolocation of a photo. Finally Flickr has mostly fixed issue themselves. Restoring insertion of Google Maps link which broke by the Flickr update.'},
    {version: '2020.06.21.0', description: 'A little bit of cleaning, a warning to userscript users - and "sub-options" for the tag-links feature (in webextension version)'},
    {version: '2020.05.31.0', description: 'Improved fix to show location of geotagged photo (Zoom in). Some code cleaning...'},
    {version: '2020.05.18.0', description: 'Fix for missing album column in Chrome when on flickr.com instead of www.flickr.com (cross-domain error)'},
    {version: '2020.01.15.0', description: 'Fix for extra menuitems on pages with the old header design'},
    {version: '2020.01.14.0', description: 'Internal changes: Remove potential unsafe or unnecessary use of innerHTML and insertAdjacentHTML'},
    {version: '2019.12.09.0', description: 'Album comments are back again!'},
    {version: '2019.11.03.0', description: 'Fix for scaling/replace showing low res photos (Adapt to a site change).'},
    {version: '2019.10.20.0', description: 'Fix for use of original in scaling/replace.'},
    {version: '2019.10.19.0', description: 'Adjusting to Flickr 2019 updates.'},
    {version: '2019.05.18.0', description: 'Also show feed links on status.flickr.net.'},
    {version: '2019.02.02.0', description: 'Improved map-fix.'},
    {version: '2018.11.29.0', description: 'New feature: Show available RSS/Atom newsfeeds on pages.'},
    {version: '2018.10.15.1', description: 'Add Options page to Firefox and Chrome browser extensions, to enable or disable individual features of Flickr Fixr (Userscript version is still all or nothing).'},
    {version: '2018.10.15.0', description: 'New feature: Added Collections and Map to topmenus.'},
    {version: '2018.08.19.0', description: 'New features: Added link leading to Tags page in topmenus. Added display of full Taken and Upload time, plus link for photographer\'s other photos from (approx.) same day.'},
    {version: '2018.05.20.0', description: 'New feature: Added a subtle warning if photostreams are shown in Date-taken order instead of Date-uploaded order.'},
    {version: '2017.07.31.0', description: 'New feature: Adding a Google Maps link on geotagged photos. Also: Removing unused code. Development code now in GitHub repository: https://github.com/StigNygaard/Stigs_Flickr_Fixr'},
    {version: '2016.06.12.3', description: 'An "un-scale button" to align image-size with (native) notes (on photo-pages, but not in lightbox mode).'},
    {version: '2016.03.11.1', description: 'New features: A link to "recent uploads page" added on the Explore page. Ctrl-click fix for opening tabs in background on search pages (Firefox-only problem?).'},
    {version: '2016.02.09.0', description: 'New feature: Link to Explore Calendar added to Explore page.'},
    {version: '2016.02.06.2', description: 'New feature: Top-pagers! Hover the mouse in the center just above photostreams to show a pagination-bar.'},
    {version: '2015.11.28.1', description: 'New feature: Album-headers are now updated with links to album-map and album-comments.'},
    {version: '2015.08.26.4', description: 'Initial userscript release version. Photo scale/replace, album column and tag-link feature.'}
];

var DEBUG = false;
function log(s) {
    if (DEBUG && console) {
        console.log(s);
    }
}
if (DEBUG) {
    if ('loading' === document.readyState) {
        log("This script is running at document-start time.");
    } else {
        log("This script is running with document.readyState: " + document.readyState);
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
    onStandaloneHandlers: [],
    runningDirty: function() { // In-development and extra experiments enabled?
        return (DEBUG && (fixr.context.userId==='10259776@N00'));
    },
    timer: {
        _test: 0 // TODO
    },
    style: {
        _declarations: '',
        add: function (decl) {
            fixr.style._declarations += decl + ' ';
        },
        init() {
            if (!document.getElementById('fixrStyle')) {
                let styleElem = createRichElement('style', {type: 'text/css', id: 'fixrStyle'}, fixr.style._declarations);
                document.getElementsByTagName('head')[0].appendChild(styleElem);
                log('fixrStyle has been ADDED');
            } else {
                log('fixrStyle was already present');
            }
        }
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
    isWebExtension: function() {
        return (typeof GM_info === 'undefined') && (typeof GM === 'undefined');
    },
    isUserscript: function() {
        return !fixr.isWebExtension();
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
            fixr.context.photographerName = fixr.content.querySelector('a.owner-name').innerText;
            return true;
        }
        return false;
    },
    initPhotographerId: function () { // photographer/attribution id

        // todo: This needs a rewrite some day...

        var elem;
        if (document.querySelector('div.photostream-page-view')) {
            // photostream
            elem = document.querySelector('div.photostream-page-view div.fluid-photostream-coverphoto-view .avatar.person');
        } else if (document.querySelector('div.photo-page-scrappy-view')) {
            // photopage
            elem = document.querySelector('div.photo-page-scrappy-view div.sub-photo-view .photo-attribution .avatar.person');
        } else if (document.querySelector('div.photo-page-lightbox-scrappy-view')) {
            // photopage lightbox
            elem = document.querySelector('div.photo-page-lightbox-scrappy-view div.photo-well-view .photo-attribution .avatar.person');
        } else if (document.querySelector('div.album-page-view')) {
            // album page
            elem = document.querySelector('div.album-page-view div.album-container div.album-header-view .album-attribution .avatar.person');
        } else if (document.querySelector('div.coverphoto-content .avatar.person')) {
            // fallback, modern design pages
            elem = document.querySelector('div.coverphoto-content .avatar.person');
        } else if (document.querySelector('div.subnav-middle div.sn-avatar > img')) {
            // fallback, old design pages
            elem = document.querySelector('div.subnav-middle div.sn-avatar > img');
        } else {
            log('fixr.initPhotographerId() - We do not look for photographerId on this page');
            return true;
        }
        if (!elem) {
            log('fixr.initPhotographerId() - Attribution elem NOT found - returning false');
            return false;
        } // re-run a little later???
        log('fixr.initPhotographerId() - Attribution elem found');
        // (div.avatar.person).style.backgroundImage=url(https://s.yimg.com/pw/images/buddyicon07_r.png#44504567@N00)
        //                    .style.backgroundImage=url(//c4.staticflickr.com/8/7355/buddyicons/10259776@N00_r.jpg?1372021232#10259776@N00)
        var result;
        if (elem.tagName.toUpperCase() === 'IMG' && elem.src) {
            result = elem.src.match(/https:(\/\/[^#\?]+\.com\/[^#\?]+\/buddyicon[^\?\#]+)[^#]*#(\d+\@N\d{2})/i);
        } else if (elem.style.backgroundImage) {
            log('fixr.initPhotographerId() - elem has style.backgroundImage "' + elem.style.backgroundImage + '", now looking for the attribution id...');
            // var pattern = /\/buddyicons\/(\d+\@N\d{2})\D+/i;
            result = elem.style.backgroundImage.match(/url[^#\?]+(\/\/[^#\?]+\.com\/[^#\?]+\/buddyicon[^\?\#]+)[^#]*#(\d+\@N\d{2})/i);
        }
        if (result) {
            log('fixr.initPhotographerId() - Attribution pattern match found: ' + result[0]);
            log('fixr.initPhotographerId() - the attribution icon is ' + result[1]);
            log('fixr.initPhotographerId() - the attribution id is ' + result[2]);
            fixr.context.photographerIcon = result[1];
            fixr.context.photographerId = result[2];
            log('fixr.initPhotographerId() - returning true...');
            return true;
        } else {
            log('fixr.initPhotographerId() - attribution pattern match not found');
            return false;
        }
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
    runIfStandalonePage: function () {
        if (fixr.content === null && fixr.pageactionsCount === 0) { // if really looks like a "standalone page"...
            // Now run the standalone handlers
            if (fixr.onStandaloneHandlers && fixr.onStandaloneHandlers !== null && fixr.onStandaloneHandlers.length) {
                log('We have ' + fixr.onStandaloneHandlers.length + ' standalone handlers starting now...');
                for (var f = 0; f < fixr.onStandaloneHandlers.length; f++) {
                    fixr.onStandaloneHandlers[f]();
                }
            }
        }
    },
    runDelayedPageActionsIfMissed: function () {
        setTimeout(fixr.runPageActionsIfMissed, 2000);
        setTimeout(fixr.runIfStandalonePage, 500);
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
    init: function (runNow, onPageHandlerArray, onResizeHandlerArray, onFocusHandlerArray, onStandaloneHandlerArray) {
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
        fixr.onPageHandlers.push(fixr.style.init); //  styles
        if (onResizeHandlerArray && onResizeHandlerArray !== null && onResizeHandlerArray.length) {
            fixr.onResizeHandlers = onResizeHandlerArray; // Replace by adding with a one-by-one by "helper" for flexibility?
        }
        if (onFocusHandlerArray && onFocusHandlerArray !== null && onFocusHandlerArray.length) {
            fixr.onFocusHandlers = onFocusHandlerArray;
        }
        if (onStandaloneHandlerArray && onStandaloneHandlerArray !== null && onStandaloneHandlerArray.length) { // on standalone pages, not part of "single page application"
            fixr.onStandaloneHandlers = onStandaloneHandlerArray;
            fixr.onStandaloneHandlers.push(fixr.style.init); //  styles
        }

        if (runNow && runNow.length) {
            log('We have ' + runNow.length + ' early running methods starting now at document.readyState = ' + document.readyState);
            for (var f = 0; f < runNow.length; f++) {
                runNow[f]();
            }
        }
    }
};
// FIXR page-tracker end


const fkey="9b8140dc97b93a5c80751a9dad552bd4"; // This api key is for Flickr Fixr only. Get your own key for free at https://www.flickr.com/services/apps/create/

function escapeHTML(str) {
    return str.replace(/[&"'<>]/g, (m) => ({ "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" })[m]);
}

function createRichElement(tagName, attributes, ...content) {
    let element = document.createElement(tagName);
    if (attributes) {
        for (const [attr, value] of Object.entries(attributes)) {
            element.setAttribute(attr, value);
        }
    }
    if (content && content.length) {
        element.append(...content);
    }
    return element;
}

function insertGMapLink() {
    if (fixr.context.pageType !== 'PHOTOPAGE') {
        return; // exit if not photopage
    }
    log('insertGMapLink() running at readystate=' + document.readyState + ' and with photoId=' + fixr.context.photoId);
    if (fixr.context.photoId) {
        var maplink = fixr.content.querySelector('a.static-maps');
        if (maplink) {
            if (!document.getElementById('googlemapslink') && maplink.getAttribute('href') && (maplink.getAttribute('href').includes('map/?'))) {
                try {
                    let lat = maplink.getAttribute('href').match(/Lat=(\-?[\d\.]+)/i)[1];
                    let lon = maplink.getAttribute('href').match(/Lon=(\-?[\d\.]+)/i)[1];
                    let gmaplink = createRichElement('a', {href: 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lon, id: 'googlemapslink'} , 'Show location on Google Maps');
                    fixr.content.querySelector('li.c-charm-item-location').insertAdjacentElement('beforeend', createRichElement('div', {class: 'location-data-container'}, gmaplink));
                }
                catch (e) {
                    log('Failed creating Google Maps link: ' + e);
                }
            } else {
                log('link NOT inserted by insertGMapLink(). Invalid element or link already created. readystate=' + document.readyState);
            }
        } else {
            log('NO maplink found at readystate=' + document.readyState + '. Re-try later?');
        }
    } else {
        log('NO photoId found at readystate=' + document.readyState);
    }
}
function insertGMapLinkDelayed() {
    if (fixr.context.pageType === 'PHOTOPAGE') {
        log('insertGMapLinkDelayed() running... with pageType=' + fixr.context.pageType);
        setTimeout(insertGMapLink, 1500); // make maplink work better on photopage
        setTimeout(insertGMapLink, 3500); // Twice. Photopage is sometimes a bit slow building
        setTimeout(insertGMapLink, 8000); // Triple. Photopage is sometimes very slow building
    }
}
function mapInitializer() {
    if (window.location.href.includes('flickr.com/map/?')) {
        // https://developer.mozilla.org/en-US/docs/Web/API/URL
        const url = new URL(window.location.href);
        // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
        const imgId = url.searchParams.get('photo');
        if (imgId) {
            const focusImg = document.getElementById('f_img_thumb_' + imgId);
            if (focusImg) {
                focusImg.click(); // close and ...
                focusImg.click(); // reopen to highlight position on map
            }
        }
    }
}

const topMenuItems_style = '.fluid-subnav .extraitems a {padding: 12px 10px !important} .subnav-refresh ul.nav-links.extraitems li.sn-navitem a {padding: 13px 10px 12px 10px !important}';
function topMenuItems() {
    // User dropdown menu
    var m = document.querySelector('li[data-context=you] > ul.gn-submenu') || document.querySelector('li[data-context=you] div#you-panel ul');
    if (m) {
        var gid = null;
        if (m.querySelector('a[data-track=gnYouGroupsClick]')) {
            gid = m.querySelector('a[data-track=gnYouGroupsClick]').parentElement;
        }
        if (!gid && m.querySelector('a[data-track=You-groups]')) {
            gid = m.querySelector('a[data-track=You-groups]').parentElement;
        }
        var aad = m.querySelector('a[data-track=gnYouSetsClick]') || m.querySelector('a[data-track=You-sets]');
        if (aad && gid) {
            if (gid.hasAttribute('aria-label') && !m.querySelector('li[aria-label=Tags]')) {
                // latest design
                gid.insertAdjacentElement('afterend', createRichElement('li',{class: 'menuitem', role: 'menuitem', 'aria-label': 'Tags'},createRichElement('a',{'data-track': 'gnYouTagsClick', href: '/photos/me/tags'}, 'Tags')));
                aad.parentElement.insertAdjacentElement('afterend', createRichElement('li', {class: 'menuitem', role: 'menuitem', 'aria-label': 'Map'}, createRichElement('a', {'data-track': 'gnYouMapClick', href: '/photos/me/map'}, 'Map')));
                aad.parentElement.insertAdjacentElement('afterend', createRichElement('li', {class: 'menuitem', role: 'menuitem', 'aria-label': 'Collections'}, createRichElement('a', {'data-track': 'gnYouCollectionsClick', href: '/photos/me/collections'}, 'Collections')));
            } else if (gid.classList.contains('gn-subnav-item') && !m.querySelector('a[data-track=You-tags]')) {
                // earlier design
                gid.insertAdjacentElement('afterend', createRichElement('li', {class: 'gn-subnav-item'}, createRichElement('a',{'data-track': 'You-tags', href: '/photos/me/tags'}, 'Tags')));
                aad.parentElement.insertAdjacentElement('afterend', createRichElement('li', {class: 'gn-subnav-item'}, createRichElement('a', {'data-track': 'You-map', href: '/photos/me/map'}, 'Map')));
                aad.parentElement.insertAdjacentElement('afterend', createRichElement('li', {class: 'gn-subnav-item'}, createRichElement('a', {'data-track': 'You-collections', href: '/photos/me/collections'}, 'Collections')));
            }
        }
    }
    // Photographer menu bar
    m = document.querySelector('ul.links[role=menubar]') || document.querySelector('ul.nav-links');
    if (m) {
        var gib = m.querySelector('li#groups') || m.querySelector('li.sn-groups');
        var aab = m.querySelector('li#albums a') || m.querySelector('li.sn-navitem-sets a');
        if (aab && gib) {
            m.classList.add('extraitems'); // mark extra items being added (so adjust spacing in style)
            if (gib.id === 'groups' && !m.querySelector('li#tags')) {
                // latest design
                gib.insertAdjacentElement('afterend', createRichElement('li', {id: 'tags', class: 'link', role: 'menuitem'}, createRichElement('a', {href: '/photos/'+fixr.context.photographerId+'/tags'}, createRichElement('span', {}, 'Tags'))));
                aab.parentElement.insertAdjacentElement('afterend', createRichElement('li', {id: 'map', class: 'menuitem', role: 'menuitem'}, createRichElement('a', {href: '/photos/' + fixr.context.photographerId + '/map'}, createRichElement('span', {}, 'Map'))));
                aab.parentElement.insertAdjacentElement('afterend', createRichElement('li', {id: 'collections', class: 'menuitem', role: 'menuitem'}, createRichElement('a', {href: '/photos/' + fixr.context.photographerId + '/collections'}, createRichElement('span', {}, 'Collections'))));
            } else if (gib.classList.contains('sn-groups') && !m.querySelector('li.sn-tags')) {
                // earlier design
                gib.insertAdjacentElement('afterend', createRichElement('li', {class: 'sn-navitem sn-tags'}, createRichElement('a', {'data-track': 'YouSubnav-tags', href: '/photos/' + fixr.context.photographerId + '/tags'}, 'Tags')));
                aab.parentElement.insertAdjacentElement('afterend', createRichElement('li', {class: 'sn-navitem sn-map'}, createRichElement('a', {'data-track': 'YouSubnav-map', href: '/photos/' + fixr.context.photographerId + '/map'}, 'Map')));
                aab.parentElement.insertAdjacentElement('afterend', createRichElement('li', {class: 'sn-navitem sn-collections'}, createRichElement('a', {'data-track': 'YouSubnav-collections', href: '/photos/' + fixr.context.photographerId + '/collections'}, 'Collections')));
            }
        }
    }
}

var album = { // cache to avoid repeating requests
    albumId: '',
    commentCount: 0,
    comment: [],
    description: ''
};
// function updateAlbumCommentCount() {
//     var _reqAlbumComments = null;
//     if (window.XMLHttpRequest) {
//         _reqAlbumComments = new XMLHttpRequest();
//         if (typeof _reqAlbumComments.overrideMimeType !== 'undefined') {
//             _reqAlbumComments.overrideMimeType('text/html');
//         }
//         _reqAlbumComments.onreadystatechange = function () {
//             if (_reqAlbumComments.readyState === 4 && _reqAlbumComments.status === 200) {
//                 log('_reqAlbumComments returned status=' + _reqAlbumComments.status);
//                 var doc = document.implementation.createHTMLDocument("sizeDoc");
//                 doc.documentElement.innerHTML = _reqAlbumComments.responseText;
//                 album.albumId = fixr.context.albumId;
//                 album.commentCount = -1;
//                 var e = doc.body.querySelectorAll('span.LinksNew b.Here');
//                 if (e && e.length === 1) {
//                     var n = parseInt(e[0].innerText, 10);
//                     if (Number.isNaN(n)) {
//                         album.commentCount = 0;
//                     } else {
//                         album.commentCount = n;
//                     }
//                 } else {
//                     album.commentCount = -1;
//                     log('b.Here??? ');
//                 }
//                 if (document.getElementById('albumCommentCount')) {
//                     if (album.commentCount === -1) {
//                         document.getElementById('albumCommentCount').innerText = '?';
//                     } else {
//                         document.getElementById('albumCommentCount').innerText = String(album.commentCount);
//                     }
//                 } else {
//                     log('albumCommentCount element not found');
//                 }
//             } else {
//                 // wait for the call to complete
//             }
//         };
//         if (fixr.context.albumId === album.albumId && fixr.context.albumId !== '' && album.commentCount !== -1) {
//             log('Usinging CACHED album count!...');
//             document.getElementById('albumCommentCount').innerText = String(album.commentCount);
//         } else if (fixr.context.albumId !== '') {
//             var url = 'https://www.flickr.com/photos/' + (fixr.context.photographerAlias || fixr.context.photographerId) + '/sets/' + fixr.context.albumId + '/comments/'; // /sets/* urls works, /albums/* urls doesn't currently work
//             _reqAlbumComments.open('GET', url, true);
//             _reqAlbumComments.send(null);
//         } else {
//             log('albumId not initialized');
//         }
//     } else {
//         log('understøtter ikke XMLHttpRequest');
//     }
// }
//
// var _wsGetPhotosetInfoLock = 0;
// function wsGetPhotosetInfo() {
//     var diff = Date.now() - _wsGetPhotosetInfoLock;
//     if ((_wsGetPhotosetInfoLock > 0) && (diff < 50)) {
//         log('Skipping wsGetPhotosetInfo() because already running?: ' + diff);
//         // *** maybe add a check to see if we are still on same album?!
//         return;
//     }
//     _wsGetPhotosetInfoLock = Date.now();
//     function handleResponse(response) {
//         if (response.ok) {
//             if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
//                 return response.json()
//             }
//             throw new Error('Response was not in expected json format.');
//         }
//         throw new Error('Network response was not ok.');
//     }
//     function handleResult(obj) {
//         if (obj.stat === "ok") {
//             if (obj.photoset && obj.photoset && obj.photoset.description) {
//
//                 document.getElementById('albumDescription').innerHTML = obj.photoset.description._content.replace(/\n/g, '<br />');
//
//             }
//         } else {
//             log('flickr.photosets.getInfo returned an ERROR: obj.stat=' + obj.stat + ', obj.code=' + obj.code + ', obj.message=' + obj.message);
//         }
//     }
//     function handleError(error) {
//         console.log('There has been a problem with your fetch operation: ', error.message);
//         log('There has been a problem with your fetch operation: ' + error);
//     }
//     if (fixr.isWebExtension()) {
//         // Call fetch() from background-script in WebExtensions, because changes in Chrome/Chromium https://www.chromium.org/Home/chromium-security/extension-content-script-fetches
//         browser.runtime.sendMessage({msgtype: "flickrservice", method: "flickr.photosets.getInfo", fkey: fkey, options: {photoset_id: fixr.context.albumId, user_id: fixr.context.photographerId}}).then(handleResult).catch(handleError);
//     } else { // Userscript (So far it still works, also on Chrome/Tampermonkey...)
//         fetch('https://api.flickr.com/services/rest/?method=flickr.photosets.getInfo&api_key=' + fkey + '&photoset_id=' + fixr.context.albumId + '&user_id=' + fixr.context.photographerId + '&format=json&nojsoncallback=1').then(handleResponse).then(handleResult).catch(handleError);
//     }
// }

var _wsGetPhotosetCommentsLock = 0;
function wsGetPhotosetComments() { // Call Flickr REST API to get album comments
    var diff = Date.now() - _wsGetPhotosetCommentsLock;
    if ((_wsGetPhotosetCommentsLock > 0) && (diff < 50)) {
        log('Skipping wsGetPhotosetComments() because already running?: ' + diff);
        // *** maybe add a check to see if we are still on same album?!
        return;
    }
    _wsGetPhotosetCommentsLock = Date.now();

    function handleResponse(response) {
        if (response.ok) {
            if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
                return response.json()
            }
            throw new Error('Response was not in expected json format.');
        }
        throw new Error('Network response was not ok.');
    }
    function handleResult(obj) {

        album.albumId = fixr.context.albumId;
        album.commentCount = -1;

        if (obj.stat === "ok") {
            log("flickr.photosets.comments.getList returned ok");
            if (obj.comments && obj.comments.photoset_id) {
                album.albumId = obj.comments.photoset_id;
            }
            if (obj.comments && obj.comments.comment) {
                album.commentCount = obj.comments.comment.length;
            } else {
                album.commentCount = 0;
            }
        } else {
            log('flickr.photosets.comments.getList returned an ERROR: obj.stat=' + obj.stat + ', obj.code=' + obj.code + ', obj.message=' + obj.message);
        }

        if (document.getElementById('albumCommentCount')) {
            if (album.commentCount === -1) {
                document.getElementById('albumCommentCount').innerText = '?';
            } else {
                document.getElementById('albumCommentCount').innerText = String(album.commentCount);
            }
        } else {
            log('albumCommentCount element not found');
        }

        // if (obj.comments.comment) {
        //     let comments = '';
        //     for (let comment of obj.comments.comment) {
        //         comments += '<hr /><div><p class="comment-author"><a href="/photos/' + comment.author + '/">' + comment.authorname + '</a> ' + (new Date(comment.datecreate * 1000)).toString().replace(/\([^\\)]+\)/, '') + '</p><p>' + comment._content.replace(/\n/g, '<br />').replace(/http:\/\/farm\d+\.static\.flickr\.com/g, 'https://live.staticflickr.com').replace(/http:\/\/(www\.)?flickr\.com/g, 'https://www.flickr.com') + '</p></div>';
        //     }
        //     if (document.getElementById('albumComments')) { // Todo: id="albumComments" doesn't yet exist!!!
        //         document.getElementById('albumComments').innerHTML = comments;
        //     }
        // }

        _wsGetPhotosetCommentsLock = 0;
    }
    function handleError(error) {
        console.log('There has been a problem with your fetch operation: ', error.message);
        log('There has been a problem with your fetch operation: ' + error);
    }

    if (fixr.isWebExtension()) {
        // Call fetch() from background-script in WebExtensions, because changes in Chrome/Chromium https://www.chromium.org/Home/chromium-security/extension-content-script-fetches
        browser.runtime.sendMessage({msgtype: "flickrservice", method: "flickr.photosets.comments.getList", fkey: fkey, options: {photoset_id: fixr.context.albumId}}).then(handleResult).catch(handleError);
    } else { // Userscript (So far it still works, also on Chrome/Tampermonkey...)
        fetch('https://api.flickr.com/services/rest/?method=flickr.photosets.comments.getList&api_key=' + fkey + '&photoset_id=' + fixr.context.albumId + '&format=json&nojsoncallback=1').then(handleResponse).then(handleResult).catch(handleError);
    }
}


var albums = { // cache albums to avoid repeating requests
    ownerId: '',
    column: '',
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
                doc.documentElement.innerHTML = _reqAlbumlist.responseText; // NOTICE, this is NOT inserted directly into HTML-document! In the following DOM-content of doc is being analyzed...
                albums.ownerId = fixr.context.photographerId;
                albums.column = new DocumentFragment();
                albums.count = 0;
                var alist = Array.from(doc.body.querySelectorAll('div.photo-list-album-view'));
                var imgPattern = /url\([\'\"]*([^\)\'\"]+)(\.[jpgtifn]{3,4})[\'\"]*\)/i;
                var columnhead = createRichElement('div', {style: 'margin:0 0 .8em 0'});
                if (document.getElementById('albumTeaser')) {
                    if (alist && alist.length > 0) {
                        columnhead.textContent = "Albums";
                        albums.column.appendChild(columnhead);
                        albums.count = alist.length;
                        for (let e of alist.slice(0,10)) {
                            var imgUrl = '';
                            //log(e.outerHTML);
                            // var result = e.style.backgroundImage.match(imgPattern); // strangely not working in Chrome
                            var result = (e.outerHTML).match(imgPattern); // quick work-around for above (works for now)
                            if (result) {
                                // imgUrl = result[1].replace(/_[a-z]$/, '') + '_s' + result[2];
                                imgUrl = result[1].replace(/_[a-z]$/, '') + '_q' + result[2];
                                log('imgUrl=' + imgUrl);
                            } else {
                                log('No match on imgPattern');
                            }
                            var a = e.querySelector('a[href][title]'); // sub-element
                            if (a && a !== null) {
                                log('Album title: ' + a.title);
                                log('Album url: ' + a.getAttribute('href'));
                                var album = document.createElement("div");
                                let thumbnail = createRichElement('img', {src: imgUrl, class: 'asquare', alt: ''});
                                let albumtitle = createRichElement('div', {style: 'margin:0 0 .8em 0'}, a.title);
                                let anchor = createRichElement('a', {href: a.getAttribute('href')}, thumbnail, albumtitle);
                                album.appendChild(anchor);
                                albums.column.appendChild(album);
                            } else {
                                log('a element not found?');
                            }
                        }
                    } else if (alist) {
                        if (doc.body.querySelector('h3')) {
                            columnhead.textContent = doc.body.querySelector('h3').innerText;
                            albums.column.appendChild(columnhead);
                        }
                    } else {
                        log('(e Undefined) Problem reading albums or no albums??? : ' + _reqAlbumlist.responseText );
                    }
                    var foot = document.createElement("div");
                    var cursive = document.createElement("i");
                    var moreanchor = document.createElement("a");
                    moreanchor.href = "/photos/" + (fixr.context.photographerAlias || fixr.context.photographerId) + "/albums/";
                    moreanchor.textContent = albums.count > 10 ? 'More albums...' : (albums.count === 0 ? 'No albums found...' : '');
                    cursive.appendChild(moreanchor);
                    foot.appendChild(cursive);
                    albums.column.appendChild(foot);
                    document.getElementById('albumTeaser').appendChild(albums.column);
                } else {
                    log('albumTeaser NOT FOUND!?!');
                }
            } else {
                // wait for the call to complete
            }
        };

        // if (fixr.context.photographerId === albums.ownerId && fixr.context.photographerId !== '') { // todo: Cache functionality currently not working it seems!?
        //
        //     log('Using CACHED albumlist!...');
        //     document.getElementById('albumTeaser').appendChild(albums.column);
        //     // document.getElementById('albumTeaser').innerHTML = '<div style="margin:0 0 .8em 0">Albums</div>' + albums.column + '<div><i><a href="/photos/' + (fixr.context.photographerAlias || fixr.context.photographerId) + '/albums/">' + (albums.count > 10 ? 'More albums...' : (albums.count === 0 ? 'No albums found...' : '')) + '</a></i></div>';
        //
        // } else
        if (fixr.context.photographerId) {
            var url = 'https://' + window.location.hostname + '/photos/' + (fixr.context.photographerAlias || fixr.context.photographerId) + '/albums';
            _reqAlbumlist.open('GET', url, true);
            _reqAlbumlist.send(null);
        } else {
            log('Attribution user (photographer) not found');
        }
    } else {
        log('understøtter ikke XMLHttpRequest');
    }
}

const albumTeaser_style = 'div#albumTeaser {border:none;margin:0;padding:0;position:absolute;top:0;right:-120px;width:100px}';
function albumTeaser() {
    if (fixr.context.pageType !== 'PHOTOSTREAM') {
        return; // exit if not photostream
    }
    log('albumTeaser() running');
    var dpc = document.querySelector('div.photolist-container');
    if (!dpc) {
        return;
    }
    log('AlbumTeaser found div.photolist-container');
    if (!document.getElementById('albumTeaser')) {
        dpc.style.position = "relative";
        dpc.insertAdjacentElement('afterbegin', createRichElement('div', {id: 'albumTeaser'}));
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

const exploreCalendar_style = '#exploreCalendar {border:none;margin:0;padding:0;position:absolute;top:38px;right:-120px;width:100px} #exploreCalendar div {margin:0 0 .8em 0} #exploreCalendar img.asquare {width:75px;height:59px}';
function exploreCalendar() {
    if (fixr.context.pageType !== 'EXPLORE') {
        return; // exit if not explore/interestingness
    }
    log('exploreCalendar() running');
    let dtr = document.querySelector('div.title-row');
    if (!dtr) {
        return;
    }
    log('exploreCalendar found div.photo-list-view');
    if (!document.getElementById('exploreCalendar')) {
        dtr.style.position = "relative";
        let exploreMonth = fixr.clock.explore().substring(0,7).replace('-','/');
        let explCal = createRichElement('a', {href: '/explore/interesting/' + exploreMonth + '/'}, createRichElement('img', {src: 'https://c2.staticflickr.com/2/1701/24895062996_78719dec15_o.jpg', class: 'asquare', alt: ''}), createRichElement('div', {}, 'Explore Calendar'));
        let freshUpl = createRichElement('a', {href: '/search/?text=&view_all=1&media=photos&content_type=1&dimension_search_mode=min&height=640&width=640&safe_search=2&sort=date-posted-desc&min_upload_date='+(Math.floor(Date.now()/1000)-7200), title:'If you are an adventurer and want to explore something different than everybody else...'}, createRichElement('img', {src: 'https://c2.staticflickr.com/2/1617/25534100345_b4a3fe78f1_o.jpg', class: 'asquare', alt: ''}), createRichElement('div', {}, 'Fresh uploads'));
        dtr.insertAdjacentElement('afterbegin', createRichElement('div', {id: 'exploreCalendar'}, explCal, freshUpl));
        log('San Francisco PST UTC-8: ' + fixr.clock.pst());
        log('Explore Beat (Yesterday, UTC-4): ' + fixr.clock.explore());
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
    var plv = document.querySelectorAll('div.photo-list-view');
    for (var i = 0; i < plv.length; i++) {
        log('ctrlClicking(): plv['+i+'] found!');
        // Allow me to open tabs in background by ctrl-click in Firefox:
        plv[i].parentNode.addEventListener('click', ctrlClick, true);
    }
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
    style: '.unscaleBtn{position:absolute;right:20px;top:15px;font-size:16px;margin-right:16px;color:#FFF;z-index:3000} .unscaleBtn:hover{cursor:pointer}',
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
            var dims = document.querySelector('div.photo-notes-scrappy-view-OLD') || document.querySelector('div.photo-notes-scrappy-view');
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
            var panel = document.querySelector('div.photo-well-media-scrappy-view-OLD') || document.querySelector('div.photo-well-media-scrappy-view');
            var notesview = document.querySelector('div.photo-notes-scrappy-view-OLD') || document.querySelector('div.photo-notes-scrappy-view');
            if (panel && !panel.querySelector('div.unscaleBtn')) {
                log('scaler.addUnscaleBtn: adding option to div.height-controller');
                let scaleIcon = createRichElement('img', {id: 'unscaleBtnId', src: 'https://farm9.staticflickr.com/8566/28150041264_a8b591c2a6_o.png', alt: 'Un-scale', title: 'This photo has been up-scaled by Flickr Fixr. Click here to be sure image-size is aligned with notes area'});
                panel.insertAdjacentElement('afterbegin', createRichElement('div', {class: 'unscaleBtn'}, scaleIcon));
                log ('scaler.addUnscaleBtn: adding click event listner on div.unscaleBtn');
                panel.querySelector('div.unscaleBtn').addEventListener('click',unscale, false);
            } else {
                log('scaler.addUnscaleBtn: div.height-controller not found OR unscaleBtn already defined');
            }
            var unscaleBtnElem = document.getElementById('unscaleBtnId');
            if (unscaleBtnElem && parseInt(notesview.style.width,10)) {
                if (scaler.mf.width === parseInt(notesview.style.width, 10)) { // Green icon
                    unscaleBtnElem.title = "This photo has been up-scaled by Flickr Fixr. It appears Flickr was able to align the notes-area with scaled photo. You should be able to view and create notes correctly scaled and aligned on the upscaled photo.";
                    unscaleBtnElem.src = 'https://farm9.staticflickr.com/8879/28767704565_17560d791f_o.png';
                } else { // Orange icon/button
                    unscaleBtnElem.title = "This photo has been up-scaled by Flickr Fixr. It appears the notes-area is UNALIGNED with the upscaled image. Please click here to align image-size to the notes-area before studying or creating notes on this image.";
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
        var replace = function () {
            if (fixr.context.pageType !== 'PHOTOPAGE' && fixr.context.pageType !== 'PHOTOPAGE LIGHTBOX') {
                return; // exit if not photopage or lightbox
            }
            log('[scaler] scaler.run.replace() running...');
            scaler.mf = document.querySelector('img.main-photo');  // for en sikkerheds skyld
            if (scaler.mf && scaler.mf !== null && scaler.maxSizeUrl !== '') {
                if (scaler.mf.height>=640 || scaler.mf.width>=640) { // dirty hack to work-around a bug
                    if (scaler.mf.src !== scaler.maxSizeUrl) {
                        scaler.mf.lowsrc = scaler.mf.src;
                        scaler.mf.src = scaler.maxSizeUrl; // Replace! only if original (maxSizeUrl should be orgUrl)
                    }
                } else {
                    log('[scaler] Second thoughts. Do not replace this photo with original because unlikely needed here (bug work-around for small screens).');
                }
                scale(); // An extra Scale() - just in case...
            }
        };
        var getSizes = function (url) { // Loading and parsing Sizes (.../sizes/o/) page is where we normally get original size/url
            log('[scaler] scaler.run.getSizes() running looking at ' + url);
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
                        doc.documentElement.innerHTML = _reqAllSizes.responseText;  // NOTICE, this is NOT inserted directly into HTML-document! In the following DOM-content of doc is being analyzed...

                        var sizelist = doc.body.querySelectorAll('ol.sizes-list li ol li'); // display sizes (but original not included in this list)
                        var largest = null;
                        var largesttext = '';
                        while(!largest && sizelist.length>0) {
                            if (sizelist[sizelist.length-1].innerText.replace(/\s+/g,'')==='') { // remove empty items
                                sizelist.pop(); // remove last
                            } else {
                                log('[scaler] Found LARGEST size: '+sizelist[sizelist.length-1].innerText.replace(/\s+/g,''));
                                // alert('[scaler] Found LARGEST size: '+sizelist[sizelist.length-1].innerText.replace(/\s+/g,''));
                                largest = sizelist[sizelist.length-1];
                                largesttext = largest.innerText.replace(/\s+/g,'');
                            }
                        }
                        var shownImg = doc.body.querySelector('div#allsizes-photo>img');
                        if (shownImg && shownImg.src && shownImg.src.match(/_o\.\w+$/)) {
                            // We are seeing the original - use it...
                            scaler.orgUrl = doc.body.querySelector('div#allsizes-photo>img').src;
                            scaler.hasOriginal = true;
                            scaler.maxSizeUrl = doc.body.querySelector('div#allsizes-photo>img').src;
                            log('[scaler] Largest/original image: ' + scaler.maxSizeUrl);
                        }
                        else if (shownImg && shownImg.src && !largest.querySelector('a')) {
                            // List doesn't have link to _PAGE_ for showing largest display size. Thus we are already on page for largest display size. Use this size
                            log ('[scaler] Sizes-page/o seems to be showing largest display-size, not the original. Thus original is not available.');
                            scaler.orgUrl = '';
                            scaler.maxSizeUrl = doc.body.querySelector('div#allsizes-photo>img').src;
                            scaler.hasOriginal = false;
                        } else if (largest && largest.querySelector('a')) {
                            log('[scaler] It seems original is NOT available, and Flickr forwarded us to a page NOT directly showing largest display version available...');
                            // **** Probably Flickr is already showing us best/largest display size. So no further action necessary !!(?) ****
                            scaler.orgUrl = '';
                            scaler.maxSizeUrl = '';
                            scaler.hasOriginal = false;
                        } else {
                            log('[scaler] UNEXPECTED situation.');
                            scaler.orgUrl = '';
                            scaler.maxSizeUrl = '';
                            scaler.hasOriginal = false;
                        }
                        // alert('largesttext: *' + largesttext + '*');
                        var r = /\((\d+)[\u{00D7}x](\d+)\)$/u; // dimensions pattern (????x????)
                        var res = largesttext.match(r);
                        if (res !== null) {
                            // alert ('dimensions: x=' + parseInt(res[1],10) + ', y=' + parseInt(res[2],10));
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
                            var orgImage = new Image();
                            orgImage.addEventListener("load", replace);
                            orgImage.src = scaler.maxSizeUrl;
                        }
                        // alert('scaler.maxSizeUrl=' + scaler.maxSizeUrl + ' , scaler.orgUrl=' + scaler.orgUrl);
                    } else {
                        // wait for the call to complete
                    }
                };
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

        var dpev = document.querySelector('div.photo-engagement-view'); // icon bar below photo on standard photopage
        var pwv = document.querySelector('div.photo-well-view'); // Photo "container" in "full screen view"
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
        var hc = document.querySelector('div.height-controller'); // black top area on standard photopage
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
        var pwmsv = document.querySelector('div.photo-well-media-scrappy-view-OLD') || document.querySelector('div.photo-well-media-scrappy-view'); // photo container+ on standard photopage
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
                    // NOTE: 'ul.sizes' probably doesn't exist until user opens download menu below photo. So this flow rarely (if ever?) run in practice
                    var org = document.querySelector('ul.sizes li.Original a.download-image-size');
                    if (org) { // quick access når vi bladrer?
                        scaler.hasOriginal = true;
                        scaler.maxSizeUrl = (org.href).replace(/^https\:/i, '').replace(/_d\./i, '.');
                        var orgImage = new Image();
                        orgImage.addEventListener("load", replace); // replaces with original once it is loaded
                        orgImage.src = scaler.maxSizeUrl;
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
                                    var orgImage = new Image();
                                    orgImage.addEventListener("load", replace);
                                    orgImage.src = scaler.maxSizeUrl;
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
                    getSizes('https://' + window.location.hostname + '/photos/' + (fixr.context.photographerAlias || fixr.context.photographerId) + '/' + fixr.context.photoId + '/sizes/o'); // Try loading Photo Sizes page showing original
                }
            } else {
                log('[scaler] Scaling NOT relevant');
            }
            scaler.postAction('notes on unscaled photo'); // look for notes (not (yet?) scaled)
        }
    }
};

const topPagination_style = '#topPaginationContainer{width:250px;height:40px;margin:0 auto;position:absolute;top:0;left:0;right:0;border:none} #topPagination{width:720px;margin:0;position:absolute;top:0;left:-235px;text-align:center;z-index:10;display:none;border:none;padding:10px 0 10px 0;overflow:hidden} .album-toolbar-content #topPagination{top:-16px} .group-pool-subheader-view #topPagination{top:-7px} .title-row #topPagination{width:830px;left:-290px;top:-12px} #topPaginationContainer:hover #topPagination{display:block}';
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

const albumExtras_style = '.album-map-icon{background:url("https://c2.staticflickr.com/6/5654/23426346485_334afa6e8f_o_d.png") no-repeat;height:21px;width:24px;top:6px;left:3px} .album-comments-icon{background:url("https://c1.staticflickr.com/5/4816/46041390622_f8a0cf0148_o.png") -32px -460px no-repeat;height:21px;width:24px;top:6px;left:3px}';
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
        var maplink = document.createElement('a');
        maplink.href= '/photos/' + fixr.context.photographerAlias + '/albums/' + fixr.context.albumId + '/map/';
        maplink.style.fontSize = '14px';
        maplink.style.color = '#FFF';
        var mapicon = document.createElement('span');
        mapicon.title = 'Album on map';
        mapicon.className = 'album-map-icon';
        maplink.appendChild(mapicon);
        mapdiv.appendChild(maplink);
        elist.appendChild(mapdiv);
        // comments-link:
        var comurl = '/photos/' + fixr.context.photographerAlias + '/sets/' + fixr.context.albumId + '/comments/';  // /sets/* urls works, /albums/* urls currently doesn't work (yet?)
        // var comurl = '#'; // NEW?!
        var cmdiv = document.createElement('div');
        cmdiv.className = 'create-book-container';
        cmdiv.title = 'Comments';
        cmdiv.style.textAlign = 'center';
        var cmlink = document.createElement('a');
        cmlink.href = comurl;
        cmlink.style.fontSize = '14px';
        cmlink.style.color = '#FFF';
        cmlink.id = 'albumCommentsLink';
        var cmicon = document.createElement('span');
        cmicon.title = 'Album comments';
        cmicon.className = 'album-comments-icon';
        cmicon.id = 'albumCommentCount';
        cmlink.appendChild(cmicon);
        cmdiv.appendChild(cmlink);
        elist.appendChild(cmdiv);

        // Sorry, album comments are currently not available to view
        // document.getElementById('albumCommentsLink').addEventListener('click', () => alert('Sorry, album comments are currently not visible on Flickr'));

        // updateAlbumCommentCount();

        // // create overlay lightbox  // NEW?!...
        // let infobox = document.createElement('div');
        // let description = document.createElement('div');
        // let comments = document.createElement('div');
        // infobox.style = 'display:none;position:absolute;top:2em;left:4em;right:4em;z-index:500;border:none;padding:2rem;background-color:#000';
        // infobox.id = 'albumInfobox';
        // infobox.innerHTML = '<h2>Album description and comments</h2>';
        // description.id = 'albumDescription';
        // description.innerHTML = '[description]';
        // comments.id = 'albumComments';
        // comments.innerHTML = '[comments]';
        // infobox.appendChild(description);
        // infobox.appendChild(comments);
        // let header = document.querySelector('div.album-header-content');
        // if (header) {
        //     header.style.position = 'relative';
        //     header.appendChild(infobox);
        //     // infobox.style.display = 'block';
        //     document.getElementById('albumCommentsLink').addEventListener('click', function(evt){evt.preventDefault();evt.stopPropagation();infobox.style.display = 'block';return false}, false);
        // }
        wsGetPhotosetComments();  // (NEW!)
        // wsGetPhotosetInfo();  // NEW?!

    }
}

const updateTags_style_avatar = 'a.fixrTag>img {width:1em;height:1em;margin:0;padding:0;position:relative;top:3px}';
const updateTags_style_hover = 'ul.tags-list>li.tag>a.fixrTag,ul.tags-list>li.autotag>a.fixrTag{display:none;} ul.tags-list>li.tag:hover>a.fixrTag,ul.tags-list>li.autotag:hover>a.fixrTag{display:inline;} ' + updateTags_style_avatar;
const updateTags_style_persist = 'ul.tags-list>li.tag>a.fixrTag,ul.tags-list>li.autotag>a.fixrTag{display:inline;} ' + updateTags_style_avatar;
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
        let tags = document.querySelectorAll('ul.tags-list>li');
        if (tags && tags !== null && tags.length > 0) {
            log('updateTags() Looping ' + tags.length + ' tags...');
            let iconHref = fixr.context.photographerIcon.match(/^([^_]+)(_\w)?\.[jpgntif]{3,4}$/)[1] + String(fixr.context.photographerIcon.match(/^[^_]+(_\w)?(\.[jpgntif]{3,4})$/)[2]); // do we know for sure it is square?
            for (let tag of tags) {
                let atag = tag.querySelector('a[title][href*="/photos/tags/"],a[title][href*="?tags="],a[title][href*="?q="]');
                if (atag) {
                    let realtag = (atag.href.match(/((\/tags\/)|(\?tags\=)|(\?q\=))([\S]+)$/i))[5];
                    if (!(tag.querySelector('a.fixrTag'))) {
                        let avatar = document.createElement('img');
                        avatar.src = iconHref;
                        avatar.alt = '*';
                        let taglink = document.createElement('a');
                        taglink.className = 'fixrTag';
                        taglink.href = '/photos/' + (fixr.context.photographerAlias || fixr.context.photographerId) + '/tags/' + realtag + '/';
                        taglink.title = atag.title + ' by ' + fixr.context.photographerName;
                        taglink.appendChild(avatar);
                        tag.insertBefore(taglink, tag.firstChild);
                    }
                } else {
                    log('updateTags(): atag not matched.');
                }
            }
        } else {
            log('updateTags(): No tags defined (yet?)');
        }
    } else {
        log('updateTags(): taglist container not found');
    }
}
function updateTagsDelayed() {
    log('updateTagsDelayed() running... with pageType=' + fixr.context.pageType);
    if (fixr.context.pageType === 'PHOTOPAGE') {
        setTimeout(updateTags, 2500);
        setTimeout(updateTags, 4500); // Twice. Those tags are sometimes a bit slow emerging
        setTimeout(updateTags, 8500); // Triple. Those tags are sometimes very slow emerging
    }
}

const photoDates_style = '.has-date-info {position:relative} .date-info{z-index:10;padding:0 .5em 0 .5em;display:none;position:absolute;top:30px;left:-40px;width:400px;margin-right:-400px;background-color:rgba(255,250,150,0.9);color:#000;border:1px solid #d4b943;border-radius:4px;} .has-date-info:hover .date-info{display:block;} .date-info label {display:inline-block; min-width: 5em;}';
function photoDates() {
    var elem = document.querySelector('div.view.sub-photo-date-view');
    if (elem && !elem.classList.contains('has-date-info')) {
        elem.classList.add('has-date-info');
        elem.insertAdjacentElement('beforeend', createRichElement('div', {class: 'date-info'}, 'Date info!'));
        wsGetPhotoInfo(); // get dates
    }
}
function photoDatesDelayed() {
    log('photoDates() running... with pageType=' + fixr.context.pageType);
    if (fixr.context.pageType === 'PHOTOPAGE') {
        setTimeout(photoDates, 2000);
        setTimeout(photoDates, 4000); // Twice.
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

const orderwarning_style = '.filter-sort.warning p {animation:wink 3s ease 1s 1;} @keyframes wink {0% {background-color:transparent;} 50% {background-color:rgba(255,250,150,0.9);} 100% {background-color:transparent;}} .filter-sort.warning:after{content:"You are looking at this photostream in Date-taken order. Change order to Date-uploaded, to be sure to see latest uploads in the top of photostreams.";z-index:10;padding:.5em;display:none;position:relative;top:-2px;right:-50px;width:400px;margin-right:-400px;background-color:rgba(255,250,150,0.9);color:#000;border:1px solid #d4b943;border-radius:4px;} .filter-sort.warning:hover:after{display:block;}';
function orderWarning() {
    if (fixr.context.pageType === 'PHOTOSTREAM') {
        var e = document.querySelector('.dropdown-link.filter-sort');
        if(e) {
            if (['Date taken', 'Fecha de captura', 'Aufnahmedatum', 'Date de prise de vue', 'Data dello scatto', 'Tirada na data', 'Ngày chụp', 'Tanggal pengambilan', '拍攝日期', '촬영 날짜'].includes(e.innerText.trim())) {
                e.classList.add('warning');
            } else {
                e.classList.remove('warning');
            }
        }
    }
}

const newsfeedLinks_style = 'div#feedlinks {border:none;margin:0;padding:0;position:absolute;top:0;right:10px;width:100px} ul.gn-tools>div#feedlinks {right:-120px} div#gn-wrap>div#feedlinks, div.header-wrap>div#feedlinks, header#branding>div#feedlinks {right:-120px} div#feedlinks>a {display:block;float:left;margin:10px 8px 0 0;width:16px} div#feedlinks>a>img {display:block;width:16px;height:16px} ul.gn-tools>div#feedlinks>a {margin-top:2px}';
function newsfeedLinks() {
    var elem = document.getElementById('feedlinks');
    if (elem) {
        elem.textContent = '';
    }
    setTimeout(updateNewsfeedLinks, 500); // give Flickr time to update link tags in head
}
function updateNewsfeedLinks() {
    var feedlinks = document.querySelectorAll('head > link[rel="alternate"][type="application/rss+xml"], head > link[rel="alternate"][type="application/atom+xml"], head > link[rel="alternate"][type="application/atom+xml"], head > link[rel="alternate"][type="application/json"]');
    log('Number of feed links found: ' + feedlinks.length);
    var dgnc = document.querySelector('div.global-nav-container ul.gn-tools') || document.querySelector('div#gn-wrap') || document.querySelector('div#global-nav') || document.querySelector('div.header-wrap') || document.querySelector('header#branding') || document.querySelector('div.custom-header-container>div>div');
    if (dgnc) {
        if (!document.getElementById('feedlinks')) {
            dgnc.style.position = "relative";
            dgnc.insertAdjacentElement('afterbegin', createRichElement('div', {id: 'feedlinks'}));
        }
        var elem = document.getElementById('feedlinks');
        if (elem) {
            var feedicons = new DocumentFragment();
            for (const link of feedlinks) {
                var feedlink = document.createElement('a');
                feedlink.href = link.href;
                var feedsymbol = document.createElement('img');
                feedsymbol.src = 'https://c1.staticflickr.com/5/4869/32220441998_601de47e20_o.png';
                feedsymbol.alt = 'Feedlink';
                feedsymbol.style.width = '16px';
                feedsymbol.style.height = '16px';
                feedsymbol.title = link.title;
                feedlink.appendChild(feedsymbol);
                feedicons.appendChild(feedlink);
            }
            elem.textContent = ''; // remove existing content
            elem.appendChild(feedicons);
        }
    }
}

function initSlideshowSpeedHook() {
    let timeoutScript = document.createElement('script');
    timeoutScript.src = browser.runtime.getURL('inject/timeout.js');
    timeoutScript.onload = function() {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(timeoutScript);
}

let slideshowSpeed = '5'; // Flickr default (seconds)
function initSlideshowSpeed() {
    if (document.body) {
        document.body.setAttribute('data-slideshowspeed', slideshowSpeed);
    }
}

var _wsGetPhotoInfoLock = 0;
function wsGetPhotoInfo() { // Call Flickr REST API to get photo info
    var diff = Date.now() - _wsGetPhotoInfoLock;
    if ((_wsGetPhotoInfoLock > 0) && (diff < 50)) {
        log('Skipping wsGetPhotoInfo() because already running?: ' + diff);
        // *** maybe add a check to see if we are still on same photo?!
        return;
    }
    _wsGetPhotoInfoLock = Date.now();

    function handleResponse(response) {
        if (response.ok) {
            if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
                return response.json()
            }
            throw new Error('Response was not in expected json format.');
        }
        throw new Error('Network response was not ok.');
    }
    function handleResult(obj) {
        var elem = document.querySelector('.date-info');
        if (obj.stat === "ok") {
            log("flickr.photos.getInfo returned ok");
            if (obj.photo && obj.photo.id) {
                var uploadDate = new Date(0);
                var debugstr = '';
                if (obj.photo.dateuploaded) {
                    uploadDate = new Date(obj.photo.dateuploaded * 1000);
                    debugstr = 'UploadDate: ' + uploadDate.toString();
                }
                let dateDetail = createRichElement('p', {'x-ms-format-detection': 'none'});
                let takenLabel = createRichElement('label', {}, 'Taken:');
                let uploadedLabel = createRichElement('label', {}, 'Uploaded:');
                let brElem = document.createElement('br');
                if (obj.photo.dates) {
                    if (obj.photo.dateuploaded !== obj.photo.dates.posted) {
                        log('Unexpected Date difference!');
                    }
                    if (obj.photo.dates.posted) {
                        if (obj.photo.dates.posted < obj.photo.dateuploaded) {
                            uploadDate = new Date(obj.photo.dates.posted * 1000); // GMT/UTC
                        }
                        debugstr += '<br />PostDate: ' + uploadDate.toString();
                    }
                    if (obj.photo.dates.taken && obj.photo.dates.takenunknown.toString() === '0') {
                        debugstr += '<br />TakenDate: ' + obj.photo.dates.taken + ' (granularity=' + obj.photo.dates.takengranularity + ')';
                        var takenDateTmp = obj.photo.dates.taken.replace(/[^\d-:\s]/g, ''); // "2018-03-30 00:35:44" (Remove any unexpected characters)
                        var takenDate = new Date(Date.parse(takenDateTmp.replace(' ', 'T')));
                        var dayStart = new Date(Date.parse(takenDateTmp.substring(0, 10) + 'T00:00:00'));
                        var dayEnd = new Date(Date.parse(takenDateTmp.substring(0, 10) + 'T23:59:59'));
                        var takenTimeIndex = takenDate.toString().search(/\d{2}[:\.]\d{2}[:\.]\d{2}/);
                        if (obj.photo.dates.takengranularity.toString() === '0') { // 0	Y-m-d H:i:s - full datetime
                            let linkElem = createRichElement('a', {href: '/search/?user_id=' + fixr.context.photographerId + '&view_all=1&min_taken_date=' + (Math.floor(dayStart.getTime() / 1000) - 43200) + '&max_taken_date=' + (Math.floor(dayEnd.getTime() / 1000) + 43200)}, takenDate.toString().substring(0, takenTimeIndex - 1));
                            dateDetail.append(takenLabel, ' ', linkElem, takenDate.toString().substring(takenTimeIndex - 1, takenTimeIndex + 8) + ' "Camera Time"', brElem);
                        } else if (obj.photo.dates.takengranularity.toString() === '4') { // 4	Y-m
                            dateDetail.append(takenLabel, ' ' + takenDateTmp.substring(0, 7), brElem);
                        } else if (obj.photo.dates.takengranularity.toString() === '6') { // 6	Y
                            dateDetail.append(takenLabel, ' ' + takenDateTmp.substring(0, 4), brElem);
                        } else if (obj.photo.dates.takengranularity.toString() === '8') { // 8	Circa...
                            dateDetail.append(takenLabel, ' Circa ' +  takenDateTmp.substring(0, 4), brElem);
                        } else {
                            log('Unexpected value for photo.dates.takengranularity: ' + obj.photo.dates.takengranularity);
                        }
                    }
                    if (obj.photo.dates.lastupdate) { // photo has been updated/replaced
                        debugstr += '<br />UpdateDate: ' + (new Date(obj.photo.dates.lastupdate * 1000)).toString();
                    }
                }
                if (elem) {
                    var uploadDateStr = uploadDate.toString();
                    var n = uploadDateStr.indexOf('(');
                    if (n > 0) {
                        dateDetail.append(uploadedLabel, ' ' + uploadDateStr.substring(0, n));
                    } else {
                        dateDetail.append(uploadedLabel, ' ' + uploadDateStr);
                    }
                    elem.textContent = '';
                    elem.append(dateDetail);
                    var withTitle = elem.parentElement.querySelector('span[title]');
                    if (withTitle) {
                        withTitle.removeAttribute('title');
                    }
                }
            }
        } else {
            if (elem) {
                elem.textContent = 'Cannot fetch detailed date details on private photos';
            }
            log('flickr.photos.getInfo returned an ERROR: obj.stat=' + obj.stat + ', obj.code=' + obj.code + ', obj.message=' + obj.message);
        }
        _wsGetPhotoInfoLock = 0;
    }
    function handleError(error) {
        console.log('There has been a problem with your fetch operation: ', error.message);
        log('There has been a problem with your fetch operation: ' + error);
        var elem = document.querySelector('.date-info');
        if (elem) {
            elem.textContent = 'There was an error fetching detailed date details...';
        }
    }

    if (fixr.isWebExtension()) {
        // Call fetch() from background-script in WebExtensions, because changes in Chrome/Chromium https://www.chromium.org/Home/chromium-security/extension-content-script-fetches
        browser.runtime.sendMessage({msgtype: "flickrservice", method: "flickr.photos.getInfo", fkey: fkey, options: {photo_id: fixr.context.photoId}}).then(handleResult).catch(handleError);
    } else { // Userscript (So far it still works, also on Chrome/Tampermonkey...)
        fetch('https://api.flickr.com/services/rest/?method=flickr.photos.getInfo&api_key=' + fkey + '&photo_id=' + fixr.context.photoId + '&format=json&nojsoncallback=1').then(handleResponse).then(handleResult).catch(handleError);
    }
}

function stereotest() {
    var self = "flickrfixruserscript";
    var other = "flickrfixrwebextension";
    if (fixr.isWebExtension()) {
        self = "flickrfixrwebextension";
        other = "flickrfixruserscript";
    }
    document.body.classList.add(self);
    if (document.body.classList.contains(other)) {
        alert("It looks like you are running both Stigs Flickr Fixr userscript and Flickr Fixr browser extension at once. Please uninstall or disable one of them to avoid errors and unpredictable behaviors!");
    }
}

function runEarly() {
    //localStorage.setItem('filterFeedEvents', 'people'); // Try to make People feed default.
}

function userscriptWarning() {
    if (!document.body.classList.contains("flickrfixrwebextension")) { // Skip warning if both versions are installed (There will be another warning from stereotest()).
        let info = (GM_info ? GM_info : (typeof GM === 'object' && GM !== null && typeof GM.info === 'object' ? GM.info : null) );
        if (info) {
            let prevDate = localStorage.getItem("fixr_userscript_warning_timestamp");
            let prevVersion = localStorage.getItem("fixr_userscript_warning_version");
            if (!prevVersion || prevVersion !== info.script.version) {
                localStorage.setItem("fixr_userscript_warning_timestamp", Date.now().toString());
                localStorage.setItem("fixr_userscript_warning_version", info.script.version);
                alert('\nYou are running the userscript-version of Flickr Fixr via ' + info.scriptHandler + '. Did you know that Flickr Fixr is also available as a regular browser extension for most webbrowsers? \n\nSupport and test of userscript-version is limited, and some features are not available or might stop working. It is highly recommended to use the regular browser extensions instead. \n\nYou can find Flickr Fixr browser extension in the Add-on webstores for Chrome, Firefox and Edge.\n');
            }
        }
    }
}

const shared_style = 'img.asquare {width:75px;height:75px;border:none;margin:0;padding:0;transition:all 0.3s ease} a:hover>img.asquare{transform:scale(1.3)}'; // used by multiple features

function handlerInitFixr(options) { // Webextension init
    let runNow = [];
    let onPageHandlers = [];
    let onResizeHandlers = [];
    let onFocusHandlers = [];
    let onStandaloneHandlers = [];

    fixr.style.add(shared_style);
    onPageHandlers.push(stereotest);
    if (options.scaler) {
        fixr.style.add(scaler.style);
        onPageHandlers.push(scaler.run);
        onResizeHandlers.push(scaler.run);
    }
    if (options.topMenuItems) {
        fixr.style.add(topMenuItems_style);
        onPageHandlers.push(topMenuItems);
        onStandaloneHandlers.push(topMenuItems);
    }
    if (options.ctrlClicking) {
        onPageHandlers.push(ctrlClicking);
    }
    if (options.albumExtras) {
        fixr.style.add(albumExtras_style);
        onPageHandlers.push(albumExtras);
    }
    if (options.topPagination) {
        fixr.style.add(topPagination_style);
        onPageHandlers.push(topPagination);
    }
    if (options.shootingSpaceballs) {
        onPageHandlers.push(shootingSpaceballs);
    }
    if (options.orderWarning) {
        fixr.style.add(orderwarning_style);
        onPageHandlers.push(orderWarning);
    }
    if (options.newsfeedLinks) {
        fixr.style.add(newsfeedLinks_style);
        onPageHandlers.push(newsfeedLinks);
        onStandaloneHandlers.push(newsfeedLinks);
    }
    if (options.photoDates) {
        fixr.style.add(photoDates_style);
        onPageHandlers.push(photoDatesDelayed);
    }
    if (options.ctrlClicking) {
        onPageHandlers.push(ctrlClickingDelayed);
    }
    if (options.exploreCalendar) {
        fixr.style.add(exploreCalendar_style);
        onPageHandlers.push(exploreCalendarDelayed);
    }
    if (options.albumTeaser) {
        fixr.style.add(albumTeaser_style);
        onPageHandlers.push(albumTeaserDelayed);
    }
    if (options.insertGMapLink) {
        onPageHandlers.push(insertGMapLinkDelayed);
        onStandaloneHandlers.push(mapInitializer);
    }
    if (options.updateTags) {
        if (options.updateTags_tagmode === 'updateTags_persist') {
            fixr.style.add(updateTags_style_persist);
        } else {
            fixr.style.add(updateTags_style_hover);
        }
        onPageHandlers.push(updateTagsDelayed);
    }
    if (options.slideshowSpeedControl) {
        slideshowSpeed = options.slideshowSpeedControl_value;
        runNow.push(initSlideshowSpeedHook);
        onPageHandlers.push(initSlideshowSpeed);
    }
    fixr.init(runNow, onPageHandlers, onResizeHandlers, onFocusHandlers, onStandaloneHandlers);
}

if (window.location.href.includes('flickr.com\/services\/api\/explore\/')) {
    // We are on Flickr API Explorer (WAS used for note handling before Flickr returned native note-support) and outside "normal" flickr page flow. fixr wont do here...
} else {
    if (fixr.isWebExtension()) {
        log('WebExtension - init with options...');
        withOptionsDo(handlerInitFixr); // Load selected features and run fixr.init with them...
    } else {
        log('Userscript - fixr.init...');
        fixr.style.add(shared_style);
        fixr.style.add(scaler.style);
        fixr.style.add(albumExtras_style);
        fixr.style.add(topPagination_style);
        fixr.style.add(orderwarning_style);
        fixr.style.add(topMenuItems_style);
        fixr.style.add(photoDates_style);
        fixr.style.add(newsfeedLinks_style);
        fixr.style.add(exploreCalendar_style);
        fixr.style.add(albumTeaser_style);
        fixr.style.add(updateTags_style_hover);
        // FIXR fixr.init([runNow], [onPageHandlers], [onResizeHandlers], [onFocusHandlers], [onStandaloneHandlers])
        fixr.init([/* runEarly */], [stereotest, scaler.run, topMenuItems, ctrlClicking, albumExtras, topPagination, shootingSpaceballs, orderWarning, newsfeedLinks, photoDatesDelayed, ctrlClickingDelayed, exploreCalendarDelayed, albumTeaserDelayed, insertGMapLinkDelayed, updateTagsDelayed, userscriptWarning], [scaler.run], [], [topMenuItems, newsfeedLinks, mapInitializer]);
    }
}
