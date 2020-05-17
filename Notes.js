if (typeof MarkStart !== "undefined") MarkStart('Notes.js')
/*
* Version: 0.1
* Author: Chris Davies
* GitHun: https://github.com/slowglass/Roll20.git
* Upload Time: UPLOAD-TIMESTAMP
*
*/
var Notes = Notes || (function() {
    'use strict';
    const $U = Utils;
    const $W = HtmlUtils;
    const version = "0.1",
    module = "cjd:Notes",
    getVersion = () => { return version; },
    onChat = (msg) => {
        let msgData = $U.parseMessage(msg, ["!note"]);
        if (msgData === undefined) return;
        switch(msgData.subCommand)
        {
            case 'show':
                printNotes(msgData.tokens.shift());
                break;
            default:
                break;
        }
    },
    showMsg = (from, name, msg) => {
      $W.printInfo(from, msg, {type: 'info', who: name});
    },
    printNotes = (token) => {
      let name = token.get('name');
      let objs = findObjs({_type:'handout', name});
      if (objs.length === 0) return;
      let from = getObj("page", Campaign().get("playerpageid")).get('name');
      objs.shift().get('notes', (note) => { showMsg(name, from, note); });
    },
    initialise = () => {
        $U.announce(module, version, 'UPLOAD-TIMESTAMP');
    },
    registerEventHandlers = () => {
        on('chat:message', onChat);
    };
    return {
        initialise,
        registerEventHandlers,
        getVersion
    }
})();

on('ready',() => {
    'use strict';

    Notes.initialise();
    Notes.registerEventHandlers();
});
if (typeof MarkStart !== "undefined") MarkStop('Notes.js')
