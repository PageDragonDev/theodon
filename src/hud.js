import BABYLON from "babylonjs";
import * as GUI from 'babylonjs-gui';
import co from "co";

const dlgActorWidth = 300;
const dlgActorHeight = 300;

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

        // HIDE HUD IN CASE IT"S SHOWING
        
        this.hideHUD();
        
        // GUI PLANE
        
        this.hudPlane = BABYLON.Mesh.CreatePlane("hudPlane", 2);
        this.hudPlane.parent = this.app.camera;
        this.hudPlane.position.z = 1.2;
        this.hudPlane.position.x = 0;
    
        // GUI TEXTURE
        
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.hudPlane);
    
        // ADD NEW SCRIPT
        
        var newScript = BABYLON.GUI.Button.CreateSimpleButton("btnNewScript", "New Script");
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
        
        // ADD PROPS
        
        if(this.app.pickedActor) {
            var props = BABYLON.GUI.Button.CreateSimpleButton("btnProps", "Properties");
            props.width = "150px";
            props.height = "40px";
            props.color = "white";
            props.cornerRadius = 20;
            props.background = "green";
            props.fontSize = 20;
            props.thickness = 1;
            props.top = "-15.6%";
            props.onPointerUpObservable.add(()=>{this.showActorHUD(this.app.pickedActor)});
            
            this.advancedTexture.addControl(props);
        }
        
        // ADD DELETE
        
        if(this.app.pickedActor) {
            var remove = BABYLON.GUI.Button.CreateSimpleButton("btnremove", "Remove");
            remove.width = "150px";
            remove.height = "40px";
            remove.color = "white";
            remove.cornerRadius = 20;
            remove.background = "red";
            remove.fontSize = 20;
            remove.thickness = 1;
            remove.top = "-15.6%";
            remove.left = "170px";
            remove.onPointerUpObservable.add(()=>{this.app.pickedActor.remove()});
            
            this.advancedTexture.addControl(remove);
        }
        
        this.showWorldScriptBranch();
        
    }
    
    // CREATE A NEW WORLD SCRIPT
    
    newWorldScript() {

        this.app.editor.open("","",(path,script)=>{
            if(!path || path.trim() == "") {
                alert("No script path specified.");
                return;
            }
            this.app.store.saveWorldScript(path,script);
            this.app.editor.close();
            this.showHUD();
        });
    }

    // HIDE HUD

    hideHUD(){

        if(this.hudPlane) {    
            this.hudPlane.dispose();
            this.hudPlane = null;
        }
        this.showingBranch = null;
        this.app.disablePicking = false;
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
                    scriptNode = {name:part,parent:current};
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
        
        if(this.showingBranch) {
            this.showHUD();
        }
    }
    
    // SHOW A BRANCH OF WS TREE
    
    showWorldScriptBranch(node,offset) {
        this.showingBranch = {node:node,offset:offset};
        
        if(!node) {
            node = this.wsRoot;
        }
        
        if(!offset) {
            offset = 0;
        }
        
        if(!node.nodes) {
            return;
        }
        
        if(node.parent && node.parent.controls) {
            node.parent.controls.forEach(control=>{
                control.dispose();
            });
        }
        
        let top = -100;
        let _this = this;
        let parentControls = [];
        if(node.parent) {
            node.parent.controls = parentControls;
        }
        
        node.nodes.forEach(node=>{
            
            // CREATE BUTTON
            
            let btnScript = BABYLON.GUI.Button.CreateSimpleButton("btn " + node.name, node.name);
            parentControls.push(btnScript);
            btnScript.width = "150px";
            btnScript.height = "30px";
            btnScript.color = "white";
            btnScript.cornerRadius = 20;
            btnScript.background = "grey";
            btnScript.fontSize = 20;
            btnScript.thickness = 1;
            btnScript.top = top;
            btnScript.left = offset;
            
            // DIFFERENT ACTIONS BASED ON WHETHER BRANCH OR LEAF
            
            if(node.nodes) {
                
                // OPEN BRANCH
                
                btnScript.onPointerUpObservable.add(()=>{
                    _this.showWorldScriptBranch(node,offset + 180);
                });
            } else {
                btnScript.background = "green";
                
                // RUN SCRIPT
                
                btnScript.onPointerUpObservable.add(()=>{
                    if(node.script && node.script.fn) {
                        _this.app.scripts.run(node.script);
                    }
                });
                
                // ADD EDIT BUTTON
                
                let btnEdit = BABYLON.GUI.Button.CreateSimpleButton("btn edit " + node.name, "Edit");
                parentControls.push(btnEdit);
                btnEdit.width = "40px";
                btnEdit.height = "12px";
                btnEdit.color = "white";
                btnEdit.cornerRadius = 20;
                btnEdit.background = "grey";
                btnEdit.fontSize = 10;
                btnEdit.thickness = 1;
                btnEdit.top = top - 9;
                btnEdit.left = offset + 100;
                btnEdit.onPointerUpObservable.add(()=>{
                    // OPEN EDITOR
                    
                    _this.app.editor.open(node.script.path,node.script.code,(path,code)=>{
                        // SAVE CODE
                        
                        co(function *(){
                            let res = yield _this.app.store.saveWorldScript(path,code,node.script._id);
                            if(res) {
                                _this.app.editor.close();
                            } else {
                                alert("There was a problem saving the script");
                            }
                        });
                        
                        
                    });
                });
                this.advancedTexture.addControl(btnEdit);
                
                // ADD REMOVE BUTTON
            
                let btnRemove = BABYLON.GUI.Button.CreateSimpleButton("btn remove " + node.name, "delete");
                parentControls.push(btnRemove);
                btnRemove.width = "40px";
                btnRemove.height = "12px";
                btnRemove.color = "white";
                btnRemove.cornerRadius = 20;
                btnRemove.background = "red";
                btnRemove.fontSize = 10;
                btnRemove.thickness = 1;
                btnRemove.top = top + 7;
                btnRemove.left = offset + 100;
                btnRemove.onPointerUpObservable.add(()=>{
                    _this.app.store.removeWorldScript(node.script);
                });
                this.advancedTexture.addControl(btnRemove);
            }
            
            this.advancedTexture.addControl(btnScript);
            
            top += 35;
        });
        
    }
    
    showActorHUD(actor,evt) {
        
        this.hideHUD();
    
        // GUI PLANE
        
        this.hudPlane = BABYLON.Mesh.CreatePlane("hudPlane", 2);
        this.hudPlane.parent = this.app.camera;
        this.hudPlane.position.z = 1.2;
        this.hudPlane.position.x = 0;
    
        // GUI TEXTURE
        
        this.hudTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.hudPlane);
        
        var rectFrame = new BABYLON.GUI.Rectangle();
        rectFrame.width = dlgActorWidth + "px";
        rectFrame.height = dlgActorHeight + "px";
        rectFrame.color = "white";
        rectFrame.thickness = 2;
        rectFrame.background = "grey";
        rectFrame.alpha = 0.7;
        this.hudTexture.addControl(rectFrame);
    
        // NAME
        
        new Text(5,5,50,15,"Name",this.hudTexture);
        new Input(55,5,240,18,actor.name,(value)=>{actor.name=value;actor.save()},this.hudTexture);
        
        // X, Y, Z
        
        new Text(5,25,50,15,"X",this.hudTexture);
        new Input(55,25,60,18,actor.position.x,(x)=>{actor.position.x = x},this.hudTexture);
        
        new Text(5,45,50,15,"Y",this.hudTexture);
        new Input(55,45,60,18,actor.position.y,(y)=>{actor.position.y = y},this.hudTexture);
        
        new Text(5,65,50,15,"Z",this.hudTexture);
        new Input(55,65,60,18,actor.position.z,(z)=>{actor.position.z = z},this.hudTexture);
        
        // rX, rY, rZ
        
        new Text(5,85,50,15,"rX",this.hudTexture);
        new Input(55,85,60,18,actor.rotation.x,(x)=>{actor.rotation.x = x},this.hudTexture);
        
        new Text(5,105,50,15,"rY",this.hudTexture);
        new Input(55,105,60,18,actor.rotation.y,(y)=>{actor.rotation.y = y},this.hudTexture);
        
        new Text(5,125,50,15,"rZ",this.hudTexture);
        new Input(55,125,60,18,actor.rotation.z,(z)=>{actor.rotation.z = z},this.hudTexture);
        
        // sX, sY, sZ
        
        new Text(5,145,50,15,"sX",this.hudTexture);
        new Input(55,145,60,18,actor.scaling.x,(x)=>{actor.scaling.x = x},this.hudTexture);
        
        new Text(5,165,50,15,"sY",this.hudTexture);
        new Input(55,165,60,18,actor.scaling.y,(y)=>{actor.scaling.y = y},this.hudTexture);
        
        new Text(5,185,50,15,"sZ",this.hudTexture);
        new Input(55,185,60,18,actor.scaling.z,(z)=>{actor.scaling.z = z},this.hudTexture);
        
    }
    
    showEventHUD(actor, hud, evt) {
        
        this.hideHUD();
        this.app.disablePicking = true;
    
        // GUI PLANE
        
        this.hudPlane = BABYLON.Mesh.CreatePlane("hudPlane", 2);
        this.hudPlane.parent = this.app.camera;
        this.hudPlane.position.z = 1.2;
        this.hudPlane.position.x = 0;
    
        // GUI TEXTURE
        
        this.hudTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.hudPlane);
        
        hud.forEach((control,idx)=>{
            new Button(0,idx*35,150,30,control.label,()=>{
                if(control.script) {
                    let script = this.app.scripts.getScriptByPath(control.script);
                    evt.target = actor;
                    if(control.data) {
                        evt = Object.assign(evt,control.data);
                    }
                    this.app.scripts.run(script,evt);
                }
            },this.hudTexture);
        });
        
    }
    
};

class Control {
    pxX(x,w=0) {return (x - dlgActorWidth/2 + w/2) + 'px'}
    pxY(y,w=0) {return (y - dlgActorHeight/2 + w/2) + 'px'}
    pxWidth(w) {return w + "px"}
    pxHeight(h) {return h + "px"}
    
    dispose() {
        this.control.dispose();
    }
}

class Text extends Control {
    constructor(x,y,width,height,value,container) {
        super();
        this.control = new BABYLON.GUI.TextBlock();
        this.control.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.control.text = value;
        this.control.color = "white";
        this.control.fontSize = 16;
        this.control.width = this.pxWidth(width);
        this.control.height = this.pxHeight(height);
        this.control.left = this.pxX(x,width);
        this.control.top = this.pxY(y,height);
        container.addControl(this.control);
    }
    
}

class Input extends Control {
    constructor(x,y,width,height,value,fn,container) {
        super();
        this.control = new BABYLON.GUI.InputText();
        this.control.text = value.toString();
        this.control.color = "white";
        this.control.background = "black";
        this.control.width = this.pxWidth(width);
        this.control.height = this.pxHeight(height);
        this.control.maxWidth = this.pxWidth(width);
        this.control.left = this.pxX(x,width);
        this.control.top = this.pxY(y,height);
        this.control.fontSize = 14;
        
        this.control.onBlurObservable.add((evt)=>{
            fn(evt.text);
        });
        container.addControl(this.control); 
    }
    
}

class Button extends Control {
    constructor(x,y,width,height,value,fn,container) {
        super();
        this.control = BABYLON.GUI.Button.CreateSimpleButton(x + y + "button", value);

        this.control.width = this.pxWidth(width);
        this.control.height = this.pxHeight(height);
        this.control.color = "white";
        this.control.cornerRadius = 20;
        this.control.background = "green";
        this.control.fontSize = 20;
        this.control.thickness = 1;
        this.control.top = this.pxY(y,height);
        this.control.left = this.pxX(x,width);
        this.control.onPointerUpObservable.add((evt)=>{
            fn(evt.text);
        });
        container.addControl(this.control); 
    }
    
}



export default TheodonHud;