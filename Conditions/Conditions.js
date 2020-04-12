MarkStart('Conditions.js');
/*
 * Version: 0.1
 * Author: Chris Davies
 * GitHun: https://github.com/slowglass/Roll20.git
 * Upload Time: UPLOAD-TIMESTAMP
 * 
 * COMMAND !cond || !conditions
 * !conditions [CONDITION] - Shows condition.
 * !conditions reset - Resets the configuration to default.
 * !conditions menu - Provides condition Menus.
 * !conditions show - Shows condition on selected token(s).
 * 
 * !conditions add [condtion(s)] - Add condition(s) to selected tokens, eg. !sm add prone paralyzed
 * !conditions remove [condtion(s)] - Remove condition(s) from selected tokens, eg. !sm remove prone paralyzed
 * !conditions toggle [condtion(s)] - Toggles condition(s) of selected tokens, eg. !sm toggle prone paralyzed
 * 
 * TODO
 * !conditions help - Shows help menu.
 * !conditions config add [name] [description]
 * !conditions config remove [name] [description]
 * !conditions export - Exports the config (with conditions).
*/

var Conditions = Conditions || (function() {
    'use strict';

    let defaults = {};
    let config = {};
    let tokenMakers = {};
    const version = "0.1",
    module = "cjd:Conditions",

    infoStyle = "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;",
    headerIconStyle = 'margin-right: 5px; margin-top: 5px; display: inline-block;',
    buttonStyle = "background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; float: right;",
    listStyle = 'list-style: none; padding: 0; margin: 0;',

    getVersion = () => { return version; },
    getConditionDescription = (name) => {
        if(!_.has(tokenMakers, name))
            return "Condition is not supported";

        let ret = config.markers[name];
        return ret!==undefined ? ret : "Condition has no description";
    },
    getConditionId = (name) => {
        if(!_.has(tokenMakers, name))
            return undefined;
        return tokenMakers[name].id;
    },
    getStatusMarkers = (token) => { return token.get('statusmarkers').split(",");},
    getIcon = (name, style='', size='24px') => {
        let url = tokenMakers[name].url;
        if (url === undefined) return '';

        let iconStyle = 'width: '+size+'; height: '+size+';';
        iconStyle += 'background-size: '+size+' '+size+';';
        iconStyle += 'background-image: url('+url+');'
        iconStyle += 'background-repeat: no-repeat;'
        iconStyle += style;

        return '<div style="'+iconStyle+'">'+'</div>';
    },
    accessGranted = (method, playerid) => {
        return (config.access === "All" || playerIsGM(playerid));
    },
    makeUL = (items, listStyle, itemStyle) => {
        let list = '<ul style="'+listStyle+'">';
        items.forEach((item) => {
            list += '<li style="'+itemStyle+'">'+item+'</li>';
        });
        list += '</ul>';
        return list;
    },
    makeA = (text, href, style, alt) => {
        return '<a style="'+style+'" href="'+href+'" title="'+alt+'">'+text+'</a>';
    },
    initialise = () => {
        initMarkers();
        getDefaults();
        config = Utils.getState(module, defaults, false);
        Utils.announce(module, version, 'UPLOAD-TIMESTAMP');
    },
    registerEventHandlers = () => {
        on('chat:message', onChat);
        on('change:graphic:statusmarkers', onMarkerChange);

        // Handle condition descriptions when other APIs changing the statusmarkers on a token?
    },
    initMarkers = () => { 
        let markers = JSON.parse(Campaign().get("token_markers"));
        markers.forEach(e =>{
            tokenMakers[e.name] = { id: e.id, url: e.url};
        });
    },
    getDefaults = (reset) => {
        defaults = {
            config: {
                access: "All",
                sendOnlyToGM: false,
            },
            markers: {
                "Blinded": '<p>A blinded creature can’t see and automatically fails any ability check that requires sight.</p>'+
                    '<p>Attack rolls against the creature have advantage, and the creature’s Attack rolls have disadvantage.</p>',
                "Prone": '<p>XYZ</p>',
                "Bane": '<p>XYZ</p>',
                "Sacred-Weapon": '<p>XYZ</p>',
                "Mage-Hand": '<p>XYZ</p>'
            },
        };
    },
    onMarkerChange = () => {},
    onChat = (msg) => {
        let msgData = Utils.parseMessage(msg, ["!cond", "!conditions"]);
        if (msgData === undefined) return;
        switch(msgData.subCommand)
        {
            case 'help':
                printHelpInfo(msgData.playerid);
                break;

            case 'show':
                printTokenConditions(msgData.tokens);
                break;

            case 'add': case 'remove': case 'toggle':
                updateTokenMarkers(msgData.playerid, msgData.subCommand, msgData.args, msgData.tokens);
                break;

            case 'menu':
                printConditionMenu(msgData.playerid);
                break;
                
            case 'reset':
                if(!accessGranted("config", playerid)) Utils.getState(module, defaults, true);
                break;

            default:
                printCondition(msgData.subCommand);
                break;
        }
    },
    printHelpInfo = () => {},
    printTokenConditions = (tokens) => {
        let contents = '';
        tokens.forEach((token) => {
            if ('token' !== token.get("_subtype")) return;
            let statusmarkers = getStatusMarkers(token);
            let listItems = [];
            statusmarkers.forEach(tag => {
                if (!tag.includes("::")) return;
                let marker=tag.split(':')[0];
                let anchor = makeA(marker, "!cond "+marker, "background-color: #fff; padding: 5px; color: #000; text-align: center;", 'Show Condition '+marker);
                listItems.push('<span>'+anchor+'</span> ');
            });
            let list = "<i>None</i>";
            if (listItems.length>0)
                list = makeUL(listItems, listStyle + ' overflow:hidden;', 'padding-left: 1em; overflow: hidden')
            contents += '<b>'+token.get('name')+'</b><br></br>' + list +"<hr>";
        });
        Utils.printInfo('', 'Conditions', '', contents, {title_tag: 'h2'}, infoStyle);
    },
    updateTokenMarkers = (playerid, cmd, args, tokens) => {
        if(!accessGranted("updateToken", playerid)) return;

        if(!tokens.length){
            Utils.printInfo('', '', '', 'No tokens are selected.', {title_tag: 'h2'}, infoStyle);
            return;
        }
        if(!args.length){
            Utils.printInfo('', '', '', 'No condition(s) were given.', {title_tag: 'h2'}, infoStyle);
            return;
        }

        _updateTokenMarkers(cmd, args, tokens);
    },
    _updateTokenMarkers = (cmd, conditions, tokens) => {
        conditions.forEach(condition => {
            let id = getConditionId(condition);
            if (id === undefined) {
                Utils.printInfo('', '', '', 'The condition `'+condition+'` is not supported.', {title_tag: 'h2'}, infoStyle);
                return;
            }
            Utils.debug("ID:", id);
            let announce = false;
            let tag = condition + "::" +id;
            tokens.forEach(token => {
                let statusmarkers = token.get('statusmarkers').split(",");
                let add = (cmd === 'add') ? true : (cmd === 'toggle') ? !statusmarkers.includes(tag) : false;
                
                if (add)
                {
                    if (!statusmarkers.includes(tag)) 
                    {
                        announce = true;
                        statusmarkers.push(tag);
                    }
                }
                else
                {
                    let markerIndex = statusmarkers.indexOf(tag);
                    statusmarkers.splice(markerIndex, 1);
                }
                Utils.debug("Status Markers:", statusmarkers.join(','));
                token.set("statusmarkers", statusmarkers.join(','));
            });
            if (announce) printCondition(condition);
        });
    },
    printConditionMenu = (playerid) => {
        if(!playerIsGM(playerid)) return;

        let contents = '';
        for(let name in config.markers){
            let desc = config.markers[name];
            contents += makeA(getIcon(name), '!cond toggle '+name, buttonStyle + 'float: none; margin-right: 5px;', "Toggle "+name);
        }
        Utils.printInfo('', 'Toggle Conditions', '', contents, {title_tag: 'h2'}, infoStyle);
    },
    printCondition = (name) => {
        let description = getConditionDescription(name);
        if (description === undefined) return;
        let icon = getIcon(name, headerIconStyle, '30px');
        Utils.printInfo('', name, icon, description, {title_tag: 'h2'}, infoStyle);
    };

    return {
        initialise,
        registerEventHandlers,
        getVersion
    };
})();


on('ready', () => { 
    'use strict';
    Conditions.initialise();
    Conditions.registerEventHandlers();
});
MarkStop('Conditions.js');