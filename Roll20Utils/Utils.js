if (typeof MarkStart !== "undefined") MarkStart('Utils.js')
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
    module = "cjd:Utils",
    reg = (pattern, str, num, defValue) => {
        let matches = str.match(pattern)
        if (matches === undefined || matches[num] === undefined)
            return defValue;
        else
            return matches[1];
    },
    debug = (msg, details) => {
        let m = msg;
        if (details !== undefined) {
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
        msgInfo.who=(getObj('player',msg.playerid)||{get:()=>'API'}).get('_displayname');
        msgInfo.tokens = [];
        if(msg.selected && msg.selected.length){
            msgInfo.tokens = msg.selected.map(s => getObj(s._type, s._id));
        }
        return msgInfo;
    },
    // Following functions are for 5eOGL - need to have a general way to specify a template going forward
    // if I ever want to publish these
    isSpellMsg = (template, content) => {
        return  template === 'spell' && content.includes("{{concentration=1}}");
    },
    isSpellAttackMsg = (template, content) => {
        return  (template === 'dmg' || template === 'atk') && content.includes('!concentration');
    },
    getSpellCaster = (str) => { return reg(/charname=([^\n{}]*[^"\n{}])/, str, 1, "Unknown"); },
    getSpellName = (str) => { return reg(/name=([^\n{}]*[^"\n{}])/, str, 1, "Unknown"); },
    parseSpell = (msg) => {
        let spellInfo = {}

        if (msg === undefined || msg.rolltemplate === undefined) 
            return undefined;
        if (!isSpellMsg(msg.rolltemplate, msg.content) && !isSpellAttackMsg(msg.rolltemplate, msg.content))
            return undefined;
            
        debug("spellInfo", "IsSpell: "+getSpellName(msg.content));
        spellInfo.character = getSpellCaster(msg.content);
        spellInfo.name = getSpellName(msg.content);
        spellInfo.playerid = msg.playerid;
        let characterid = findObjs({ name: spellInfo.character, _type: 'character' }).shift().get('id');
        let currentPageId = Campaign().get('playerpageid');
        let tokens = findObjs({ represents: characterid, _type: 'graphic' });
        spellInfo.tokens = [];
        tokens.forEach(token => {  if (token.get("_pageid") == currentPageId) spellInfo.tokens.push(token); });
        return spellInfo;
    };
    announce(module, version, "UPLOAD-TIMESTAMP");
    return {
        debug,
        parseMessage,
        parseSpell,
        getState,
        announce
    };
})();

var HtmlUtils = HtmlUtils || (function() {
    'use strict';
    let currentSettings = {};
    const version = "0.1",
    name = "cjd:Utils",
    styles = {
        link: "background-color: #fff; padding: 5px; color: #000; text-align: center;",
        button: "background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; float: right;",
        list: 'list-style: none; padding: 0; margin: 0; overflow:hidden;',
        listItem:'padding-left: 1em; overflow: hidden',

        info: "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;",
        //headerIcon: 'margin-right: 5px; margin-top: 5px; display: inline-block;'
    },
    get = (name, fallback='') => {
        return (undefined !== currentSettings[name]) ? currentSettings[name] : fallback;
    },
    attr = (name) => {
        let txt = '';
        if (undefined !== currentSettings[name]) txt+=currentSettings[name];
        if (txt !== '') return `${name}='${txt}'`;
        else return txt;
    },
    style = (prefix) => {
        let typeKey= (undefined===prefix) ? 'type' : `${prefix}Type`;
        let styleKey= (undefined===prefix) ? 'style' : `${prefix}Style`;
        let t = currentSettings[typeKey];
        let txt = '';
        if (undefined !== t) {
            if (undefined !== styles[t]) txt += styles[t];
        }
        if (undefined !== currentSettings[styleKey]) txt+=currentSettings[styleKey];
        if (txt !== '') return `style='${txt}'`;
        else return txt;
    },
    a = (text, settings) => {
        currentSettings = settings;
        return '<a '+ style() + attr('href')  + attr('title') +  '>' + text + '</a>';
    },
    ul = (items, settings) => {
        currentSettings = settings;

        let html='<ul ' + style('list') + '>';
        items.forEach((item) => { html += '<li '+ style('listItem') + '>'+item+'</li>'; });
        html += '</ul>';
        return html;
    },
    h = (text) => {
        if (text === '') return '';
        let tag = get('title_tag', 'h2');
        let icon = get('icon');
        if (icon === '')
            return `<${tag} style="margin-bottom: 10px;">${text}</${tag}>`;
        else
        return   `<${tag} style="margin-bottom: 10px;">${icon}<span style="vertical-align: top;">${text}</span></${tag}>`;
    },
    printInfo = (title, text, settings) => {
        currentSettings = settings;
        sendChat(get('module', 'Info'), '<div '+style()+'>'+h(title)+text+'</div>', null, {noarchive:true});
    };
    return {
        a, ul, h,
        printInfo
    }
})();
if (typeof MarkStop !== "undefined") MarkStop('Utils.js')