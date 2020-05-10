if (typeof MarkStart !== "undefined") MarkStart('Birthday.js')
var Birthday = Birthday || (function () {
    'use strict';
    const
        uiSettings = { who: 'Happy Birthday', type:'info', title_tag: 'h3', targets: []},
        headerIconStyle = 'margin-right: 5px; margin-top: 5px; display: inline-block; float: left;',
        buttonStyle = 'margin-right: 1px; margin-top: 1px; display: inline-block;',
        diceUrl = 'https://s3.amazonaws.com/files.d20.io/images/132699619/tiJzPqL7cg4WTkUqGKCd4w/max.png?1589025181';
    const
        $U = Utils,
        $W = HtmlUtils;
    const
        fail = (msg) => {
          let settings = $U.clone(uiSettings);
          settings.targets = ['gm'];
          $W.printInfo('', msg, settings);
        },
        getIcon = (url, style='', size='24px') => {
            if (url === undefined) return '';
            let iconStyle = 'width: '+size+'; height: '+size+';';
            iconStyle += 'background-size: '+size+' '+size+';';
            iconStyle += 'background-image: url('+url+');'
            iconStyle += 'background-repeat: no-repeat;'
            iconStyle += style;

            return '<div style="'+iconStyle+'">'+'</div>';
        },
        apply = (playerId) => {
          let settings = $U.clone(uiSettings);
          let name = $U.getPlayer(playerId, 'name');
          let char = $U.getPlayer(playerId, 'char');
          settings.icon = getIcon(diceUrl, headerIconStyle, '45px');
          let msg = `Happy Birthday ${name}. The gods have smiled on you on this day. You may re-roll the previous roll that you just made for ${char}`;
          $W.printInfo(name, msg, settings);
        },
        showMsg = (token) => {
          let settings = $U.clone(uiSettings);
          let charId = $U.getRoll20Property(token, 'represents');
          let character = getObj("character", charId);
          if (character === undefined) return fail(`Char ${charId}: ` + $U.getRoll20Property(token, 'name', 'UNKNOWN'));
          let controlledby = character.get("controlledby");
          let p = $U.getPlayerId('name', 'Paul');
          let w = $U.getPlayerId('name', 'William');
          log(p);
          let who = '';
          let msg = '';
          let name = '';
          if (controlledby.split(',').includes(p)) {
            msg += 'Happy Birthday Old man. As the oldest player in the party, ';
            who = p;
            name = "Paul";
          } else if (controlledby.split(',').includes(w)) {
            msg += 'Happy Birthday Willian. As it is your birthday, ';
            who = w;
            name = "William";
          } else {
            return fail($U.getRoll20Property(token, 'name', 'UNKNOWN'));
          }
          msg += 'for tonight only you can have one re-roll.'+
            'The button below will activate that re-roll. Use it with care as you only have one '+
            ' and as you have \'Davidson\' dice you will have lots of options to choose from.'
          let imgurl = $U.getRoll20Property(token, "imgsrc");
          settings.icon = getIcon(imgurl, headerIconStyle, '45px');
          let button = $W.a(getIcon(diceUrl, buttonStyle, '30px'), {href:`!bb apply ${who}`, type:'button', style:'float: right; '});
          settings.targets = ['gm', who];
          $W.printInfo(name, `${msg}${button}`, settings);
          return true;
        },
        onChat = (msg) => {
            let msgData = $U.parseMessage(msg, ["!bb"]);
            if (msgData === undefined) return;
            switch (msgData.subCommand) {
                case 'msg':
                    showMsg(msgData.tokens.shift());
                    break;
                case 'apply':
                    apply(msgData.args.shift());
                    break;

                case 'help':
                default:
                    break;
            }
        },
        registerEventHandlers = () => {
            on('chat:message', onChat);
        };
    return {registerEventHandlers};
})();

on('ready', () => {
    'use strict';
    Birthday.registerEventHandlers();
});

if (typeof MarkStop !== "undefined") MarkStop('Birthday.js')
