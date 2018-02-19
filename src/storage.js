import firebase from "firebase";
import 'firebase/firestore';
import co from "co";
import uploadcare from 'uploadcare-widget';
import _ from "lodash";

let Store = class {

    constructor(target, instanceId, theodonApp, config) {
        this.theodonApp = theodonApp;
        this.instanceId = instanceId;
        this.config = {
            apiKey: target.dataset["apikey"],
            authDomain: target.dataset["authdomain"],
            databaseURL: target.dataset["databaseurl"],
            projectId: target.dataset["projectid"],
            storageBucket: target.dataset["storagebucket"],
            messagingSenderId: target.dataset["messagingsenderid"],
            worldId: target.dataset["world"],
            sceneId: target.dataset["scene"]
        };

        if(config) {
            this.config = config;
        }

        this.worldId = this.config.worldId;
        this.sceneId = this.config.sceneId;
        
        
        if(!this.config.firebaseApp) {
            let initConfig = Object.assign({}.this.config);
            delete initConfig.worldId;
            delete initConfig.sceneId;
            this.app = firebase.initializeApp(this.config, instanceId);
        } else {
            this.app = this.config.firebaseApp;
        }
        
        this._user = config.user;
        this._admin = config.admin?config.admin:false;
        this.fetchFileDialog = this.fetchFileDialog.bind(this);
        this.getImageData = this.getImageData.bind(this);

    }

    init() {
        let store = this;

        // Authenticate Using a popup.

        return co(function*() {
            let profile;
            let authUser;

            // GET DB

            let db = store.app.firestore();
            let usersRef = db.collection("users");    
            
                
            if (!store.app.auth().currentUser) {
                
                var provider = new firebase.auth.GoogleAuthProvider();
                provider.addScope('profile');
                provider.addScope('email');
                let result = yield store.app.auth().signInWithPopup(provider);
                authUser = result.user;
                profile = { accessToken: result.credential.accessToken, user: null };
                
                // DO WE ALREADY HAVE THIS USER?
    
                let userRef = usersRef.doc(authUser.uid);
                let userDoc = yield userRef.get();
                let existingUser = userDoc.exists ? userDoc.data() : null;
                
                if(existingUser) {
                    existingUser = {
                        displayName: authUser.displayName,
                        email: authUser.email,
                        photoURL: authUser.photoURL
                    };
                }
                
                // UPDATE USER INFO
            
                yield usersRef.doc(authUser.uid).set(existingUser);
                profile = existingUser;
                
            }
            else {
                authUser = store.app.auth().currentUser;
                let userRef = usersRef.doc(authUser.uid);
                let userDoc = yield userRef.get();
                
                let existingUser = userDoc.exists ? userDoc.data() : null;
                if(!existingUser) {
                    existingUser = {
                        displayName: authUser.displayName,
                        email: authUser.email,
                        photoURL: authUser.photoURL
                    };
                }
            
                profile = existingUser;
            }
            

            // GET INITIALIZE INFO

            let worldsRef = db.collection("worlds");
            let worldRef = worldsRef.doc(store.worldId);
            let worldDoc = yield worldRef.get();

            store.worldProfile = worldDoc.exists ? worldDoc.data() : null;
            if (store.worldProfile) {
                store.worldProfile.id = store.worldId;
            }
            if(!store._user) {
                store._user = profile;
            }
            console.log("THEODON USER:",store._user);

        });
    }

    // LOAD WORLD SCRIPTS

    watchWorldScripts(onChange, onRemove) {

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

    saveWorldScript(path, code, sid) {
        // GET DB

        let db = this.app.firestore();

        // SCRIPT RECORD

        let pathParts = path.split('/');
        let script = {
            name: pathParts[pathParts.length - 1],
            path: path,
            code: code,
            wid: this.worldId
        };

        // STORE

        let scriptsRef = db.collection("scripts");
        let scriptRef;
        if (sid) {
            scriptRef = scriptsRef.doc(sid);
        }
        else {
            scriptRef = scriptsRef.doc();
        }

        return co(function*() {
            try {
                yield scriptRef.set(script);
                return true;
            }
            catch (e) {
                console.error(e);
                return false;
            }
        });
    }

    // REMOVE SCRIPT

    removeWorldScript(script) {
        let db = this.app.firestore();
        let scriptsRef = db.collection("scripts").doc(script._id);
        scriptsRef.delete();
    }

    // GETTER FOR USER PROFILE

    get user() {
        return this._user;
    }
    
    get admin() {
        return this._admin;
    }

    // SAVE COLLECTION/OBJECT VALUE

    save(collection, id, field, value) {

        // GET DB

        let db = this.app.firestore();

        // STORE

        let collectionRef = db.collection(collection);
        let docRef = collectionRef.doc(id);
        let update = {};

        // EXPAND OUT DOT NOTATION

        let parts = field.split('.');
        let next = update;

        parts.forEach((part, idx) => {

            if (idx < parts.length - 1) {
                next[part] = {};
                next = next[part];
            }
            else {
                next[part] = value;
            }
        });


        return co(function*() {
            yield docRef.set(update, { merge: true });
        });
    }

    saveActor(aid, instance) {
        
        // GET DB

        let db = this.app.firestore();
        let actorsRef = db.collection("actors");
        instance.wid = this.worldId;
        if(this.sceneId) {
            instance.sid = this.sceneId;
        }
        
        console.log("Saving Actor:",instance.name,aid,instance.state?instance.state.tid?instance.state.tid:'no tid':'no tid');

        actorsRef.doc(aid).set(instance);
        
    }

    removeActor(actor) {
        // GET DB

        let db = this.app.firestore();

        // DELETE ACTOR

        let actorsRef = db.collection("actors").doc(actor.id);
        actorsRef.delete().then(function() {
            console.log("Actor successfully deleted!");
        }).catch(function(error) {
            console.error("Actor removing document: ", error);
        });

        // DELETE PLACEMENT

        let placementRef = db.collection("placements").doc(actor.id);
        placementRef.delete();

        // DELETE WAYPOINTS

        let query = db.collection("waypoints").where("aid", "==", actor.id);
        query.get().then((snapshot) => {
            // When there are no documents left, we are done
            if (snapshot.size == 0) {
                return 0;
            }

            // Delete documents in a batch
            var batch = db.batch();
            snapshot.docs.forEach(function(doc) {
                batch.delete(doc.ref);
            });

            return batch.commit().then(function() {
                return snapshot.size;
            });
        });

    }

    // CALC ZONE

    getZone(p) {
        return { x: Math.floor(p.x / 10), y: Math.floor(p.y / 10), z: Math.floor(p.z / 10) };
    }

    // SAVE A FIXED PLACEMENT

    savePlacement(actor, placement) {

        // GET DB

        let db = this.app.firestore();
        let actorsRef = db.collection("placements");
        placement.wid = this.worldId;
        placement.time = firebase.firestore.FieldValue.serverTimestamp();
        placement.zone = this.getZone(placement.position);

        return co(function*() {
            yield actorsRef.doc(actor.id).set(placement);
        });
    }

    // SAVE A WAYPOINT

    saveWaypoint(actor, waypoint) {

        // GET DB

        let db = this.app.firestore();
        let actorsRef = db.collection("waypoints");
        waypoint.wid = this.worldId;
        waypoint.aid = actor.id;
        waypoint.time = firebase.firestore.FieldValue.serverTimestamp();
        waypoint.zone = this.getZone(waypoint.position);

        actorsRef.add(waypoint);
    }

    // WATCH ACTORS

    watchActors(onChange, onRemove) {
        
        // LOAD ALL ACTORS AND SORT BY PRIORITY
        
        let db = this.app.firestore();
        let actors = [];
        let collection;
        if(this.sceneId) {
            collection = db.collection("actors").where("wid", "==", this.worldId).where("sid", "==", this.sceneId);
        } else {
            collection = db.collection("actors").where("wid", "==", this.worldId);
        }
        collection.get()
        .then(querySnapshot => {
            querySnapshot.forEach(function(doc) {

                let actorDef = doc.data();
                actorDef._id = doc.id;
                
                actors.push(actorDef);
            });
            
            actors = _.sortBy(actors,"priority");
            actors.forEach(actorDef=>{
                onChange(actorDef);
            });
            
            // CALL POPULATED EVENT
        
            this.theodonApp.scripts.runScript("World/Populated");
            
            // CALL EXTERNAL SCENE LOADED
            
            if(this.theodonApp.config.onSceneLoaded) {
                this.theodonApp.config.onSceneLoaded(this.theodonApp);
            }
            
            // WATCH FOR ACTOR CHANGES

            collection.onSnapshot(function(snapshot) {
                snapshot.docChanges.forEach(function(change) {

                    let actorDef = change.doc.data();
                    actorDef._id = change.doc.id;

                    if (change.type === "added") {
                        onChange(actorDef);
                    }
                    if (change.type === "modified") {
                        onChange(actorDef);
                    }
                    if (change.type === "removed") {
                        onRemove(actorDef);
                    }
                });
            });
            
            
        });
        

        
    }

    // WATCH PLACEMENTS

    watchPlacements(onChange) {

        // WATCH SCRIPTS

        let db = this.app.firestore();
        db.collection("placements").where("wid", "==", this.worldId)
            .onSnapshot(function(snapshot) {
                snapshot.docChanges.forEach(function(change) {

                    let placementDef = change.doc.data();
                    placementDef._id = change.doc.id;

                    if (change.type === "added") {
                        onChange(placementDef);
                    }
                    if (change.type === "modified") {
                        onChange(placementDef);
                    }

                });
            });
    }

    // WATCH WAYPOINT

    watchWaypoints(onChange) {

        // WATCH SCRIPTS

        let db = this.app.firestore();
        db.collection("waypoints").where("wid", "==", this.worldId)
            .onSnapshot(function(snapshot) {
                snapshot.docChanges.forEach(function(change) {

                    let waypointDef = change.doc.data();
                    waypointDef._id = change.doc.id;

                    if (change.type === "added") {
                        onChange(waypointDef);
                    }
                    if (change.type === "modified") {
                        onChange(waypointDef);
                    }
                });
            });
    }

    clearWaypoints(actor, time) {

        let db = this.app.firestore();
        let query = db.collection("waypoints");
        query.where("aid", "==", actor.id);
        query.where("time", "<=", time);

        query.get().then((snapshot) => {
            // When there are no documents left, we are done
            if (snapshot.size == 0) {
                return 0;
            }

            // Delete documents in a batch
            var batch = db.batch();
            snapshot.docs.forEach(function(doc) {
                batch.delete(doc.ref);
            });

            return batch.commit().then(function() {
                return snapshot.size;
            });
        });
    }

    getImageData(url) {

        return new Promise((resolve, reject) => {
            let img = new Image(); /*global Image*/

            img.onload = function() {
                let canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;

                // Copy the image contents to the canvas
                let ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                let dataURL = canvas.toDataURL("image/jpeg");

                resolve(dataURL);
            };
            img.onerror = function() {
                reject(new Error("There was an error fetching " + url));
            };
            img.setAttribute('crossOrigin', 'anonymous');
            img.src = url;
        });
    }

    fetchFileDialog(folder="images") {
        
        return new Promise((resolve, reject) => {
            
            // CREATE ELEMENT

            let element = document.createElement("input");
            element.setAttribute("id", "uploadcare");
            element.setAttribute("style", "display:none");
            document.body.appendChild(element);

            // CREATE WIDGET

            let widget = uploadcare.Widget('#uploadcare');
            
            // SHOW DIALOG
            
            widget.openDialog();
            widget.onUploadComplete((file) => {
                element.remove();
                
                // TURN URL INTO IMAGE DATA

                this.getImageData(file.cdnUrl).then(data => {
                    // STORE IMAGE

                    let ref = this.app.storage().ref();
                    let imagePath = folder + '/' + file.name;

                    let imageRef = ref.child(imagePath);
                    imageRef.putString(data, 'data_url').then(result => {
                        let fullPath = result.metadata.downloadURLs[0];
                        resolve(fullPath);
                    });

                });


            });

        });
    }
};

export default Store;
