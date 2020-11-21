/*
* Version: 0.1
* Author: Chris Davies
* GitHun: https://github.com/slowglass/Roll20.git
* Upload Time: UPLOAD-TIMESTAMP
*
* COMMAND !concentration
* !concentration damaged - Shows condition.
* !concentration set - Resets the configuration to default.
* !concentration clear - Provides condition Menus.
* !concentration reset - Provides condition Menus.
*
*
* TODO
* !concentration help - Shop help information
*/

import { APIModule } from "./APIModule";
import { MessageInfo } from "./MessageReader";
import { Roll20 } from "./Roll20";
import { Conditions, ConditionsListener } from "./Condition";
export class Concentration extends APIModule implements ConditionsListener {
    readonly version = "0.4"
    readonly conditions:Conditions
    readonly CONCENTRATING = "Concentrating"
    config:any = {};
    spells:Set<string> = new Set<string>()

    constructor(conditions:Conditions) {
        super()
        this.conditions = conditions
    }
    // @ts-ignore
    onConditionsChange(token:Graphic, flag:boolean) {
        return false;
    }
    private hasCondition(token:Graphic):boolean { return this.conditions.hasCondition(token, "Concentrating"); }
    private setCondition(token:Graphic) { this.conditions.changeCondition("add", token, "Concentrating"); }
    private clearCondition(token:Graphic) { this.conditions.changeCondition("remove", token, "Concentrating"); }
    private setTokens(messageInfo:MessageInfo) {
        const concentration = messageInfo.args.shift()
        if (concentration !== undefined)
            messageInfo.tokens.forEach(token => this.addConcentration(messageInfo.playerid, token, concentration))
    }
    private clearTokens(messageInfo:MessageInfo) {
        messageInfo.tokens.forEach(token => this.removeConcentration(messageInfo.playerid, token))
    }
    private requestRolls(messageInfo:MessageInfo) {
        const damStr = messageInfo.args.shift()
        const damage = parseInt(damStr === undefined ? '' : damStr, 10)
        if (!isNaN(damage)) {
            messageInfo.tokens.forEach((token) => {
                if (!Roll20.hasAccess(messageInfo.playerid, token)) return;
                this.requestRoll(token, damage);
            })
        }
    }
    private printConcentrationMsg(charName:string, isConcentrating:boolean, wasConcentrating:boolean, spell:string) {
        let message = (wasConcentrating) ? '<p style="font-size: 9pt; color: #ff0000;">Previous concentration cancelled.</p>' : '';
        if (isConcentrating)
        {
            if('' !== spell)
                message += `<b>${charName}</b> is now concentrating on <b>${spell}</b>.`;
            else
                message += `<b>${charName}</b> is now concentrating.`;
        }
        if (message !== '')
            this.msgSender.printInfo('', message, {targets: [charName, 'gm'], type: 'info'});
    }
    private setConcentration(name:string, token:Graphic, isConcentrating:boolean, spell:string) {
        const wasConcentrating = this.hasCondition(token)
        if (isConcentrating)
            this.setCondition(token)
        else
            this.clearCondition(token)
        this.printConcentrationMsg(name, isConcentrating, wasConcentrating, spell);
    }
    private static getCharName(token:Graphic):string {
        const represents = token.get('represents')
        if (represents === undefined) return ''
        const character=getObj('character', represents)
        if (character === undefined)  return ''
        const name = character.get('name')
        if (name === undefined)  return ''
        return name
    }
    private addConcentration(playerid:string, token:Graphic, spell:string) {
        if (!Roll20.hasAccess(playerid, token)) return
        const name = Concentration.getCharName(token)
        this.setConcentration(name, token, true, spell)
    }
    private removeConcentration (playerid:string, token:Graphic) {
        if (!Roll20.hasAccess(playerid, token)) return
        const name = Concentration.getCharName(token)
        this.setConcentration(name, token, false, '')
    }
    private spellCast(spellInfo:any):void {
        if (spellInfo.character === undefined || spellInfo.tokens.length === 0) return;
        if (spellInfo.name === undefined || spellInfo.playerid === undefined) return;

        spellInfo.tokens.forEach((token:Graphic) => {
            this.setConcentration(spellInfo.character, token, true, spellInfo.name)
        });
    }
    private requestRoll(token:Graphic, damage:number) {
        if (damage<0) return;
        const dc = damage > 20 ? Math.floor(damage/2) : 10;
        let message = '<b>'+token.get('name')+'</b> must make a Concentration Check - <b>DC ' + dc + '</b>.';
        message += ' - Damage: '+damage
        this.msgSender.printInfo('', message, {targets: [token.get("name"), 'gm'], type: 'info'});
    }
    private onBarChange(token:Graphic, prev:any) {
        if (!this.hasCondition(token)) return;
        const pageId =  Campaign().get('playerpageid');
        if (token.get('_pageid') !== pageId)
            return
        let bar:('bar1_value'|'bar2_value'|'bar3_value')="bar1_value"
        switch (this.config.bar) {
            case "1":
                bar="bar1_value"
                break
            case "2":
                bar="bar2_value"
                break
            case "3":
                bar="bar3_value"
                break
        }
        const currentValue = token.get(bar);
        const previousValue:(string|number|undefined) = prev[bar];
        if (!Roll20.isNumber(currentValue)) return
        if (!Roll20.isNumber(previousValue)) return
        this.requestRoll(token, Number(previousValue) - Number(currentValue))
    }
    private checkAllSpells() {
        this.spells = new Set<string>();
        const m:Map<string,Map<string,string>> = new Map();

        Roll20.forEachAttribute((attr:Attribute) => {
            const fullname = attr.get("name");
            if (fullname === undefined) return;
            if (!fullname.startsWith("repeating_spell-")) return;
            const val = attr.get("current");

            const [, slot, id, attrName] = fullname.split('_');
            const [, num] = slot.split('-');

            const key = `${id}-${num}`;
            let attrInfo = m.get(key)
            if (attrInfo === undefined) {
                attrInfo = new Map()
                m.set(key, attrInfo)
            }
            attrInfo.set(attrName, val)
        })
        m.forEach((v) => {
            const spellConcentration = v.get("spellconcentration")
            const spellName = v.get("spellname")
            if ((spellConcentration=== "{{concentration=1}}") && (spellName !== undefined))
                this.spells.add(spellName)
        });
    }
    protected initialise():void {
        this.config = {/* import-yaml:./src/Concentration.config.yaml */}
        let barChange:GraphicChangeBarValue = "change:graphic:bar1_value"
        switch (this.config.bar) {
            case "1":
                barChange="change:graphic:bar1_value"
                break
            case "2":
                barChange="change:graphic:bar2_value"
                break
            case "3":
                barChange="change:graphic:bar3_value"
                break
        }
        this.checkAllSpells()
        this.commands.push("!concentration")
        this.subcommands.set('damaged', {
            args: '[amount of damage]',  desc: 'Makes a Concentration check based on damage provided for all selected tokens',
            apply: msgInfo => this.requestRolls(msgInfo)})
        this.subcommands.set('set', {
            args: '[spell name]',  desc: 'Sets the concentration condition for all selected tokens',
            apply: msgInfo => this.setTokens(msgInfo)})
        this.subcommands.set('clear', {
            args: '',  desc: 'Clears the concentration condition for all selected tokens',
            apply: msgInfo => this.clearTokens(msgInfo)})
        on(barChange, (token, prev) => this.onBarChange(token, prev));
        this.conditions.registerListener(this, "Concentrating");
        this.onSpellCast = (msg) => {
            const spellData = this.parser.spell(msg, this.spells);
            if (spellData.matches) {
                this.spellCast(spellData);
                return true
            }
            return false
        }
    }
}
