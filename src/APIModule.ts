/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*/


function debug(m:string, o:any) {
    log(m+":"+JSON.stringify(o))
}
abstract class APIModule {
    abstract version: string
    protected abstract initialise() : void
    register() {
        log(`Register Module: ${this.constructor.name} (${this.version})`)
        this.initialise()
    }
}