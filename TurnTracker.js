if (typeof MarkStart !== "undefined") MarkStart('TurnTracker.js')
/*
 * Version: 0.1
 * Author: Chris Davies
 * GitHun: https://github.com/slowglass/Roll20.git
 * Upload Time: UPLOAD-TIMESTAMP

 * COMMAND !tt || !turntracker
 *
 * !tt clear - Removes Round Counter from Turn Tracker
 * !tt start - Places the Round Counter at the end of the Turn Tracker and resets the counter to zero.
 * !tt next -  Moves to the next token in the Turn Tracker. Only announces to GM if the token is hidden
 * !tt ping-target - Pings the current target so all can see.
 * !tt add - Adds an element (spell/effect) to the turn tracker (with duration in rounds)
 * !tt remove - Removes an element  (spell/effect) from the turn traker
 * !tt incr - Increments all the element in the turn tracker
 * !tt help - Shows help menu.
 *
 * !tt config .....
*/

// Terms
// Round - Six seconds of action
// Turn - Each player has a turn within one round
// Ticket - Entry in a turn order


var TurnTracker = TurnTracker || (function () {
    'use strict';
    const
        version = "0.1",
        module = "cjd:TurnTracker",
        uiSettings = { who: 'Next Turn', type:'info', title_tag: 'h3', targets: []},
        headerIconStyle = 'margin-right: 5px; margin-top: 5px; display: inline-block; float: left;',
        buttonStyle = 'margin-right: 1px; margin-top: 1px; display: inline-block;',
        nextUrl = 'https://s3.amazonaws.com/files.d20.io/images/132700410/wqxZjz4l3dqjHPSfElyOxg/max.png?1589025398';
    const
        $U = Utils,
        $W = HtmlUtils;
    const TTEntries = (() => {
        const
            get = () => {
                let turnorder = Campaign().get("turnorder");
                return JSON.parse(turnorder === '' ? '[]' : turnorder);
            },
            set = turnorder => Campaign().set('turnorder', JSON.stringify(turnorder)),
            slice = n => set(get().slice(n)),
            rotate = (turnorder) => {
                if (turnorder.length === 0) return turnorder;
                turnorder.push(turnorder.shift());
                return turnorder;
            },
            add = (entry, first) => {
                let turnorder = get();
                turnorder.push(entry);
                if (turnorder.length > 1) {
                    let id = first=== undefined ? turnorder[0].id : first;
                    turnorder.sort((a, b) => b.pr - a.pr);
                    while (turnorder[0].id !== id)
                        turnorder = rotate(turnorder);
                }
                set(turnorder);
            },
            next = () => set(rotate(get()));
        return {
            get, set, next, slice, add
        };
    })();
    const TTT_Marker = (() => {
        const
            type = 'Marker',
            url = 'https://s3.amazonaws.com/files.d20.io/images/4095816/086YSl3v0Kz3SlDAu245Vg/thumb.png?1400535580',
            update = (token) => {
                let state = TTTTokens.getState(token);
                state.count += 1;
                token.set('name', `Turn #${state.count}`);
                TTTTokens.setState(token, state);
                return true;
            },
            create = (count) => {
                let state = { type, count: count - 1 };
                let token = createObj('graphic', {
                    imgsrc: url,
                    pageid: Campaign().get("playerpageid"),
                    layer: 'objects',
                    left: -120, top: -120, height: 70, width: 70
                });
                TTTTokens.setState(token, state);
                update(token);
                return token.get('_id');
            };
        return { type, update, create };
    })();
    const TTT_Cond = (() => {
        const
            type = 'Condition',
            url = 'https://s3.amazonaws.com/files.d20.io/images/132476156/BAEaLoC9w-5PM77BN61GPw/thumb.png?1588974077',
            update = (token) => {
                let state = TTTTokens.getState(token);
                if (state.duration === 1001) return true;
                state.duration -= 1;
                if (state.duration < 0) {
                    token.remove();
                    TTEntries.slice(1);
                    return false;
                }
                token.set('name', `${state.name} : ${state.duration} rounds remaining`);
                TTTTokens.setState(token, state);
                return true;
            },
            create = (name, d, hidden) => {
                let layer = hidden ? 'gmlayer' : 'objects';
                let state = {type, duration: parseInt(d, 10) + 1, name};
                let token = createObj('graphic', {
                    name, layer,
                    imgsrc: url,
                    pageid: Campaign().get("playerpageid"),
                    left: -120, top: -120, height: 70, width: 70
                });
                TTTTokens.setState(token, state);
                update(token);
                return token.get('_id');
            }
        return { type, create, update };
    })();
    const TTTTokens = (() => {
        const
            Marker = "TTMarker:",
            is = token_or_id => $U.getRoll20Property(token_or_id, "gmnotes", "").startsWith(Marker),
            getState = (token_or_id) => {
                let gmnotes = $U.getRoll20Property(token_or_id, "gmnotes");
                return JSON.parse(gmnotes.slice(gmnotes.indexOf(Marker) + Marker.length));
            },
            setState = (token_or_id, state) => {
                let token = $U.getToken(token_or_id);
                token.set('gmnotes', Marker+JSON.stringify(state));
            },
            update = (token_or_id) => {
                let token = $U.getToken(token_or_id);
                let state = getState(token_or_id);
                switch (state.type) {
                    case TTT_Marker.type: return TTT_Marker.update(token);
                    case TTT_Cond.type: return TTT_Cond.update(token);
                    default: return true;
                }
            },
            removeAll = () => {
                findObjs({_type: 'graphic'}).forEach((o) => {
                    if (TTTTokens.is(o)) o.remove();
                });
            };
        return { is, getState, setState, update, removeAll };
    })();
    let marker = undefined;
    const
        getVersion = () => version,
        getCurrentTicket = () => TTEntries.get().shift(),
        deleteRoundTicket = () => {
            if (marker !== undefined)
                getObj("graphic", marker).remove();
            marker = undefined;
        },
        addRoundTicket = () => {
            deleteRoundTicket();
            let pageid = Campaign().get("playerpageid");
            marker = TTT_Marker.create(1);
            TTEntries.add({ pageid, id: marker, pr: 99 }, marker);
            combatStart();
        },
        isHidden = id => $U.getRoll20Property(id, "layer") === 'gmlayer',
        getIcon = (url, style='', size='24px') => {
            if (url === undefined) return '';
            let iconStyle = 'width: '+size+'; height: '+size+';';
            iconStyle += 'background-size: '+size+' '+size+';';
            iconStyle += 'background-image: url('+url+');'
            iconStyle += 'background-repeat: no-repeat;'
            iconStyle += style;

            return '<div style="'+iconStyle+'">'+'</div>';
        },
        getConditions = (id) => {
            let conditions = '';
            if (Conditions !== undefined) {
                let token = $U.getToken(id);
                let items = Conditions.getTokenConditions(token);
                if (items.length > 0) {
                    conditions = "Conditions: ";
                    items.forEach((item, idx) => {
                        if (idx !== 0) conditions += ", ";
                        conditions += item;
                    });
                }
            }
            return conditions;
        },
        combatStart = () => {
            let imgurl = TTT_Marker.url;
            let name = "Start Combat";
            let settings = $U.clone(uiSettings);
            settings.who = 'Next Turn';
            settings.icon = getIcon(imgurl, headerIconStyle, '45px');
            let button = $W.a(getIcon(nextUrl, buttonStyle, '30px'), {href:'!tt next', type:'button', style:'float: right; '});
            $W.printInfo(name, `Combat is about to start${button}`, settings);
        },
        announce = (id) => {
            let settings = $U.clone(uiSettings);
            let conditions = getConditions(id);
            let imgurl = $U.getRoll20Property(id, "imgsrc");
            let name = $U.getRoll20Property(id, "short_name");
            settings.icon = getIcon(imgurl, headerIconStyle, '45px');
            let button = $W.a(getIcon(nextUrl, buttonStyle, '30px'), {href:'!tt next', type:'button', style:'float: right; '});
            if (isHidden(id)) settings.targets = ['gm'];
            $W.printInfo(name, `It is now your turn<br>${conditions}${button}`, settings);
        },
        processTurnTracker = () => {
            let startTicket = getCurrentTicket();
            if (startTicket === undefined) return;
            let ticket = startTicket;
            while (ticket !== undefined && TTTTokens.is(ticket.id)) {
                if (TTTTokens.update(ticket.id))
                    TTEntries.next();
                ticket = getCurrentTicket();
                if (startTicket.id === ticket.id)
                    break;
            }
            ping();
        },
        moveToNextPlayer = (playerid) => {
            let startTicket = getCurrentTicket();
            if (startTicket === undefined) return;
            let controlledBy = $U.controlledByPlayer(startTicket.id, playerid);
            if (!playerIsGM(playerid) && !controlledBy) return;
            TTEntries.next();
            processTurnTracker();
        },
        openTurnTracker = () => { /**/ },
        startCombat = () => {
            addRoundTicket();
            openTurnTracker();
        },
        clear = () => {
            TTTTokens.removeAll();
            TTEntries.set([]);
        },
        add = (args) => {
            let name = args[0] === undefined ? "Knotted Handkerchief" : args[0];
            let duration = args[1] === undefined ? 1000 : args[1];
            let hidden = args[2] === undefined ? false : args[2] === 'hidden';
            let pageid = Campaign().get("playerpageid");
            let ticket = TTEntries.get().shift();
            let pr = ticket === undefined ? 0.005 : parseInt(ticket.pr, 10) + 0.005;
            let id = TTT_Cond.create(name, duration, hidden);
            TTEntries.add({ pageid, id, pr });
        },
        ping = () => {
            let ticket = getCurrentTicket();
            if (ticket === undefined) return;
            announce(ticket.id);
            var token = $U.getToken(ticket.id);
            if (token === undefined) return;
            if (!isHidden(token))
              sendPing(token.get('left'), token.get('top'), token.get('pageid'));

        },
        onTurnOrder = (obj, prev) => {
            let current = TTEntries.get();
            let previous = (prev.turnorder === "") ? [] : JSON.parse(prev.turnorder);
            if (current.length === previous.length) return;
            if (marker === undefined) return;
            processTurnTracker();
        },
        onChat = (msg) => {
            let msgData = $U.parseMessage(msg, ["!tt", "!turntracker"]);
            if (msgData === undefined) return;
            switch (msgData.subCommand) {
                case 'clear':
                    clear();
                    break;
                case 'start':
                    startCombat();
                    break;
                case 'next':
                    moveToNextPlayer(msgData.playerid);
                    break;
                case 'add':
                    add(msgData.args);
                    break;
                case 'ping-target':
                    ping();
                    break;
                case 'remove':
                    break;
                case 'incr': /* Increment round */
                    break;

                case 'help':
                default:
                    break;
            }
        },
        registerEventHandlers = () => {
            on('chat:message', onChat);
            on('change:campaign:turnorder', onTurnOrder);
        },
        initialise = () => {
            $U.announce(module, version, 'UPLOAD-TIMESTAMP');
        };

    return {
        initialise,
        registerEventHandlers,
        getVersion
    };
})();

on('ready', () => {
    'use strict';
    TurnTracker.initialise();
    TurnTracker.registerEventHandlers();
});

if (typeof MarkStop !== "undefined") MarkStop('TurnTracker.js')
