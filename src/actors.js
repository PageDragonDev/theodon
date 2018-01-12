import BABYLON from "babylonjs";
import uuidv1 from "uuid/v1";
import co from "co";

let Actors = class {
    constructor(app) {
        this.app = app;
        this.actors = [];
        this.actorsById = {};
        this.waitOn = {};
        this.done = this.done.bind(this);
        
        let _this = this;
        
        // WATCH ACTORS
        
        _this.app.store.watchActors((actorDef)=>{
            let actor = _this.addDef(actorDef);
            let waitOn = _this.waitOn[actorDef._id];
            if(waitOn) {
                actor.updatePlacement(waitOn);
                delete _this.waitOn[actorDef._id];
            }
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
    
};
exports.Actors = Actors;

// ACTOR

let Actor = class {
    
    constructor (app, def) {

        this.app = app;
        this._id = uuidv1();
        this.created = false;
        this.picked = this.picked.bind(this);
        this.proxy = {name:"",material:{}};
        
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
        console.log("INIT")
        this._id = def._id;
        this.primitive = def.primitive;
        this.type = def.type;
        this.proxy._name = def.name;
        this.proxy.diffuseColor = def.diffuseColor;
        this.proxy.emissiveColor = def.emissiveColor;
        this.proxy.specularColor = def.specularColor;
        this.proxy.ambientColor = def.ambientColor;
        this.proxy.diffuseTexture = def.diffuseTexture;
        this.create();
        this.hasChanges = false;
        this.hasPlacementChanges = false;
        
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
        this.create();
    }
    
    // TRANSFORM ACTOR TO NEW POSITION, ORIENTATION, AND SCALE
    
    updatePlacement(def) {
        if(def.position) {
            this._position = new BABYLON.Vector3(def.position.x,def.position.y,def.position.z);
            if(this._mesh) {
                this._mesh.position = this._position;
            }
        }
        
        if(def.rotation) {
            this._rotation = new BABYLON.Vector3(def.rotation.x,def.rotation.y,def.rotation.z);
            if(this._mesh) {
                this._mesh.rotation = this._rotation;
            }
        }
        
        if(def.scaling) {
            this._scaling = new BABYLON.Vector3(def.scaling.x,def.scaling.y,def.scaling.z);
            if(this._mesh) {
                this._mesh.scaling = this._scaling;
            }
        }
    }

    
    setPrimative(args) {
        this.type = "primitive";
        this.primitive = [];
        for(let i = 0; i < args.length; i++) {
            this.primitive.push(args[i]);
        }
        this.hasChanges = true;
    }
    
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
                
                return yield _this.app.store.saveActor(_this._id,instance);
                
            }
        });
    }
    
    savePlacement() {
        let placement = {};
        let _this = this;
        
        return co(function *(){
            if(_this.type == "primitive") {
                placement.position = {x:_this.position.x,y:_this.position.y,z:_this.position.z};
                placement.rotation = {x:_this.rotation.x,y:_this.rotation.y,z:_this.rotation.z};
                placement.scaling = {x:_this.scaling.x,y:_this.scaling.y,z:_this.scaling.z};
                return yield _this.app.store.savePlacement(_this._id,placement);
                
            }
        });
    }
    
    done() {
        let _this = this;
        return co(function *(){
            if(_this.hasChanges) {
                // _this.app.actors.add(_this);
                yield _this.save();
                _this.hasChanges = false;
            }
        
            if(_this.hasPlacementChanges) {
                yield _this.savePlacement();
                _this.hasPlacementChanges = false;
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
                    _this.created = true;
                    _this._mesh.isVisible = false; // TEMP HIDE
                    initHide = true; // SO WE CAN UNHIDE
                    
                    if(_this.position) {
                        _this._mesh.position = _this.position;
                    }
                    if(_this.rotation) {
                        _this._mesh.rotation = _this.rotation;
                    }
                    if(_this.scaling) {
                        _this._mesh.scaling = _this.scaling;
                    }
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
                
                // SETUP FOR PICKING
                
                _this._mesh.isPickable = true;
                _this._mesh.actionManager = new BABYLON.ActionManager(_this.app.scene);
                _this._mesh.actionManager.registerAction(
                    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, _this.picked)
                );
                
                if(initHide) {
                    _this._mesh.isVisible = true;
                }
                
                return _this._mesh;
            }
        });
    }
    
    picked(evt) {
        console.log("PICKED",evt)
        
        this.app._pickedActors = [this];
        //this.app.hud.showActorHUD(this);
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
    
    set position(p) {
  
        this.mesh.position = p;
        this.hasPlacementChanges = true;
    }
    
    get position() {
        return this.mesh.position;
    }
    
    set rotation(r) {

        this.mesh.rotation = r;
        this.hasPlacementChanges = true;
    }
    
    get rotation() {
        return this.mesh.rotation;
    }
    
    set scaling(s) {

        this.mesh.scaling = s;
        this.hasPlacementChanges = true;
    }
    
    get scaling() {
        return this.mesh.scaling;
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