import uuidv1 from "uuid/v1";
import Store from "./storage.js";
import co from "co";
import BABYLON from "babylonjs";
import TheodonHud from "./hud.js";
import Editor from "./editor.js";
import ScriptManager from "./scripts.js";

let TheodonApp = class {
    
    constructor (instanceId,renderTarget) {
        this.instanceId = instanceId;
        this.renderTarget = renderTarget;
        this.store = null;
    }
    
    // INIT APP BY SETTING UP STORAGE
    
    init() {
        let app = this;
        
        // SETUP STORE
        
        let store = new Store(app.renderTarget, app.instanceId);
        this.store = store;
        
        // SYNCRONOUSLY  INITALIZE APP
        
        co(function *(){
            yield store.init();
            app.worldProfile = store.worldProfile;
            app.initView();
        });
    }
    
    // INIT VIEW
    
    initView() {
        
        // INIT ENGINE
        
        this.engine = new BABYLON.Engine(this.renderTarget, true);
        
        // create a basic BJS Scene object
        this.scene = new BABYLON.Scene(this.engine);
        
        // create a FreeCamera, and set its position to (x:0, y:5, z:-10)
        this.camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 5,-10), this.scene);
    
        // target the camera to scene origin
        this.camera.setTarget(BABYLON.Vector3.Zero());
    
        // attach the camera to the canvas
        this.camera.attachControl(this.renderTarget, false);
    
        // create a basic light, aiming 0,1,0 - meaning, to the sky
        this.light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0,1,0), this.scene);
    
        // create a built-in "sphere" shape; 
        this.sphere = BABYLON.MeshBuilder.CreateSphere('sphere', {segments:16, diameter:2}, this.scene);
    
        // move the sphere upward 1/2 of its height
        this.sphere.position.y = 1;
        
        // Manage Scripts
        
        this.scripts = new ScriptManager(this);
        
        // Init Editor
        
        this.editor = new Editor(this);
        
        // Init HUD
        
        this.hud = new TheodonHud(this);
        
        // Render Loop
    
        let scene = this.scene;
        this.engine.runRenderLoop(function() {
            scene.render();
        });
        
        // Run World onLoad
        
        let _func = Function;
        this.fnOnLoad = new _func("name","user",this.worldProfile.script.onLoad);
        this.fnOnLoad(this.worldProfile.name,this.store.userProfile);
        
    }
};

// STORE ALL OUR APPS

let theoApps = {};

// GATHERS PROPERTIES FROM PASSED IN ELEMENT AND SETS UP PRE-3D ENV

exports.initRenderTarget = (target) => {
    console.log("Theodon Initializing",target.dataset);
    
    // CREATE THEODON APP

    let instanceId = uuidv1();    
    let theoApp = new TheodonApp(instanceId, target);
    theoApps[instanceId] = theoApp;
    theoApp.init();
};