/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*/
declare var _:any;

function debug(m:string, o:any) {
    log(m+":"+JSON.stringify(o))
}
interface ChatCommand {
    apply(msgInfo:MessageInfo): void
    args:string
    desc:string
}
type OnSpellCast = (msg:ChatEventData) => boolean;
abstract class APIModule {
    abstract version:string
    protected readonly commands:string[] = []
    protected readonly subcommands:Map<string, ChatCommand> = new Map()
    protected readonly parser:ChatParser = new ChatParser()
    protected readonly msgSender:MessageSender = new MessageSender()
    protected onSpellCast:OnSpellCast|undefined = undefined
    protected abstract initialise(): void

    getState(name: string, defaults: any, override: any) {
        if (!_.has(state, name)) {
            state[name] = state[name] || {};
        }
        if (override || Object.keys(state[name]).length === 0) {
            state[name] = JSON.parse(JSON.stringify(defaults));
        }
        return state[name];
    }

    showHelp():void {
        const listItems:string[] = []
        const cmd = this.commands[0]
        listItems.push(`<span style="text-decoration: underline">${cmd} help</span> - Shows this menu.`)
        listItems.push('&nbsp;')
        this.subcommands.forEach((info, name) => {
            listItems.push(`<span style="text-decoration: underline">!${cmd} ${name} ${info.args}</span> - ${info.desc}`)
        })
        listItems.push('&nbsp;')
        const contents = this.msgSender.list(listItems, {listType:'list'});
        this.msgSender.printInfo('Usage', contents, {type: 'info'});
    }

    xxOnChat(msg:ChatEventData):void {
        if (this.onSpellCast !== undefined) {
            if (this.onSpellCast(msg))
                return;
        }
        const msgData =this.parser.msg(msg, this.commands)
        if (!msgData.matches) return;
        let subcommandName = msgData.args.shift()
        if (subcommandName === undefined)
            subcommandName = ''
        const subcommand = this.subcommands.get(subcommandName)
        if (subcommand !== undefined) {
            try {
                subcommand.apply(msgData)
            } catch (error) {
                debug("Error:", error)
            }
        }
        else {
            this.showHelp()
        }
    }

    register() {
        log(`Register Module: ${this.constructor.name} (${this.version})`)
        this.initialise()
        if (this.commands.length>0)
            on('chat:message', (msg:ChatEventData) => this.xxOnChat(msg));
    }
}