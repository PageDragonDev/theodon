import firebase from "firebase";
import 'firebase/firestore'
import co from "co";


let Store = class {
    
    constructor(target,instanceId) {
        this.instanceId = instanceId;
        this.config = {
            apiKey: target.dataset["apikey"],
            authDomain: target.dataset["authdomain"],
            databaseURL: target.dataset["databaseurl"],
            projectId: target.dataset["projectid"],
            storageBucket: target.dataset["storagebucket"],
            messagingSenderId: target.dataset["messagingsenderid"]
        };
        this.worldId = target.dataset["world"];
        this.app = firebase.initializeApp(this.config,instanceId);
        this.profile = null;
    }
  
    init() {
        let store = this;
        
        // Authenticate Using a popup.
    
        return co(function *(){
            let profile;
            let authUser;
            
            if(!store.app.auth().currentUser) {
                var provider = new firebase.auth.GoogleAuthProvider();
                provider.addScope('profile');
                provider.addScope('email');
                let result = yield store.app.auth().signInWithPopup(provider);
                authUser = result.user;
                profile = {accessToken: result.credential.accessToken,user: null};
            } else {
                authUser = store.app.auth().currentUser;
                profile = {accessToken: null,user: null};
            }
            
            // GET DB
        
            let db = store.app.firestore();
            
            // GET USERS REF
            
            let usersRef = db.collection("users");
            
            // DO WE ALREADY HAVE THIS USER?
            
            let userRef = usersRef.doc(authUser.uid);
            let userDoc = yield userRef.get();
            let existingUser = userDoc.exists?userDoc.data():{};
    
            existingUser = {
                displayName: authUser.displayName,
                email: authUser.email,
                photoURL: authUser.photoURL
            };
    
            // CAN WE ADMIN?
        
            if(typeof(existingUser.role) == "undefined") {
                existingUser.role = "observer";
            }
            
            // UPDATE USER INFO
            
            yield usersRef.doc(authUser.uid).set(existingUser);
            profile.user = existingUser;
            profile.user._id = authUser.uid;
            
            // GET INITIALIZE INFO
            
            let worldsRef = db.collection("worlds");
            let worldRef = worldsRef.doc(store.worldId);
            let worldDoc = yield worldRef.get();
            
            store.worldProfile = worldDoc.exists?worldDoc.data():null;
            if(store.worldProfile) {
                store.worldProfile.id = store.worldId;
            }
            store.profile = profile;
    
        });
    }
    
    // LOAD WORLD SCRIPTS
    
    watchWorldScripts(onChange,onRemove) {
        
        // WATCH SCRIPTS
        
        let db = this.app.firestore();
        db.collection("scripts").where("wid", "==", this.worldId)
        .onSnapshot(function(snapshot) {
            snapshot.docChanges.forEach(function(change) {

                let script = change.doc.data();
                script._id = change.doc.id;
                
                if (change.type === "added") {
                    onChange(script);
                }
                if (change.type === "modified") {
                    onChange(script);
                }
                if (change.type === "removed") {
                    onRemove(script);
                }
            });
        });
    }
    
    // ADD/SAVE WORLD SCRIPT
    
    saveWorldScript(path,code, sid) {
        // GET DB
        
        let db = this.app.firestore();
        
        // SCRIPT RECORD
        
        let pathParts = path.split('/');
        let script = {
            name: pathParts[pathParts.length-1],
            path: path,
            code: code,
            wid: this.worldId
        };
            
        // STORE
        
        let scriptsRef = db.collection("scripts");
        let scriptRef;
        if(sid) {
            scriptRef = scriptsRef.doc(sid);
        } else {
            scriptRef = scriptsRef.doc();
        }
        
        return co(function *(){
            yield scriptRef.set(script);
            script._id = scriptRef.id;
            return script;
        });
    }
    
    // GETTER FOR USER PROFILE
    
    get userProfile() {
        return this.profile;
    }
    
    // SAVE COLLECTION/OBJECT VALUE
    
    save(collection,id,field,value) {
        
        // GET DB
        
        let db = this.app.firestore();
            
        // STORE
        
        let collectionRef = db.collection(collection);
        let docRef = collectionRef.doc(id);
        let update = {};
        
        // EXPAND OUT DOT NOTATION
        
        let parts = field.split('.');
        let next = update;
        
        parts.forEach((part,idx)=>{
            
            if(idx < parts.length-1) {
                next[part] = {};
                next = next[part];
            } else {
                next[part] = value;
            }
        });

        
        return co(function *(){
            yield docRef.set(update,{merge:true});
        });
    }
        
};

export default Store;