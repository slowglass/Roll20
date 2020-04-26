if (typeof MarkStart !== "undefined") MarkStart('Center.js')
/*
* Version: 0.1
* Author: Chris Davies
* GitHun: https://github.com/slowglass/Roll20.git
* Upload Time: UPLOAD-TIMESTAMP
* 
*/
var Center = Center || (function() {
    'use strict';
    const $U = Utils;
    //let defaults = {};
    //let config = {};
    const version = "0.1",
    module = "cjd:Center",
    getVersion = () => { return version; },
    pingPlayers = () => {
        let currentPageID = Campaign().get('playerpageid');
        var players = findObjs({ _type:"player" });
        players.forEach((p) => {
            let pid = p.get("_id");
            let tokens = filterObjs((obj) => {
                if (obj.get("_subtype") !== "token") return false;
                if (obj.get("_pageid") !== currentPageID) return false;
                let character = getObj("character", obj.get("represents"));
                if (character === undefined) return false;
                let controlledby = character.get("controlledby");
                if (controlledby === undefined || controlledby === 'all') return false;
                return controlledby.split(',').includes(pid);
            });
            if (tokens === undefined || tokens.length === 0)
                tokens = findObjs({ _subtype:"token", _pageid: currentPageID, name: 'Party' });
            if (tokens === undefined || tokens.length === 0) return;
            let token = tokens.shift();
            sendPing(token.get("left"),token.get("top"),token.get("pageid"),"",true, pid);
        });
    },
    onNewPage = () => { setTimeout(() => { pingPlayers(); }, 1500);},
    initialise = () => {
        $U.announce(module, version, 'UPLOAD-TIMESTAMP');
    },
    registerEventHandlers = () => {
        on('change:campaign:playerpageid', onNewPage);
    };
    return {
        initialise,
        registerEventHandlers,
        getVersion
    }
})();

on('ready',() => {
    'use strict';

    Center.initialise();
    Center.registerEventHandlers();
});
if (typeof MarkStart !== "undefined") MarkStop('Center.js')
