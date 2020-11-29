/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*
* COMMAND !note
* !note show @graphic : Print a link to the graphic in chat.
* !note show <id> : Print a link to the graphic in chat.
*/
class Notes extends APIModule {
    readonly version = "1.0"
    static readonly buttonStyle = 'float: none; margin-right: 5px;';
    private linkFromTarget(messageInfo:MessageInfo) {
        // usage !note @{selected|token_id} @{target|token_id}
        let token
        const args = messageInfo.args
        args.shift()
        const id = args.shift()
        if (id !== undefined)
            token = getObj("graphic", id);
        this.link(token)
    }
    private linkFromToken(messageInfo:MessageInfo) {
        const token = messageInfo.tokens.shift()
        this.link(token)
    }
    private buildMessage(name:string, handout:Handout):string{
        const id=handout.get("_id");
        return this.msgSender.anchor(name, {
            href:`http://journal.roll20.net/handout/${id}`,
            type:'button',
            style:Notes.buttonStyle});
    }
    private link(token:Graphic|undefined) {
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
        this.msgSender.printInfo('Handout', a, {type: 'info'});
    }
    // tslint:disable-next-line:no-empty
    protected initialise(): void {
        this.registerEventHandlers()
    }
    protected registerEventHandlers(): void {
        this.commands.push("!note")
        this.subcommands.set('token', {
            args: '',  desc: 'Creates chat link for the selected token\'s linked handout',
            apply: msgInfo => this.linkFromToken(msgInfo)})
        this.subcommands.set('target', {
            args: '&#64;{selected|token_id} &#64;(target|token_id}',  desc: 'Creates chat link for the target token\'s linked handout',
            apply: msgInfo => this.linkFromTarget(msgInfo)})
    }
}
