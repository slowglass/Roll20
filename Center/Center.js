if (typeof MarkStart !== "undefined") MarkStart('Center.js')
/*
* Version: 0.1
* Author: Chris Davies
* GitHun: https://github.com/slowglass/Roll20.git
* Upload Time: UPLOAD-TIMESTAMP
* 
* COMMAND !centre
* !centre reset - Provides condition Menus.
*
* 
* TODO
*/
var Center = Center || (function() {
    'use strict';
    const $U = Utils;
    const $W = HtmlUtils;

    let defaults = {};
    let config = {};
    const version = "0.1",
    module = "cjd:Center",
    getVersion = () => { return version; },
    onChat = (msg) => {
        let msgData = $U.parseMessage(msg, ["!centre", "!center"]);
        if (msgData === undefined) return;
        switch(msgData.subCommand)
        {
            case 'reset':
                config = $U.getState(module, defaults, true);
                break;

            default:
                printHelpInfo();
                break;
        }
    },
    printHelpInfo = () => {
        let message = "Help Message";
        $W.printInfo('', message, {type: 'info'});
    },
    initialise = () => {
        getDefaults();
        config = $U.getState(module, defaults, false);
        $U.announce(module, version, 'UPLOAD-TIMESTAMP');
    },
    registerEventHandlers = () => {
        on('chat:message', onChat);
    },
    getDefaults = () => {
        defaults = {};   
    };
    return {
        initialise,
        registerEventHandlers,
        getVersion
    }
})();

on('ready',function() {
    'use strict';

    Center.initialise();
    Center.registerEventHandlers();
});
if (typeof MarkStart !== "undefined") MarkStart('Concentration.js')