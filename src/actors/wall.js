import BABYLON from "babylonjs";
import Path from "./path.js";
import HT from "./hextools.js";
import co from "co";

class Wall extends Path {
    
    constructor(app,def) {
        super(app);
        if(def) {
            if(!def._id) {
                def._id = this._id;
            }
            def.name = "wall";
            this.init(def);
        }
        this.changesPending();
    }

    get width() {
        return this.proxy.width?this.proxy.width:2;
    }

    set width(_width) {
        this.proxy.width = _width;
        this.changesPending();
    }
    
    get halfWidth() {
        return this.width/2;
    }
    
    get height() {
        return this.proxy.height?this.proxy.height:10;
    }

    set height(_height) {
        this.proxy.height = _height;
        this.changesPending();
    }
    
    get closed() {
        return this.firstNode.equals(this.lastNode);
    }
    
    set primaryTexture(_texture) {
        this.proxy.primaryTexture = _texture;
        this.changesPending();
    }
    
    get primaryTexture() {
        return this.proxy.primaryTexture;
    }
    
    set secondaryTexture(_texture) {
        this.proxy.secondaryTexture = _texture;
        this.changesPending();
    }
    
    get secondaryTexture() {
        return this.proxy.secondaryTexture;
    }

    init(def) {
        super.init(def,false);

        this.proxy.width = def.width;
        this.proxy.height = def.height;
        this.proxy.primaryTexture = def.primaryTexture;
        this.proxy.secondaryTexture = def.secondaryTexture;

        this.create();
        this.hasChanges = false;
    }

    save() {
        
        let instance = {};
            
        instance.type = "wall";
        instance.name = this.name ? this.name : "wall";
        instance.priority = this.priority;
        instance.nodes = this.proxy.nodes.map(v3=>this.v3ToPoint(v3));
        instance.width = this.proxy.width;
        instance.height = this.proxy.height;
        
        // TEXTURE
        
        if(this.proxy.primaryTexture) {
            instance.primaryTexture = this.textureToJSON(this.proxy.primaryTexture);
        }
        
        if(this.proxy.secondaryTexture) {
            instance.secondaryTexture = this.textureToJSON(this.proxy.secondaryTexture);
        }

        // PARENT
        
        if (this.parent) {
            instance.parent = this.parent.id;
        }

        // STATE

        instance.state = this._state;

        this.app.store.saveActor(this._id, instance);

    }

    addNode(v3) {
        super.addNode(v3);
        
        // CLOSE IF ENDPOINTS ARE CLOSE
        
        if(this.nodes.length > 2) {
            let d = BABYLON.Vector3.Distance(this.firstNode,this.lastNode);
            if(d <= this.width) {
                this.lastNode.set(this.firstNode.x,this.firstNode.y,this.firstNode.z);
                this.changesPending();
            }
        }

    }
    
    // THE WALL IS CREATED EACH TIME IT IS INIT'ED.
    
    create() {
        
        this.drawPath();
        
        if(!this._mesh) {
            return;
        }
        
        // SET PARENT

        if (this.proxy.parent) {
            this.app.actors.doWhenLoaded(this.proxy.parent, (actor) => {
                if(this._mesh && actor._mesh) {
                    this._mesh.parent = actor._mesh;
                } else {
                    console.warn("Unabled set parent mesh of",this.name,". Mesh has not been built.");
                }
                
            });
        }
    

        this._mesh.aid = this.id;

        return this._mesh;

    }

    drawPath() {
        if (this._mesh) {
            this._mesh.dispose();
            this._mesh = null;
        }
        
        if(!this.proxy.nodes || this.proxy.nodes.length == 0) {
            return;
        }
        
        // DRAW CENTER LINES FOR  DEBUGGING
        
        // if(this.proxy.nodes.length > 1) {
        //     this._mesh = BABYLON.MeshBuilder.CreateLines("wall", {points: this.proxy.nodes}, this.app.scene);
        //     this._mesh.color = new BABYLON.Color3(0.0, 1.0, 1.0);
        // }
        
        // CREATE MESH
        
        this._mesh = new BABYLON.Mesh("wall",this.app.scene);
        
        // CREATE WALL SEGMENTS
        
        let segments = [], prevSegment = null;
        this.proxy.nodes.forEach((node,idx)=>{
            if(idx < this.nodes.length-1) {
                let segment = new Segment(this,idx,idx+1);
                
                segment.prevSegment = prevSegment;
                if(prevSegment) {
                    prevSegment.nextSegment = segment;
                }
                
                prevSegment = segment;
                segments.push(segment);
            }
        });
        
        // CLOSE SEGMENTS?
        
        if(this.closed && segments.length > 2) {
            segments[0].prevSegment = segments[segments.length-1];
            segments[segments.length-1].nextSegment = segments[0];
        }
        
        // DRAW SEGMENTS
        
        segments.forEach((segment,idx)=>{
            segment.draw();
        });
        
        
        return this._mesh;
    }

}

class Segment {
    constructor(wall,startIdx,endIdx) {
        this.wall = wall;
        this.startIdx = startIdx;
        this.endIdx = endIdx;
        this.start = this.wall.nodes[startIdx];
        this.end = this.wall.nodes[endIdx];
        this.prevSegment = null;
        this.nextSegment = null;
        this.up = new BABYLON.Vector3(0,1,0);
        this.centerLineVector = this.end.subtract(this.start).normalize();
        this.length = BABYLON.Vector3.Distance(this.wall.nodes[this.startIdx],this.wall.nodes[this.endIdx]);
	    this.mesh = new BABYLON.Mesh("wall segment", this.wall.app.scene);
        this.mesh.parent = this.wall.mesh;
        this.createSubmesh = this.createSubmesh.bind(this);
        this.drawPositions = this.drawPositions.bind(this);
        this.drawIndices = this.drawIndices.bind(this);
    }
    
    
    draw() {
        
        let _this = this;
        return co(function *(){
            // DRAW START/END NODES FOR DEBUGGING
            
            // _this.wall.drawNode(_this.start);
            // _this.wall.drawNode(_this.end);
            
            // START CORNERS
            
            let startAngle = Math.PI;
            let startCorners;
            if(_this.prevSegment) {
                startAngle = _this.wall.angle(_this.centerLineVector,_this.prevSegment.centerLineVector.scale(-1));
                startCorners = _this.makeCorners(_this.start,startAngle,_this.centerLineVector,_this.prevSegment.centerLineVector.scale(-1));
            } else {
                startCorners = _this.makeCorners(_this.start,startAngle,_this.centerLineVector);
            }
            
            // END CORNERS
            
            let endAngle = Math.PI;
            let endCorners;
            if(_this.nextSegment) {
                endAngle = _this.wall.angle(_this.centerLineVector.scale(-1),_this.nextSegment.centerLineVector);
                endCorners = _this.makeCorners(_this.end,endAngle,_this.centerLineVector.scale(-1),_this.nextSegment.centerLineVector);
            } else {
                endCorners = _this.makeCorners(_this.end,endAngle,_this.centerLineVector.scale(-1));
            }
                
            // COLLECT FOUNDATION VERTICES
            
            let foundationVerticies = [startCorners.p1,startCorners.p2,endCorners.p1,endCorners.p2];
            
            // DRAW SORTED VERTS
            
            // let colors = [new BABYLON.Color3(1,0,0),new BABYLON.Color3(0,1,0),new BABYLON.Color3(0,0,1),new BABYLON.Color3(1,1,0)];
            // if(_this.startIdx == 0) {
            //     foundationVerticies.forEach((v,i)=>{
            //         _this.wall.drawNode(v,colors[i],1);
            //     });
            // }
            
            // CREATE CEILING VERTICES
            
            let celingVerticies = foundationVerticies.map(v=>{
                let n = new BABYLON.Vector3(v.x,v.y,v.z);
                n.y += _this.wall.height;
                return n;
            });
            
            // DRAW SORTED VERTS
            
            // if(_this.startIdx == 0) {
            //     celingVerticies.forEach((v,i)=>{
            //         _this.wall.drawNode(v,colors[i],1);
            //     });
            // }
            
            // VERTEX ARRAY FOR FOUNDATION AND CEILING
            
            let positions = [];
            
            // START EDGE VERTS
            
            positions = [...positions,foundationVerticies[0].x,foundationVerticies[0].y,foundationVerticies[0].z]; // LL 0
            positions = [...positions,celingVerticies[1].x,celingVerticies[1].y,celingVerticies[1].z]; // UR 1
            positions = [...positions,celingVerticies[0].x,celingVerticies[0].y,celingVerticies[0].z]; // UL 2
            
            positions = [...positions,foundationVerticies[0].x,foundationVerticies[0].y,foundationVerticies[0].z]; // LL 3
            positions = [...positions,foundationVerticies[1].x,foundationVerticies[1].y,foundationVerticies[1].z]; // LR 4
            positions = [...positions,celingVerticies[1].x,celingVerticies[1].y,celingVerticies[1].z]; // UR 5
            
            // END EDGE VERTS
            
            positions = [...positions,foundationVerticies[2].x,foundationVerticies[2].y,foundationVerticies[2].z]; // LL 6
            positions = [...positions,celingVerticies[3].x,celingVerticies[3].y,celingVerticies[3].z]; // UR 7
            positions = [...positions,celingVerticies[2].x,celingVerticies[2].y,celingVerticies[2].z]; // UL 8
            
            positions = [...positions,foundationVerticies[2].x,foundationVerticies[2].y,foundationVerticies[2].z]; // LL 9
            positions = [...positions,foundationVerticies[3].x,foundationVerticies[3].y,foundationVerticies[3].z]; // LR 10
            positions = [...positions,celingVerticies[3].x,celingVerticies[3].y,celingVerticies[3].z]; // UR 11
            
            // RIGHT SIDE VERTS
            
            positions = [...positions,foundationVerticies[1].x,foundationVerticies[1].y,foundationVerticies[1].z]; // LL 12
            positions = [...positions,celingVerticies[2].x,celingVerticies[2].y,celingVerticies[2].z]; // UR 13
            positions = [...positions,celingVerticies[1].x,celingVerticies[1].y,celingVerticies[1].z]; // UL 14
            
            positions = [...positions,foundationVerticies[1].x,foundationVerticies[1].y,foundationVerticies[1].z]; // LL 15
            positions = [...positions,foundationVerticies[2].x,foundationVerticies[2].y,foundationVerticies[2].z]; // LR 16
            positions = [...positions,celingVerticies[2].x,celingVerticies[2].y,celingVerticies[2].z]; // UR 17
            
            // LEFT SIDE VERTS
            
            positions = [...positions,foundationVerticies[3].x,foundationVerticies[3].y,foundationVerticies[3].z]; // LL 18
            positions = [...positions,celingVerticies[0].x,celingVerticies[0].y,celingVerticies[0].z]; // UR 19
            positions = [...positions,celingVerticies[3].x,celingVerticies[3].y,celingVerticies[3].z]; // UL 20
            
            positions = [...positions,foundationVerticies[3].x,foundationVerticies[3].y,foundationVerticies[3].z]; // LL 21
            positions = [...positions,foundationVerticies[0].x,foundationVerticies[0].y,foundationVerticies[0].z]; // LR 22
            positions = [...positions,celingVerticies[0].x,celingVerticies[0].y,celingVerticies[0].z]; // UR 23
            
            // TOP VERTS
            
            positions = [...positions,celingVerticies[0].x,celingVerticies[0].y,celingVerticies[0].z]; // LL 24
            positions = [...positions,celingVerticies[2].x,celingVerticies[2].y,celingVerticies[2].z]; // UR 25
            positions = [...positions,celingVerticies[3].x,celingVerticies[3].y,celingVerticies[3].z]; // UL 26
            
            positions = [...positions,celingVerticies[0].x,celingVerticies[0].y,celingVerticies[0].z]; // LL 27
            positions = [...positions,celingVerticies[1].x,celingVerticies[1].y,celingVerticies[1].z]; // LR 28
            positions = [...positions,celingVerticies[2].x,celingVerticies[2].y,celingVerticies[2].z]; // UR 29
            
            
            // START EDGE FACETS
            
            let indices = [0,1,2];
            indices = [...indices,3,4,5];
            
            // END EDGE FACETS
            
            indices = [...indices,6,7,8];
            indices = [...indices,9,10,11];
            
            // RIGHT SIDE
            
            indices = [...indices,12,13,14];
            indices = [...indices,15,16,17];
            
            // LEFT SIDE
            
            indices = [...indices,18,19,20];
            indices = [...indices,21,22,23];
            
            // TOP
            
            indices = [...indices,24,25,26];
            indices = [...indices,27,28,29];
            
            
            // NORMALS
            
            let normals = [];
            BABYLON.VertexData.ComputeNormals(positions, indices, normals);
            
            // UVS
            
            // START EDGE UVS
            
            let uvs = [0,0,1,1,0,1];
            uvs = [...uvs,0,0,1,0,1,1];
            
            // // END EDGE UVS
            
            uvs = [...uvs,0,0,1,1,0,1];
            uvs = [...uvs,0,0,1,0,1,1];
            
            // RIGHT SIDE UVS
            
            uvs = [...uvs,0,0,1,1,0,1];
            uvs = [...uvs,0,0,1,0,1,1];
            
            // LEFT SIDE UVS
            
            uvs = [...uvs,0,0,1,1,0,1];
            uvs = [...uvs,0,0,1,0,1,1];
            
            // TOP UVS
            
            uvs = [...uvs,0,1,1,0,1,1];
            uvs = [...uvs,0,1,0,0,1,0];
            
            // VERTEX DATA
            
            var vertexData = new BABYLON.VertexData();
            vertexData.positions = positions;
    	    vertexData.indices = indices;
    	    vertexData.normals = normals;
    	    vertexData.uvs = uvs;
    	    
    	    // APPLY TO MESH
    	    
    	    vertexData.applyToMesh(_this.mesh,1);
    	    
    	    // MULTI MAT
    	    
    	    _this.mesh.subMeshes = [];
    	    let multimat = new BABYLON.MultiMaterial("multimat", _this.wall.app.scene);
    	    
    	    // APPLY PRIMARY TEXTURE

    	    if(_this.wall.primaryTexture) {
    	        
    	        // GET PRIMARY TEXTURE
    	        
    	        let primaryTexture = yield _this.wall.app.textures.getTexture(_this.wall.primaryTexture.name);
    	        primaryTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    	        primaryTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
                
                // DETERMINE SCALE ALONG WALL
                
                let uScale = 1;
                let vScale = 1;
                let primaryTextureWidth = 0;
                let primaryTextureHeight = 0;
                let heightScale = 0;
                let scaledTextureWidth = 0;
                
                primaryTextureWidth = primaryTexture._texture.baseWidth;
                primaryTextureHeight = primaryTexture._texture.baseHeight;
                
                heightScale = _this.wall.height / primaryTextureHeight;
                scaledTextureWidth = primaryTextureWidth * heightScale;
                uScale = _this.length/scaledTextureWidth;
                
                primaryTexture.uScale = uScale;
                primaryTexture.vScale = vScale;

    	        // MATERIAL
        
                let primaryMaterial = new BABYLON.StandardMaterial("primary material", _this.wall.app.scene);
                primaryMaterial.diffuseTexture = primaryTexture;
                
                // ADD TO MULTI
                
                multimat.subMaterials.push(primaryMaterial);
                
                // CREATE SUBMESHES FOR RIGHT AND LEFT SIDES
                

                _this.mesh.subMeshes.push(_this.createSubmesh(12,6)); // RIGHT SIDE
                _this.mesh.subMeshes.push(_this.createSubmesh(18,6)); // LEFT SIDE

                
                
                // IF WE DON'T HAVE A SECONDARY TEXTURE
                
                if(!_this.wall.secondaryTexture) {
                    _this.mesh.subMeshes.push(_this.createSubmesh(0,6)); // START EDGE
                    _this.mesh.subMeshes.push(_this.createSubmesh(6,6)); // END EDGE
                    _this.mesh.subMeshes.push(_this.createSubmesh(24,6)); // TOP
                }
    	    }
    	    
    	    // APPLY SECONDARY TEXTURE

    	    if(_this.wall.secondaryTexture) {
    	        
    	        // GET SECONDARY TEXTURE
    	        
    	        let secondaryTexture = yield _this.wall.app.textures.getTexture(_this.wall.secondaryTexture.name);
    	        secondaryTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    	        secondaryTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
                
                // DETERMINE SCALE ALONG WALL
                
                let uScale = 1;
                let vScale = 1;
                let secondaryTextureWidth = 0;
                let secondaryTextureHeight = 0;
                let heightScale = 0;
                let scaledTextureWidth = 0;
                
                secondaryTextureWidth = secondaryTexture._texture.baseWidth;
                secondaryTextureHeight = secondaryTexture._texture.baseHeight;
                
                heightScale = _this.wall.height / secondaryTextureHeight;
                scaledTextureWidth = secondaryTextureWidth * heightScale;
                uScale = _this.length/scaledTextureWidth;
                
                secondaryTexture.uScale = uScale;
                secondaryTexture.vScale = vScale;

    	        // MATERIAL
        
                let secondaryMaterial = new BABYLON.StandardMaterial("secondary material", _this.wall.app.scene);
                secondaryMaterial.diffuseTexture = secondaryTexture;
                
                // ADD TO MULTI
                
                multimat.subMaterials.push(secondaryMaterial);
                
                // CREATE SUBMESHES FOR TOP
                
                _this.mesh.subMeshes.push(_this.createSubmesh(24,6,1)); // TOP
                
                // EDGE TEXTURE (USES SECONDARY TEXTURE)
                
                let edgeTexture = yield _this.wall.app.textures.getTexture(_this.wall.secondaryTexture.name);
    	        edgeTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    	        edgeTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    	        
    	        // EDGE MATERIAL
        
                let edgeMaterial = new BABYLON.StandardMaterial("edge material", _this.wall.app.scene);
                edgeMaterial.diffuseTexture = edgeTexture;
                
                // ADD TO MULTI
                
                multimat.subMaterials.push(edgeMaterial);
                
                // CREATE SUBMESHES FOR EDGES
                
                _this.mesh.subMeshes.push(_this.createSubmesh(0,6,2)); // START EDGE
                _this.mesh.subMeshes.push(_this.createSubmesh(6,6,2)); // END EDGE

    	    }
	    
	        _this.mesh.material = multimat;
        });
    }
    
    createSubmesh(startIndex,count,matIndex=0) {
        let verticesCount = this.mesh.getTotalVertices();
        let sm;
        try {
            sm = new BABYLON.SubMesh(matIndex, 0, verticesCount, startIndex, count, this.mesh);
        } catch (e) {
            // DO NOTHING... catches spurious "update of undefined"
        }

        return sm;
    }
    
    drawPositions(positions) {

		var box, boxmat;
		for (var i=0;i<positions.length;i+=3) {
			box = BABYLON.Mesh.CreateBox("box"+String(i), 1, this.wall.app.scene);
			box.position = new BABYLON.Vector3(positions[i], positions[i+1], positions[i+2]);

			boxmat = new BABYLON.StandardMaterial("boxmat", this.wall.app.scene);

			// new DynamicTexture(name, options, this.wall.app.scene, generateMipMaps)
			boxmat.emissiveTexture = new BABYLON.DynamicTexture("dt", 512, this.wall.app.scene, true);

			// drawText(text, x, y, font, color, clearColor, invertY)
			if (i<300) {
				boxmat.emissiveTexture.drawText((i/3<10?" "+String(i/3):String(i/3)), 10, 340, "bold 250pt verdana", "white", "blue", 1);
			}
			else {
				boxmat.emissiveTexture.drawText(String(i/3), 10, 340, "bold 160pt verdana", "white", "blue", 1);
			}

			box.material = boxmat;

		}
	}
	
	drawIndices(positions,indices) {

		var box, boxmat;
		for (var i=0;i<indices.length;i++) {
		    let posIdx = i * 3;
			box = BABYLON.Mesh.CreateBox("box"+String(i), 1, this.wall.app.scene);
			box.position = new BABYLON.Vector3(positions[posIdx], positions[posIdx+1], positions[posIdx+2]);

			boxmat = new BABYLON.StandardMaterial("boxmat", this.wall.app.scene);

			// new DynamicTexture(name, options, this.wall.app.scene, generateMipMaps)
			boxmat.emissiveTexture = new BABYLON.DynamicTexture("dt", 512, this.wall.app.scene, true);

			// drawText(text, x, y, font, color, clearColor, invertY)
			if (i<300) {
				boxmat.emissiveTexture.drawText((i<10?" "+String(i):String(i)), 10, 340, "bold 250pt verdana", "white", "blue", 1);
			}
			else {
				boxmat.emissiveTexture.drawText(String(i), 10, 340, "bold 160pt verdana", "white", "blue", 1);
			}

			box.material = boxmat;

		}
	}
    
    
    // mid: Midpoint of wall end
    // angle: angle between walls
    // cv1, cv2: Vectors of walls away from mid point
    
    makeCorners(mid, angle, cv1, cv2) {
        
        // STRAIGHT ANGLE
        
        if(angle == Math.PI) {
            let outVector1 = BABYLON.Vector3.Cross(this.centerLineVector,this.up).normalize();
            let outVector2 = outVector1.scale(-1);
            
            outVector1.scaleInPlace(this.wall.halfWidth);
            outVector2.scaleInPlace(this.wall.halfWidth);
            let p1 = mid.add(outVector1);
            let p2 = mid.add(outVector2);
            
            // DETERMINE ORDER
            
            let a = p1.subtract(mid);
            let crossA = BABYLON.Vector3.Cross(a,cv1);
            
            // CORRECT ORDER
        
            if(crossA.y < 0) {
                return {p1:p2,p2:p1};
            } else {
                return {p1:p1,p2:p2};
            }
        }
        
        // ANGLE < 180deg
        
        let theta = angle/2;
        let c = this.wall.halfWidth/Math.sin(theta);
        let outVector1 = cv1.add(cv2).normalize();
        let outVector2 = outVector1.scale(-1);
        outVector1.scaleInPlace(c);
        outVector2.scaleInPlace(c);
        
        let p1 = mid.add(outVector1);
        let p2 = mid.add(outVector2);
        
        // DETERMINE ORDER
        
        let a = p1.subtract(mid);
        // let b = p2.subtract(mid);
        
        let crossA = BABYLON.Vector3.Cross(a,cv1);
        // let crossB = BABYLON.Vector3.Cross(b,cv1);
        
        // if(this.startIdx == 3) {
        //     console.log("A,B:",crossA,crossB);
        // }
        
        // CORRECT ORDER
        
        if(crossA.y < 0) {
            return {p1:p2,p2:p1};
        } else {
            return {p1:p1,p2:p2};
        }
        
        
    }
}

export default Wall;