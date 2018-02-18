import BABYLON from "babylonjs";
import uuidv1 from "uuid/v1";
import co from "co";
import _ from "lodash";
import TWEEN from "tween.js";

// WAYPOINTED VECTOR3

let WayPointVector = class {
    
    constructor(actor,prop){
        this.actor = actor;
        this.prop = prop;
    }
    
    get x() {
        return this.prop.x;
    }
    get y() {
        return this.prop.y;
    }
    get z() {
        return this.prop.z;
    }
    
    set x(x) {
        this.prop.x = parseFloat(x);
        this.actor.saveWaypoint();
    }
    set y(y) {
        this.prop.y = parseFloat(y);
        this.actor.saveWaypoint();
    }
    set z(z) {
        this.prop.z = parseFloat(z);
        this.actor.saveWaypoint();
    }
    
    
};

// ACTOR

class Actor {
    
    constructor (app, def) {

        this.app = app;
        this._id = uuidv1();
        this.created = false;
        this.pick = this.pick.bind(this);
        this.proxy = {name:"",material:{},position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},scaling:{x:1,y:1,z:1}};
        this.saveWaypoint = this.saveWaypoint.bind(this); //_.debounce(this.saveWaypoint.bind(this),500);
        this.savePlacement = _.debounce(this.savePlacement.bind(this),5000);
        this.clearWaypoints = _.debounce(this.clearWaypoints.bind(this),5000);
        this.lastUpdated = 0;
        this._parent = null;
        this._state = {};
        this._localState = {};
        this._priority = 0;
        
        if(def) {
            this.init(def);
        } else {
            this._mesh = null;
            this.type = "unknown";
            this._position = BABYLON.Vector3.Zero();
            this.hasChanges = false;
            this.hasPlacementChanges = false;
        }

    }
    
    // INITIALIZE ACTOR WITH JSON DEF... BUT SKIP POSITION, ORIENTATION, AND SCALE
    
    init(def) {
        this._id = def._id;
        this.type = def.type;
        this.proxy._name = def.name;
        this.proxy.diffuseColor = new BABYLON.Color3(def.diffuseColor.r,def.diffuseColor.g,def.diffuseColor.b);
        this.proxy.emissiveColor = new BABYLON.Color3(def.emissiveColor.r,def.emissiveColor.g,def.emissiveColor.b);
        this.proxy.specularColor = new BABYLON.Color3(def.specularColor.r,def.specularColor.g,def.specularColor.b);
        this.proxy.ambientColor = new BABYLON.Color3(def.ambientColor.r,def.ambientColor.g,def.ambientColorb);
        this.proxy.diffuseTexture = def.diffuseTexture;
        this.proxy.checkCollisions = def.checkCollisions;
        this._priority = def.priority;
        this._state = def.state?def.state:{};
        this.proxy.parent = def.parent;
        this.proxy.visible = typeof(def.visible) != 'undefined'?def.visible:true;
        this.create();
        this.hasChanges = false;
        
    }
    
    // CLONE FROM ANOTHER ACTOR
    
    clone(actor) {
        this._id = actor._id;
        this.primitive = actor.primitive;
        this._position = actor._position;
        this._name = actor._name;
        this.type = actor.type;
        this._mesh = actor.mesh; // TODO: May have to be smarter about copying mesh
        this.created = actor.created;
        this.hasChanges = actor.hasChanges;
        this.hasPlacementChanges = actor.hasChanges;
        this.proxy.parent = actor.parent;
        this._priority = actor.priority;
        this.create();
    }
    
    placementOffset() {
        return new BABYLON.Vector3.Zero();
    }
    
    // TRANSFORM ACTOR TO NEW POSITION, ORIENTATION, AND SCALE
    
    updatePlacement(def) {
        
        if(!def.time) {
            return;
        }
        if(this.placed) {
            return;
        }
        this.placed = true;
        
        // DISCARD OLD UPDATES
        
        let time = def.time.getTime();
        if(time < this.lastUpdated) {
            return;
        }
        this.lastUpdated = new Date().getTime();
        
        if(def.position) {
            // GET OFFSET
        
            let defPos = new BABYLON.Vector3(def.position.x,def.position.y,def.position.z);
            let offsetPos = defPos.add(this.placementOffset());
            
            // PLACE
            
            if(this._mesh) {
                this._mesh.position =offsetPos;
            }
            this.proxy.position.x = defPos.x;
            this.proxy.position.y = defPos.y;
            this.proxy.position.z = defPos.z;
        }
        
        if(def.rotation) {
            if(this._mesh) {
                this._mesh.rotation = new BABYLON.Vector3(def.rotation.x,def.rotation.y,def.rotation.z);
            }
            this.proxy.rotation.x = this._mesh.rotation.x;
            this.proxy.rotation.y = this._mesh.rotation.y;
            this.proxy.rotation.z = this._mesh.rotation.z;
        }
        
        if(def.scaling) {
            if(this._mesh) {
                this._mesh.scaling = new BABYLON.Vector3(def.scaling.x,def.scaling.y,def.scaling.z);
            }
            this.proxy.scaling.x = this._mesh.scaling.x;
            this.proxy.scaling.y = this._mesh.scaling.y;
            this.proxy.scaling.z = this._mesh.scaling.z;
        }
        
        this.trigger("placed");
    }
    
    // TRANSFORM ACTOR TO NEW POSITION, ORIENTATION, AND SCALE
    
    updateWaypoint(def) {

        if(!def.time) {
            return;
        }
        
        // DISCARD OLD UPDATES
        
        let time = def.time.getTime();
        if(time < this.lastUpdated) {
            return;
        }
        this.lastUpdated = time;
        
        // GET TIME DELTA
        
        let timeDiff = this.lastUpdated - time;
        if(timeDiff < 1000) {
            timeDiff = 1000;
        }
        
        if(def.position) {
            
            // GET OFFSET
        
            let defPos = new BABYLON.Vector3(def.position.x,def.position.y,def.position.z);
            let offsetPos = defPos.add(this.placementOffset());
            let offset = this.placementOffset();
            
            // PLACE
            
            if(this._mesh) {
                new TWEEN.Tween(this._mesh.position)
    				.to(offsetPos, timeDiff)
    				.onUpdate(()=>{
    				    this.proxy.position.x = this._mesh.position.x - offset.x;
                        this.proxy.position.y = this._mesh.position.y - offset.y;
                        this.proxy.position.z = this._mesh.position.z - offset.z;
    				})
    				.start();
            }
            
        }
        
        if(def.rotation) {
            if(this._mesh) {
                new TWEEN.Tween(this._mesh.rotation)
    				.to(new BABYLON.Vector3(def.rotation.x,def.rotation.y,def.rotation.z), timeDiff)
    				.onUpdate(()=>{
    				    this.proxy.rotation.x = this._mesh.rotation.x;
                        this.proxy.rotation.y = this._mesh.rotation.y;
                        this.proxy.rotation.z = this._mesh.rotation.z;
    				})
    				.start();
            }
        }
        
        if(def.scaling) {
            if(this._mesh) {
                new TWEEN.Tween(this._mesh.scaling)
    				.to(new BABYLON.Vector3(def.scaling.x,def.scaling.y,def.scaling.z), timeDiff)
    				.onUpdate(()=>{
    				    this.proxy.scaling.x = this._mesh.scaling.x;
                        this.proxy.scaling.y = this._mesh.scaling.y;
                        this.proxy.scaling.z = this._mesh.scaling.z;
    				})
    				.start();
            }
            
        }
    }
    
    // CLEAR WAYPOINTS OLDER THAN FIVE SECONDS FROM LAST UPDATED
    
    clearWaypoints(time) {
        if(this.lastUpdated) {
            this.app.store.clearWaypoints(this,new Date(this.lastUpdated-5000));
        }
    }
    
    // SAVE ACTOR
    
    colorToObj(c) {return {r:c.r,g:c.g,b:c.b}}
    
    save() {
        console.warn("Abastract Actor:save() Called");
    }
    
    savePlacement() {
        let placement = {};
        
        placement.position = {x:this.proxy.position.x,y:this.proxy.position.y,z:this.proxy.position.z};
        placement.rotation = {x:this.proxy.rotation.x,y:this.proxy.rotation.y,z:this.proxy.rotation.z};
        placement.scaling = {x:this.proxy.scaling.x,y:this.proxy.scaling.y,z:this.proxy.scaling.z};
        
        this.app.store.savePlacement(this,placement);
    }
    
    // THROTTLED CREATION OF WAYPOINTS
    
    saveWaypoint() {
        
        let waypoint = {};
        
        waypoint.position = {x:this.proxy.position.x,y:this.proxy.position.y,z:this.proxy.position.z};
        waypoint.rotation = {x:this.proxy.rotation.x,y:this.proxy.rotation.y,z:this.proxy.rotation.z};
        waypoint.scaling = {x:this.proxy.scaling.x,y:this.proxy.scaling.y,z:this.proxy.scaling.z};

        this.app.store.saveWaypoint(this,waypoint);
        
        // ALSO SAVE PLACEMENT
        
        this.savePlacement();
        
        // ALSO CLEAR WAYPOINTS
        
        this.clearWaypoints();
    }
    
    done() {
        let _this = this;
        return co(function *(){
            if(_this.hasChanges) {
                // _this.app.actors.add(_this);
                yield _this.save();
                _this.hasChanges = false;
            }
        });
    }
    
    // CREATE MESH FROM PRIMITIVE OR FILE
    
    create() {
        console.warn("Abastract Actor:create() Called");
    }
    
    // DESTROY ACTOR AND MESH
    
    destroy() {
        if(this._mesh) {
            this._mesh.dispose();
        }
    }
    
    pick(evt) {
        // ONLY PICK IF NOT ALREADY PICKED, OTHERWISE UNPICK
        
        if(this.app._pickedActors.indexOf(this) < 0 && evt.event.ctrlKey) {
            
            this.highlight();
            this.select();

        } 
        
        // SEND PICK EVENT
        
        this.app.actors.send("pick",Object.assign({target:this},evt));
        
    }
    
    select(highlight = false,clearHighlights = true,add = false) {
        if(clearHighlights) {
            this.app._pickedActors.forEach(a=>{
                a.unhighlight();
                
            });
        }
        
        if(highlight) {
            this.highlight();
        }
        
        if(add) {
            this.app._pickedActors.push(this);
        } else {
            this.app._pickedActors = _.filter(a=>a != this);
            if(this.app._pickedActors.length == 0) {
                this.app._pickedActors.push(this);
            }
        }
    }
    
    highlight(color=BABYLON.Color3.Green()) {
        this.app._pickedActors.forEach(a=>{
            this.app.hlLayer.removeMesh(a._mesh,BABYLON.Color3.Green());
        });
        this.app.hlLayer.addMesh(this._mesh,color);
        this.mesh.getChildMeshes(false).forEach((m)=>{
            this.app.hlLayer.addMesh(m,color);
        });
    }
    
    unhighlight() {
        this.app.hlLayer.removeMesh(this.mesh);
        this.mesh.getChildMeshes(false).forEach((m)=>{
            this.app.hlLayer.removeMesh(m);
        });
    }
    
    remove() {
        this.mesh.getChildMeshes(true).forEach((m)=>{
            if(m.aid) {
                let child = this.app.actors.actorsById[m.aid];
                child.remove();
            }
        });
        this.app.store.removeActor(this);
    }
    
    setState(newState) {
        this._state = Object.assign(this._state,newState);
        this.changesPending();
    }
    
    setLocalState(newState) {
        this._localState = Object.assign(this._localState,newState);
    }
    
    // ON MESSAGE
    
    on(event,scriptPath,options) {
        let onEvent = {};
        onEvent["_"+event] = {path:scriptPath,options:options?options:null};
        
        this.setState(onEvent);
    }
    
    // TRIGGER
    
    trigger(eventName,eventData) {
        let event = this._state["_" + eventName];
        
        if(!eventData) {
            eventData = {};
        }
        
        if(event) {
            
            // RUN SCRIPT
            
            let script = this.app.scripts.getScriptByPath(event.path);
            if(script) {
                eventData.target = this;
                this.app.scripts.run(script,eventData);
            }
            
            return true;
        }
        return false;
    }
    
    // SHOW HUD
    
    showHUD(hud,data = {}) {
        data.target = this;
        this.app.hud.showEventHUD(this,hud,data);
    }
    
    hideHUD() {
        this.app.hud.hideHUD();
    }
    
    // POINTER OVER
    
    onPointerMove(fn) {
        
        
        if(fn) {
            this.pointerMoveListener = (e) => {
                let pickResult = this.app.scene.pick(this.app.scene.pointerX, this.app.scene.pointerY);
                if(pickResult.pickedMesh) {
                    
                    
                    // TRAVEL ANCESTORS UNTIL WE FIND AN ACTOR
                    
                    let currentMesh = pickResult.pickedMesh;
                    while(!currentMesh.aid && currentMesh != null) {
                        currentMesh = currentMesh.parent;
                    }
                    
                    if(currentMesh) {
                        
                        let actor = this.app.actors.actorsById[currentMesh.aid];
                        if(actor) {
                            
                            pickResult.event = e;
                            if(actor.id == this.id) {
                                fn(pickResult);
                            }
                        }
                    }
                }
            };
            this.app.renderTarget.addEventListener("pointermove", this.pointerMoveListener);
        } else {
            this.app.renderTarget.removeEventListener("pointermove",this.pointerMoveListener);
            this.pointerMoveListener = null;
        }
    }
    
    changesPending() {
        this.hasChanges = true;
    }
    
    // PROPS
    
    get id() {
        return this._id;
    }
    
    get mesh() {
        return this._mesh?this._mesh:this.proxy;
    }
    
    get name() {
        return this.mesh.name;
    }
    
    set name(name) {
        this.mesh.name = name;
        this.changesPending();
    }
    
    get parent() {
        return this._parent;
    }
    
    set parent(parent) {
        this._parent = parent;
        this.mesh.parent = parent._mesh;
        this.changesPending();
    }
    
    get state() {
        return this._state;
    }
    
    get localState() {
        return this._localState;
    }
    
    get priority() {
        return this._priority;
    }
    
    set priority(priority) {
        this._priority = priority;
        this.changesPending();
    }
    
    get visible() {
        return this.mesh.isVisible;
    }
    
    set visible(_visible) {
        this.mesh.isVisible = _visible;
        this.changesPending();
    }
    
    // PLACEMENT PROPS ARE WRAPPED IN WAYPOINT VECTORS TO UPDATE WAYPOINTS
    
    set position(p) {
        this.proxy.position = p;
        this.posWP = null;
        this.saveWaypoint();
    }
    
    get position() {
        if(!this.posWP) {
            this.posWP = new WayPointVector(this,this.proxy.position);
        }
        return this.posWP;
    }
    
    set rotation(r) {

        this.proxy.rotation = r;
        this.rotWP = null;
        this.saveWaypoint();
    }
    
    get rotation() {
        
        if(!this.rotWP) {
            this.rotWP = new WayPointVector(this,this.proxy.rotation);
        }
        return this.rotWP;
    }
    
    set scaling(s) {

        this.proxy.scaling = s;
        this.sclWP = null;
        this.saveWaypoint();
    }
    
    get scaling() {

        if(!this.sclWP) {
            this.sclWP = new WayPointVector(this,this.proxy.scaling);
        }
        return this.sclWP;
    }
    
    // MATERIAL
    
    get material() {
        return this.mesh.material;
    }
    
    get diffuseColor() {
        return this.mesh.material.diffuseColor;
    }
    
    set diffuseColor(c) {
        this.mesh.material.diffuseColor = c;
        this.changesPending();
    }
    
    get specularColor() {
        return this.mesh.material.specularColor;
    }
    
    set specularColor(c) {
        this.mesh.material.specularColor = c;
        this.changesPending();
    }
    
    get emissiveColor() {
        return this.mesh.material.emissiveColor;
    }
    
    set emissiveColor(c) {
        this.mesh.material.emissiveColor = c;
        this.changesPending();
    }
    
    get ambientColor() {
        return this.mesh.material.ambientColor;
    }
    
    set ambientColor(c) {
        this.mesh.material.ambientColor = c;
        this.changesPending();
    }
    
    // COLLISION
    
    get checkCollisions() {
        return this.mesh.checkCollisions;
    }
    
    set checkCollisions(check) {
        this.mesh.checkCollisions = check;
        this.changesPending();
    }
    
    // TEXTURE
    
    get diffuseTexture() {
        return this.mesh.material.diffuseTexture;
    }
    
    set diffuseTexture(t) {
        this.mesh.material.diffuseTexture = t;
        this.changesPending();
    }
    
    get specularTexture() {
        return this.mesh.material.specularTexture;
    }
    
    set specularTexture(t) {
        this.mesh.material.specularTexture = t;
        this.changesPending();
    }
    
    get ambientTexture() {
        return this.mesh.material.ambientTexture;
    }
    
    set ambientTexture(t) {
        this.mesh.material.ambientTexture = t;
        this.changesPending();
    }
    
    get emissiveTexture() {
        return this.mesh.material.emissiveTexture;
    }
    
    set emissiveTexture(t) {
        this.mesh.material.emissiveTexture = t;
        this.changesPending();
    }
    
}

export default Actor;