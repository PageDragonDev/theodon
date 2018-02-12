import BABYLON from "babylonjs";
import Actor from "./actor.js";
import co from "co";


class Primitive extends Actor {
    
    constructor (app, def) {
        super(app, def);
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
    
    init(def) {
        this.primitive = def.primitive;
        super.init(def);
    }
    
    save() {
        let instance = {};
        let _this = this;
        
        
        return co(function *(){

            instance.type = "primitive";
            instance.primitive = _this.primitive;
            instance.name = _this.name?_this.name:"";
            instance.priority = _this.priority;
            instance.visible = _this.mesh.isVisible;

            // MATERIAL
            
            if(_this.diffuseColor) {
                instance.diffuseColor = _this.colorToObj(_this.diffuseColor);
            }
            if(_this.specularColor) {
                instance.specularColor = _this.colorToObj(_this.specularColor);
            }
            if(_this.emissiveColor) {
                instance.emissiveColor = _this.colorToObj(_this.emissiveColor);
            }
            if(_this.ambientColor) {
                instance.ambientColor = _this.colorToObj(_this.ambientColor);
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
            
            // COLLISION
            
            instance.checkCollisions = _this.checkCollisions?_this.checkCollisions:false;
            
            // PARENT
            
            if(_this.parent) {
                instance.parent = _this.parent.id;
            }
            
            // STATE
            
            instance.state = _this._state;
            
            return yield _this.app.store.saveActor(_this._id,instance);

        });
    }
    
    // CREATE MESH FROM PRIMITIVE OR FILE
    
    create() {
        let _this = this;
        return co(function *(){
            
            let initHide = false;
            
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
                args.push(_this.app.scene);
                
                _this._mesh = fn.apply(null,args);
                _this._mesh.aid = _this.id;
                _this.created = true;
                _this._mesh.isVisible = false; // TEMP HIDE
                initHide = true; // SO WE CAN UNHIDE
                
                if(_this._name) {
                    _this._mesh.name = _this._name;
                }
                
                _this.trigger("created");
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
            
            // COLLISION
            
            _this._mesh.checkCollisions = _this.proxy.checkCollisions;
            
            // SHOW IF HIDDEN DUE TO DEF OR INIT
            
            _this._mesh.isVisible = _this.proxy.visible;
            if(initHide) {
                _this._mesh.isVisible = true;
            }
            
            // SET PARENT
            
            if(_this.proxy.parent) {
                _this.app.actors.doWhenLoaded(_this.proxy.parent,(actor)=>{
                    _this.parent = actor;
                });
            }
                   
            return _this._mesh;

        });
    }
}

export default Primitive;