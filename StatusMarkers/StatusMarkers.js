/*
 * Version: 0.1
 * Author: Chris Davies
 * GitHun: https://github.com/slowglass/Roll20.git
 * Upload Time: UPLOAD-TIMESTAMP
 * 
 * COMMAND !statusmarkers || !sm
 * !sm - Provides condition Menus.
 * !sm [CONDITION] - Shows condition.
 * !sm show - Shows condition on selected token(s).
 * !sm help - Shows help menu.
 * 
 * !sm add [condtion(s)] - Add condition(s) to selected tokens, eg. !sm add prone paralyzed
 * !sm remove [condtion(s)] - Remove condition(s) from selected tokens, eg. !sm remove prone paralyzed
 * !sm toggle [condtion(s)] - Toggles condition(s) of selected tokens, eg. !sm toggle prone paralyzed
 * 
 * TODO
 * !sm config
 * !sm export - Exports the config (with conditions).
*/

var StatusMarkers = StatusMarkers || (function() {
    'use strict';
    
    let whisper, handled = [],
        observers = {
            tokenChange: []
        };

    let tokenMarkers = [];
    const version = "0.1",

    // Styling for the chat responses.
    style = "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;",
    buttonStyle = "background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; float: right;",
    listStyle = 'list-style: none; padding: 0; margin: 0;',

    script_name = 'StatusMarkers',
    state_name = 'STATUS_MARKERS',

    initMarkers = () => {
        tokenMarkers = JSON.parse(Campaign().get("token_markers"));
    },

    allowRestricted = (playerid) => {
        return (state[state_name].config.userToggle || playerIsGM(playerid));
    },
    updateTokenMarkers = (cmd, msg, args) => {
        if(!allowRestricted(msg.playerid)) return;

        if(!msg.selected || !msg.selected.length){
            makeAndSendMenu('No tokens are selected.');
            return;
        }
        if(!args.length){
            makeAndSendMenu('No condition(s) were given. Use: <i>!statusmarkers '+extracommand+' prone</i>');
            return;
        }

        let tokens = msg.selected.map(s => getObj(s._type, s._id))
        handleConditions(args, tokens, cmd);
    },
    handleInput = (msg) => {
        if (msg.type != 'api') return;

        // Split the message into command and argument(s)
        let args = msg.content.split(' ');
        let command = args.shift().substring(1);
        let extracommand = args.shift();
        if(command === "sm" || command === "statusmarkers"){
            switch(extracommand){
                
                case 'help':
                    sendHelpMenu(playerIsGM(msg.playerid));
                break;

                case 'show':
                    if(msg.selected && msg.selected.length){
                        let tokens = msg.selected.map(s => getObj(s._type, s._id));
                        sendTokenConditionsToChat(tokens);
                    }
                    break;

                case 'add': case 'remove': case 'toggle':
                    updateTokenMarkers(extracommand, msg, args);
                break;

                default:
                    if(!allowRestricted(msg.playerid)) return;

                    let condition_name = extracommand;
                    let condition = getConditionByName(condition_name);

                    if (condition)
                    if(condition_name){
                        let condition;
                        // Check if the condition exists in the condition object.
                        if(condition = getConditionByName(condition_name)){
                            // Send it to chat.
                            sendConditionToChat(condition);
                        }else{
                            sendChat((whisper) ? script_name : '', whisper + 'Condition ' + condition_name + ' does not exist.', null, {noarchive:true});
                        }
                    }else{
                        if(!playerIsGM(msg.playerid)) return;
                        sendMenu(msg.selected);
                    }
                break;
            }
        }
    },

    handleConditions = (conditions, tokens, type='add', error=true) => {
        conditions.forEach(condition_key => {
            let condition = getConditionByName(condition_key);
            if(!condition){
                if(error) makeAndSendMenu('The condition `'+condition+'` does not exist.');
                return;
            }           
            let status_name = condition.name;
            let customToken = getCustomToken(status_name);
            if (customToken != undefined)
                status_name = customToken.tag;

            tokens.forEach(token => {
                let prevSM = token.get('statusmarkers');
                let statusmarkers = prevSM.split(",");
                let add = (type === 'add') ? true : (type === 'toggle') ? !statusmarkers.includes(status_name) : false;
                
                if (add)
                {
                    statusmarkers.push(status_name);
                }
                else
                {
                    let markerIndex = statusmarkers.indexOf(status_name);
                    statusmarkers.splice(markerIndex, 1);
                }
                token.set("statusmarkers", statusmarkers.join(','));
                let prev = token;
                prev.attributes.statusmarkers = prevSM;
                notifyObservers('tokenChange', token, prev);

                if(add && !handled.includes(condition_key)){
                    sendConditionToChat(condition);
                    doHandled(condition_key);
                }
                
            });
        });
    },

    esRE = function (s) {
        var escapeForRegexp = /(\\|\/|\[|\]|\(|\)|\{|\}|\?|\+|\*|\||\.|\^|\$)/g;
        return s.replace(escapeForRegexp,"\\$1");
    },

    HE = (function(){
        var entities={
                //' ' : '&'+'nbsp'+';',
                '<' : '&'+'lt'+';',
                '>' : '&'+'gt'+';',
                "'" : '&'+'#39'+';',
                '@' : '&'+'#64'+';',
                '{' : '&'+'#123'+';',
                '|' : '&'+'#124'+';',
                '}' : '&'+'#125'+';',
                '[' : '&'+'#91'+';',
                ']' : '&'+'#93'+';',
                '"' : '&'+'quot'+';'
            },
            re=new RegExp('('+_.map(_.keys(entities),esRE).join('|')+')','g');
        return function(s){
            return s.replace(re, function(c){ return entities[c] || c; });
        };
    }()),

    handleStatusmarkerChange = (obj, prev) => {
        if(handled.includes(obj.get('represents')) || !prev || !obj) return

        prev.statusmarkers = (typeof prev.get === 'function') ? prev.get('statusmarkers') : prev.statusmarkers;

        if(state[state_name].config.showDescOnStatusChange && typeof prev.statusmarkers === 'string'){
            // Check if the statusmarkers string is different from the previous statusmarkers string.
            if(obj.get('statusmarkers') !== prev.statusmarkers){
                // Create arrays from the statusmarkers strings.
                var prevstatusmarkers = prev.statusmarkers.split(",");
                var statusmarkers = obj.get('statusmarkers').split(",");

                // Loop through the statusmarkers array.
                statusmarkers.forEach(function(marker){
                    let condition = getConditionByMarker(marker);
                    if(!condition) return;
                     
                    // If it is a new statusmarkers, get the condition from the conditions object, and send it to chat.
                    if(marker !== "" && !prevstatusmarkers.includes(marker)){
                        if(handled.includes(getConditionKey(condition.name))) return;
                        
                        //sendConditionToChat(condition);
                        handleConditions([condition.name], [obj], 'add', false)
                        doHandled(obj.get('represents'));
                    }
                });

                prevstatusmarkers.forEach((marker) => {
                    let condition = getConditionByMarker(marker);
                    if(!condition) return;

                    if(marker !== '' && !statusmarkers.includes(marker)){
                        handleConditions([condition.name], [obj], 'remove', false);
                    }
                })
            }
        }
    },

    doHandled = (what) => {
        handled.push(what);
        setTimeout(() => {
            handled.splice(handled.indexOf(what), 1);
        }, 1000);
    },

    getConditionByMarker = (marker) => {
        return getObjects(state[state_name].conditions, 'icon', marker).shift() || false;
    },

    getConditionKey = (name) => {
        return name.replace(/-/g, "_").toLowerCase();
    },
    getConditionByName = (name) => {
        if (name)
            return state[state_name].conditions[getConditionKey(name)] || false;
        else
            return false;
    },

    sendConditionToChat = (condition, w) => {
        let desc = (!condition.description || condition.description === '') ? "" : condition.description;
        let icon = (state[state_name].config.showIconInDescription) ? getIcon(condition.name, 'margin-right: 5px; margin-top: 5px; display: inline-block;') || '' : '';
        makeAndSendMenu(desc, icon+condition.name, {
            title_tag: 'h2',
            whisper: (state[state_name].config.sendOnlyToGM) ? 'gm' : '' 
        });
    },

    getCustomToken = (icon) => {
        let customToken = undefined;
        tokenMarkers.some((m) => {
            if (m.name == icon) {
                customToken = m;
                return true;
            }
            return false;
        });
        return customToken;
    },

    getIcon = (icon, style='', size='24px') => {
        let X = '';
        let iconStyle = ''

        
        let customToken = getCustomToken(icon);
        if (customToken === undefined) 
            return false;

        iconStyle += 'width: '+size+'; height: '+size+';';
        iconStyle += 'background-size: '+size+' '+size+';';
        iconStyle += 'background-image: url('+customToken.url+');'
        iconStyle += 'background-repeat: no-repeat;'
        iconStyle += style;

        // TODO: Make span
        return '<div style="'+iconStyle+'">'+X+'</div>';
    },

    ucFirst = (string) => {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    //return an array of objects according to key, value, or key and value matching
    getObjects = (obj, key, val) => {
        var objects = [];
        for (var i in obj) {
            if (!obj.hasOwnProperty(i)) continue;
            if (typeof obj[i] == 'object') {
                objects = objects.concat(getObjects(obj[i], key, val));    
            } else 
            //if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
            if (i == key && obj[i] == val || i == key && val == '') { //
                objects.push(obj);
            } else if (obj[i] == val && key == ''){
                //only add if the object is not already in the array
                if (objects.lastIndexOf(obj) == -1){
                    objects.push(obj);
                }
            }
        }
        return objects;
    },

    sendTokenConditionsToChat = (tokens) => {
        let contents = '';
        tokens.forEach((token) => {
            if ('token' !== token.get("_subtype")) return;
            let statusmarkers = token.get('statusmarkers').split(",");
            let listItems = [];
            for(let key in state[state_name].conditions){
                let condition = state[state_name].conditions[key];
                let status_name = condition.name;
                let customToken = getCustomToken(status_name);
                if (customToken != undefined)
                    status_name = customToken.tag;
                if (statusmarkers.includes(status_name))
                {
                    let b = makeButton(condition.name, "!sm "+condition.name, "background-color: #fff; padding: 5px; color: #000; text-align: center; float: right;", "");
                    listItems.push('<span style="float: left;">'+getIcon(condition.name, 'display: inline-block;', '24px')+b+'</span> ');
                }
            }
            let list = "<i>None</i>";
            if (listItems.length>0)
                list = makeList(listItems, listStyle + ' overflow:hidden;', 'overflow: hidden')
            contents += '<b>'+token.get('name')+'</b><br></br>' + list +"<hr>";
        });
        makeAndSendMenu(contents, "Conditions");
    },

    sendMenu = (selected, show_names) => {
        let contents = '';
        if(selected && selected.length){
            selected.forEach(s => {
                let token = getObj(s._type, s._id);
                if ('token' !== token.get("_subtype")) return;
                if(token && token.get('statusmarkers') !== ''){
                    let statusmarkers = token.get('statusmarkers').split(',');
                    let active_conditions = [];
                    statusmarkers.forEach(marker => {
                        let con;
                        if(con = getObjects(state[state_name].conditions, 'icon', marker)){
                            if(con[0] && con[0].name) active_conditions.push(con[0].name);
                        }
                    });

                    if(active_conditions.length){
                        contents += '<b>'+token.get('name') + '\'s Conditions:</b><br><i>' + active_conditions.join(', ') + '</i><hr>';
                    }
                }
            });
        }

        contents += 'Toggle Condition on Selected Token(s):<br>'
        for(let condition_key in state[state_name].conditions){
            let condition = state[state_name].conditions[condition_key];
            contents += makeButton(getIcon(condition.name) || condition.name, '!statusmarkers toggle '+condition_key, buttonStyle + 'float: none; margin-right: 5px;', condition.name);
        }
        makeAndSendMenu(contents, script_name + ' Menu');
    },


    sendHelpMenu = (isGM) => {
        if (!isGM) return;

        let configButton = makeButton('Config', '!statusmarkers config', buttonStyle + ' width: 100%;')

        let listItems = [
            '<span style="text-decoration: underline">!statusmarkers help</span> - Shows this menu.',
            '<span style="text-decoration: underline">!statusmarkers [CONDITION]</span> - Shows the description of the condition entered.',
            '&nbsp;',
            '<span style="text-decoration: underline">!statusmarkers add [CONDITIONS]</span> - Add the given condition(s) to the selected token(s).',
            '<span style="text-decoration: underline">!statusmarkers toggle [CONDITIONS]</span> - Remove the given condition(s) from the selected token(s).',
            '<span style="text-decoration: underline">!statusmarkers remove [CONDITIONS]</span> - Remove the given condition(s) from the selected token(s).',
            '<span style="text-decoration: underline">!statusmarkers show [CONDITIONS]</span> - Remove the given condition(s) from the selected token(s).',
            '&nbsp;',]

        let contents = '<b>Commands:</b>'+makeList(listItems, listStyle)+'<hr>'+configButton;
        makeAndSendMenu(contents, script_name+' Help')
    },

    makeAndSendMenu = (contents, title, settings) => {
        settings = settings || {};
        settings.whisper = (typeof settings.whisper === 'undefined' || settings.whisper === 'gm') ? '/w gm ' : '';
        title = (title && title != '') ? makeTitle(title, settings.title_tag || '') : '';
        sendChat(script_name, settings.whisper + '<div style="'+style+'">'+title+contents+'</div>', null, {noarchive:true});
    },

    makeTitle = (title, title_tag) => {
        title_tag = (title_tag && title_tag !== '') ? title_tag : 'h3';
        return '<'+title_tag+' style="margin-bottom: 10px;">'+title+'</'+title_tag+'>';
    },

    makeButton = (title, href, style, alt) => {
        return '<a style="'+style+'" href="'+href+'" title="'+alt+'">'+title+'</a>';
    },
    
    makeList = (items, listStyle, itemStyle) => {
        let list = '<ul style="'+listStyle+'">';
        items.forEach((item) => {
            list += '<li style="'+itemStyle+'">'+item+'</li>';
        });
        list += '</ul>';
        return list;
    },

    getConditions = () => {
        return state[state_name].conditions;
    },

    checkInstall = () => {
        initMarkers();
        if(!_.has(state, state_name)){
            state[state_name] = state[state_name] || {};
        }
        setDefaults();
        log("-=> StatusMarkers v0.1 <=-  [UPLOAD-TIMESTAMP]");
    },

    observeTokenChange = function(handler){
        if(handler && _.isFunction(handler)){
            observers.tokenChange.push(handler);
        }
    },

    notifyObservers = function(event,obj,prev){
        _.each(observers[event],function(handler){
            handler(obj,prev);
        });
    },

    registerEventHandlers = () => {
        on('chat:message', handleInput);
        on('change:graphic:statusmarkers', handleStatusmarkerChange);

        // Handle condition descriptions when tokenmod changes the statusmarkers on a token.
        if('undefined' !== typeof TokenMod && TokenMod.ObserveTokenChange){
            TokenMod.ObserveTokenChange((obj,prev) => {
                handleStatusmarkerChange(obj,prev);
            });
        }

        if('undefined' !== typeof DeathTracker && DeathTracker.ObserveTokenChange){
            DeathTracker.ObserveTokenChange((obj,prev) => {
                handleStatusmarkerChange(obj,prev);
            });
        }

        if('undefined' !== typeof InspirationTracker && InspirationTracker.ObserveTokenChange){
            InspirationTracker.ObserveTokenChange((obj,prev) => {
                handleStatusmarkerChange(obj,prev);
            });
        }

        if('undefined' !== typeof CombatTracker && CombatTracker.ObserveTokenChange){
            CombatTracker.ObserveTokenChange((obj,prev) => {
                handleStatusmarkerChange(obj,prev);
            });
        }
    },

    setDefaults = (reset) => {
        const defaults = {
            config: {
                userAllowed: true,
                userToggle: true,
                sendOnlyToGM: false,
                showDescOnStatusChange: true,
                showIconInDescription: true
            },
            conditions: {
                blinded: {
                    name: 'Blinded',
                    description: '<p>A blinded creature can’t see and automatically fails any ability check that requires sight.</p>'+
                    '<p>Attack rolls against the creature have advantage, and the creature’s Attack rolls have disadvantage.</p>'
                },
                charmed: {
                    name: 'Charmed',
                    description: '<p>A charmed creature can’t Attack the charmer or target the charmer with harmful Abilities or magical effects.</p>'+
                    '<p>The charmer has advantage on any ability check to interact socially with the creature.</p>'
                },
                deafened: {
                    name: 'Deafened',
                    description: '<p>A deafened creature can’t hear and automatically fails any ability check that requires hearing.</p>'
                },
                frightened: {
                    name: 'Frightened',
                    description: '<p>A frightened creature has disadvantage on Ability Checks and Attack rolls while the source of its fear is within line of sight.</p>'+
                    '<p>The creature can’t willingly move closer to the source of its fear.</p>'
                },
                grappled: {
                    name: 'Grappled',
                    description: '<p>A grappled creature’s speed becomes 0, and it can’t benefit from any bonus to its speed.</p> <p>The condition ends if the Grappler is <i>incapacitated</i>.</p>'+
                    '<p>The condition also ends if an effect removes the grappled creature from the reach of the Grappler or Grappling effect, such as when a creature is hurled away by the Thunderwave spell.</p>'
                },
                incapacitated: {
                    name: 'Incapacitated',
                    description: '<p>An incapacitated creature can’t take actions or reactions.</p>'
                },
                invisibility: {
                    name: 'Invisibility',
                    description: '<p>An invisible creature is impossible to see without the aid of magic or a Special sense. For the purpose of Hiding, the creature is heavily obscured. '+
                    'The creature’s location can be detected by any noise it makes or any tracks it leaves.</p> <p>Attack rolls against the creature have disadvantage, and the creature’s Attack rolls have advantage.</p>'
                },
                paralyzed: {
                    name: 'Paralyzed',
                    description: '<p>A paralyzed creature is <i>incapacitated</i> and can’t move or speak.</p> <p>The creature automatically fails Strength and Dexterity saving throws.</p>'+
                    '<p>Attack rolls against the creature have advantage.</p> <p>Any Attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.</p>'
                },
                petrified: {
                    name: 'Petrified',
                    description: '<p>A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). '+
                    'Its weight increases by a factor of ten, and it ceases aging.</p>'+
                    '<p>The creature is <i>incapacitated</i>, can’t move or speak, and is unaware of its surroundings.</p>'+
                    '<p>Attack rolls against the creature have advantage.</p>'+
                    '<p>The creature automatically fails Strength and Dexterity saving throws.</p>'+
                    '<p>The creature has Resistance to all damage.</p>'+
                    '<p>The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized.</p>'
                },
                poisoned: {
                    name: 'Poisoned',
                    description: '<p>A poisoned creature has disadvantage on Attack rolls and Ability Checks.</p>',
                },
                prone: {
                    name: 'Prone',
                    description: '<p>A prone creature’s only Movement option is to crawl, unless it stands up and thereby ends the condition.</p>'+
                    '<p>The creature has disadvantage on Attack rolls.</p>'+
                    '<p>An Attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the Attack roll has disadvantage.</p>'
                },
                restrained: {
                    name: 'Restrained',
                    description: '<p>A restrained creature’s speed becomes 0, and it can’t benefit from any bonus to its speed.</p>'+
                    '<p>Attack rolls against the creature have advantage, and the creature’s Attack rolls have disadvantage.</p>'+
                    '<p>The creature has disadvantage on Dexterity saving throws.</p>'
                },
                stunned: {
                    name: 'Stunned',
                    description: '<p>A stunned creature is <i>incapacitated</i>, can’t move, and can speak only falteringly.</p>'+
                    '<p>The creature automatically fails Strength and Dexterity saving throws.</p>'+
                    '<p>Attack rolls against the creature have advantage.</p>'
                },
                unconscious: {
                    name: 'Unconscious',
                    description: '<p>An unconscious creature is <i>incapacitated</i>, can’t move or speak, and is unaware of its surroundings.</p>'+
                    '<p>The creature drops whatever it’s holding and falls prone.</p>'+
                    '<p>The creature automatically fails Strength and Dexterity saving throws.</p>'+
                    '<p>Attack rolls against the creature have advantage.</p>'+
                    '<p>Any Attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.</p>'
                },

                vicious_mockery: {
                    name: 'Vicious-Mockery',
                    description: '<p>Creature has disadvantage on the next Attack roll it makes before the end of its next turn</p>',
                },
                inspiration: {
                    name: 'Inspiration',
                    description: 'Bardic Inspiration grants the creature a die (d6) that it can use on '+
                    'one one ability check, attack roll, saving throw, weapon damage roll it makes. '+
                    'It can also use the die to add to it AC agaist on attack'
                },
                bane: {
                    name: 'Bane',
                    description: '<p>Whenever creature makes an attack roll or a saving throw while under the <b>Bane</b> effect, the creature must roll a d4 and subtract the number rolled from the attack roll or saving throw.</p>'
                },
                charm: {
                    name: 'Charm',
                    description: '<p>Charmed creature regars the caster of charm as a friendly acquaintance.</p>'+
                    '<p>This spell ends if the caster or any of its companions do anything harmful to it.</p>'+
                    '<p>Once the spell ends, the creature knows that it was charmed</p>'
                },
                command: {
                    name: 'Command',
                    description: '<p>The commanded creature must follow the command it has been given on its next turn.</p>'
                },
                heat_metal: {
                    name: 'Heat-Metal',
                    description: '<p>A piece of metal the creature is holding / wearing is hot. The caster can reapply the damage on as a bonus action</p>'
                },
                mage_hand: {
                    name: 'Mage-Hand',
                    description: '<p>A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action. '+
                    'The hand vanishes if it is ever more than 30 feet away from you or if you cast this spell again.</p><p>You can use your action to control the hand. '+
                    'You can use the hand to manipulate an object, open an unlocked door or container, stow or retrieve an item from an open container, or pour the contents out of a vial. '+
                    'You can move the hand up to 30 feet each time you use it.</p><p>The hand can’t attack, activate magic items, or carry more than 10 pounds.</p>'
                },
                sanctuary: {
                    name: 'Sanctuary',
                    description: '<p>Any creature who targets the warded creature with an attack or a harmful spell must first make a Wisdom saving throw. '+
                    'On a failed save, the creature must choose a new target or lose the attack or spell. '+
                    'This spell doesn\'t protect the warded creature from area effects, such as the explosion of a fireball.</p>'+
                    '<p>If the warded creature makes an attack, casts a spell that affects an enemy, or deals damage to another creature, this spell ends.</p>'
                },
                sacred_weapon: {
                    name: 'Sacred-Weapon',
                    description: '<p>Creature adds its Charisma bonus at all attack rolls that it makes. '+
                    'Its weapon is surrounded in flashes of lightning, emitting bright light in a 20-foot radius and a dim light 20 feet beyond that. '+
                    'The creature\'s weapon is magical while this effect lasts.</p>'
                },
                protection_from_good_and_evil: {
                    name: 'Protection-from-Good-and-Evil',
                    description: 
                        '<p>Protected creature is protected against certain types of creatures: aberrations, celestials, elementals, fey, fiends, and undead.</p>' +
                        '<p>The protection grants several benefits. Creatures of those types have disadvantage on attack rolls against the protected creature. ' +
                        'The protected creature also can\'t be charmed, frightened, or possessed by them. '+
                        'If the protected creature is already charmed, frightened, or possessed by such a creature, the protected creature has advantage on any new saving throw against the relevant effect.</p>'
                },
                shield_of_faith: {
                    name: 'Shield-of-Faith',
                    description: 'Creature gains +2 bonus to AC while Shield of Faith is in effect.'
                },
                sleep: {
                    name: 'Sleep',
                    description: 'Creature gains +2 bonus to AC while Shield of Faith is in effect.'
                },
            },
        };

        state[state_name].config = defaults.config;
        state[state_name].conditions = defaults.conditions;
    };

    return {
        checkInstall,
        ObserveTokenChange: observeTokenChange,
        registerEventHandlers,
        getConditions,
        getConditionByName,
        handleConditions,
        sendConditionToChat,
        getIcon,
        version
    };
})();

on('ready', () => { 
    'use strict';
    StatusMarkers.checkInstall();
    StatusMarkers.registerEventHandlers();
});