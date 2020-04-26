if (typeof MarkStart !== "undefined") MarkStart('Concentration.js')
/*
* Version: 0.1
* Author: Chris Davies
* GitHun: https://github.com/slowglass/Roll20.git
* Upload Time: UPLOAD-TIMESTAMP
* 
* COMMAND !concentration
* !concentration damaged - Shows condition.
* !concentration set - Resets the configuration to default.
* !concentration clear - Provides condition Menus.
* !concentration reset - Provides condition Menus.
*
* 
* TODO
* !concentration help - Shop help information
*/

var Concentration = Concentration || (function() {
    'use strict';
    const $U = Utils;
    const $W = HtmlUtils;

    let defaults = {};
    let config = {};
    let spells = [];
    const version = "0.1",
    module = "cjd:Concentration",
    getVersion = () => { return version; },

    onConditionsChange = (/* token, flag */) => {
        return true;
    },
    hasCondition = (token) => { return Conditions.hasCondition(token, "Concentrating"); }, 
    setCondition = (token) => { Conditions.changeCondition("add", token, "Concentrating"); }, 
    clearCondition = (token) => { Conditions.changeCondition("remove", token, "Concentrating"); }, 
    onChat = (msg) => {
        let spellData = $U.parseSpell(msg, spells);
        if (spellData !== undefined) {
            spellCast(spellData);
            return;
        }

        let msgData = $U.parseMessage(msg, ["!concentration"]);
        if (msgData === undefined) return;
        switch(msgData.subCommand)
        {
            case 'damaged':
                requestRolls(msgData.playerid, msgData.tokens, msgData.args[0]);
                break;

            case 'set':
                setTokens(msgData.playerid, msgData.tokens, msgData.args[0]);
                break;

            case 'clear':
                clearTokens(msgData.playerid, msgData.tokens);
                break;

            case 'reset':
                config = $U.getState(module, defaults, true);
                break;

            case 'help':
            default:
                printHelpInfo();
                break;
        }
    },
    printHelpInfo = () => {
        let message = "Help Message";
        $W.printInfo('', message, {type: 'info'});
    },
    setTokens = (playerid, tokens, spellName) => {
        tokens.forEach(token => addConcentration(playerid, token, spellName));
    },
    clearTokens = (playerid, tokens) => {
        tokens.forEach(token => removeConcentration(playerid, token));
    },
    requestRolls = (playerid, tokens, damage) => {
        tokens.forEach((token) => {
            if (!hasAccess(playerid, token)) return;
            requestRoll(token, damage);
        });
    },
    controlsObj = (playerid, obj) => {
        return obj && 
            (obj.get('controlledby').split(',').includes(playerid) || 
            obj.get('controlledby').split(',').includes('all'));
    },
    hasAccess = (playerid, token) => {
        let character = getObj('character', token.get('represents'));
        return playerIsGM(playerid) || controlsObj(playerid, token) || controlsObj(playerid, character);
    },
    printConcentrationMsg = (character, is_concentrating, was_concentrating, spell) => {
        let message = (was_concentrating) ? '<p style="font-size: 9pt; color: red;">Previous concentration cancelled.</p>' : '';
        if (is_concentrating)
        {
            if(undefined !== spell)
                message += `<b>${character}</b> is now concentrating on <b>${spell}</b>.`;
            else
                message += `<b>${character}</b> is now concentrating.`;
        }
        if (message !== '')
            $W.printInfo('', message, {targets: [character, 'gm'], type: 'info'});
    },
    addConcentration = (playerid, token, spell) => {
        if (!hasAccess(playerid, token)) return;

        let was_concentrating = hasCondition(token);
        setCondition(token);
        printConcentrationMsg(token.get("name"), true, was_concentrating, spell);
    },
    removeConcentration = (playerid, token) => {
        if (!hasAccess(playerid, token)) return;
        let was_concentrating = hasCondition(token);
        clearCondition(token);
        printConcentrationMsg(token.get("name"), false, was_concentrating, undefined);
    },
    spellCast = (spellInfo) => {
        if (spellInfo.character === undefined || spellInfo.tokens.length === 0) return;
        if (spellInfo.name === undefined || spellInfo.playerid === undefined) return;

        spellInfo.tokens.forEach((token) => {
            let was_concentrating = hasCondition(token);
            setCondition(token);
            printConcentrationMsg(spellInfo.character, true, was_concentrating, spellInfo.name);
        });
    },
    requestRoll = (token, damage) => {
        if (damage<0) return;
        let dc = damage > 20 ? Math.floor(damage/2) : 10;
        let message = '<b>'+token.get('name')+'</b> must make a Concentration Check - <b>DC ' + dc + '</b>.';
        $W.printInfo('', message, {targets: [token.get("name"), 'gm'], type: 'info'});
    },
    onBarChange = (token, prev) => {
        if (!hasCondition(token)) return;
        let bar = 'bar'+config.bar+'_value';
        
        if (prev !== undefined) {
            requestRoll(token, prev[bar] - token.get(bar));
        }
    },
    checkAllSpells = () => {
        spells = [];
        let m = new Map();
        getAllObjs().forEach((obj) => {
            let name = obj.get("name");
            let val = obj.get("current");
            if (name === undefined) return;
            if (!name.startsWith("repeating_spell-")) return;
            let [, slot, id, attr] = name.split('_');
            let [, num] = slot.split('-');

            let key = `${id}-${num}`;
            if (!m.has(key)) m.set(key, new Map());
            m.get(key).set(attr, val);
        });
        m.forEach((v) => { if (v.get("spellconcentration") === "{{concentration=1}}") spells.push(v.get("spellname")); });
    },
    initialise = () => {
        getDefaults();
        config = $U.getState(module, defaults, false);
        checkAllSpells();
        $U.announce(module, version, 'UPLOAD-TIMESTAMP');
    },
    registerEventHandlers = () => {
        on('chat:message', onChat);
        on('change:graphic:bar'+config.bar+'_value', onBarChange);
        Conditions.registerListener(Concentration, "Concentrating");
    },
    getDefaults = () => { defaults = { bar: 1 }; };
    return {
        initialise,
        registerEventHandlers,
        getVersion,
        onConditionsChange /*ConcentrationListener*/,
    }
})();

on('ready',() => {
    'use strict';

    Concentration.initialise();
    Concentration.registerEventHandlers();
});
if (typeof MarkStart !== "undefined") MarkStop('Concentration.js')
