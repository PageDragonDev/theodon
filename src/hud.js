import BABYLON from "babylonjs";
import * as GUI from 'babylonjs-gui';

let TheodonHud = class {
    
    constructor (app) {
        this.app = app;
        
        // CREATE SCENE ACTION MANAGER
        
        if(!app.scene.actionManager) {
            app.scene.actionManager = new BABYLON.ActionManager(app.scene);
        }
        
        // BIND METHODS
        
        this.newWorldScript = this.newWorldScript.bind(this);
        this.showWorldScriptBranch = this.showWorldScriptBranch.bind(this);
        
        // LISTEN FOR ACTIVATION KEY
        
        app.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction({ trigger: BABYLON.ActionManager.OnKeyDownTrigger, parameter: " " },
            () => {
                if(!this.hudPlane) {
                    this.showHUD(app);
                } else {
                    this.hideHUD(app);
                }
            }
        ));
    }
    
    // SHOW HUD
    
    showHUD() {
    
        // GUI PLANE
        
        this.hudPlane = BABYLON.Mesh.CreatePlane("hudPlane", 2);
        this.hudPlane.parent = this.app.camera;
        this.hudPlane.position.z = 1.2;
        this.hudPlane.position.x = 0;
    
        // GUI TEXTURE
        
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.hudPlane);
    
        // ADD NEW SCRIPT
        
        var newScript = BABYLON.GUI.Button.CreateSimpleButton("btnProps", "New Script");
        newScript.width = "150px";
        newScript.height = "40px";
        newScript.color = "white";
        newScript.cornerRadius = 20;
        newScript.background = "green";
        newScript.fontSize = 20;
        newScript.thickness = 1;
        newScript.top = "-20%";
        newScript.onPointerUpObservable.add(this.newWorldScript);
        
        this.advancedTexture.addControl(newScript);
        
        this.showWorldScriptBranch();
        
    }
    
    // CREATE A NEW WORLD SCRIPT
    
    newWorldScript() {
        let _this = this;
        this.app.editor.open("","",(path,script)=>{
            if(!path || path.trim() == "") {
                alert("No script path specified.");
                return;
            }
            _this.app.store.saveWorldScript(path,script);
        });
    }

    // HIDE HUD

    hideHUD(){

        if(this.hudPlane) {    
            this.hudPlane.dispose();
            this.hudPlane = null;
        }
    }
    
    // UPDATE WORLD SCRIPTS
    
    updateWorldScripts(scripts) {

        // CREATE ROOT
        
        this.wsRoot = {nodes:[]};
        
        // PROCESS SCRIPT
        
        scripts.forEach((script)=>{
            
            // PLACE IN TREE
            
            let pathParts = script.path.split('/');
            let current = this.wsRoot;
            
            pathParts.forEach((part,idx)=>{

                let scriptNode = current.nodes.find(sn=>sn.name == part);
                if(!scriptNode) {
                    scriptNode = {name:part};
                    current.nodes.push(scriptNode);
                
                    if(idx < pathParts.length - 1) {
                        if(!scriptNode.nodes) {
                            scriptNode.nodes = [];
                        }
                    } else {
                        scriptNode.script = script;
                    }
                }
                
                
                current = scriptNode;
            });
            
        });
        
        console.log(this.wsRoot)
    }
    
    // SHOW A BRANCH OF WS TREE
    
    showWorldScriptBranch(node,offset) {
        
        if(!node) {
            node = this.wsRoot;
        }
        
        if(!offset) {
            offset = 0;
        }
        
        if(!node.nodes) {
            return;
        }
        
        let top = -100;
        let _this = this;
        
        node.nodes.forEach(node=>{
            let btnScript = BABYLON.GUI.Button.CreateSimpleButton("btn " + node.name, node.name);
            btnScript.width = "150px";
            btnScript.height = "40px";
            btnScript.color = "white";
            btnScript.cornerRadius = 20;
            btnScript.background = "grey";
            btnScript.fontSize = 20;
            btnScript.thickness = 1;
            btnScript.top = top;
            btnScript.left = offset;
            if(node.nodes) {
                btnScript.onPointerUpObservable.add(()=>{
                    _this.showWorldScriptBranch(node,offset + 200);
                });
            } else {
                btnScript.background = "green";
                btnScript.onPointerUpObservable.add(()=>{
                    if(node.script && node.script.fn) {
                        node.script.fn(this.app.scene);
                    }
                });
                
            }
            
            this.advancedTexture.addControl(btnScript);
            
            top += 50;
        });
        
    }
    
};

export default TheodonHud;