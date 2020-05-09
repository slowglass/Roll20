if (typeof MarkStart !== "undefined") MarkStart('Conditions.js')
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
* !conditions help - Shows help menu.
*
* TODO
* !conditions config add [name] [description]
* !conditions config remove [name] [description]
* !conditions export - Exports the config (with conditions).
*/


/**
 * External API
 *
 * ConditionsListener:onConditionsChange(character, flag) : return true if processed (ie Conditions need do no more)
 * Conditions:registerListener(ConditionsListener)
 * Conditions:hasCondition(token, name)
 * Conditions:setCondition(token, name)
 * Conditions:clearCondition(token, name)
 */
var Conditions = Conditions || (function() {
    'use strict';
    const $U = Utils;
    const $W = HtmlUtils;
    let defaults = {};
    let config = {};
    let tokenMakers = {};
    let listeners = {};
    const version = "0.1",
    module = "cjd:Conditions",

    headerIconStyle = 'margin-right: 5px; margin-top: 5px; display: inline-block;',

    getVersion = () => { return version; },
    getMarkerNames = (type) => {
        let keys = Object.keys(config.markers);
        if (type === undefined) return keys.sort();
        return _.filter(keys,k => config.markers[k].type === type).sort();
    },
    supportsMarker = (name) => { return _.has(config.markers, name); },
    getMarkerDesc = (name) => { return config.markers[name].desc; },
    getConditionDescription = (name) => {
        if(!_.has(tokenMakers, name))
            return "Condition is not supported";
        let ret = getMarkerDesc(name);
        return ret!==undefined ? ret : "Condition has no description";
    },
    getConditionId = (name) => {
        if(!_.has(tokenMakers, name))
            return undefined;
        return tokenMakers[name].id;
    },
    getConditionAsName = (name) => {
        return name.replace(/-/g, ' ');
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
        config = $U.getState(module, defaults, false);
        // Currently no way to save config so lets always reset
        $U.getState(module, defaults, true);
        $U.announce(module, version, 'UPLOAD-TIMESTAMP');
    },
    registerEventHandlers = () => {
        on('chat:message', onChat);
        on('change:graphic:statusmarkers', onMarkerChange);

        // Handle condition descriptions when other APIs changing the statusmarkers on a token?
    },
    initMarkers = () => {
        let markers = JSON.parse(Campaign().get("token_markers"));
        markers.forEach((e) => {
            tokenMakers[e.name] = { id: e.id, url: e.url};
        });
    },
    /*eslint object-curly-newline: "off"*/
    getDefaults = () => {
        defaults = {
            config: {
                access: "All",
                sendOnlyToGM: false,
            },
            markers: {
                // Conditions
                'Blinded': {
                    type:'Cond', desc: '<p>A blinded creature can’t see and automatically fails any ability check that requires sight.</p>'+
                    '<p>Attack rolls against the creature have advantage, and the creature’s Attack rolls have disadvantage.</p>'},
                'Charmed': {
                    type:'Cond', desc: '<p>A charmed creature can’t Attack the charmer or target the charmer with harmful Abilities or magical effects.</p>'+
                    '<p>The charmer has advantage on any ability check to interact socially with the creature.</p>'},
                'Deafened': {
                    type:'Cond', desc: '<p>A deafened creature can’t hear and automatically fails any ability check that requires hearing.</p>'},
                'Frightened': {
                    type:'Cond', desc: '<p>An invisible creature is impossible to see without the aid of magic or a Special sense. For the purpose of Hiding, the creature is heavily obscured. '+
                    'The creature’s location can be detected by any noise it makes or any tracks it leaves.</p> <p>Attack rolls against the creature have disadvantage, and the creature’s Attack rolls have advantage.</p>'},
                'Paralyzed': {
                    type:'Cond', desc: '<p>A paralyzed creature is <i>incapacitated</i> and can’t move or speak.</p> <p>The creature automatically fails Strength and Dexterity saving throws.</p>'+
                    '<p>Attack rolls against the creature have advantage.</p> <p>Any Attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.</p>'},
                'Petrified': {
                    type:'Cond', desc: '<p>A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). '+
                    'Its weight increases by a factor of ten, and it ceases aging.</p>'+
                    '<p>The creature is <i>incapacitated</i>, can’t move or speak, and is unaware of its surroundings.</p>'+
                    '<p>Attack rolls against the creature have advantage.</p>'+
                    '<p>The creature automatically fails Strength and Dexterity saving throws.</p>'+
                    '<p>The creature has Resistance to all damage.</p>'+
                    '<p>The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized.</p>'},
                'Poisoned': {
                    type:'Cond', desc: '<p>A poisoned creature has disadvantage on Attack rolls and Ability Checks.</p>'},
                'Prone': {
                    type:'Cond', desc: '<p>A prone creature’s only Movement option is to crawl, unless it stands up and thereby ends the condition.</p>'+
                    '<p>The creature has disadvantage on Attack rolls.</p>'+
                    '<p>An Attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the Attack roll has disadvantage.</p>'},
                'Restrained': {
                    type:'Cond', desc: '<p>A restrained creature’s speed becomes 0, and it can’t benefit from any bonus to its speed.</p>'+
                    '<p>Attack rolls against the creature have advantage, and the creature’s Attack rolls have disadvantage.</p>'+
                    '<p>The creature has disadvantage on Dexterity saving throws.</p>'},
                'Stunned': {
                    type:'Cond', desc: '<p>A stunned creature is <i>incapacitated</i>, can’t move, and can speak only falteringly.</p>'+
                    '<p>The creature automatically fails Strength and Dexterity saving throws.</p>'+
                    '<p>Attack rolls against the creature have advantage.</p>'},
                'Unconscious': {
                    type:'Cond', desc: '<p>An unconscious creature is <i>incapacitated</i>, can’t move or speak, and is unaware of its surroundings.</p>'+
                    '<p>The creature drops whatever it’s holding and falls prone.</p>'+
                    '<p>The creature automatically fails Strength and Dexterity saving throws.</p>'+
                    '<p>Attack rolls against the creature have advantage.</p>'+
                    '<p>Any Attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.</p>'},
                "Concentrating": {
                    type:'Cond', desc: '<p>Creature is concentrating on maintaining a spell.</p>'+
                    '<p>The following can break the creature\'s concentation:</p>'+
                    '<ul><li>Casting another spell that requires concentration.</li>'+
                    '<li>Whenever the creature takes damage it must make a Constitution saving throw to maintain its concentration. '+
                    'The DC equals 10 or half the damage taken, whichever number is higher. '+
                    'If damage is taken from multiple sources, such as an arrow and a dragon\'s breath, then separate saving throws are made for each source of damage</li>'+
                    '<li>Being incapacitated or killed.</li></ul>'},
                // States
                'Bandaged': {
                    type:'State', desc: '<p>Creature has been healed using a bandage. It cannot be healed again using a bandage until it has had a short rest</p>'},
                'Torch': {
                    type:'State', desc: '<p>Creature is carrying a visible torch.</p>'},
                'Lantern': {
                    type:'State', desc: '<p>Creature is carrying a visible lantern.</p>'},
                // Spell Effects
                'Inspiration': {
                    type:'Spell', desc: '<p>Bardic Inspiration grants the creature a die (d6) that it can use on '+
                    '<b>one</b> ability check, attack roll, saving throw, weapon damage roll it makes.</p>'+
                    '<p>It can also use the die to add to it AC agaist on attack</p>'},
                'Bane': {
                    type:'Spell', desc: '<p>Whenever creature makes an attack roll or a saving throw while under the <b>Bane</b> effect, the creature must roll a d4 and subtract the number rolled from the attack roll or saving throw.</p>'},
                'Bless': {
                    type:'Spell', desc: '<>p>Whenever creature makes an attack roll or a saving throw while blessed, it can roll a d4 and add the number rolled to the attack roll or saving throw.</p>'},
                'Charm': {
                    type:'Spell', desc: '<p>Charmed creature regars the caster of charm as a friendly acquaintance.</p>'+
                    '<p>This spell ends if the caster or any of its companions do anything harmful to it.</p>'+
                    '<p>Once the spell ends, the creature knows that it was charmed</p>'},
                'Command': {
                    type:'Spell', desc: '<p>The commanded creature must follow the command it has been given on its next turn.</p>'},
                'Faerie-Fire': {
                    type:'Spell', desc: '<p>Creature is outlined in blue, green, or violet light. While outlined in light any attack roll against the creature or object has advantage if the attacker can see it, and the creature can’t benefit from being invisible.</p>'},
                'Heat-Metal': {
                    type:'Spell', desc: '<p>A piece of metal the creature is holding / wearing is hot. The caster can reapply the damage on as a bonus action</p>'},
                'Mage-Hand': {
                    type:'Spell', desc: '<p>A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action. '+
                    'The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.</p><p>You can use your action to control the hand. '+
                    'You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial. '+
                    'You can move the hand up to 30 feet each time you use it.</p><p>The hand can’t attack, activate magic items, or carry more than 10 pounds.</p>'},
                'Mirror-Image': {
                    type:'Spell', desc: '<p>There are a number of illusory duplicates of the creature around and about it.</p>'+
                    '<p>Each time the creature is attacked, there is a equal chance the attack hits one of the duplicates.</p>'+
                    '<p>The AC if the duplicate is the creatures AC + its Dex modifier.<p>'+
                    '<p>If hit, the duplicate disappears.</p>'+
                    '<p>A creature is unaffected by this spell if it can’t see, if it relies on senses other than sight, such as blindsight, or if it can perceive illusions as false, as with truesight.</p>'},
                'Sanctuary': {
                    type:'Spell', desc: '<p>Any creature who targets the warded creature with an attack or a harmful spell must first make a Wisdom saving throw. '+
                    'On a failed save, the creature must choose a new target or lose the attack or spell. '+
                    'This spell doesn\'t protect the warded creature from area effects, such as the explosion of a fireball.</p>'+
                    '<p>If the warded creature makes an attack, casts a spell that affects an enemy, or deals damage to another creature, this spell ends.</p>'},
                'Sacred-Weapon': {
                    type:'Spell', desc: '<p>Creature adds its Charisma bonus at all attack rolls that it makes. '+
                    'Its weapon is surrounded in flashes of lightning, emitting bright light in a 20-foot radius and a dim light 20 feet beyond that. '+
                    'The creature\'s weapon is magical while this effect lasts.</p>'},
                'Sleep': {
                    type:'Spell', desc: '<p>Creature gains +2 bonus to AC while Shield of Faith is in effect.</p>'},
                'Protection-from-Good-and-Evil': {
                    type:'Spell', desc: '<p>Protected creature is protected against certain types of creatures: aberrations, celestials, elementals, fey, fiends, and undead.</p>' +
                    '<p>The protection grants several benefits. Creatures of those types have disadvantage on attack rolls against the protected creature. ' +
                    'The protected creature also can\'t be charmed, frightened, or possessed by them. '+
                    'If the protected creature is already charmed, frightened, or possessed by such a creature, the protected creature has advantage on any new saving throw against the relevant effect.</p>'},
                'Shield-of-Faith': {
                    type:'Spell', desc: '<p>Creature gains +2 bonus to AC while Shield of Faith is in effect.</p>'},
                'Vicious-Mockery': {
                    type:'Spell', desc: '<p>Creature has disadvantage on the next Attack roll it makes before the end of its next turn</p>'}
            }
        };
    },
    onMarkerChange = (token, prev) => {
        let prevStatusMarkers = (typeof prev.get === 'function') ? prev.get('statusmarkers') : prev.statusmarkers;
        if (typeof prev.statusmarkers !== 'string') return;

        let currentStatusMarkers = token.get('statusmarkers');
        if (prevStatusMarkers === currentStatusMarkers) return;

        // Create arrays from the statusmarkers strings.
        let arrPrev = prev.statusmarkers.split(",");
        let arrCurrent = currentStatusMarkers.split(",");

        // Loop through the statusmarkers array.
        arrCurrent.forEach((tag) => {
            if (!tag.includes("::")) return;
            if(!arrPrev.includes(tag)) {
                let marker=tag.split(':')[0];
                if (!supportsMarker(marker)) return;
                if (!informListeners(marker, token, true))
                    printCondition(marker);
            }
        });
        arrPrev.forEach((tag) => {
            if (!tag.includes("::")) return;
            if(!arrCurrent.includes(tag)) {
                let marker=tag.split(':')[0];
                if (!supportsMarker(marker)) return;
                if (!informListeners(marker, token, false))
                    printCondition(marker);
            }
        });

    },
    onChat = (msg) => {
        let msgData = $U.parseMessage(msg, ["!cond", "!conditions"]);
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
                if(accessGranted("config", msgData.playerid))
                    config = $U.getState(module, defaults, true);
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
            '&nbsp;'
        ];


        let contents = $W.ul(listItems, {listType:'list'});
        $W.printInfo('Usage', contents, {type: 'info'});
    },
    printTokenConditions = (tokens) => {
        let contents = '';
        tokens.forEach((token) => {
            if (token.get("_subtype") !== 'token') return;
            let statusmarkers = getStatusMarkers(token);
            let listItems = [];
            statusmarkers.forEach((tag) => {
                if (!tag.includes("::")) return;
                let marker=tag.split(':')[0];
                let anchor = $W.a(getConditionAsName(marker), {title:'Show Condition '+marker, href:'!cond '+marker, type:"link"});
                listItems.push('<span>'+anchor+'</span> ');
            });
            let list = "<i>None</i>";
            if (listItems.length>0)
                list = $W.ul(listItems, {listType:'list', itemType:'listItem'});
            contents += '<b>'+token.get('name')+'</b><br></br>' + list +"<hr>";
        });
        $W.printInfo('Conditions', contents, {type: 'info'});
    },
    updateCondition = (cmd, token, tag) => {
        let announce = false;
        let statusmarkers = token.get('statusmarkers').split(",");
        let add = (cmd === 'add') ? true : (cmd === 'toggle') ? !statusmarkers.includes(tag) : false;
        let marker=tag.split(':')[0];
        if (add && !statusmarkers.includes(tag)) {
            statusmarkers.push(tag);
            announce = !informListeners(marker,token, true);
        } else if (!add && statusmarkers.includes(tag)) {
            let markerIndex = statusmarkers.indexOf(tag);
            statusmarkers.splice(markerIndex, 1);
            informListeners(marker,token, false);
        }
        token.set("statusmarkers", statusmarkers.join(','));
        return announce;
    },
    updateTokenMarkers = (playerid, cmd, conditions, tokens) => {
        if(!accessGranted("updateToken", playerid)) return;

        if(!tokens.length) {
            $W.printInfo('', 'No tokens are selected.', {type: 'info'});
            return;
        }
        if(!conditions.length) {
            $W.printInfo('', 'No condition(s) were given.', {type: 'info'});
            return;
        }
        conditions.forEach((condition) => {
            let id = getConditionId(condition);
            if (id === undefined) {
                let condition_name = getConditionAsName(condition);
                $W.printInfo('', `The condition ${condition_name} is not supported.`, {type: 'info'});
                return;
            }
            let announce = false;
            let tag = condition + "::" +id;
            tokens.forEach((token) => { announce = announce || updateCondition(cmd, token, tag); });
            if (announce) printCondition(condition);
        });
    },
    printConditionMenu = (playerid) => {
        if(!playerIsGM(playerid)) return;

        let contents = '';
        contents='<div><b>Conditions:</b><br />';

        getMarkerNames("Cond").forEach((name) => {
            if (getConditionId(name) === undefined) {
                log("Missing Condition: "+name);
                return;
            }
            contents += $W.a(getIcon(name), {title:'Toggle '+getConditionAsName(name), href:'!cond toggle '+name, type:'button', style:'float: none; margin-right: 5px;'});
        });
        contents+='</div>';
        contents+='<div><b>Spells:</b><br />';
        getMarkerNames("Spell").forEach((name) => {
                    if (getConditionId(name) === undefined) {
                        log("Missing Condition: "+name);
                        return;
                    }
                    contents += $W.a(getIcon(name), {title:'Toggle '+getConditionAsName(name), href:'!cond toggle '+name, type:'button', style:'float: none; margin-right: 5px;'});
                });
        contents+='</div>';
        $W.printInfo('Toggle Conditions', contents, {type: 'info'});
    },
    printCondition = (condition) => {
        if (getConditionId(condition) === undefined) return;
        let name = getConditionAsName(condition);
        let description = getConditionDescription(condition);
        if (description === undefined) return;
        let icon = getIcon(condition, headerIconStyle, '30px');
        $W.printInfo(name, description, {icon, type: 'info'});
    },
    registerListener = (listener, condition) => {
        if(!_.has(listeners, condition)) listeners[condition] = [];
        listeners[condition].push(listener);
    },
    informListeners = (marker, token, flag) => {
        if(!_.has(listeners, marker))
            return false;
        let playersInformed = false;
        listeners[marker].forEach((listener) => { playersInformed = playersInformed || listener.onConditionsChange(token, flag); });
        return playersInformed;
    },
    hasCondition = (token, condition) => {
        let id = getConditionId(condition);
        if (id === undefined) return false;
        let tag = condition + "::" +id;
        let statusmarkers = token.get('statusmarkers').split(",");
        return statusmarkers.includes(tag);
    },
    changeCondition = (cmd, token, condition) => {
        let id = getConditionId(condition);
        if (id === undefined) return false;
        let tag = condition + "::" +id;
        updateCondition(cmd, token, tag);
        return true;
    }

    return {
        initialise,
        registerEventHandlers,
        getVersion,
        registerListener,
        hasCondition,
        changeCondition
    };
})();


on('ready', () => {
    'use strict';
    Conditions.initialise();
    Conditions.registerEventHandlers();
});
if (typeof MarkStop !== "undefined") MarkStop('Conditions.js')
