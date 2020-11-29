/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*/

/* tslint:disable:max-classes-per-file */
class MessageInfo {
    constructor() {
        this.matches = false;
        this.args = []
        this.command =""
        this.playerid = ""
        this.who = ""
        this.tokens = []
    }
    set(a:string[], c:string, p:string, w:string, ts:Graphic[]) {
        this.matches = true;
        this.args = a
        this.command = c
        this.playerid = p
        this.who = w
        this.tokens = ts
    }
    matches: boolean
    args: string[]
    command: string
    playerid: string
    who: string
    tokens: Graphic[]
}
class SpellInfo {
    constructor() {
        this.type = "spell"
        this.matches = false;
        this.name =""
        this.character = ""
        this.playerid = ""
        this.who = ""
        this.tokens = []
    }
    set(n:string, c:string, p:string, w:string, ts:Graphic[]) {
        this.matches = true;
        this.name = n
        this.character = c
        this.playerid = p
        this.who = w
        this.tokens = ts
    }
    matches: boolean
    type: "spell"
    name: string
    character: string
    playerid: string
    who: string
    tokens: Graphic[]
}
class AttackInfo {
    constructor() {
        this.type = "attack"
        this.matches = false;
        this.character = ''
        this.tokens = []
    }
    set(c:string, ts:Graphic[]) {
        this.matches = true;
        this.character = c
        this.tokens = ts
    }
    matches: boolean
    type: "attack"
    character: string
    tokens: Graphic[]
}
class SaveInfo {
    constructor() {
        this.type = "save"
        this.matches = false;
        this.name = ''
        this.character = ''
        this.tokens = []
    }
    set(n:string, c:string, ts:Graphic[]) {
        this.matches = true;
        this.name = n
        this.character = c
        this.tokens = ts
    }
    matches: boolean
    type: "save"
    name: string
    character: string
    tokens: Graphic[]
}
class ChatParser {
    static saves:any = {
        'Strength': "rname=^{strength-save",
        'Dexterity':"rname=^{dexterity-save",
        'Constitution':"rname=^{constitution-save",
        'Intelligence':"rname=^{intelligence-save",
        'Wisdom':"rname=^{wisdom-save",
        'Charisma':"rname=^{charisma-save"
    }
    private static reg(pattern:RegExp, str:string, num:number, defValue:string|undefined):string|undefined {
        const matches = str.match(pattern)
        if (matches === undefined || matches === null || matches[num] === undefined)
            return defValue;
        else
            return matches[1];
    }
    private static getCharacterName(str:string):string {
        let name = ChatParser.reg(/charname=([^\n{}]*[^"\n{}])/, str, 1, undefined);
        if (name === undefined)
            name = ChatParser.reg(/{{name=([^\n{}]*[^"\n{}])/, str, 1, undefined);
        return name === undefined ? "Unknown" : name;
    }
    private static getSelected(str:string) : Graphic | undefined {
        const s = str.slice(str.indexOf("{{selected=")+11);
        if (s.includes("}}")) {
            return getObj('graphic',s.slice(0,s.indexOf("}}")));
        }
        return undefined;
    }
    private getTokens(msg:ApiChatEventData):Graphic[] {
        const tokens:Graphic[] = []
        if (msg.selected) {
            msg.selected.forEach(s => {
                if (s._type === "graphic") {
                    const g = getObj(s._type, s._id);
                    if (g !== undefined) tokens.push(g)
                }
            });
            if (tokens.length > 0) return tokens;
        }
        if (msg.content.includes("{{selected=")) {
            const selected = ChatParser.getSelected(msg.content);
            if (selected !== undefined) {
                tokens.push(selected)
                return tokens;
            }
        }
        const charName = ChatParser.getCharacterName(msg.content);
        const characterObj = findObjs({name: charName, _type: 'character'}).shift() as Character | undefined;
        if (characterObj === undefined) return tokens;
        const characterId = characterObj.get('_id');
        const currentPageId = Campaign().get('playerpageid');
        return findObjs({represents: characterId, _type: 'graphic', _pageid: currentPageId}) as Graphic[];

    }
    private static getWho(msg: ChatEventData) : string {
        return msg.who !== undefined ? msg.who : (getObj('player',msg.playerid)||{get:()=>'API'}).get('_displayname');
    }
    msg(msg: ChatEventData, commands: string[]) : MessageInfo  {
        const msgInfo = new MessageInfo()
        const args = msg.content.split(' ');
        let command = args.shift()
        if (command === undefined) command = ""
        if (commands.includes(command)) {
            const playerid = msg.playerid;
            const who = ChatParser.getWho(msg);
            const tokens = this.getTokens(msg);
            msgInfo.set(args, command, playerid, who, tokens)
        }
        return msgInfo
    }
    private static getSpellName(str:string):string {
        const name = ChatParser.reg(/name=([^\n{}]*[^"\n{}])/, str, 1, undefined)
        return name === undefined ? "Unknown" : name;
    }
    private static isSpellMsg(template:string, content:string):boolean {
        return  template === 'spell' && content.includes("{{concentration=1}}");
    }
    private static isSaveMsg(template:string, content:string):boolean {
        if (template === 'simple' || template === 'npc') {
            const values:string[] = Object.values(ChatParser.saves)
            if (values.some((s: string) => content.includes(s)))
                return true
        }
        return false
    }
    attack(msg: ChatEventData) : AttackInfo {
        const attackInfo = new AttackInfo()
        if (msg === undefined || msg.rolltemplate === undefined)
            return attackInfo
        if (msg.rolltemplate !== 'npcatk' && msg.rolltemplate !== 'atk')
            return attackInfo
        const character = ChatParser.getCharacterName(msg.content);
        const tokens = this.getTokens(msg);
        attackInfo.set(character, tokens)
        return attackInfo
    }
    save(msg: ChatEventData) : SaveInfo {
        const saveInfo = new SaveInfo()
        if (msg === undefined || msg.rolltemplate === undefined)
            return saveInfo
        if (!ChatParser.isSaveMsg(msg.rolltemplate, msg.content))
            return saveInfo;
        const keys:string[] = Object.keys(ChatParser.saves)
        const key = keys.find((k:string) => msg.content.includes(ChatParser.saves[k])) as string
        const character = ChatParser.getCharacterName(msg.content);
        const tokens = this.getTokens(msg);
        saveInfo.set(key, character, tokens)
        return saveInfo
    }
    spell(msg: ChatEventData, spells:Set<string>) : SpellInfo {
        const spellInfo = new SpellInfo()
        if (msg === undefined || msg.rolltemplate === undefined)
            return spellInfo
        const name = ChatParser.getSpellName(msg.content)
        if (!spells.has(name) && !ChatParser.isSpellMsg(msg.rolltemplate, msg.content))
            return spellInfo;
        const character = ChatParser.getCharacterName(msg.content);
        const playerid = msg.playerid;
        const tokens = this.getTokens(msg);
        const who=ChatParser.getWho(msg);
        spellInfo.set(name, character, playerid, who, tokens)
        return spellInfo;
    }
    chat_info(msg: ChatEventData) : SaveInfo|AttackInfo {
        let info:SaveInfo|AttackInfo = this.save(msg)
        if (!info.matches) info = this.attack(msg)
        return info
    }
}