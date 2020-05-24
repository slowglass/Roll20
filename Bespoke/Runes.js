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
                   case 'Config': mode = "Look"; showEihwaz(); break;
                   case 'Look': mode = "Understand"; break;
                   case 'Understand': mode = "LookAll"; showAll(); break;
                   case 'LookAll': mode = "Investigate"; break;
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
    getInvestigationCount = (who) => {
      if (seen[who] === undefined) seen[who] = [];
      return seen[who].length;
    },
    showEihwaz = () => {
      findObjs({type: "graphic", name:"Eihwaz"}).forEach((obj) => {
            obj.set("layer", "objects");
      });
    },
    showAll = () => {
      let runeNames = Object.keys(runes);
      findObjs({type: "graphic"}).forEach((obj) => {
        let name = obj.get("name");
        if (runeNames.includes(name))
            obj.set("layer", "objects");
      });
    },
    checkAllNotes = () => {
        let runeNames = Object.keys(runes);
        findObjs({type: "graphic"}).forEach((obj) => {
          let name = obj.get("name");
          if (runeNames.includes(name)) {
            obj.set("layer", "gmlayer");
            runes[name].url = obj.get('imgsrc');
          }
        });
        findObjs({type: "handout"}).forEach((obj) => {
          let name = obj.get("name");
          if (runeNames.includes(name)) {
            obj.get('notes', (note) => { runes[name].details=note; });
          }
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
      if (name === "Eihwaz") {
        seen[who].push(name);
        return false;
      }
      if (seen[who].length >= 4) return true;
      seen[who].push(name);
      return false;
    },
    showMsg = (who, name, msg) => {
      let sz="48";
      let title=`${name}`
      let summary="";
      let url="https://s3.amazonaws.com/files.d20.io/images/137734472/yzfsc1gAwmjDJ3_KKtmPDA/max.png?1590318443";
      if (name !== "Investigate") {
        sz="64";
        title=`Rune ${name}:`;
        summary=runes[name].s;
        url=runes[name].url;
      }
      let message=`<img style="float:right;width:${sz}px" src="${url}"/><b>${title}</b> ${summary}<br/>${msg}`;
      $W.printInfo('', message, {targets: [who, 'gm'], type: 'info', who: 'The GM'});
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
    showInvestigatingPre = (who, name) => {
      if (seen[who].includes(name))
        showMsg(who, "Investigate", `You open your mind and let if feel the power of the ${name} Rune. Having inspected it before, it opens to you again without much effort.`);
      else
        showMsg(who, "Investigate", `You open your mind and let if feel the power of the ${name} Rune. It resist you, put you focus your will, slowly depleting what strength you have left.`);
    },
    showInvestigatingPost = (who) => {
      let result="You may be able to do this a couple more times.";
      let count = getInvestigationCount(who);
      if (count === 2) result="This time was easier. You definitely have the strenth to investigate one more rune";
      if (count === 3) result="This time was even easier, but your strength is waining. You may have the strenth to investigate one more rune, you will not know unless you try.";
      if (count === 4) result="This time was even easier yet again, however you have reached the end of your strength and cannot investigate another rune";
      showMsg(who, "Investigate", `Having revealed the rune's secrets you pause and take a breath. This has taken a lot out of you. ${result}`);
    },
    showLimitReached = (who, token) => {
      let name=token.get('name');
      showMsg(who, name, `You do not have the strength to investigate any futher runes.`);
    },
    showDetails = (who, playerid, token) => {
      let name=token.get('name');
      log("Details: "+JSON.stringify(token));
      log("Details: "+name);
      if ((mode === "Understand" || mode === "LookAll") && name==="Eihwaz")
      {
        let preCount = getInvestigationCount(who);
        showInvestigatingPre(who, name);
        limitReached(name, who);
        let postCount = getInvestigationCount(who);
        showMsg(who, name, runes[name].details);
        if (preCount !== postCount)
          showInvestigatingPost(who);
        return;
      }
      if (mode !== "Investigate")
      {
        showGM(`${who} Investigating ${name}`);
        return;
      }
      if (!canInvesitigate(name, playerid))
        showNoDetails(who, token);
      else
      {
        let preCount = getInvestigationCount(who);
        if (limitReached(name, who))
          showLimitReached(who, token);
        else {
          showInvestigatingPre(who, name);
          let postCount = getInvestigationCount(who);
          showMsg(who, name, runes[name].details);
          if (preCount !== postCount)
            showInvestigatingPost(who);
        }
      }

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
