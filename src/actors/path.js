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
            def.name = "path";
            this.init(def);
        }
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
    
    get firstNode() {
        return this.proxy.nodes && this.proxy.nodes.length?this.proxy.nodes[0]:null;
    }
    
    get lastNode() {
        return this.proxy.nodes && this.proxy.nodes.length?this.proxy.nodes[this.proxy.nodes.length-1]:null;
    }
    

    v3ToPoint(v3) {
        return {x:v3.x,y:v3.y,z:v3.z};
    }
    
    pointToV3(p) {
        return new BABYLON.Vector3(p.x,p.y,p.z);
    }
    
    init(def,create) {
        this._id = def._id;
        this.type = def.type;
        this.proxy._name = def.name;
        this._state = def.state ? def.state : {};
        this.proxy.parent = def.parent;
        this.proxy.nodes = def.nodes?def.nodes.map(p=>this.pointToV3(p)):[];
        if(create) {
            this.create();
        }
        this.hasChanges = false;
    }

    save() {
        
        let instance = {};
            
        instance.type = "path";
        instance.name = this.name ? this.name : "";
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
        
        if(!this._mesh) {
            return;
        }
        
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
        
        if(!this.proxy.nodes || this.proxy.nodes.length == 0) {
            return;
        }
        
        if(this.proxy.nodes.length > 1) {
            this._mesh = BABYLON.MeshBuilder.CreateLines("path", {points: this.proxy.nodes}, this.app.scene);
            this._mesh.color = new BABYLON.Color3(0.0, 1.0, 1.0);
        }
        
        this.proxy.nodes.forEach(node=>{
            let sphere = BABYLON.MeshBuilder.CreateSphere("path node", {diameter: 1.5}, this.app.scene);
            sphere.position = node.clone();
            sphere.parent = this._mesh;
        });
        
        return this._mesh;
    }
    
    addNode(v3) {
        if(!this.proxy.nodes) {
            this.proxy.nodes = [];
        }

        this.proxy.nodes.push(v3.clone());
        this.changesPending();

    }

    drawNode(node,color=new BABYLON.Color3(1,1,1),diameter=1,yOffset=0) {
        let sphere = BABYLON.MeshBuilder.CreateSphere("path node", {diameter: diameter}, this.app.scene);
        sphere.position = node.clone();
        sphere.position.y += yOffset;
        sphere.parent = this._mesh;
        sphere.material = new BABYLON.StandardMaterial("path node material", this.app.scene);
        sphere.material.diffuseColor = color;
    }
    
    angle(v1,v2) {
	    
    	let dot = BABYLON.Vector3.Dot(v1,v2);
    	dot = dot / (v1.length()*v2.length());
    	let acos = Math.acos(dot);
    	return acos;
    }
}

export default Path;