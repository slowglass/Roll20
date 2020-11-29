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
    readonly conditions:Conditions
    globalMods:Map<string,GlobalModifier[]> = new Map()
    constructor(conditions:Conditions) {
        super();
        this.conditions = conditions
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
        const contents = this.msgSender.list(characters, {listType:'list', itemType:'listItem'})
        this.msgSender.printInfo(buff, contents, {type: 'info'});
    }
    paladin_aura(token:Graphic) {
        const paladin = findObjs({_type:'graphic', _pageid: token.get('_pageid'), name: 'Siri' })[0] as Graphic|undefined
        if (paladin === undefined) return
        const [dist, units] = Roll20.getDistance(token, paladin)
        if (dist < 0) return
        if (units !== 'ft') return
        if (dist >10.5) return // Comment out this line to get "Out of range messages
        const charName = token.get('name')
        const paladinName = paladin.get('name')
        const paladinLevel = 6
        const paladinBonus = 2
        let bonus = '+'+paladinBonus
        if (dist >10.5)
            bonus = 'Out of range'
        const distDesc=`${paladinName} (${dist} ${units})`
        this.msgSender.rollModifier('',charName, "Paladin Protection", ` (${paladinLevel})`, distDesc, bonus);
    }
    bane(char:string) {
        sendChat("", "/roll 1d4", (ops) => {
                const rollContents = JSON.parse(ops[0].content)
                const roll = rollContents.rolls[0].results[0].v
                const bonus = '-'+roll
                const desc = `Rolling 1d4 = (${roll}) `
                this.msgSender.rollModifier('', char,  "Bane", ` (1d4)`, desc, bonus);
            });
    }
    attack_buff(title:string, char:string, bonus:string) {
        this.msgSender.rollModifier('', char,  title, '', '', bonus);
    }
    gnonish_save(char:string, name:string) {
        debug("Name:", name)
        if (['Intelligence', 'Wisdom', 'Charisma'].includes(name)) {
            debug("Name:", name)
            this.msgSender.rollModifier('', char, 'Gnome Cunning', '', '', "Advantage");
        }
    }
    buff(info:SaveInfo|AttackInfo):void {
        const token = info.tokens[0]
        if (token === undefined) return
        const char = info.character
        debug("Char:", char)
        if (info.type === "save")
        {
            if (this.conditions.hasCondition(token, 'Ally'))
                this.paladin_aura(token)
            if (this.conditions.hasCondition(token, 'Protected'))
                this.paladin_aura(token)
            if (this.conditions.hasCondition(token, 'Bane'))
                this.bane(char)
            if (char === "Woffler")
                this.gnonish_save(char, info.name)
            if (char === "Siri" || char === "Sigrid  Nordbakken (Siri)")
                this.msgSender.rollModifier('', char, 'Dwarven Resilience', '', '', "Poison<br/>Advantage<br/>Resistance");if (char === "Siri")
            if (char === "Siri"  || char === "Sigrid  Nordbakken (Siri)")
                this.msgSender.rollModifier('', char, 'Divine Health', '', '', "Disease<br/>Immune");
            if (char === "Gunhildrr Ormsdottir" || char === "Gunhildrr")
                this.msgSender.rollModifier('', char, 'Fey Ancestry', '', '', "Charm<br/>Advantage");
        }
        else if (info.type === "attack")
        {
            if (this.conditions.hasCondition(token, 'Bane'))
                this.bane(char)
            if (this.conditions.hasCondition(token, 'Sacred-Weapon'))
                this.attack_buff("Sacred Weapon", char, "+2")
        }
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
        this.onSpellCast = (msg) => {
            const info = this.parser.chat_info(msg);
            if (info.matches) {
                this.buff(info);
                return true
            }
            return false
        }
    }
}