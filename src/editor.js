import ace from "brace";
import 'brace/mode/javascript';
import 'brace/theme/monokai';

let Editor = class {
    
    constructor (app) {
        
        this.app = app;
        
        this.close = this.close.bind(this);
        this.save = this.save.bind(this);
        this.pathChanged = this.pathChanged.bind(this);
    }
    
    open(path,script,onSave) {
        
        if(this.wrapper) {
            this.wrapper.remove();
        }
        this.onSave = onSave?onSave:null;
        this.path = path;
        
        // CREATE WRAPPER
        
        this.wrapper = document.createElement("div");
        this.wrapper.setAttribute("id","theodonEditor");
        
        // CREATE MENU
        
        this.menu = document.createElement("div");
        this.menu.setAttribute("id","theodonEditorMenu");
        this.menu.setAttribute("style","flex-basis:30px;display:flex");
        this.wrapper.appendChild(this.menu);
        
        // SAVE BUTTON
        
        if(onSave) {
            this.btnSave = document.createElement("button");
            this.btnSave.appendChild(document.createTextNode("Save"));
            this.btnSave.onclick = this.save;
            this.menu.appendChild(this.btnSave);
        }
        
        // CANCEL BUTTON
        
        this.btnCancel = document.createElement("button");
        this.btnCancel.appendChild(document.createTextNode("Cancel"));
        this.btnCancel.onclick = this.close;
        this.menu.appendChild(this.btnCancel);
        
        // PATH
        
        this.inputPath = document.createElement("input");
        this.inputPath.onkeydown = this.pathChanged;
        this.inputPath.onblur = this.pathChanged;
        this.inputPath.setAttribute("style","margin-left:20px");
        this.inputPath.value = path;
        this.menu.appendChild(this.inputPath);
        
        // CREATE EDITOR CONTAINER
        
        this.container = document.createElement("div");
        this.container.setAttribute("id","theodonEditorContainer");
        this.container.setAttribute("style","flex-grow:1");
        this.wrapper.appendChild(this.container);
        
        // APPEND TO BODY
        
        document.body.appendChild((this.wrapper));
        
        // GET RENDER TARGET POSITION AND SIZE
        
        let margin = 50;
        let rect = this.app.renderTarget.getBoundingClientRect();
        let width = (rect.right - rect.left) - margin * 2;
        let height = (rect.bottom - rect.top) - margin * 2;
        
        // SET WRAPPER POSITION AND SIZE
        
        this.wrapper.setAttribute("style","background-color:#ababab;border:solid 1px #ffffff;display:flex;flex-direction:column;position:absolute;left:" + rect.left + margin + "px;top:" + rect.top + margin +  "px;width:" + width + "px;height:" + height + "px");
        
        this.editor = ace.edit(this.container);
        this.editor.getSession().setMode('ace/mode/javascript');
        this.editor.setTheme('ace/theme/monokai');
        if(script) {
            this.editor.setValue(script); 
        }
    }
    
    save() {
        if(this.onSave) {
            this.onSave(this.path,this.editor.getValue());
        }
    }
    
    close() {
        this.wrapper.remove();
        this.wrapper = null;
    }
    
    pathChanged(e) {
        this.path = e.currentTarget.value;
    }
    
};

export default Editor;