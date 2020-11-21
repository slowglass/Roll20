/*
* Author: Chris Davies
* GitHun: https://github.com/slowglass/Roll20.git
* Upload Time: UPLOAD-TIMESTAMP
*
* COMMAND !buff
*
*
* TODO
* !concentration help - Shop help information
*/

class Buff extends APIModule {
    readonly version = "0.1"
    globalMods:Map<string,GlobalModifier[]> = new Map()
    constructor() {
        super();
        this.globalMods.set("Bless", [
            new GlobalModifier(GlobalModifier.SAVES, "Bless", "1d4"),
            new GlobalModifier(GlobalModifier.ATTACKS, "Bless", "1d4")
        ])
    }
    add(args:string[]):void {
        const buff = args.shift()
        const casterId = args.shift()
        const tokenId = args.shift()
        if (buff === undefined || casterId === undefined || tokenId === undefined ) return;
        const token = getObj('graphic', tokenId)
        if (token === undefined) return
        const charId = token.get("represents")
        if (charId === undefined) return
        const globalMods = this.globalMods.get(buff)
        if (globalMods === undefined) return
        globalMods.forEach((v) => {
            v.add(charId)
        })
        // if (Conditions) Conditions.changeCondition("add", $T.obj(token_id), "Bless")
    }
    remove(token:Graphic|undefined, args:string[]):void {
        const buff = args.shift()
        if (buff === undefined || token === undefined ) return
        const charId = token.get("represents")
        if (charId === undefined ) return;
        const globalMods = this.globalMods.get(buff)
        if (globalMods === undefined) return
        globalMods.forEach((v) => {
            v.disable(charId)
        })
        // if (Conditions) Conditions.changeCondition("remove", $T.obj(token), "Bless")
    }
    show(args:string[]):void {
        const buff = args.shift()
        if (buff === undefined ) return;
        const characters:string[] = []
        const globalMods = this.globalMods.get(buff)
        if (globalMods === undefined) return
        const globalMod = globalMods[0]
        Roll20.findCharacters({}).forEach((c) => {
            if (globalMod.enabledIn(c.get("_id")))
                characters.push(c.get("name"))
        })

        const contents = characters.join(",")
        this.msgSender.printInfo('Blessed', contents, {type: 'info'});
    }
    protected initialise() {
        // Handle condition descriptions when other APIs changing the statusmarkers on a token?
        this.commands.push("!buff")
        this.subcommands.set('show', {
            args: '[buff]',  desc: 'Show the characters that currently have that buff enabled.\',',
            apply: msgInfo => this.show(msgInfo.args)})
        this.subcommands.set('add', {
            args: '[buff] [caster_token_id] [target_token_id]',  desc: 'Adds the named buff to target token.\',',
            apply: msgInfo => this.add(msgInfo.args)})
        this.subcommands.set('remove', {
            args: '[condition]',  desc: 'Removes the named buff from the selected token(s).\',',
            apply: msgInfo => this.remove(msgInfo.tokens.shift(), msgInfo.args)})
    }
}
