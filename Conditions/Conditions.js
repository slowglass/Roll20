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
    let prev = {};
    const version = "0.1",
    module = "cjd:Conditions",

    headerIconStyle = 'margin-right: 5px; margin-top: 5px; display: inline-block;',

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
    onMarkerChange = (obj, prev) => {
        let prevStatusMarkers = (typeof prev.get === 'function') ? prev.get('statusmarkers') : prev.statusmarkers;
        if (typeof prev.statusmarkers !== 'string') return;

        let currentStatusMarkers = obj.get('statusmarkers');
        if (prevStatusMarkers === currentStatusMarkers) return;

        // Create arrays from the statusmarkers strings.
        let arrPrev = prev.statusmarkers.split(",");
        let arrCurrent = currentStatusMarkers.split(",");

        // Loop through the statusmarkers array.
        arrCurrent.forEach(tag => {
            if (!tag.includes("::")) return;
            if(!arrPrev.includes(tag)) {
                let marker=tag.split(':')[0];
                if (!_.has(config.markers, marker)) return;
                printCondition(marker);
            }
        });
    },
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
    printHelpInfo = () => {
        let listItems = [
            '<span style="text-decoration: underline">!cond help</span> - Shows this menu.',
            '<span style="text-decoration: underline">!cond [CONDITION]</span> - Shows the description of the condition entered.',
            '&nbsp;',
            '<span style="text-decoration: underline">!cond add [CONDITIONS]</span> - Add the given condition(s) to the selected token(s).',
            '<span style="text-decoration: underline">!cond toggle [CONDITIONS]</span> - Toggles the given condition(s) on the selected token(s).',
            '<span style="text-decoration: underline">!cond remove [CONDITIONS]</span> - Removes the given condition(s) from the selected token(s).',
            '<span style="text-decoration: underline">!cond show [CONDITIONS]</span> - Show the current condition(s) from the selected token(s).',
            '&nbsp;'];
        

        let contents = HtmlUtils.ul(listItems, {listType:'list'});
        HtmlUtils.printInfo('', 'Usage', contents, {title_tag:'h2', type: 'info'});
    },
    printTokenConditions = (tokens) => {
        let contents = '';
        tokens.forEach((token) => {
            if ('token' !== token.get("_subtype")) return;
            let statusmarkers = getStatusMarkers(token);
            let listItems = [];
            statusmarkers.forEach(tag => {
                if (!tag.includes("::")) return;
                let marker=tag.split(':')[0];
                let anchor = HtmlUtils.a(marker, {alt:'Show Condition '+marker, href:'!cond '+marker, type:"link"});
                listItems.push('<span>'+anchor+'</span> ');
            });
            let list = "<i>None</i>";
            if (listItems.length>0)
                list = HtmlUtils.ul(listItems, {listType:'list', itemType:'listItem'});
            contents += '<b>'+token.get('name')+'</b><br></br>' + list +"<hr>";
        });
        HtmlUtils.printInfo('', 'Conditions', contents, {title_tag:'h2', type: 'info'});
    },
    updateTokenMarkers = (playerid, cmd, args, tokens) => {
        if(!accessGranted("updateToken", playerid)) return;

        if(!tokens.length){
            HtmlUtils.printInfo('', '', 'No tokens are selected.', {type: 'info'});
            return;
        }
        if(!args.length){
            HtmlUtils.printInfo('', '', 'No condition(s) were given.', {type: 'info'});
            return;
        }

        _updateTokenMarkers(cmd, args, tokens);
    },
    _updateTokenMarkers = (cmd, conditions, tokens) => {
        conditions.forEach(condition => {
            let id = getConditionId(condition);
            if (id === undefined) {
                HtmlUtils.printInfo('', '', `The condition ${condition} is not supported.`, {type: 'info'});
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
            contents += HtmlUtils.a(getIcon(name), {alt:'Toggle '+name, href:'!cond toggle '+name, type:'button', style:'float: none; margin-right: 5px;'});
        }
        HtmlUtils.printInfo('', 'Toggle Conditions', contents, {title_tag: 'h2', type: 'info'});
    },
    printCondition = (name) => {
        let description = getConditionDescription(name);
        if (description === undefined) return;
        let icon = getIcon(name, headerIconStyle, '30px');
        HtmlUtils.printInfo('', name, description, {icon:icon, title_tag: 'h2', type: 'info'});
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