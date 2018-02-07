import BABYLON from "babylonjs";
import Actor from "./actor.js";
import HT from "./hextools.js";
import co from "co";

class Grid extends Actor {
    
    constructor(app,def) {
        super(app);
        if(def) {
            if(!def._id) {
                def._id = this._id;
            }
            this.init(def);
        }
        this.hasChanges = true;
    }

    get gridSize() {
        return this.proxy.gridSize;
    }

    set gridSize(_size) {
        this.proxy.gridSize = _size;
        this.hasChanges = true;
    }
    
    get gridType() {
        return this.proxy.gridType;
    }
    
    get gridWidth() {
        return this.proxy.gridWidth;
    }
    
    get gridHeight() {
        return this.proxy.gridHeight;
    }
    
    get visible() {
        return this.mesh.isVisible;
    }
    
    set visible(_visible) {
        this.mesh.isVisible = _visible;
    }

    init(def) {
        this._id = def._id;
        this.type = def.type;
        this.proxy._name = def.name;
        this._state = def.state ? def.state : {};
        this.proxy.parent = def.parent;
        this.proxy.gridType = def.gridType?def.gridType:"square";
        this.proxy.gridSize = def.gridSize;
        this.proxy.gridWidth = def.gridWidth;
        this.proxy.gridHeight = def.gridHeight;
        this.create();
        this.hasChanges = false;

    }

    save() {
        
        let instance = {};
        let _this = this;

        return co(function*() {
            
            instance.type = "grid";
            instance.name = _this.name ? _this.name : "";
            instance.gridType = _this.proxy.gridType;
            instance.gridSize = _this.proxy.gridSize;
            instance.gridWidth = _this.proxy.gridWidth;
            instance.gridHeight = _this.proxy.gridHeight;
            instance.priority = _this.priority;

            // PARENT
            
            if (_this.parent) {
                instance.parent = _this.parent.id;
            }

            // STATE

            instance.state = _this._state;

            return yield _this.app.store.saveActor(_this._id, instance);

        });
    }

    create() {

        if (!this.created) {
            this.makeGrid();
        }

        // SET PARENT

        if (this.proxy.parent) {
            this.app.actors.doWhenLoaded(this.proxy.parent, (actor) => {
                this.parent = actor;
            });
        }
        this._mesh.aid = this.id;

        return this._mesh;

    }

    makeGrid() {
        if (this._mesh) {
            this._mesh.dispose();
            this._mesh = null;
        }

        if (this.gridType != "hex") {
            
            let lines = [];

            let halfWidth = Math.round(this.proxy.gridWidth / 2);
            let halfHeight = Math.round(this.proxy.gridHeight / 2);
            let gridSize = this.proxy.gridSize ? this.proxy.gridSize : 10;
            let xRun = this.proxy.gridWidth;
            let yRun = this.proxy.gridHeight;

            // PAD IN AN EXTRA GRID ROW SO WE COVER ENTIRE MAP IF NEEDED

            let padOffsetX = 0;
            let padOffsetY = 0;
            if ((Math.floor(halfWidth / gridSize) * gridSize) < halfWidth - 1) {
                xRun += gridSize;
                padOffsetX = gridSize;
            }
            if ((Math.floor(halfHeight / gridSize) * gridSize) < halfHeight - 1) {
                yRun += gridSize;
                padOffsetY = gridSize;
            }

            for (let x = 0; x <= xRun; x += gridSize) {
                let points = [];
                points.push(new BABYLON.Vector3(x, 0, 0));
                points.push(new BABYLON.Vector3(x, 0, yRun));
                lines.push(points);
            }

            for (let y = 0; y <= yRun; y += gridSize) {
                let points = [];
                points.push(new BABYLON.Vector3(0, 0, y));
                points.push(new BABYLON.Vector3(xRun, 0, y));
                lines.push(points);
            }

            this._mesh = BABYLON.MeshBuilder.CreateLineSystem("grid", { lines: lines }, this.app.scene);
            this._mesh.isVisible = false;

            // PLACE GRID IN CORRECT SPOT... ACCOUNT FOR MAKING SURE GRID PASSES THROUGH 0,0

            this.gridOffsetX = Math.floor(halfWidth / gridSize) * gridSize + padOffsetX;
            this.gridOffsetY = Math.floor(halfHeight / gridSize) * gridSize + padOffsetY;
            this._mesh.position.x -= this.gridOffsetX;
            this._mesh.position.z -= this.gridOffsetY;
            this._mesh.position.x += this.proxy.position.x;
            this._mesh.position.z += this.proxy.position.z;

            // SET Y HEIGHT OF GRID

            let gridHeight = 2; //sceneState.cursor ? sceneState.cursor.position.y + 1 : 1;

            this._mesh.position.y = gridHeight;
            this._mesh.alpha = 1;
            this._mesh.color = new BABYLON.Color3(0.0, 1.0, 1.0);
            
        }
        else {
            this.makeHexGrid();

            let lines = [];

            this.hexGrid.Hexes.forEach((hex) => {
                let points = [];
                hex.Points.forEach((p) => {
                    points.push(new BABYLON.Vector3(p.X, 0, p.Y));
                });
                points.push(new BABYLON.Vector3(hex.Points[0].X, 0, hex.Points[0].Y));
                lines.push(points);
            });

            let halfWidth = Math.round(this.gridWidth / 2);
            let halfHeight = Math.round(this.gridHeight / 2);

            this._mesh = BABYLON.MeshBuilder.CreateLineSystem("ls", { lines: lines }, this.app.scene);
            this._mesh.isVisible = false;
            this._mesh.position.x -= halfWidth;
            this._mesh.position.z -= halfHeight;
            let gridHeight = 1; //sceneState.cursor ? sceneState.cursor.position.y + 1 : 1;

            this._mesh.position.y = gridHeight;
            this._mesh.alpha = 0.5;
            this._mesh.color = new BABYLON.Color3(0.0, 1.0, 1.0);
        }
        
    }
    
    placementOffset() {
        return new BABYLON.Vector3(-this.gridOffsetX,2,-this.gridOffsetY);
    }

    makeHexGrid() {
        let gridSize = this.proxy.gridSize ? this.proxy.gridSize : 10;
        HT.setHexGridWithSideLengthZAndRatio(gridSize, 1.1547005383792515290182975610039); // USE r = 1.1547005383792515290182975610039 or r= 1.333
        this.hexGrid = new HT.Grid(this.proxy.gridWidth, this.proxy.gridHeight);
    }
    
    gridPosition(v3) {
        
    	let gridSize = this.gridSize?this.gridSize:10;
    	let offsetX = this.gridOffsetX;
    	let offsetY = this.gridOffsetY;
    	
    	// CREATE TARGET POINT BASED ON PARENT
    	
    	let target;
    	if(this.parent) {
    	    target = new BABYLON.Vector3(v3.x-this.parent.position.x,v3.y-this.parent.position.y,v3.z-this.parent.position.z);
    	} else {
    	    target = new BABYLON.Vector3(v3.x,v3.y,v3.z);
    	}
        
        let adjusted;
    	if(this.gridType != "hex") {
    		adjusted = new BABYLON.Vector3(
    			Math.floor((target.x - offsetX - this.position.x)/gridSize)*gridSize + Math.round(gridSize/2) + offsetX + this.position.x,
    			target.y,
    			Math.floor((target.z - offsetY - this.position.z)/gridSize)*gridSize + Math.round(gridSize/2) + offsetY + this.position.z);
    	} else {
    		let halfWidth = Math.round(this.gridWidth/2);
    		let halfHeight = Math.round(this.gridHeight/2);
    
    		let p = new HT.Point(target.x + halfWidth,target.z + halfHeight);
    		if(!this.hexGrid) {
    			this.makeHexGrid();
    		}
    		let hex = this.hexGrid.GetNearestHex(p);
    
    		let gp = new BABYLON.Vector3(
    			hex.MidPoint.X - halfWidth + offsetX,
    			target.y,
    			hex.MidPoint.Y - halfHeight + offsetY);
    
    		adjusted = gp;
    	}
    
        return adjusted;
    }

}

export default Grid;