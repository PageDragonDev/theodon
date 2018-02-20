import BABYLON from "babylonjs";
import TWEEN from "tween.js";
import Grid from "./actors/grid.js";
import Primitive from "./actors/primitive.js";
import co from "co";

let ScriptManager = class {
    
    constructor (app) {
        this.app = app;
        this.worldScripts = [];
        this.worldScriptsByPath = {};
        this.whenLoaded = [];
        this.updateScript = this.updateScript.bind(this);
        this.removeScript = this.removeScript.bind(this);
        
        // SCRIPT HELPERS
        
        this.primitive = this.primitive.bind(this);
        this.grid = this.grid.bind(this);
        this.actor = this.actor.bind(this);
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
        this.worldScriptsByPath[script.path] = script;
        
        // MAKE INTO FN
        
        let _Function = Function;
        let decoratedScript = "co(function *(){" + script.code + "\ndone();});";
        decoratedScript = decoratedScript.replace(/texture\(/g,"yield texture(");
        decoratedScript = decoratedScript.replace(/fetchFileDialog\(/g,"yield fetchFileDialog(");
        
        script.fn = new _Function(
            "done",
            "co",
            "BABYLON",
            "scene",
            "primitive",
            "grid", 
            "actor",
            "actors",
            "color",
            "picked",
            "texture",
            "data",
            "target",
            "fetchFileDialog",
            "nearest",
            "user",
            "camera",
            "goto",
            decoratedScript);
        
        if(this.app.hud) {
            this.app.hud.updateWorldScripts(this.worldScripts);
        }
        
        // CHECK RUN WHEN LOADED
        
        let test = this.whenLoaded.find(w=>w.path == script.path);
        if(test && !test.ran) {
            test.ran = true;
            this.run(script,test.data);
        }
    }
    
    // GET A SCRIPT
    
    getScriptByPath(path) {
        return this.worldScriptsByPath[path];
    }
    
    // RUN A SCRIPT
    
    run(script,data = {}) {

        if(script && script.fn) {
            
            try {
                script.fn(
                    this.app.actors.done,
                    co,
                    BABYLON,
                    this.app.scene,
                    this.primitive,
                    this.grid,
                    this.actor,
                    this.app.actors,
                    this.color,
                    this.app.pickedActor,
                    this.texture,
                    data,
                    data.target,
                    this.app.store.fetchFileDialog,
                    this.app.actors.nearest,
                    this.app.store.user,
                    this.app.camera,
                    this.goToActor);
            } catch(e) {
                console.error("Script:",script.path,e);
            }
        }
    }
    
    // RUN A SCRIPT WHEN IT'S LOADED
    
    runScript(path,data) {
        let script = this.getScriptByPath(path);
        if(!script) {
            this.whenLoaded.push({path:path,ran:false,data:data});
        } else {
            script.ran = true;
            this.run(script,data);
        }
    }
    
    // REMOVE A SCRIPT
    
    removeScript(script) {
        this.worldScripts = this.worldScripts.filter(s=>s._id != script._id);
        if(this.app.hud) {
            this.app.hud.updateWorldScripts(this.worldScripts);
        }
    }
    
    // HELPERS
    
    // WRAP BABYLON MeshBuilder
    
    primitive() {
        let fn = BABYLON.MeshBuilder[arguments[0]];
        if(fn) {
            let actor = new Primitive(this.app);
            actor.setPrimative(arguments);
            this.app.actors.add(actor);
            actor.create();
            return actor;
        }
        
    }
    
    // Grid Script Helper
    
    grid(parent,width,height,gridSize=20) {
        let actor = new Grid(this.app, {
            name:"grid",
            parent:this.parent,
            gridType:"square",
            gridSize:gridSize,
            gridWidth:width,
            gridHeight:height
        });
        actor.parent = parent;
        this.app.actors.add(actor);
        
        actor.create();
        return actor;
    }
    
    // Get Actor Helper
    
    actor(aid) {
        return this.app.actors.actorsById[aid];
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
    
    // Move Camera To Actor
    
    goToActor(actor) {
        
        new TWEEN.Tween(this._mesh.position)
			.to(actor.mesh.position, 2000)
			.start();
    }
};

export default ScriptManager;
