import BABYLON from "babylonjs";
import uuidv1 from "uuid/v1";
import co from "co";
import _ from "lodash";
import TWEEN from "tween.js";

let Actors = class {
    constructor(app) {
        this.app = app;
        this.actors = [];
        this.actorsById = {};
        this.waitOn = {};
        this.whenLoaded = {};
        this.done = this.done.bind(this);
        this.doWhenLoaded = this.doWhenLoaded.bind(this);
        
        let _this = this;
        
        // WATCH ACTORS
        
        _this.app.store.watchActors((actorDef)=>{
            let actor = _this.addDef(actorDef);
            
            let waitOn = _this.waitOn[actorDef._id];
            if(waitOn) {
                actor.updatePlacement(waitOn);
                delete _this.waitOn[actorDef._id];
            }
            
            let doWhen = _this.whenLoaded[actorDef._id];
            if(doWhen) {
                doWhen(actor);
                delete _this.whenLoaded[actorDef._id];
            }
            
        },(actorDef)=>{
            let actor = _this.addDef(actorDef);
            actor.destroy();
            this.actors = this.actors.filter(a=>a.id != actorDef._id);
            delete this.actorsById[actorDef._id];
        });    

        // WATCH PLACEMENTS
        
        this.app.store.watchPlacements((placement)=>{
            let actor = this.actorsById[placement._id];
            if(actor) {
                actor.updatePlacement(placement);
            } else {
                // WAIT ON ACTOR
                this.waitOn[placement._id] = placement;
            }
        });
        
        // WATCH WAYPOINTS
        
        this.app.store.watchWaypoints((waypoint)=>{
            
            // IGNORE STALE WAYPOINTS
            
            if(waypoint.time) {
                let now = new Date().getTime();
                let then = waypoint.time.getTime();
                
                if(now - then > 5000) {
                    return;
                }
            }
            
            // UPDATE ACTOR
            
            let actor = this.actorsById[waypoint.aid];
            if(actor) {
                actor.updateWaypoint(waypoint);
            } 
        });
        
    }
    
    // SEND EVENT
        
    send(eventName,eventData) {
        
        let honored = 0;
        if(eventData.targetActor) {
            let res = eventData.targetActor.trigger(eventName,eventData);
            if(res) {honored++;}
        } else {
            this.actors.forEach(actor=>{
                let res = actor.trigger(eventName,eventData);
                if(res) {honored++;}
            });
        }
        
        console.info("EVENT",eventName,"HONORED",honored,honored==1?"TIME":"TIMES");
        
    }
    
    // ADD
    
    add(actor) {
        let existing = this.actorsById[actor._id];
        if(!existing) {
            this.actors.push(actor);
            this.actorsById[actor._id] = actor;
            return actor;
        } else {
            existing.clone(actor);
            return existing;
        }
    }
    
    // ADD ACTOR TO ACTOR LIST USING A JSON DEF
    
    addDef(def) {
        let existing = this.actorsById[def._id];
        if(existing) {
            // INIT IN PLACE
            
            existing.init(def);
            return existing;

        } else {
            let actor = new Actor(this.app,def);
            this.actors.push(actor);
            this.actorsById[actor._id] = actor;
            return actor;
        }
    }
    
    done() { // TODO: Use Generator
        this.actors.forEach(a=>a.done());
    }
    
    doWhenLoaded(aid,fn) {
        let actor = this.actorsById[aid];
        if(actor) {
            fn(actor);
        } else {
            this.whenLoaded[aid] = fn;
        }
    }
    
};
exports.Actors = Actors;

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

let Actor = class {
    
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
        this.primitive = def.primitive;
        this.type = def.type;
        this.proxy._name = def.name;
        this.proxy.diffuseColor = new BABYLON.Color3(def.diffuseColor.r,def.diffuseColor.g,def.diffuseColor.b);
        this.proxy.emissiveColor = new BABYLON.Color3(def.emissiveColor.r,def.emissiveColor.g,def.emissiveColor.b);
        this.proxy.specularColor = new BABYLON.Color3(def.specularColor.r,def.specularColor.g,def.specularColor.b);
        this.proxy.ambientColor = new BABYLON.Color3(def.ambientColor.r,def.ambientColor.g,def.ambientColorb);
        this.proxy.diffuseTexture = def.diffuseTexture;
        this._state = def.state?def.state:{};
        this.proxy.parent = def.parent;
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
        this.create();
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
            if(this._mesh) {
                this._mesh.position = new BABYLON.Vector3(def.position.x,def.position.y,def.position.z);
            }
            this.proxy.position.x = this._mesh.position.x;
            this.proxy.position.y = this._mesh.position.y;
            this.proxy.position.z = this._mesh.position.z;
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
        let timeDiff = this.lastUpdated - time;
        if(timeDiff < 0) {
            timeDiff = 0;
        }

        if(def.position) {
            if(this._mesh) {
                new TWEEN.Tween(this._mesh.position)
    				.to(new BABYLON.Vector3(def.position.x,def.position.y,def.position.z), timeDiff)
    				.onUpdate(()=>{
    				    this.proxy.position.x = this._mesh.position.x;
                        this.proxy.position.y = this._mesh.position.y;
                        this.proxy.position.z = this._mesh.position.z;
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
    
    // SETS ACTOR TO A PRIMITIVE (MUST BE A SET OF MESH BUILDER PARAMS)

    setPrimative(args) {
        this.type = "primitive";
        this.primitive = [];
        for(let i = 0; i < args.length; i++) {
            this.primitive.push(args[i]);
        }
        this.hasChanges = true;
    }
    
    // SAVE ACTOR
    
    save() {
        let instance = {};
        let _this = this;
        
        let colorToObj = (c) => {return {r:c.r,g:c.g,b:c.b}};
        
        return co(function *(){
            if(_this.type == "primitive") {
                instance.type = "primitive";
                instance.primitive = _this.primitive;
                instance.name = _this.name?_this.name:"";

                // MATERIAL
                
                if(_this.diffuseColor) {
                    instance.diffuseColor = colorToObj(_this.diffuseColor);
                }
                if(_this.specularColor) {
                    instance.specularColor = colorToObj(_this.specularColor);
                }
                if(_this.emissiveColor) {
                    instance.emissiveColor = colorToObj(_this.emissiveColor);
                }
                if(_this.ambientColor) {
                    instance.ambientColor = colorToObj(_this.ambientColor);
                }
                
                let createTexture = (t) => {
                    return {
                        "name": t.name,
                        "level": t.level,
                        "hasAlpha": t.hasAlpha,
                        "getAlphaFromRGB": t.getAlphaFromRGB,
                        "coordinatesMode": t.coordinatesMode,
                        "uOffset": t.uOffset,
                        "vOffset": t.vOffset,
                        "uScale": t.uScale,
                        "vScale": t.vScale,
                        "uAng": t.uAng,
                        "vAng": t.vAng,
                        "wAng": t.wAng,
                        "wrapU": t.wrapU,
                        "wrapV": t.wrapV,
                        "coordinatesIndex": t.coordinatesIndex
                    };
                };
                
                // TEXTURE
                
                if(_this.diffuseTexture) {
                    instance.diffuseTexture = createTexture(_this.diffuseTexture);
                }
                
                if(_this.specularTexture) {
                    instance.specularTexture = createTexture(_this.specularTexture);
                }
                
                if(_this.emissiveTexture) {
                    instance.emissiveTexture = createTexture(_this.emissiveTexture);
                }
                
                if(_this.ambientTexture) {
                    instance.ambientTexture = createTexture(_this.ambientTexture);
                }
                
                // PARENT
                
                if(_this.parent) {
                    instance.parent = _this.parent.id;
                }
                
                // STATE
                
                instance.state = _this._state;
                
                return yield _this.app.store.saveActor(_this._id,instance);
                
            }
        });
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

        let _this = this;
        return co(function *(){
            let initHide = false;
            if(_this.type == "primitive" && _this.primitive) {
                if(!_this.created) {
                    
                    let fn = BABYLON.MeshBuilder[_this.primitive[0]];
                    if(!fn) {
                        console.error("Unable to build with",_this.primitive[0]);
                        return;
                    }
                    
                    let args = [];
                    for(let i = 1; i < _this.primitive.length;i++) {
                        args.push(_this.primitive[i]);
                    }
                    
                    _this._mesh = fn.apply(null,args);
                    _this._mesh.aid = _this.id;
                    _this.created = true;
                    _this._mesh.isVisible = false; // TEMP HIDE
                    initHide = true; // SO WE CAN UNHIDE
                    
                    if(_this._name) {
                        _this._mesh.name = _this._name;
                    }
                }
                
                // MATERIAL
                
                _this._mesh.material = new BABYLON.StandardMaterial("material", _this.app.scene);
                
                if(_this.proxy.diffuseColor) {
                    _this._mesh.material.diffuseColor = _this.proxy.diffuseColor;
                }
                if(_this.proxy.specularColor) {
                    _this._mesh.material.specularColor = _this.proxy.specularColor;
                }
                if(_this.proxy.emissiveColor) {
                    _this._mesh.material.emissiveColor = _this.proxy.emissiveColor;
                }
                if(_this.proxy.ambientColor) {
                    _this._mesh.material.ambientColor = _this.proxy.ambientColor;
                }
                
                // TEXTURE
                
                if(_this.proxy.diffuseTexture) {
                    _this._mesh.material.diffuseTexture = yield _this.app.textures.getTexture(_this.proxy.diffuseTexture.name);
                }
                
                if(_this.proxy.emissiveTexture) {
                    _this._mesh.material.emissiveTexture = yield _this.app.textures.getTexture(_this.proxy.emissiveTexture.name);
                }
                
                if(_this.proxy.specularTexture) {
                    _this._mesh.material.specularTexture = yield _this.app.textures.getTexture(_this.proxy.specularTexture.name);
                }
                
                if(_this.proxy.ambientTexture) {
                    _this._mesh.material.ambientTexture = yield _this.app.textures.getTexture(_this.proxy.ambientTexture.name);
                }
                
                // SHOW IF HIDDEN DUE TO INIT
                
                if(initHide) {
                    _this._mesh.isVisible = true;
                }
                
                // SET PARENT
                
                if(_this.proxy.parent) {
                    _this.app.actors.doWhenLoaded(_this.proxy.parent,(actor)=>{
                        _this._mesh.parent = actor.mesh;
                    });
                }
                
                return _this._mesh;
            }
        });
    }
    
    // DESTROY ACTOR AND MESH
    
    destroy() {
        if(this._mesh) {
            this._mesh.dispose();
        }
    }
    
    pick(evt) {
        
        // ONLY PICK IF NOT ALREADY PICKED, OTHERWISE UNPICK
        
        if(this.app._pickedActors.indexOf(this) < 0) {
            console.log("ACTOR PICKED",evt);
            
            this.app._pickedActors.forEach(a=>{
                this.app.hlLayer.removeMesh(a._mesh,BABYLON.Color3.Green());
            });
            this.app._pickedActors = [this];
            this.app.hlLayer.addMesh(this._mesh,BABYLON.Color3.Green());
        } else {
            this.app._pickedActors.forEach(a=>{
                this.app.hlLayer.removeMesh(a._mesh,BABYLON.Color3.Green());
            });
            this.app._pickedActors = [];
        }
        
        // SEND PICK EVENT
            
        this.app.actors.send("pick",Object.assign({target:this},evt));
        
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
        this.hasChanges;
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
        
        if(event) {
            let script = this.app.scripts.getScriptByPath(event.path);
            this.app.scripts.run(script,eventData,this);
            return true;
        }
        return false;
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
        this.hasChanges = true;
    }
    
    get parent() {
        return this._parent;
    }
    
    set parent(parent) {
        this._parent = parent;
        this.mesh.parent = parent._mesh;
        this.hasChanges = true;
    }
    
    // PLACVEMENT PROPS ARE WRAPPED IN WAYPOINT VECTORS TO UPDATE WAYPOINTS
    
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
        this.hasChanges = true;
    }
    
    get specularColor() {
        return this.mesh.material.specularColor;
    }
    
    set specularColor(c) {
        this.mesh.material.specularColor = c;
        this.hasChanges = true;
    }
    
    get emissiveColor() {
        return this.mesh.material.emissiveColor;
    }
    
    set emissiveColor(c) {
        this.mesh.material.emissiveColor = c;
        this.hasChanges = true;
    }
    
    get ambientColor() {
        return this.mesh.material.ambientColor;
    }
    
    set ambientColor(c) {
        this.mesh.material.ambientColor = c;
        this.hasChanges = true;
    }
    
    // TEXTURE
    
    get diffuseTexture() {
        return this.mesh.material.diffuseTexture;
    }
    
    set diffuseTexture(t) {
        this.mesh.material.diffuseTexture = t;
        this.hasChanges = true;
    }
    
    get specularTexture() {
        return this.mesh.material.specularTexture;
    }
    
    set specularTexture(t) {
        this.mesh.material.specularTexture = t;
        this.hasChanges = true;
    }
    
    get ambientTexture() {
        return this.mesh.material.ambientTexture;
    }
    
    set ambientTexture(t) {
        this.mesh.material.ambientTexture = t;
        this.hasChanges = true;
    }
    
    get emissiveTexture() {
        return this.mesh.material.emissiveTexture;
    }
    
    set emissiveTexture(t) {
        this.mesh.material.emissiveTexture = t;
        this.hasChanges = true;
    }
    
};

export default Actor;