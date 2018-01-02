let ScriptManager = class {
    
    constructor (app) {
        this.app = app;
        this.worldScripts = [];
        this.updateScript = this.updateScript.bind(this);
        this.removeScript = this.removeScript.bind(this);
        this.app.store.watchWorldScripts(this.updateScript,this.removeScript);
    }
    
    updateScript(_script) {
        
        // ADD/UPDATE SCRIPT
        
        let script = this.worldScripts.find(s=>s._id == _script._id);
        if(script) {
            script.path = _script.path;
            script.name = _script.name;
            script.code = _script.code;
            script.wid = _script.wid;
        } else {
            script = _script;
            this.worldScripts.push(script);
        }
        
        // MAKE INTO FN
        
        let _Function = Function;
        script.fn = new _Function("scene",script.code);
        
        if(this.app.hud) {
            this.app.hud.updateWorldScripts(this.worldScripts);
        }
    }
    
    removeScript(script) {
        
    }
};

export default ScriptManager;