if (typeof MarkStart !== "undefined") MarkStart('Concentration.js')
var Concentration = Concentration || (function() {
    'use strict';
    const $U = Utils;
    const $W = HtmlUtils;

    let defaults = {};
    let config = {};
    const version = "0.1",
    module = "cjd:Concentration",
    getVersion = () => { return version; },


    onConditionsChange = (token, flag) => {
        return true;
    },
    hasCondition = (token) => { return Conditions.hasCondition(token, "Concentrating"); }, 
    setCondition = (token) => { Conditions.changeCondition("add", token, "Concentrating"); }, 
    clearCondition = (token) => { Conditions.changeCondition("remove", token, "Concentrating"); }, 
    onChat = (msg) => {
        let spellData = $U.parseSpell(msg, defaults.spells);
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

            case 'help':
            default:
                printHelpInfo();
                break;
        }
    },
    setTokens = (playerid, tokens, spellName) => {
        tokens.forEach(token => addConcentration(playerid, token, spellName));
    },
    clearTokens = (playerid, tokens) => {
        tokens.forEach(token => removeConcentration(playerid, token));
    },
    requestRolls = (tokens, damage) => {
        tokens.forEach(token => {
            if (!hasAccess(playerid, token)) return;
            requestRoll(token, damage);
        });
    },
    controlsObj = (playerid, obj) => {
        return character && 
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
        if (spellInfo.character === undefined || spellInfo.tokens === []) return;
        if (spellInfo.name === undefined || spellInfo.playerid === undefined) return;

        spellInfo.tokens.forEach(token => {
            let n=token.get("name");
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
    initialise = () => {
        getDefaults();
        config = $U.getState(module, defaults, false);
        $U.announce(module, version, 'UPLOAD-TIMESTAMP');
    },
    registerEventHandlers = () => {
        on('chat:message', onChat);
        on('change:graphic:bar'+config.bar+'_value', onBarChange);
        Conditions.registerListener(Concentration, "Concentrating");
    },
    getDefaults = (reset) => {
        defaults = {
            bar: 1,
            spells: []
        };
        // Cantrips;
        let s = 'Create Bonfire,Dancing Lights,Friends,Guidance,Resistance,True Strike';
        // Level 1 (Bard / Wizard / Paladin)
        s += ',Bane,Bless,Cause Fear, Compelled Duel,Detect Evil and Good,Detect Magic,Detect Poison and Disease';
        s += ',Divine Favour,Expeditious Retreat,Faerie Fire,Fog Cloud,Heroism,Protection from Evil and Good,Searing Smite';
        s += ',Shield of Faith,Silent Image,Tasha\'s Hideous Laughter,Thunderous Smite,Witch Bolt,Wrathful Smite';

        // Level 2 (Bard)
        s += ',Calm Emotions,Cloud of Daggers,Crown of Madness,Detect Thoughts,Enhance Ability,Heat Metal,Hold Person,Invisibility';
        s += ',Locate Object,Phantasmal Force,Silence,Skywrite,Warding Wind';
        // Level 3 (Bard)
        s += ',Bestor Curse,Clairvoyance,Enemies Abound,Fear,Hypnotic Pattern,Major Image,Stinking Cloud';
        defaults.spells = s.split(',');
        
    };
    return {
        initialise,
        registerEventHandlers,
        getVersion,
        onConditionsChange, // ConcentrationListener
    }
})();

on('ready',function() {
    'use strict';

    Concentration.initialise();
    Concentration.registerEventHandlers();
});
if (typeof MarkStart !== "undefined") MarkStart('Concentration.js')