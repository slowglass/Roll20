interface GlobalModifierAttribute
{
    prefix:string
    name:string
    roll:string
    flag:string
    global:string
}
class GlobalModifier {
    static SAVES:GlobalModifierAttribute = {prefix:'savemod', name:"global_save_name", roll: "global_save_roll", flag: "global_save_active_flag", global:'global_save_mod'}
    static ATTACKS:GlobalModifierAttribute = {prefix:'tohitmod', name:"global_attack_name", roll: "global_attack_roll", flag: "global_attack_active_flag", global:'global_attack_mod'}

    attr:GlobalModifierAttribute
    name:string
    roll:string
    constructor(attr:GlobalModifierAttribute,n:string,r:string) {
        this.attr = attr
        this.name = n
        this.roll = r
    }
    _createRepeatingKey() {
        return this._generateUUID().replace(/_/g, "Z");
    }
    // tslint:disable-next-line:only-arrow-functions
    _generateUUID = (function() {
        let a = 0
        const b:number[] = [];
        return () => {
            let c:string|number = (new Date()).getTime()
            const d = c === a;
            a = c;
            let e
            let f
            for (e = new Array(8), f = 7; 0 <= f; f--) {
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
    }())
    _getFlag(charId:string):boolean {
        const attrId = this._getRepeatingKey(charId, `repeating_${this.attr.prefix}`, this.attr.name, this.name)
        if (attrId !== '')
            return false

        const flag  = `repeating_${this.attr.prefix}_${attrId}_${this.attr.flag}`
        return this._getAttribute(charId, flag).get("current") === "1"
    }
    _set(charId:string, on:boolean) {
        let attrId = this._getRepeatingKey(charId, `repeating_${this.attr.prefix}`, this.attr.name, this.name)
        const exists = (attrId !== '')
        if (!exists && !on)
            return

        if (!exists)
            attrId = this._createRepeatingKey()

        const name = `repeating_${this.attr.prefix}_${attrId}_${this.attr.name}`
        const roll = `repeating_${this.attr.prefix}_${attrId}_${this.attr.roll}`
        const flag  = `repeating_${this.attr.prefix}_${attrId}_${this.attr.flag}`

        if (!exists) {
            this._createAttribute(charId, name).set("current", this.name)
            this._createAttribute(charId, roll).set("current", this.name)
            this._createAttribute(charId, flag).set("current", on ? '1' : '0')
        } else {
            this._getAttribute(charId, flag).set("current", on ? '1' : '0')
        }
    }
    _updateGlobal(charId:string) {
        const keys = this._getRepeatingKeys(charId, `repeating_${this.attr}`, this.name)
        const values:string[] = [];
        keys.forEach((attrId) => {
            const name = `repeating_${this.attr.prefix}_${attrId}_${this.attr.name}`
            const roll = `repeating_${this.attr.prefix}_${attrId}_${this.attr.roll}`
            const flag  = `repeating_${this.attr.prefix}_${attrId}_${this.attr.flag}`
            const f = this._getAttribute(charId, flag).get("current")
            if (f === "1") {
                const r = this._getAttribute(charId, roll).get("current")
                const n = this._getAttribute(charId, name).get("current")
                values.push(`${r}[[${n}]]`)
            }
        })
        const sum = (values.length === 0) ? '' : values.join("+")
        this._createAttribute(charId, `${this.attr.global}`).set("current", sum)
        this._createAttribute(charId, `${this.attr.global}_flag`).set("current", "1")
    }
    _getRepeatingKey(c:string, s:string, e:string, v:string):string {
        let key:string = ''
        Roll20.findAttributes({_characterid: c}).forEach((a) => {
            const n = a.get("name")
            if (key === undefined && n.startsWith(s+'_') && n.endsWith('_'+e)) {
                if (a.get("current") === v)
                    key = n.substring(s.length+1, n.length - e.length-1)
            }
        })
        return key
    }
    _getRepeatingKeys(c:string, s:string, e:string) {
        const keys:string[] = []
        Roll20.findAttributes({_characterid: c}).forEach((a) => {
            const n = a.get("name")
            if (n.startsWith(s+'_') && n.endsWith('_'+e)) {
                keys.push(n.substring(s.length+1, n.length - e.length-1))
            }
        })
        return keys
    }
    enabledIn(charId:string) {
        return this._getFlag(charId)
    }
    add(charId:string) {
        this._set(charId, true)
        this._updateGlobal(charId)
    }
    disable(charId:string) {
        this._set(charId, false)
        this._updateGlobal(charId)
    }
    _getAttribute(c:string, n:string):Attribute {
        return findObjs({
            type: 'attribute',
            _characterid: c,
            name: n
        }, {caseInsensitive: true})[0] as Attribute;
    }
    _createAttribute(c:string, n:string):Attribute {
        return createObj('attribute', {
            _characterid: c,
            name: n,
            current: '',
            max: ''
        }) as Attribute;
    }
    // tslint:disable-next-line:only-arrow-functions
}
