/* tslint:disable */

/*
 * Author: Chris Davies
 * GitHun: https://github.com/slowglass/Roll20.git

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
*/

interface TurnEntry {
    id: string
    pr: string
    custom: string
}

enum TurnOrderChange {
    NONE = "NONE",
    ROTATE = "ROTATE",
    REORDER = "REORDER",
    ADD = "ADD",
    REMOVE = "REMOVE",
    REFACTOR = "REFACTOR"
}

class TurnOrder {
    static readonly empty:TurnEntry = {id:"EMPTY", pr:"-99", custom:"EMPTY"}
    entries:TurnEntry[] = []
    sameOrder(newEntries:TurnEntry[]):boolean {
        if (newEntries === this.entries) return true;
        if (newEntries.length !== this.entries.length) return false;
        for (let i = 0; i < this.entries.length; ++i) {
            const a = this.entries[i]
            const b = newEntries[i]
            if ((a.id !== b.id) || (a.pr != b.pr) || (a.custom != b.custom))
                return false
        }
        return true;
    }
    _get():TurnEntry[] {
        const tmp = Campaign().get("turnorder");
        return JSON.parse(tmp === '' ? '[]' : tmp) as TurnEntry[];
    }
    put() {
        Campaign().set('turnorder', JSON.stringify(this.entries))
    }
    rotateTo(te:TurnEntry) {
        if (this.entries.length === 0) return
        if (te === TurnOrder.empty) return
        if (this.entries.includes(te))
            while (this.entries[0] !== te)
                this.rotate()
    }
    read():[TurnOrderChange, TurnEntry] {
        const newEntries = this._get()

        if (this.sameOrder(newEntries))
            return [TurnOrderChange.NONE, TurnOrder.empty]

        const entrySet = new Set()
        this.entries.forEach((te) => {
            entrySet.add(te.id+"-"+te.pr)
        })
        const sameElements = newEntries.length === this.entries.length && newEntries.every(
            te => entrySet.has(te.id+"-"+te.pr))

        if (sameElements) {
            this.rotate()
            const result = this.sameOrder(newEntries) ? TurnOrderChange.ROTATE : TurnOrderChange.REORDER
            this.entries = newEntries
            return [result, TurnOrder.empty]
        }
        const newEntrySet = new Set()
        newEntries.forEach((te) => {
            newEntrySet.add(te.id+"-"+te.pr)
        })
        const added=newEntries.filter((te) => !entrySet.has(te.id+"-"+te.pr))
        const removed=this.entries.filter((te) => !newEntrySet.has(te.id+"-"+te.pr))
        this.entries = newEntries
        if (added.length === 1 && removed.length === 0)
            return [TurnOrderChange.ADD, added[0] as TurnEntry]
        if (removed.length === 1 && added.length === 0)
            return [TurnOrderChange.REMOVE, removed[0] as TurnEntry]
        return [TurnOrderChange.REFACTOR, TurnOrder.empty]
    }
    head():TurnEntry {
        const te = this.entries[0]
        if (te === undefined)
            return TurnOrder.empty
        else
            return te
    }
    add(te:TurnEntry):void {
        const head = this.head();
        this.entries.push(te)
        this.sort()
        this.rotateTo(head)
    }
    rotate():void {
        if (this.entries.length === 0) return
        this.entries.push(this.entries.shift() as TurnEntry);
    }
    remove(id:string):void {
        this.entries.filter((te) => te.id !== id)
    }
    clear():void {
        this.entries = []
        this.put()
    }
    sort():void {
        this.entries.sort((a, b)=> Number(b.pr) - Number(a.pr))
    }
}

interface TurnMarkerState {
    type: string
    count: number
}
// noinspection JSUnusedGlobalSymbols
class TurnMarker {
    readonly _json_prefix = 'cjd:Marker:'
    readonly _type = 'Marker'
    readonly _url = 'https://s3.amazonaws.com/files.d20.io/images/4095816/086YSl3v0Kz3SlDAu245Vg/thumb.png?1400535580'
    turnEntry:TurnEntry
    count:number
    constructor() {
        this.turnEntry = TurnOrder.empty
        this.count = 0
    }
    _get(token:Graphic):void {
        let gmnotes = token.get("gmnotes");
        let state = JSON.parse(gmnotes.slice(gmnotes.indexOf(this._json_prefix) + this._json_prefix.length)) as TurnMarkerState;
        if (state.type === this._type)
            this.count = state.count
    }
    _set(token:Graphic):void {
        let state:TurnMarkerState = { type: this._type, count: this.count }
        token.set('gmnotes', this._json_prefix+JSON.stringify(state));
    }
    clear() {
        let token = getObj('graphic', this.turnEntry.id)
        if (token !== undefined)
            token.remove()
        this.turnEntry = TurnOrder.empty
        this.count = 0
    }
    clearAll() {
        Roll20.filterGraphics((t) => t.get('name').startsWith('Turn #')).forEach((t) => t.remove())
        this.turnEntry = TurnOrder.empty
        this.count = 0
    }
    create(count:number, pr:number=1) {
        this.clear()
        let name =`Turn #${count}`
        let token = createObj('graphic', {
            name,
            imgsrc: this._url,
            _pageid: Campaign().get("playerpageid"),
            layer: 'objects',
            left: -120, top: -120, height: 70, width: 70
        });
        if (token === undefined)
            throw new Error("Cannot create Maker token")

        this.count = count
        this.turnEntry = { id:token.get('_id'), custom: name, pr:String(pr)}
    }
    getTurnEntry():TurnEntry { return this.turnEntry }
    set(count:number) {
        if (this.turnEntry.id === 'EMPTY')
            return
        this.count=count
        let token = getObj('graphic', this.turnEntry.id)
        if (token !== undefined) {
            token.set('name', `Turn #${count}`);
            this._set(token)
        }
    }
    incr() {
        this.set(this.count+1)
    }
}

class TurnTracker extends APIModule {
    readonly version = "0.2"
    static readonly uiSettings = { who: 'Next Turn', type:'info', title_tag: 'h3', targets: []}
    static readonly headerIconStyle = 'margin-right: 5px; margin-top: 5px; display: inline-block; float: left;'
    static readonly buttonStyle = 'margin-right: 1px; margin-top: 1px; display: inline-block;'
    static readonly nextUrl = 'https://s3.amazonaws.com/files.d20.io/images/132700410/wqxZjz4l3dqjHPSfElyOxg/max.png?1589025398'
    parser:ChatParser = new ChatParser()
    printer:MessageSender = new MessageSender()
    turnOrder:TurnOrder
    turnMarker:TurnMarker
    conditions:Conditions
    constructor(conditions:Conditions) {
        super()
        this.conditions = conditions
        this.turnOrder = new TurnOrder()
        this.turnMarker = new TurnMarker()
    }
    onRotate() {
        // Assumes that this.turnOrder.read() has already been run
        const head = this.turnOrder.head();
        if (head.id == this.turnMarker.getTurnEntry().id) {
            this.turnMarker.incr()
            this.turnOrder.put()
        }
        this.print(this.turnOrder.head());
    }
    onRefactor(oldHead:TurnEntry) {
        // Sort or something more drastic
        // Assumes that this.turnOrder.read() has already been run
        this.turnOrder.rotateTo(oldHead)
        this.turnOrder.put()
        this.print(this.turnOrder.head());
    }
    onAdd(oldHead:TurnEntry, _newEntry:TurnEntry) {
        // Assumes that this.turnOrder.read() has already been run
        this.turnOrder.sort()
        this.turnOrder.rotateTo(oldHead)
        this.turnOrder.put()
    }
    onRemove(oldHead:TurnEntry, oldEntry:TurnEntry) {
        // Assumes that this.turnOrder.read() has already been run
        if (oldHead === oldEntry)
            this.print(this.turnOrder.head());
    }
    isHidden(token:Graphic):boolean {
        return token.get("layer") === 'gmlayer'
    }
    clearMarkers() {
        this.turnMarker.clearAll()
    }
    createMarker() {
        this.turnMarker.create(1, 99)
        this.turnOrder.add(this.turnMarker.getTurnEntry())
    }
    clear() {
        this.turnOrder.clear()
        this.clearMarkers()
        this.print(this.turnOrder.head());
    }
    startCombat() {
        const pid = Campaign().get('playerpageid');
        Campaign().set({ initiativepage: pid });

        this.clearMarkers()
        this.turnOrder.read()
        this.createMarker()
        this.turnOrder.sort()
        this.turnOrder.put()
        this.print(this.turnOrder.head());
    }
    rotate() {
        this.turnOrder.read()
        this.turnOrder.rotate()
        this.turnOrder.put()
        this.onRotate()
    }
    add(token:Graphic, initiative:number) {
        this.turnOrder.read()
        const id = token.get('_id')
        const custom = token.get('name')
        const pr = String(initiative)
        this.turnOrder.add({id, custom, pr});
        this.turnOrder.put()
    }
    remove(token:Graphic) {
        this.turnOrder.read()
        const oldHead = this.turnOrder.head()
        this.turnOrder.remove(token.get('_id'))
        this.turnOrder.put()
        const newHead = this.turnOrder.head()
        if (oldHead === newHead)
            this.print(newHead)
    }
    getConditions(id:string) {
        let token = getObj('graphic', id);
        if (token !== undefined) {
            let items = this.conditions.getTokenConditions(token);
            if (items.length > 0)
                return "Conditions: " + items.join(', ')
        }
        return '';
    }
    ping(): void{
        let head = this.turnOrder.head();
        this.print(head);
        const token = getObj('graphic',head.id);
        if (token !== undefined && !this.isHidden(token))
            sendPing(token.get('left'), token.get('top'), token.get('_pageid'));
    }
    print(te:TurnEntry) {
        const token = getObj('graphic',te.id);
        if (token === undefined)
            return
        let settings:any = { ...TurnTracker.uiSettings }

        let imgurl = token.get("imgsrc");
        let name = token.get("name");
        settings.icon = this.printer.icon(imgurl, TurnTracker.headerIconStyle, '45px');
        let button = this.printer.anchor(this.printer.icon(TurnTracker.nextUrl, TurnTracker.buttonStyle, '30px'),
            {href:'!tt next', type:'button', style:'float: right; '});
        if (this.isHidden(token)) settings.targets = ['gm'];
        if (name.startsWith('Turn #'))
            this.printer.printInfo(name, `Start of ${name}${button}`, settings);
        else {
            let conditions = this.getConditions(te.id);
            this.printer.printInfo(name, `It is now your turn<br>${conditions}${button}`, settings);
        }

        if (!this.isHidden(token))
            sendPing(token.get('left'), token.get('top'), token.get('_pageid'));
    }
    onTurnOrder() {
        const oldHead = this.turnOrder.head()
        const [change, entry] = this.turnOrder.read()
        switch (change) {
            case TurnOrderChange.NONE:
                break;
            case TurnOrderChange.ROTATE:
                this.onRotate();
                break
            case TurnOrderChange.ADD:
                this.onAdd(oldHead, entry);
                break;
            case TurnOrderChange.REMOVE:
                this.onRemove(oldHead, entry);
                break;
            case TurnOrderChange.REFACTOR:
                this.onRefactor(oldHead);
                break;
        }
    }
    onChat(msg:ChatEventData):void {
        let msgData =this.parser.msg(msg, ["!tt", "!turntracker"])
        if (!msgData.matches) return;
        const subCommand = msgData.args[0]
        switch (subCommand) {
            case 'clear':
                this.clear();
                break;
            case 'start':
                this.startCombat();
                break;
            case 'next':
                this.rotate();
                break;
            case 'ping-target':
                this.ping();
                break;
            case 'help':
            default:
                break;
        }
    }
    protected initialise():void {
        on('chat:message', (msg:ChatEventData) => this.onChat(msg));
        on('change:campaign:turnorder', () => this.onTurnOrder());
        this.turnOrder.read()
    }
}
