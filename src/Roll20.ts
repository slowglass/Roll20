/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*/

class Roll20 {
    static filterGraphics(callback: (obj: Roll20Object) => boolean):Graphic[] {
        return filterObjs((o:Roll20Object) => {
            return (o.get('_type') === 'graphic') ?  callback(o) : false
        }) as Graphic[]
    }
    static filterPlayers(callback: (obj: Roll20Object) => boolean):Player[] {
        return filterObjs((o: Roll20Object) => {
            return (o.get('_type') === 'player') ?  callback(o) : false
        }) as Player[]
    }
    static findGraphics(properties:any):Graphic[] {
        return findObjs({...properties, _type:'graphics'}) as Graphic[]
    }
    static findPlayers(properties:any):Player[] {
        return findObjs({...properties, _type:'player'}) as Player[]
    }
}