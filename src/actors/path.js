import BABYLON from "babylonjs";
import Actor from "./actor.js";
import HT from "./hextools.js";

class Path extends Actor {
    
    constructor(app,def) {
        super(app);
        if(def) {
            if(!def._id) {
                def._id = this._id;
            }
            this.init(def);
        }
        this.changesPending();
    }

    get width() {
        return this.proxy.width;
    }

    set width(_width) {
        this.proxy.width = _width;
        this.changesPending();
    }
    
    get height() {
        return this.proxy.height;
    }

    set height(_height) {
        this.proxy.height = _height;
        this.changesPending();
    }
    
    get visible() {
        return this.mesh.isVisible;
    }
    
    set visible(_visible) {
        this.mesh.isVisible = _visible;
    }
    
    get nodes() {
        return this.proxy.nodes;
    }

    v3ToPoint(v3) {
        return {x:v3.x,y:v3.y,z:v3.z};
    }
    
    pointToV3(p) {
        return new BABYLON.Vector3(p.x,p.y,p.z);
    }
    
    init(def) {
        this._id = def._id;
        this.type = def.type;
        this.proxy._name = def.name;
        this._state = def.state ? def.state : {};
        this.proxy.parent = def.parent;
        this.proxy.width = def.width;
        this.proxy.height = def.height;
        this.proxy.nodes = def.nodes.map(p=>this.pointToV3(p));
        this.create();
        this.hasChanges = false;

    }

    save() {
        
        let instance = {};
            
        instance.type = "path";
        instance.name = this.name ? this.name : "";
        instance.width = this.proxy.width;
        instance.height = this.proxy.height;
        instance.priority = this.priority;
        instance.nodes = this.proxy.nodes.map(v3=>this.v3ToPoint(v3));

        // PARENT
        
        if (this.parent) {
            instance.parent = this.parent.id;
        }

        // STATE

        instance.state = this._state;

        this.app.store.saveActor(this._id, instance);

    }

    // THE GRID IS CREATED EACH TIME IT IS INIT'ED.
    
    create() {
        
        this.drawPath();
        
        // SET PARENT

        if (this.proxy.parent) {
            this.app.actors.doWhenLoaded(this.proxy.parent, (actor) => {
                if(this._mesh && actor._mesh) {
                    this._mesh.parent = actor._mesh;
                } else {
                    console.warn("Unabled set parent mesh of",this.name,". Mesh has not been built.");
                }
                
            });
        }
    

        this._mesh.aid = this.id;

        return this._mesh;

    }

    drawPath() {
        if (this._mesh) {
            this._mesh.dispose();
            this._mesh = null;
        }

        this.mesh.lines = BABYLON.MeshBuilder.CreateLines("lines", {points: this.proxy.nodes}, this.app.scene);
    }
    
    addNode(v3) {
        if(!this.proxy.nodes) {
            this.proxy.nodes = [];
        }
        this.proxy.nodes.push(v3);
    }

}

export default Path;