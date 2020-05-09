if (typeof MarkStart !== "undefined") MarkStart('Utils.js')
/*
 * Version: 0.1
 * Author: Chris Davies
 * GitHun: https://github.com/slowglass/Roll20.git
 * Upload Time: UPLOAD-TIMESTAMP
 *
 * Utils
 *   - announce(name, version
*/
var Utils = Utils || (function() {
    'use strict';
    let players = {};
    const version = "0.1",
    debugStyle = "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;",
    module = "cjd:Utils",
    reg = (pattern, str, num, defValue) => {
        let matches = str.match(pattern)
        if (matches === undefined || matches === null || matches[num] === undefined)
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
    getSelected = (str) => {
      let s = str.slice(str.indexOf("{{selected=")+11);
      if (s.includes("}}")) {
        return getObj('graphic',s.slice(0,s.indexOf("}}")));
      }
      return undefined;
    },
    getWho = (msg) => {
        return msg.who !== undefined ? msg.who : (getObj('player',msg.playerid)||{get:()=>'API'}).get('_displayname');
    },
    getToken = (token_or_id) => {
        if (typeof token_or_id === 'string') {
            return getObj('graphic', token_or_id);
        }
        return token_or_id;
    },
    controlledByPlayer = (token_or_id, playerId, allowAll) => {
        let token = getToken(token_or_id);
        let character = getObj("character", token.get("represents"));
        if (character === undefined) return false;
        let controlledby = character.get("controlledby");
        if (allowAll && controlledby === 'all') return true;
        if (controlledby === undefined || controlledby === 'all' || controlledby === '') return false;
        return controlledby.split(',').includes(playerId);
    },
    getRoll20Property = (token_or_id, key, fallback) => {
        let t = getToken(token_or_id);
        if (t === undefined) return fallback;
        let v = '';
        if (key === "short_name") {
            v = t.get("name");
            if (v === "Gunhildrr Ormsdottir") v = "Gunhildrr";
        } else {
            v = t.get(key);
        }
        return v === undefined ? fallback : v;
    },
    // Following functions are for 5eOGL - need to have a general way to specify a template going forward
    // if I ever want to publish these
    isSpellMsg = (template, content) => {
        return  template === 'spell' && content.includes("{{concentration=1}}");
    },
    isAttackMsg = (template) => {
        return  (template === 'dmg' || template === 'atk' || template === 'npcatk');
    },
    isSaveMsg = (template, content) => {
        if (template === 'simple' && content.includes('-save-u}}}')) return true;
        return template === 'npc' && content.includes('-save}}}');
    },
    getCharacterName = (str) => {
        let name = reg(/charname=([^\n{}]*[^"\n{}])/, str, 1, undefined);
        if (name === undefined)
            name = reg(/{{name=([^\n{}]*[^"\n{}])/, str, 1, "Unknown");
        return name;
    },
    getSpellName = (str) => { return str === undefined ? "Unknown" : reg(/name=([^\n{}]*[^"\n{}])/, str, 1, "Unknown"); },
    _getTokens = (msg) => {
        if(msg.selected && msg.selected.length){
            return msg.selected.map(s => getObj(s._type, s._id));
        }
        if (msg.content.includes("{{selected=")) {
            let selected = getSelected(msg.content);
            if (selected !== undefined)
                return [selected];
        }
        let character = getCharacterName(msg.content);
        let characterObj = findObjs({ name: character, _type: 'character' }).shift();
        if (characterObj === undefined) return [];
        let characterId = findObjs({ name: character, _type: 'character' }).shift().get('id');
        let currentPageId = Campaign().get('playerpageid');
        let tokens = findObjs({ represents: characterId, _type: 'graphic',  _pageid: currentPageId });
        return tokens === undefined ? [] : tokens;
    },
    parseSpell = (msg, spellList) => {
        let spellInfo = {};
        if (msg === undefined || msg.rolltemplate === undefined)
            return undefined;
        spellInfo.name = getSpellName(msg.content);
        if (!spellList.includes(spellInfo.name) && !isSpellMsg(msg.rolltemplate, msg.content))
            return undefined;

        spellInfo.character = getCharacterName(msg.content);
        spellInfo.name = getSpellName(msg.content);
        spellInfo.playerid = msg.playerid;
        spellInfo.tokens = _getTokens(msg);
        spellInfo.who=getWho(msg);
        return spellInfo;
    },
    parseSave = (msg) => {
        let saveInfo = {};
        if (msg === undefined || msg.rolltemplate === undefined || !isSaveMsg(msg.rolltemplate, msg.content))
            return undefined;
        saveInfo.character = getCharacterName(msg.content);
        saveInfo.playerid = msg.playerid;
        saveInfo.tokens = _getTokens(msg);
        saveInfo.who=getWho(msg);
        return saveInfo;
    },
    parseMessage = (msg, commands) => {
        let msgInfo = {}
        msgInfo.args = msg.content.split(' ');
        msgInfo.command = msgInfo.args.shift();
        if (!commands.includes(msgInfo.command))
            return undefined;
        msgInfo.subCommand = msgInfo.args.shift();
        msgInfo.playerid = msg.playerid;
        msgInfo.who=getWho(msg);
        msgInfo.tokens = _getTokens(msg);
        return msgInfo;
    },
    parseAttack = (msg) => {
        let attackInfo = {};
        if (msg === undefined || msg.rolltemplate === undefined || !isAttackMsg(msg.rolltemplate))
            return undefined;

        attackInfo.character = getCharacterName(msg.content);
        attackInfo.playerid = msg.playerid;
        attackInfo.tokens = _getTokens(msg);
        attackInfo.who=getWho(msg);
        return attackInfo;
    },
    addPlayer = (id, char, name) => {
      players[id] = {char, name};
      return true;
    },
    getPlayerId = (field, value) => _.find(players, p => p[field] === value),
    getPlayer = (playerId) => {
      if (!_.has(players, playerId))
        return false;
      return players[playerId].char;
    };
    addPlayer('-LjLzcTIT87gkT7sYzKZ', "Woffler", "Paul");
    addPlayer('-LjX5QHohZ33sOLQlwyg', "Gunnhildr", "Vicki");
    addPlayer('-LmU19KlCSzGgZu9iGsF', "Siri", "Judith");
    addPlayer('-M32vYnIVoH6qsGsK1aQ', "Kildare", "William");
    announce(module, version, "UPLOAD-TIMESTAMP");
    return {
        getPlayer,
        getPlayerId,
        controlledByPlayer,
        debug,
        parseMessage,
        parseSpell,
        parseSave,
        parseAttack,
        getState,
        getToken,
        getRoll20Property,
        announce
    };
})();

var HtmlUtils = HtmlUtils || (function() {
    'use strict';
    let currentSettings = {};
    const version = "0.1",
    module = "cjd:Utils",
    styles = {
        link: "background-color: #fff; padding: 5px; color: #000; text-align: center;",
        button: "background-color: #fff; border: 0px solid #292929; border-radius: 0px; padding: 1px; color: #fff; text-align: center; float: right;",
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
        currentSettings = settings === undefined ? {} : settings;
        let speakingAs = get('who', 'Info')
        let msg = '<div '+style()+'>'+h(title)+text+'</div>';
        if (currentSettings.targets === undefined || currentSettings.targets.length === 0)
          sendChat(speakingAs, msg, null, {noarchive:true});
        else
            currentSettings.targets.forEach(target => sendChat(speakingAs, `/w ${target} ${msg}`, null, {noarchive:true}));
    };
    Utils.announce(module, version, "UPLOAD-TIMESTAMP");
    return {
        a, ul, h,
        printInfo
    }
})();
if (typeof MarkStop !== "undefined") MarkStop('Utils.js')
