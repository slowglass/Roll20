if (typeof MarkStart !== "undefined") MarkStart('Debuf.js')
/*
* Version: 0.1
* Author: Chris Davies
* GitHun: https://github.com/slowglass/Roll20.git
* Upload Time: UPLOAD-TIMESTAMP
*
* COMMAND !Debuf
* !Debuf reset - Provides condition Menus.
*
*
* TODO
*/
var Debuf = Debuf || (function() {
    'use strict';
    const $U = Utils;
    const $W = HtmlUtils;

    let defaults = {};
    let config = {};
    const version = "0.1",
    module = "cjd:Debuf",
    getVersion = () => { return version; },
    onChat = (msg) => {
        let parseData = $U.parseAttack(msg);
        if (parseData === undefined) parseData = $U.parseSave(msg);
        if (parseData !== undefined) {
            printDebufMessage(parseData.who, parseData.tokens.shift());
            return;
        }

        let msgData = $U.parseMessage(msg, ["!debuf"]);
        if (msgData === undefined) return;
        switch(msgData.subCommand)
        {
            case 'reset':
                config = $U.getState(module, defaults, true);
                break;

            case 'help':
                    printHelpInfo();
                    break;
            default:
                printDebufMessage(msgData.who, msgData.tokens);
                break;
        }
    },
    printHelpInfo = () => {
        let message = "Help Message";
        $W.printInfo('', message, {type: 'info'});
    },
    printRollDebufMessage = (who, token, rollCmd, msg) => {
      sendChat(who, rollCmd,  (result) => {
          let roll = JSON.parse(result[0].content).total;
          let message = msg.replace(/ROLL/, roll).replace(/NAME/, token.get('name'));
          $W.printInfo('', message, {type: 'info', who});
      });
    },
    printDebufMessage = (who, token) => {
        if (token === undefined) return;
        Object.keys(config.conditions).forEach((name) => {
            if (!Conditions.hasCondition(token, name))
                return;
            let cond =  config.conditions[name];
            switch (cond.action) {
              case 'roll':
                printRollDebufMessage(who, token, cond.roll, cond.message);
                break;
              default:
                log("Action:" + cond.action);
            }
        });
    },
    initialise = () => {
        getDefaults();
        config = $U.getState(module, defaults, false);
        config = $U.getState(module, defaults, true);
        $U.announce(module, version, 'UPLOAD-TIMESTAMP');
    },
    registerEventHandlers = () => {
        on('chat:message', onChat);
    },
    getDefaults = () => {
        defaults = {
            conditions: {
                "Bane": {action: 'roll', roll: '/roll 1d4', message: "Bane debuf of <b>ROLL</b> on <b>NAME</b>"}
            }
        };
    };
    return {
        initialise,
        registerEventHandlers,
        getVersion
    }
})();

on('ready',() => {
    'use strict';
    Debuf.initialise();
    Debuf.registerEventHandlers();
});
if (typeof MarkStop !== "undefined") MarkStop('Debuf.js')
