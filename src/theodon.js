import uuidv1 from "uuid/v1";
import Store from "./storage.js";
import co from "co";
import BABYLON from "babylonjs";
import TheodonHud from "./hud.js";
import Editor from "./editor.js";
import ScriptManager from "./scripts.js";
import {Actors} from "./actors.js";
import Textures from "./textures.js";
import TWEEN from "tween.js";

let TheodonApp = class {
    
    constructor (instanceId,renderTarget) {
        this.instanceId = instanceId;
        this.renderTarget = renderTarget;
        this.store = null;
        this._pickedActors = [];
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
        this.scene.collisionsEnabled = true;
        
        // create a FreeCamera, and set its position to (x:0, y:5, z:-10)
        this.camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 5,-10), this.scene);
        this.camera.ellipsoid = new BABYLON.Vector3(10, 10, 10);
        this.camera.speed = 4;
        this.camera.keysUp = [38,87]; // W and UP
        this.camera.keysDown = [40,83]; // A and UP
        this.camera.keysLeft = [37,65]; // S and UP
        this.camera.keysRight = [39,68]; // D and UP
        this.camera.checkCollisions = true;
    
        // target the camera to scene origin
        this.camera.setTarget(BABYLON.Vector3.Zero());
    
        // attach the camera to the canvas
        this.camera.attachControl(this.renderTarget, false);
    
        // create a basic light, aiming 0,1,0 - meaning, to the sky
        this.light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0,1,0), this.scene);
        
        // Manage Scripts
        
        this.scripts = new ScriptManager(this);
        
        // Init Editor
        
        this.editor = new Editor(this);
        
        // Init HUD
        
        this.hud = new TheodonHud(this);
        
        // Actors
        
        this.actors = new Actors(this);
        
        // Render Loop
    
        let scene = this.scene;
        this.engine.runRenderLoop(function() {
            scene.render();
            TWEEN.update();
        });
        
        // Textures
        
        this.textures = new Textures(this);
        
        // Highlight Layer
        
        this.hlLayer = new BABYLON.HighlightLayer("hl1", scene);
        
        // Run World onLoad
        
        this.scripts.runWhenLoaded("World/On Load");
        
        // Setup Picking
        
        this.renderTarget.addEventListener("click", (e) => {
           let pickResult = scene.pick(scene.pointerX, scene.pointerY);
           if(pickResult.pickedMesh) {
                let actor = this.actors.actorsById[pickResult.pickedMesh.aid];
                if(actor) {
                    pickResult.event = e;
                    actor.pick(pickResult);
                }
           }
        });
        
        
    }
    
    get pickedActor() {
        if(this._pickedActors.length) {
            return this._pickedActors[0];
        }
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