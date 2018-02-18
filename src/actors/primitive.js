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

        instance.type = "primitive";
        instance.primitive = this.primitive;
        instance.name = this.name?this.name:"";
        instance.priority = this.priority;
        instance.visible = this.mesh.isVisible;

        // MATERIAL
        
        if(this.diffuseColor) {
            instance.diffuseColor = this.colorToObj(this.diffuseColor);
        }
        if(this.specularColor) {
            instance.specularColor = this.colorToObj(this.specularColor);
        }
        if(this.emissiveColor) {
            instance.emissiveColor = this.colorToObj(this.emissiveColor);
        }
        if(this.ambientColor) {
            instance.ambientColor = this.colorToObj(this.ambientColor);
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
        
        if(this.diffuseTexture) {
            instance.diffuseTexture = createTexture(this.diffuseTexture);
        }
        
        if(this.specularTexture) {
            instance.specularTexture = createTexture(this.specularTexture);
        }
        
        if(this.emissiveTexture) {
            instance.emissiveTexture = createTexture(this.emissiveTexture);
        }
        
        if(this.ambientTexture) {
            instance.ambientTexture = createTexture(this.ambientTexture);
        }
        
        // COLLISION
        
        instance.checkCollisions = this.checkCollisions?this.checkCollisions:false;
        
        // PARENT
        
        if(this.parent) {
            instance.parent = this.parent.id;
        }
        
        // STATE
        
        instance.state = this._state;
        
        this.app.store.saveActor(this._id,instance);

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
                    if(this._mesh && actor._mesh) {
                        this._mesh.parent = actor._mesh;
                    } else {
                        console.warn("Unabled set parent mesh of",this.name,". Mesh has not been built.");
                    }
                });
            }
                   
            return _this._mesh;

        });
    }
}

export default Primitive;