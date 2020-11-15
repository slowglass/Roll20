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

class ChatParser {
    private static reg(pattern:RegExp, str:string, num:number, defValue:string|undefined):string|undefined {
        const matches = str.match(pattern)
        if (matches === undefined || matches === null || matches[num] === undefined)
            return defValue;
        else
            return matches[1];
    }
    private static getCharacterName(str:string) {
        let name = ChatParser.reg(/charname=([^\n{}]*[^"\n{}])/, str, 1, undefined);
        if (name !== undefined)
            name = ChatParser.reg(/{{name=([^\n{}]*[^"\n{}])/, str, 1, "Unknown");
        return name;
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
            const who= ChatParser.getWho(msg);
            const tokens = this.getTokens(msg);
            msgInfo.set(args, command, playerid, who, tokens)
        }
        return msgInfo
    }
}