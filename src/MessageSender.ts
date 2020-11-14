/*
* Author: Chris Davies
* GitHub: https://github.com/slowglass/Roll20.git
*/

/* tslint:disable:max-classes-per-file */
class MessageSender {
    currentSettings:any
    private readonly styles:Map<string,string>
    constructor() {
        this.styles = new Map<string,string>();
        this.styles.set('link', "background-color: #fff; padding: 5px; color: #000; text-align: center;");
        this.styles.set('button', "background-color: #fff; border: 0px solid #292929; border-radius: 0px; padding: 1px; color: #000; text-align: center; float: right;")
        this.styles.set('list', 'list-style: none; padding: 0; margin: 0; overflow:hidden;')
        this.styles.set('listItem', 'padding-left: 1em; overflow: hidden')
        this.styles.set('info', "overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;")
        this.styles.set('headerIcon', 'margin-right: 5px; margin-top: 5px; display: inline-block;')
    }
    header(text:string) {
        if (text === '') return '';
        const tag = this.get('title_tag', 'h2');
        const icon = this.get('icon');
        if (icon === '')
            return `<${tag} style="margin-bottom: 10px;">${text}</${tag}>`;
        else
            return   `<${tag} style="margin-bottom: 10px;">${icon}<span style="vertical-align: top;">${text}</span></${tag}>`;
    }
    style(prefix:string=""):string {
        const typeKey= (prefix==='') ? 'type' : `${prefix}Type`;
        const styleKey= (prefix==='') ? 'style' : `${prefix}Style`;
        const t = this.currentSettings[typeKey];
        let txt = '';
        if (undefined !== t && this.styles.has(t))
            txt += this.styles.get(t);

        if (undefined !== this.currentSettings[styleKey])
            txt+=this.currentSettings[styleKey];

        if (txt !== '') return `style='${txt}'`;
        else return txt;
    }
    get(name:string, fallback:string=''):string {
        return (undefined !== this.currentSettings[name]) ? this.currentSettings[name] : fallback;
    }
    printInfo(title:string, text:string, settings:any):void {
        this.currentSettings = settings === undefined ? {} : settings;
        const speakingAs = this.get('who', 'Info')
        const msg = '<div '+this.style()+'>'+this.header(title)+text+'</div>';
        if (this.currentSettings.targets === undefined || this.currentSettings.targets.length === 0)
            sendChat(speakingAs, msg, null, {noarchive:true});
        else
            this.currentSettings.targets.forEach((target: string) => sendChat(speakingAs, `/w ${target} ${msg}`, null, {noarchive:true}));
    }
}