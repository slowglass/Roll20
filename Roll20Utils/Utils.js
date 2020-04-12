MarkStart('Utils.js')
/*
 * Version: 0.1
 * Author: Chris Davies
 * GitHun: https://github.com/slowglass/Roll20.git
 * Upload Time: UPLOAD-TIMESTAMP
 * 
 * Utils
 *   - announce(name, version)
*/

var Utils = Utils || (function() {
    'use strict';
    const version = "0.1",
    debugStyle = "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;",
    name = "cjd:Utils",
    debug = (msg, details) => {
        let m = msg;
        if (details !== undefined) {
            log(typeof details);
            log(details instanceof String);
            if (typeof details === 'string' || details instanceof String)
                m += details;
            else
                m += JSON.stringify(details);
        }
        sendChat("Utils:DEBUG", "/w gm " + '<div style="'+debugStyle+'">'+m+'</div>', null, {noarchive:true});
    },
    getState = (name, defaults, override) => {
        if(!_.has(state, name)) {
            state[name] = state[name] || {};
        }
        if (override || Object.keys(state[name]).length === 0) {
            state[name] = JSON.parse(JSON.stringify(defaults));
        }

        log("4");
        return state[name];
    },
    announce = (name, version, date) => { log('==> '+name+': ' + version + '  - Uploaded @ ['+date+']');},
    parseMessage = (msg, commands) => {
        let msgInfo = {}
        msgInfo.args = msg.content.split(' ');
        msgInfo.command = msgInfo.args.shift();
        if (!commands.includes(msgInfo.command))
            return undefined;
        msgInfo.subCommand = msgInfo.args.shift();
        msgInfo.playerid = msg.playerid;
        msgInfo.tokens = [];
        if(msg.selected && msg.selected.length){
            msgInfo.tokens = msg.selected.map(s => getObj(s._type, s._id));
        }
        debug(msgInfo.command + ":" + msgInfo.subCommand);
        return msgInfo;
    },
    printInfo = (module, title, icon, text, settings, style) => {
        title = heading(icon, title, settings.title_tag);
        sendChat(module, '<div style="'+style+'">'+title+text+'</div>', null, {noarchive:true});
    },
    heading = (icon, title, tag) => {
        return '<'+tag+' style="margin-bottom: 10px;">'+icon+'<span style="vertical-align: top;">'+title+'</span></'+tag+'>';
    };
    announce(name, version, 'UPLOAD-TIMESTAMP');
    return {
        debug,
        parseMessage,
        printInfo,
        getState,
        announce
    };
})();
MarkStop('Utils.js')