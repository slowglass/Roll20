/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*
* COMMAND !note
* !note show @graphic : Print a link to the graphic in chat.
* !note show <id> : Print a link to the graphic in chat.
*/
class Notes extends APIModule {
    readonly version = "0.2"
    static readonly buttonStyle = 'float: none; margin-right: 5px;';
    parser:ChatParser = new ChatParser()
    printer:MessageSender = new MessageSender()
    private onChat(msg:ChatEventData) {
        const msgData = this.parser.msg(msg, ["!note"]);
        if (!msgData.matches) return;
        switch (msgData.args[0]) {
            case 'show':
                const token = msgData.tokens.shift()
                if (token === undefined)
                    this.linkFromTarget(msgData.args)
                else
                    this.link(token)
                break
            default:
                break
        }
    }
    private linkFromTarget(args:string[]) {
        args.shift()
        const id = args.shift()
        if (id !== undefined) {
            const token = getObj("graphic", id);
            if (token !== undefined)
                this.link(token)
        }
    }
    private buildMessage(name:string, handout:Handout):string{
        const id=handout.get("_id");
        return this.printer.anchor(name, {
            href:`http://journal.roll20.net/handout/${id}`,
            type:'button',
            style:Notes.buttonStyle});
    }
    private link(token: Graphic|undefined) {
        let a = 'No token defined';
        if (token !== undefined) {
            const name = token.get('name')
            a=''
            const handouts = findObjs({ _type:"handout" }) as Handout[];
            handouts.some((h) => {
                if (h.get("name") === name) {
                    a = this.buildMessage(name, h)
                    return true;
                }
                else return false;
            });
            if (a === "") {
                const h = createObj('handout',{ name });
                if (h !== undefined)
                    a = this.buildMessage(name, h)
            }
        }
        this.printer.printInfo('Handout', a, {type: 'info'});
    }
    // tslint:disable-next-line:no-empty
    protected initialise(): void {
        this.registerEventHandlers()
    }
    protected registerEventHandlers(): void {
        on('chat:message', (msg) => this.onChat(msg));
    }
}

on('ready', () => {
    const notes = new Notes();
    notes.register();
})
