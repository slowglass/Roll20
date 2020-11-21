
import { APIModule } from "./APIModule";
import { Center } from "./Center";
import { Conditions } from "./Condition";
import { Concentration } from "./Concentration";
import { MessageSender } from "./MessageSender";
import { Notes } from './Notes'
import { TurnTracker } from "./TurnTracker";

on('ready', () => {
    const modules:APIModule[] = []
    const conditions = new Conditions()
    modules.push(new Center())
    modules.push(conditions)
    modules.push(new Concentration(conditions))
    modules.push(new Notes())
    modules.push(new TurnTracker(conditions))

    modules.forEach(m => m.register())


    const messageSender =  new MessageSender()
    const moduleInfo = modules.map( m => `${m.constructor.name}: ${m.version}`)
    const description=  "The modules loaded" +
        messageSender.list(moduleInfo, {listType:'list', itemType:'listItem'});
    messageSender.printInfo('Module (re)start', description, {type: 'info'});
})
