import BABYLON from "babylonjs";
import uuidv1 from "uuid/v1";

let Textures = class {
    constructor(app) {
        this.app = app;
        this.texturesById = {};
        this.getTexture = this.getTexture.bind(this);
       
    }
    
    getTexture(path) {
        
        // DO WE ALREADY HAVE THIS TEXTURE?
        
        let texture = this.texturesById[path];
        
        if(texture) {
           return texture; 
        }
        
        // CREATE TEXTURE
        
        texture = new BABYLON.Texture(path,this.app.scene);
        this.texturesById[path] = texture;
        
        return texture;
    }
    
    
};
export default Textures;