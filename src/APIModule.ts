/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*/
declare var _:any;

function debug(m:string, o:any) {
    log(m+":"+JSON.stringify(o))
}
abstract class APIModule {
    abstract version: string

    protected abstract initialise(): void

    getState(name: string, defaults: any, override: any) {
        if (!_.has(state, name)) {
            state[name] = state[name] || {};
        }
        if (override || Object.keys(state[name]).length === 0) {
            state[name] = JSON.parse(JSON.stringify(defaults));
        }
        return state[name];
    }

    register() {
        log(`Register Module: ${this.constructor.name} (${this.version})`)
        this.initialise()
    }
}