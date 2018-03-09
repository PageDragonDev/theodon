import BABYLON from "babylonjs";
import Grid from "./actors/grid.js";
import Path from "./actors/path.js";
import Wall from "./actors/wall.js";
import Primitive from "./actors/primitive.js";
import co from "co";

import TWEEN from "tween.js";

let ScriptManager = class {
    
    constructor (app) {
        this.app = app;
        this.worldScripts = [];
        this.worldScriptsByPath = {};
        this.whenLoaded = [];
        this.updateScript = this.updateScript.bind(this);
        this.removeScript = this.removeScript.bind(this);
        this.runScript = this.runScript.bind(this);
        
        // SCRIPT HELPERS
        
        this.primitive = this.primitive.bind(this);
        this.grid = this.grid.bind(this);
        this.actor = this.actor.bind(this);
        this.color = this.color.bind(this);
        this.texture = this.texture.bind(this);
        this.goToActor = this.goToActor.bind(this);
        this.path = this.path.bind(this);
        this.wall = this.wall.bind(this);
        
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
        let decoratedScript = "co(function *(){" + script.code + "\ndone();return true;});";
        decoratedScript = decoratedScript.replace(/texture\(/g,"yield texture(");
        decoratedScript = decoratedScript.replace(/fetchFileDialog\(/g,"yield fetchFileDialog(");
        
        script.fn = new _Function("run",
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
            "config",
            "goto",
            "path",
            "wall",
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
                let result = script.fn(this.app.scripts.runScript,
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
                    this.app.config,
                    this.goToActor,
                    this.path,
                    this.wall);
                if(!result) {
                    this.app.actors.done();
                }
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
        if(typeof(r) != "string") {
            let c = new BABYLON.Color3(r,g,b); 
            return c;
        } else {
            let h = this.colorNameToHex(r);
            if(h) {
                let c = BABYLON.Color3.FromHexString(h); 
                return c;
            } else {
                let c = BABYLON.Color3.FromHexString(r); 
                return c;
            }
        }
    }
    
    // NEW TEXTURE (USES CACHED TEXTURE OR CACHES NEW TEXTURE)
    
    texture(path) {
        return this.app.textures.getTexture(path);
    }
    // Move Camera To Actor
    
    goToActor(actor,yOffset,margin) {
        
        // MOVE
        
        let start = this.app.camera.position;
        let target = actor.mesh.position.clone();
        target.y += yOffset;
        let vector = target.subtract(start).normalize();
        let distance = BABYLON.Vector3.Distance(start,target);
        
        let end = start.add(vector.scale(distance - margin));
        this.app.camera.setTarget(target);
        
        new TWEEN.Tween(start)
			.to(end, 1000)
			.start();
    }
    
    // New Path
    
    path(parent) {
        let actor = new Path(this.app, {
            name:"path",
            parent:parent
        });
        actor.parent = parent;
        this.app.actors.add(actor);
        
        actor.create();
        return actor;
    }
    
    // New Path
    
    wall(parent,width=5,height=10) {
        let actor = new Wall(this.app, {
            name:"wall",
            width:width,
            height:height,
            parent:parent
        });
        actor.parent = parent;
        this.app.actors.add(actor);
        
        actor.create();
        return actor;
    }
    
    
    colorNameToHex(color)
    {
        var colors = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
        "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
        "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
        "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
        "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
        "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
        "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
        "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
        "honeydew":"#f0fff0","hotpink":"#ff69b4",
        "indianred ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
        "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
        "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
        "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
        "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
        "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
        "navajowhite":"#ffdead","navy":"#000080",
        "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
        "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
        "rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
        "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
        "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
        "violet":"#ee82ee",
        "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
        "yellow":"#ffff00","yellowgreen":"#9acd32"};
    
        if (typeof colors[color.toLowerCase()] != 'undefined')
            return colors[color.toLowerCase()];
    
        return false;
    }
};

export default ScriptManager;
