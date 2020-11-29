/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*
*/
class Center extends APIModule {
    readonly version = "1.0"
    private pageID = ''

    private pingPlayers() {
        const currentPageID = Campaign().get('playerpageid');
        if (this.pageID === currentPageID) return
        const players = Roll20.findPlayers({})
        players.forEach((p) => {
            const pid = p.get("_id");
            const isGM = playerIsGM(pid);
            let tokens = Roll20.filterGraphics((obj: Graphic) => {
                if (obj.get("_subtype") !== "token") return false;
                if (obj.get("_pageid") !== currentPageID) return false;
                const character = getObj("character", obj.get("represents"));
                if (character === undefined) return false;
                const controlledby = character.get("controlledby");
                if (controlledby === undefined || controlledby === 'all' || controlledby === '') return false;
                return isGM || controlledby.split(',').includes(pid);
            });
            if (tokens.length === 0)
                tokens = Roll20.findGraphics({_subtype: "token", _pageid: currentPageID, name: 'Party'});
            const token = tokens.shift()
            if (token === undefined) return
            this.pageID = currentPageID
            sendPing(token.get("left"), token.get("top"), token.get("_pageid"), "", true, pid);
        });
    }

    private onNewPage(): void {
        setTimeout(() => {
            this.pingPlayers();
        }, 1500);
    }

    protected initialise(): void {
        on('change:campaign:playerpageid', () => this.onNewPage());
    }
}

