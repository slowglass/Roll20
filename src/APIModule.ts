/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*/


declare var $U : any;

abstract class APIModule {
    abstract version: string
    abstract module: string
    protected abstract initialise() : void

    register() {
        $U.announce(this.module, this.version);
        this.initialise()
    }
}