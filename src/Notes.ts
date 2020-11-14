/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*/
class NotesModule extends APIModule {
    readonly version = "0.1"
    readonly module = "Notes"
    parser:ChatParser = new ChatParser()
    printer:MessageSender = new MessageSender()
    private onChat(msg: ChatEventData) {
        const msgData = this.parser.msg(msg, ["!note"]);
        if (msgData === undefined) return;
        switch (msgData.args[0]) {
            case 'show':
                this.printNotes(msgData.tokens.shift());
                break;
            default:
                break;
        }
    }

    private printNotes(token: any) {
        const name = token.get('name');
        const objs = findObjs({_type: 'handout', name});
        if (objs.length === 0) return;
        const from = getObj("page", Campaign().get("playerpageid")).get('name');
        if (objs.length > 0) {
            // @ts-ignore
            objs.shift().get('notes', (note: any) => {
                this.printer.printInfo(name, note, {type: 'info', who: from})
            })
        }
    }

    // tslint:disable-next-line:no-empty
    protected initialise(): void {
    }

    protected registerEventHandlers(): void {
        on('chat:message', this.onChat);
    }
}

const Notes = new NotesModule();
on('ready', () => {
    Notes.register();
});