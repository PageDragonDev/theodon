import BABYLON from "babylonjs";
import Actor from "./actors.js";
import co from "co";

let ScriptManager = class {
    
    constructor (app) {
        this.app = app;
        this.worldScripts = [];
        this.whenLoaded = [];
        this.updateScript = this.updateScript.bind(this);
        this.removeScript = this.removeScript.bind(this);
        
        // SCRIPT HELPERS
        
        this.primitive = this.primitive.bind(this);
        this.color = this.color.bind(this);
        this.texture = this.texture.bind(this);
        
        // WATCH SCRIPTS
        
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
        let decoratedScript = "co(function *(){" + script.code + "\ndone();});";
        decoratedScript = decoratedScript.replace(/texture\(/,"yield texture(");
        
        script.fn = new _Function("done","co","BABYLON","scene","primitive","color","picked","texture",decoratedScript);
        
        if(this.app.hud) {
            this.app.hud.updateWorldScripts(this.worldScripts);
        }
        
        // CHECK RUN WHEN LOADED
        
        let test = this.whenLoaded.find(w=>w.path == script.path);
        if(test && !test.ran) {
            test.ran = true;
            this.run(script);
        }
    }
    
    // GET A SCRIPT
    
    getScriptByPath(path) {
        return this.worldScripts.find((s)=>s.path == path);
    }
    
    // RUN A SCRIPT
    
    run(script) {
        if(script && script.fn) {
            
            try {
                script.fn(this.app.actors.done,co,BABYLON,this.app.scene,this.primitive,this.color,this.app.pickedActor,this.texture);
            } catch(e) {
                console.error("Script:",script.path,e);
            }
        }
    }
    
    // WRAP BABYLON MeshBuilder
    
    primitive() {
        let fn = BABYLON.MeshBuilder[arguments[0]];
        if(fn) {
            let actor = new Actor(this.app);
            actor.setPrimative(arguments);
            this.app.actors.add(actor);
            actor.create();
            return actor;
        }
        
    }
    
    // NEW COLOR
    
    color(r,g,b) {
        let c = new BABYLON.Color3(r,g,b); 
        return c;
    }
    
    // NEW TEXTURE (USES CACHED TEXTURE OR CACHES NEW TEXTURE)
    
    texture(path) {
        return this.app.textures.getTexture(path);
    }
    
    // RUN A SCRIPT WHEN IT'S LOADED
    
    runWhenLoaded(path) {
        this.whenLoaded.push({path:path,ran:false});
    }
    
    // REMOVE A SCRIPT
    
    removeScript(script) {
        this.worldScripts = this.worldScripts.filter(s=>s._id != script._id);
        if(this.app.hud) {
            this.app.hud.updateWorldScripts(this.worldScripts);
        }
    }
};

export default ScriptManager;
