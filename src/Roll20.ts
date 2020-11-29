/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*/

interface TokenPosition {
    pageId:string
    x: number
    y: number
    units:string
}

class Roll20 {
    static forEachAttribute(callback: (obj: Attribute) => void) {
        getAllObjs().forEach((o:Roll20Object) => {
            if (o.get('_type') === 'attribute')
                callback(o)
        })
    }
    static filterGraphics(callback: (obj: Graphic) => boolean):Graphic[] {
        return filterObjs((o:Roll20Object) => {
            return (o.get('_type') === 'graphic') ?  callback(o) : false
        }) as Graphic[]
    }
    static filterPlayers(callback: (obj: Player) => boolean):Player[] {
        return filterObjs((o: Roll20Object) => {
            return (o.get('_type') === 'player') ?  callback(o) : false
        }) as Player[]
    }
    static filterAttributes(callback: (obj: Attribute) => boolean):Attribute[] {
        return filterObjs((o: Roll20Object) => {
            return (o.get('_type') === 'attribute') ?  callback(o) : false
        }) as Attribute[]
    }
    static findAttributes(properties:any):Attribute[] {
        return findObjs({...properties, _type:'attribute'}) as Attribute[]
    }
    static findGraphics(properties:any):Graphic[] {
        return findObjs({...properties, _type:'graphics'}) as Graphic[]
    }
    static findPlayers(properties:any):Player[] {
        return findObjs({...properties, _type:'player'}) as Player[]
    }
    static findCharacters(properties:any):Character[] {
        return findObjs({...properties, _type:'character'}) as Character[]
    }
    private static isControlledBy(playerid:string, controlledby:string) {
        const controlledbyArr = controlledby.split(',')
        return controlledbyArr.includes(playerid) || controlledbyArr.includes('all')
    }
    private static controlsToken(playerid:string, token:Graphic) {
        return Roll20.isControlledBy(playerid, token.get('controlledby'))
    }
    private static controlsCharacter(playerid:string, character:Character) {
        return Roll20.isControlledBy(playerid, character.get('controlledby'));
    }
    static hasAccess(playerid:string, token:Graphic):boolean {
        if (playerIsGM(playerid) || Roll20.controlsToken(playerid, token))
            return true;
        const character = getObj('character', token.get('represents'));
        if (character === undefined)
            return false;
        return Roll20.controlsCharacter(playerid, character);
    }
    static getPosition(token:Graphic):TokenPosition {
        const pageId = token.get('_pageid')
        const page = getObj('page', pageId)
        const scale = page.get('scale_number')
        const units = page.get('scale_units')
        const x = token.get("left")*scale/70.0
        const y = token.get("top")*scale/70.0
        return {pageId, x, y, units}
    }
    static getDistance(t1:Graphic, t2:Graphic):[number, string] {
        const p1 = Roll20.getPosition(t1)
        const p2 = Roll20.getPosition(t2)
        if (p1.pageId !== p2.pageId) return [-1, 'Different page']
        const dist = Math.max(Math.abs(p1.x-p2.x),Math.abs(p1.y-p2.y))
        return [dist, p1.units]
    }
    static isNumber(n: string | number|undefined): boolean {
        if (n === undefined) return false
        return !isNaN(parseFloat(String(n))) && isFinite(Number(n))
    }
// tslint:disable-next-line:only-arrow-functions
    static generateUUID = function () {
        let a = 0
        const b:any[] = []
        return () => {
            let c:any = (new Date()).getTime()
            const d = c === a;
            a = c;
            // tslint:disable-next-line:no-var-keyword
            for (var e = new Array(8), f = 7; 0 <= f; f--) {
                e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
                c = Math.floor(c / 64);
            }
            c = e.join("");
            if (d) {
                for (f = 11; 0 <= f && 63 === b[f]; f--) {
                    b[f] = 0;
                }
                b[f]++;
            } else {
                for (f = 0; 12 > f; f++) {
                    b[f] = Math.floor(64 * Math.random());
                }
            }
            for (f = 0; 12 > f; f++) {
                c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);
            }
            return c;
        };
    }()
}
