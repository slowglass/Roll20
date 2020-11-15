/*
 * Version: 0.1
 * Author: Chris Davies
 * GitHun: https://github.com/slowglass/Roll20.git
 * Upload Time: UPLOAD-TIMESTAMP
 *
 * COMMAND !cond || !conditions
 * !conditions [CONDITION] - Shows condition.
 * !conditions menu - Provides condition Menus.
 * !conditions show - Shows condition on selected token(s).
 *
 * !conditions add [condtion(s)] - Add condition(s) to selected tokens, eg. !sm add prone paralyzed
 * !conditions remove [condtion(s)] - Remove condition(s) from selected tokens, eg. !sm remove prone paralyzed
 * !conditions toggle [condtion(s)] - Toggles condition(s) of selected tokens, eg. !sm toggle prone paralyzed
 *
 * !conditions help - Shows help menu.
 *
 * External API
 *
 * ConditionsListener:onConditionsChange(character, flag) : return true if processed (ie Conditions need do no more)
 * Conditions:registerListener(ConditionsListener)
 * Conditions:hasCondition(token, name)
 * Conditions:setCondition(token, name)
 * Conditions:clearCondition(token, name)
 */

declare var _:any;

interface ConditionsListener {
    onConditionsChange(token:Graphic, flag:boolean):boolean
}

interface MarkerInfo {
    type:string
    desc:string
}
interface TokenMarkerInfo {
    id:string
    url:string
}

class Conditions extends APIModule {
    readonly version = '0.2'
    readonly headerIconStyle = 'margin-right: 5px; margin-top: 5px; display: inline-block;'
    private listeners:Map<string,ConditionsListener[]> = new Map<string,ConditionsListener[]>()
    parser:ChatParser = new ChatParser()
    printer:MessageSender = new MessageSender()
    config:any
    markers:Map<string,MarkerInfo> = new Map<string,MarkerInfo>()
    tokenMakers:Map<string,TokenMarkerInfo> = new Map<string,TokenMarkerInfo>()

    private static getConditionAsName(name:string):string { return name.replace(/-/g, ' '); }
    private static getStatusMarkers(token:Graphic):string[] { return token.get('statusmarkers').split(","); }

    protected initialise() {
        this.initMarkers();
        this.getDefaults();
        on('chat:message', (msg) => this.onChat(msg));
        on('change:graphic:statusmarkers', (obj:Graphic, prev:any) => this.onMarkerChange(obj, prev));
        // Handle condition descriptions when other APIs changing the statusmarkers on a token?
    }
    private getConditionDescription(name:string):string {
        if (!this.tokenMakers.has(name))
            return "Condition is not supported";
        const marker = this.markers.get(name)
        return marker !== undefined ? marker.desc : "Condition has no description"
    }
    private getConditionId(name:string):string|undefined {
        const tokenMaker = this.tokenMakers.get(name)
        if (tokenMaker === undefined)
            return undefined
        return tokenMaker.id;
    }
    private getIcon(name:string, style:string='', size:string='24px'):string {
        const tokenMarker = this.tokenMakers.get(name)
        debug(name, tokenMarker)
        if (tokenMarker === undefined) return ''
        if (tokenMarker.url === undefined) return ''

        let iconStyle = `width: ${size}; height: ${size};`
        iconStyle += `background-size: ${size} ${size};`
        iconStyle += `background-image: url(${tokenMarker.url});`
        iconStyle += `background-repeat: no-repeat;`
        iconStyle += style;
        debug(name, iconStyle)
        return '<div style="'+iconStyle+'">'+'</div>';
    }
    // @ts-ignore
    // noinspection JSUnusedLocalSymbols
    private accessGranted(method:string, playerid:string):boolean {
        return (this.config.access === "All" || playerIsGM(playerid));
    }
    private initMarkers():void {
        const markers = JSON.parse(Campaign().get("token_markers"));
        markers.forEach((e:any) => {
            this.tokenMakers.set(e.name, { id: e.id, url: e.url})
        });
    }
    private getDefaults():void {
        this.config = {/* yaml:./src/Conditions.config.yaml */}
        const m:any = {/* yaml:./src/Conditions.markers.yaml */}
        for(const p in m) {
            if (m.hasOwnProperty(p)) {
                this.markers.set(p, {type: m[p].type, desc: m[p].desc})
            }
        }
    }
    private onMarkerChange(token:Graphic, prev:any) {
        const prevStatusMarkers = (typeof prev.get === 'function') ? prev.get('statusmarkers') : prev.statusmarkers;
        if (typeof prev.statusmarkers !== 'string') return;

        const currentStatusMarkers = token.get('statusmarkers');
        if (prevStatusMarkers === currentStatusMarkers) return;

        // Create arrays from the statusmarkers strings.
        const arrPrev = prev.statusmarkers.split(",");
        const arrCurrent = currentStatusMarkers.split(",");

        // Loop through the statusmarkers array.
        arrCurrent.forEach((tag:string) => {
            if (!tag.includes("::")) return;
            if(!arrPrev.includes(tag)) {
                const marker=tag.split(':')[0];
                if (!this.markers.has(marker)) return;
                if (!this.informListeners(marker, token, true))
                    this.printCondition(marker);
            }
        });
        arrPrev.forEach((tag:string) => {
            if (!tag.includes("::")) return;
            if(!arrCurrent.includes(tag)) {
                const marker=tag.split(':')[0];
                if (!this.markers.has(marker)) return;
                if (!this.informListeners(marker, token, false))
                    this.printCondition(marker);
            }
        });
    }
    private onChat(msg:ChatEventData) {
        const msgData = this.parser.msg(msg, ["!cond", "!conditions"]);
        if (!msgData.matches) return;
        const subCommand = msgData.args.shift()
        if (subCommand === undefined) {
            this.printHelpInfo()
            return
        }
        switch(subCommand)
        {
            case 'help':
                this.printHelpInfo();
                break;

            case 'show':
                this.printTokenConditions(msgData.tokens);
                break;

            case 'add':
            case 'remove':
            case 'toggle':
                this.updateTokenMarkers(msgData.playerid, subCommand, msgData.args, msgData.tokens);
            break;

            case 'menu':
                this.printConditionMenu(msgData.playerid);
                break;

            default:
                this.printCondition(subCommand);
                break;
        }
    }
    private printHelpInfo = () => {
        const listItems = [
            '<span style="text-decoration: underline">!cond help</span> - Shows this menu.',
            '<span style="text-decoration: underline">!cond [CONDITION]</span> - Shows the description of the condition entered.',
            '&nbsp;',
            '<span style="text-decoration: underline">!cond add [CONDITIONS]</span> - Add the given condition(s) to the selected token(s).',
            '<span style="text-decoration: underline">!cond toggle [CONDITIONS]</span> - Toggles the given condition(s) on the selected token(s).',
            '<span style="text-decoration: underline">!cond remove [CONDITIONS]</span> - Removes the given condition(s) from the selected token(s).',
            '<span style="text-decoration: underline">!cond show [CONDITIONS]</span> - Show the current condition(s) from the selected token(s).',
            '<span style="text-decoration: underline">!cond menu</span> - Show menu that makes toggling conditions on selected token(s) easier.',
            '&nbsp;'
        ];
        const contents = this.printer.list(listItems, {listType:'list'});
        this.printer.printInfo('Usage', contents, {type: 'info'});
    }
    private getTokenConditions(token:Graphic) {
        const listItems:string[] = [];
        if (token.get("_subtype") !== 'token') return listItems;
        const statusmarkers = Conditions.getStatusMarkers(token);
        statusmarkers.forEach((tag:string) => {
            if (!tag.includes("::")) return;
            const marker=tag.split(':')[0];
            const anchor = this.printer.anchor(Conditions.getConditionAsName(marker), {title:'Show Condition '+marker, href:'!cond '+marker, type:"link"});
            listItems.push('<span>'+anchor+'</span> ');
        });
        return listItems;
    }
    private printTokenConditions(tokens:Graphic[]) {
        let contents = '';
        tokens.forEach((token:Graphic) => {
            if (token.get("_subtype") !== 'token') return;
            const listItems = this.getTokenConditions(token);
            let list = "<i>None</i>";
            if (listItems.length>0)
                list = this.printer.list(listItems, {listType:'list', itemType:'listItem'});
            contents += '<b>'+token.get('name')+'</b><br />' + list +"<hr>";
        });
        this.printer.printInfo('Conditions', contents, {type: 'info'});
    }
    private updateCondition(cmd:string, token:Graphic, tag:string):boolean {
        let announce = false;
        const statusmarkers = token.get('statusmarkers').split(",");
        const add = (cmd === 'add') ? true : (cmd === 'toggle') ? !statusmarkers.includes(tag) : false;
        const marker=tag.split(':')[0];
        if (add && !statusmarkers.includes(tag)) {
            statusmarkers.push(tag);
            announce = !this.informListeners(marker,token, true);
        } else if (!add && statusmarkers.includes(tag)) {
            const markerIndex = statusmarkers.indexOf(tag);
            statusmarkers.splice(markerIndex, 1);
            this.informListeners(marker,token, false);
        }
        token.set("statusmarkers", statusmarkers.join(','));
        return announce;
    }
    private updateTokenMarkers(playerid:string, cmd:string, conditions:string[], tokens:Graphic[]) {
        if(!this.accessGranted("updateToken", playerid)) return;

        if(tokens.length === 0) {
            this.printer.printInfo('', 'No tokens are selected.', {type: 'info'});
            return;
        }
        if(conditions.length === -0) {
            this.printer.printInfo('', 'No condition(s) were given.', {type: 'info'});
            return;
        }
        conditions.forEach((condition) => {
            const id = this.getConditionId(condition);
            if (id === undefined) {
                const conditionName = Conditions.getConditionAsName(condition);
                this.printer.printInfo('', `The condition ${conditionName} is not supported.`, {type: 'info'});
                return;
            }
            let announce = false;
            const tag = condition + "::" +id;
            tokens.forEach((token) => { announce = announce || this.updateCondition(cmd, token, tag); });
            if (announce) this.printCondition(condition);
        });
    }
    private printCondition(condition:string) {
        if (this.getConditionId(condition) === undefined) return;
        const name = Conditions.getConditionAsName(condition);
        const description = this.getConditionDescription(condition);
        const icon = this.getIcon(condition, this.headerIconStyle, '30px');
        this.printer.printInfo(name, description, {icon, type: 'info'});
    }
    private printConditionSubMenu(title:string, type:string):string {
        let contents =`<div><b>${title}:</b><br />`
        this.markers.forEach((v,name) => {
            if (v.type !== type) return
            if (this.getConditionId(name) === undefined) return
            contents += this.printer.anchor(this.getIcon(name), {title:'Toggle '+Conditions.getConditionAsName(name), href:'!cond toggle '+name, type:'button', style:'float: none; margin-right: 5px;'});
        })
        contents+='</div>'
        return contents
    }
    private printConditionMenu(playerid:string) {
        if(!playerIsGM(playerid)) return;
        let contents =''
        contents += this.printConditionSubMenu('Conditions', 'Cond')
        contents += this.printConditionSubMenu('Spells', 'Spell')
        this.printer.printInfo('Toggle Conditions', contents, {type: 'info'});
    }
    private registerListener(listener:ConditionsListener, condition:string) {
        const arr = this.listeners.get(condition)
        if (arr === undefined)
            this.listeners.set(condition, [listener])
        else
            arr.push(listener)
    }
    private informListeners(marker:string, token:Graphic, flag:boolean) {
        const arr = this.listeners.get(marker)
        if (arr === undefined)
            return false
        let playersInformed = false;
        arr.forEach((listener:ConditionsListener) => { playersInformed = playersInformed || listener.onConditionsChange(token, flag); });
        return playersInformed;
    }
    hasCondition(token:Graphic, condition:string) {
        const id = this.getConditionId(condition);
        if (id === undefined) return false;
        const tag = condition + "::" +id;
        const statusmarkers = token.get('statusmarkers').split(",");
        return statusmarkers.includes(tag);
    }
    changeCondition(cmd:string, token:Graphic, condition:string) {
        const id = this.getConditionId(condition);
        if (id === undefined) return false;
        const tag = condition + "::" +id;
        this.updateCondition(cmd, token, tag);
        return true;
    }
}

on('ready', () => {
    const conditions = new Conditions();
    conditions.register();
})

