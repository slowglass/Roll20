if (typeof MarkStart !== "undefined") MarkStart('Runes.js')
var Runes = Runes || (function() {
    'use strict';
    const $U = Utils;
    const $W = HtmlUtils;


    let runes = {};
    let seen = {};
    let mode = "Config";
    const version = "0.1",
    module = "cjd:Runes",
    getVersion = () => { return version; },

    onChat = (msg) => {
        let msgData = $U.parseMessage(msg, ["!runes"]);
        if (msgData === undefined) return;
        if (msgData === undefined) return;
        if (mode === "Config" && msgData.subCommand !== "next")
        {
          showGM(`Message from '${msgData.who}', ID:'${msgData.playerid}'`);
          return;
        }
        switch(msgData.subCommand)
        {
            case 'next':
                 switch(mode)
                 {
                   case 'Config': mode = "Look"; break;
                   case 'Look': mode = "Understand"; break;
                   case 'Understand': mode = "Investigate"; break;
                   default:
                 }
                 showGM(`New mode ${mode}`);
                 break;

            case 'name':
                showName(msgData.who, msgData.tokens.shift());
                break;

            case 'details':
                showDetails(msgData.who, msgData.playerid, msgData.tokens.shift());
                break;

            default:
                break;
        }
    },
    checkAllNotes = () => {
        let runeNames = Object.keys(runes);
        getAllObjs().forEach((obj) => {
            let name = obj.get("name");
            if (!runeNames.includes(name))
              return;
             obj.get('notes', (note) => { runes[name].details=note; });
             runes[name].url = obj.get('imgsrc');
        });
    },
    canInvesitigate = (name, playerid) => {
      let rune = runes[name];
      if (rune.details === undefined) return false;
      if (rune.playerid === undefined) return true;
      return rune.playerid === playerid;
    },
    limitReached = (name, who) => {
      if (seen[who] === undefined) seen[who] = [];
      if (seen[who].includes(name)) return false;
      if (name === "Eihwaz") return false;
      if (seen[who].length >= 3) return true;
      seen[who].push(name);
      return false;
    },
    showMsg = (who, name, msg) => {
      let summary=runes[name].s;
      let url=runes[name].url;
      let message=`<img style="float:right;width:100px" src="${url}"/><b>Rune ${name}:</b> ${summary}<br/>${msg}`;
      $W.printInfo('', message, {targets: [who, 'gm'], type: 'info'});
    },
    showGM = (msg) => {
      $W.printInfo('', msg, {targets: ['gm'], type: 'info'});
    },
    showName = (who, token) => {
      let name=token.get('name');
      if (name === "Eihwaz")
        showMsg(who, name, "You feel drawn to this rune by an unstoppable force. Further investigation is warranted.");
      else
        showMsg(who, name, "Further investigation might be warranted.");
    },
    showNoDetails = (who, token) => {
      let name=token.get('name');
      showMsg(who, name, `This run feels alien to you. There is nothing that you can tell about it.`);
    },
    showLimitReached = (who, token) => {
      let name=token.get('name');
      showMsg(who, name, `You do not have the strength to investigate any futher runes.`);
    },
    showDetails = (who, playerid, token) => {
      let name=token.get('name');
      log("Details: "+JSON.stringify(token));
      log("Details: "+name);
      if (mode === "Understand" && name==="Eihwaz")
      {
        showMsg(who, name, runes[name].details);
        return;
      }
      if (mode !== "Investigate")
      {
        showGM(`${who} Investigating ${name}`);
        return;
      }
      if (!canInvesitigate(name, playerid))
        showNoDetails(who, token);
      else if (limitReached(name, who))
        showLimitReached(who, token);
      else
        showMsg(who, name, runes[name].details);
    },

    initialise = () => {
        let siri=$U.getPlayerId('char', 'Woffler');
        let woffler=$U.getPlayerId('char', 'Siri');
        let grunhildr=$U.getPlayerId('char', 'Gunnhildr');
        let kildare=$U.getPlayerId('char', 'Kildare');
        //let test=$U.getPlayerId('char', 'Test1');
        $U.announce(module, version, 'UPLOAD-TIMESTAMP');
        runes = {
          'Algiz': {s:'Protection'},
          'Berkana': {s:'Birch'},
          'Eihwaz': {s:'Yggdrasil'},
          'Fehu': {s:'Kettle'},
          'Gebo': {s:'Gift'},
          'Hagalaz': {s:'Storm (Hail)', playerid:siri},
          'Isa': {s:'Ice'},
          'Jera': {s:'Harvest'},
          'Kaunaz': {s:'Torch'},
          'Nauthiz': {s:'Need'},
          'Pertho': {s:'Dice cup', playerid: woffler},
          'Raido': {s:'Journey'},
          'Sowelu': {s:'Achievement'},
          'Teiwaz': {s:'Warrior (Tyr)', playerid: kildare},
          'Thurisaz': {s:'Wisdom (Mimir)', playerid: grunhildr},
          'Mannaz': {s:'Self'},
          'Uruz': {s:'Aurochs' },
          'Ansuz': {s:'Destiny'},
          'Wunjo': {s:'Reward'},
          'Laguz': {s:'Water'},
          'Inguz': {s:'Freyr'},
          'Ehwaz':  {s:'Horse'},
          'Othila': {s:'Property'},
          'Dagaz': {s:'Day'}
        };
        checkAllNotes();
        showGM(`Current Mode ${mode}`);
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

    Runes.initialise();
    Runes.registerEventHandlers();
});
if (typeof MarkStart !== "undefined") MarkStop('Runes.js')
