
let camera3D, scene, renderer, cube;
let texts = [];
let hitTestableOjects = [];
let in_front_of_you;
let currentObject;
let handProxy;
let myTimer;
let video;
let p5Canvas;
let p5Texture;
let lastFewHands = [];
let handIsReset = true;

let hands = [];

const VIDEO_SIZE = 512;

const CASTLE_HOLD_MS = 3000;
const BG_SPHERE_RADIUS = 1000;
const CASTLE_PLANE_SIZE = 300;
const CASTLE_DISTANCE_FROM_CENTER = 860;

let bothHandsSince = null;
let awaitingReleaseForNextCastle = false;
let p5OverLayMesh;
let castleTexture;
let castleMeshes = [];
let castleBuildCount = 0;

function preload() {
    handpose = ml5.handPose();
}

function bothHandsQualify() {
    if (hands.length < 2) return false;
    let h0 = hands[0];
    let h1 = hands[1];
    if (!h0.keypoints || !h1.keypoints || h0.keypoints.length < 1 || h1.keypoints.length < 1) {
        return false;
    }
    let c0 = h0.confidence != null ? h0.confidence : 1;
    let c1 = h1.confidence != null ? h1.confidence : 1;
    return c0 > 0.7 && c1 > 0.7;
}

function handPairMidpoint() {
    let a = hands[0].keypoints[0];
    let b = hands[1].keypoints[0];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function drawCircularProgress(cx, cy, radius, progress01) {
    noFill();
    strokeCap(ROUND);
    stroke(210, 190, 155);
    strokeWeight(5);
    circle(cx, cy, radius * 2);
    stroke(61, 122, 62);
    strokeWeight(6);
    arc(cx, cy, radius * 2, radius * 2, -HALF_PI, -HALF_PI + constrain(progress01, 0, 1) * TWO_PI);
}


function setup() {

    video = createCapture(VIDEO);
    video.size(VIDEO_SIZE, VIDEO_SIZE);
    video.hide();
    p5Canvas = createCanvas(VIDEO_SIZE, VIDEO_SIZE);
    p5Canvas.elt.style.display = "none";

    handpose.detectStart(video, gotHands);
    init3D();
}

function draw() {
    clear();

    for (let i = 0; i < hands.length; i++) {
        let hand = hands[i];
        for (let j = 0; j < hand.keypoints.length; j++) {
            let keypoint = hand.keypoints[j];
            fill(160, 220, 255);
            noStroke();
            circle(keypoint.x, keypoint.y, 10);
        }
    }

    if (bothHandsQualify()) {
        if (awaitingReleaseForNextCastle) {
            bothHandsSince = null;
        } else {
            if (bothHandsSince === null) {
                bothHandsSince = millis();
            }
            let mid = handPairMidpoint();
            let elapsed = millis() - bothHandsSince;
            let t = min(1, elapsed / CASTLE_HOLD_MS);
            drawCircularProgress(mid.x, mid.y, 36, t);
            if (elapsed >= CASTLE_HOLD_MS) {
                addCastleOnPanorama();
                awaitingReleaseForNextCastle = true;
                bothHandsSince = null;
            }
        }
    } else {
        awaitingReleaseForNextCastle = false;
        bothHandsSince = null;
    }
}

function addCastleOnPanorama() {
    if (!castleTexture) {
        return;
    }
    camera3D.updateMatrixWorld(true);
    let dir = new THREE.Vector3();
    camera3D.getWorldDirection(dir);
    let pos = dir.clone().multiplyScalar(CASTLE_DISTANCE_FROM_CENTER);

    let geo = new THREE.PlaneGeometry(CASTLE_PLANE_SIZE, CASTLE_PLANE_SIZE);
    let mat = new THREE.MeshBasicMaterial({
        map: castleTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        alphaTest: 0.02,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true
    });
    let mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.lookAt(0, 0, 0);
    mesh.renderOrder = 1;
    scene.add(mesh);
    castleMeshes.push(mesh);
    castleBuildCount += 1;
    updateCastleCounterDisplay();
}

function updateCastleCounterDisplay() {
    let el = document.getElementById("castle-count-value");
    if (el) {
        el.textContent = String(castleBuildCount);
    }
}


function gotHands(results) {
    hands = results;
    if (hands[0] && hands[0].confidence > 0.9) {//&& hands[0].handedness == "Left" 
        let indexZ = hands[0].index_finger_tip.z3D;
        let indexX = hands[0].index_finger_tip.x3D;
        let indexY = hands[0].index_finger_tip.y3D;
        let thumbZ = hands[0].thumb_tip.z3D;
        let thumbX = hands[0].thumb_tip.x3D;
        let thumbY = hands[0].thumb_tip.y3D;
        let distanceBetweenFingers = dist(indexX, indexY, thumbX, thumbY, indexZ, thumbZ);

        let x = map(indexX, 0, 0.07, 64, -64); //turn 0-640 to -320 to 320 
        let y = map(indexY, 0, 0.07, 32, -64); //turn 0-640 to -320 to 320 
        var mouse = { "x": x, "y": y, "z": indexZ };

        mouse = averageLastFewHands(mouse);
        mouse.z = Math.abs(mouse.z);
        if (distanceBetweenFingers > 0.1) {
            //if (handIsReset) {
            //createNewShape();
            //handIsReset = false;
        }
        // } else {
        //     handIsReset = true;
        // }

        // ///hitTest(mouse.x, mouse.y);
        // var raycaster = new THREE.Raycaster(); // create once
        // raycaster.near = 10;
        // raycaster.far = 1000;
        // raycaster.setFromCamera(mouse, camera3D);
        // var intersects = raycaster.intersectObjects(hitTestableOjects, false);

        // // //  console.log( handProxy.position);
        // if (intersects.length > 0) {
        //     console.log("intersetion", intersects[0]);
        // }

        //     if (openHand == false) {
        //         console.log(intersects[0]);
        //         var posInWorld = new THREE.Vector3();
        //         handProxy.getWorldPosition(posInWorld);
        //         intersects[0].object.position.x = posInWorld.x;
        //         intersects[0].object.position.y = posInWorld.y;
        //     }
        // }
        //}
    }
}

function averageLastFewHands(mouse) {
    //average last few to smooth it out
    lastFewHands.push(mouse);
    if (lastFewHands.length > 5) {
        lastFewHands.shift();  //remove first
    }
    let xTotal = 0;
    let yTotal = 0;
    let zTotal = 0;
    for (var i = 0; i < lastFewHands.length; i++) {
        xTotal += lastFewHands[i].x;
        yTotal += lastFewHands[i].y;
        zTotal += lastFewHands[i].z;
    }
    mouse.x = xTotal / lastFewHands.length;
    mouse.y = yTotal / lastFewHands.length;
    mouse.z = zTotal / lastFewHands.length;
    handProxy.position.x = mouse.x;
    handProxy.position.y = mouse.y;
    return mouse;
}


function createNewShape() {

    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var geo = new THREE.SphereGeometry(1, 16, 32);
    var mesh = new THREE.Mesh(geo, material);
    mesh.position.x = handProxy.position.x;
    mesh.position.y = handProxy.position.y;
    mesh.position.z = handProxy.position.z;
    // console.log(posInWorld);
    mesh.lookAt(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    scene.add(mesh);
    hitTestableOjects.push(mesh);
}


function init3D() {
    scene = new THREE.Scene();
    camera3D = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    ///document.body.appendChild(renderer.domElement);

    //this puts the three.js stuff in a particular div
    document.getElementById('container').appendChild(renderer.domElement)


    let bgGeometery = new THREE.SphereGeometry(1000, 60, 40);
    // let bgGeometery = new THREE.CylinderGeometry(725, 725, 1000, 10, 10, true)
    bgGeometery.scale(-1, 1, 1);
    // has to be power of 2 like (4096 x 2048) or(8192x4096).  i think it goes upside down because texture is not right size
    let panotexture = new THREE.TextureLoader().load("beach.webp");
    panotexture.wrapS = THREE.RepeatWrapping;
    panotexture.wrapT = THREE.RepeatWrapping;
    panotexture.repeat.set(1, -1);
    panotexture.offset.set(0, 1);
    // var material = new THREE.MeshBasicMaterial({ map: panotexture, transparent: true,   alphaTest: 0.02,opacity: 0.3});
    let backMaterial = new THREE.MeshBasicMaterial({ map: panotexture });
    let back = new THREE.Mesh(bgGeometery, backMaterial);
    scene.add(back);


    //tiny little dot (could be invisible) for placing things in front of you
    // var geometryFront = new THREE.BoxGeometry(1, 1, 1);
    // var materialFront = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // in_front_of_you = new THREE.Mesh(geometryFront, materialFront);
    // camera3D.add(in_front_of_you); // then add in front of the camera so it follow it
    // in_front_of_you.position.set(0, 0, -600);


    handProxy = new THREE.Object3D();
    camera3D.add(handProxy);
    scene.add(camera3D);
    handProxy.position.z = -50;

    var planeGeo = new THREE.PlaneGeometry(VIDEO_SIZE, VIDEO_SIZE);
    p5Texture = new THREE.Texture(p5Canvas.elt);
    p5Texture.minFilter = THREE.LinearFilter;
    p5Texture.magFilter = THREE.LinearFilter;
    let overlayMat = new THREE.MeshBasicMaterial({
        map: p5Texture,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide
    });
    p5OverLayMesh = new THREE.Mesh(planeGeo, overlayMat);
    p5OverLayMesh.lookAt(0, 0, 0);
    p5OverLayMesh.position.z = -450;
    camera3D.add(p5OverLayMesh);

    new THREE.TextureLoader().load("castle.png", function (tex) {
        tex.needsUpdate = true;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(1, -1);
        tex.offset.set(0, 1);
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        if (renderer.capabilities && typeof renderer.capabilities.getMaxAnisotropy === "function") {
            tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        }
        castleTexture = tex;
    });

    moveCameraWithMouse();

    camera3D.position.z = 0;
    animate();
}

function hitTest(x, y) {  //called from onDocumentMouseDown()
    let mouser = { "x": 0, "y": 0 };
    var raycaster = new THREE.Raycaster(); // create once
    //var mouse = new THREE.Vector2(); // create once
    mouser.x = (x / renderer.domElement.clientWidth) * 2 - 1;
    mouser.y = - (y / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouser, camera3D);
    var intersects = raycaster.intersectObjects(hitTestableOjects, false);
    // if there is one (or more) intersections
    currentObject = null;
    if (intersects.length > 0) {
        let hitObj = intersects[0].object; //closest object
        hitObj.material.color.setHex(Math.random() * 0xffffff);
        console.log("hit", hitObjID);
    }
    // console.log(currentObject);

}

function animate() {
    requestAnimationFrame(animate);
    if (p5Texture) {
        p5Texture.needsUpdate = true;
    }
    for (var i = 0; i < texts.length; i++) {
        texts[i].texture.needsUpdate = true;
    }
    renderer.render(scene, camera3D);
}




function onDocumentKeyDown(e) {
    clearTimeout(myTimer);
    if (currentObject) {
        if (e.key == "ArrowRight") {
            console.log(e.key);
            currentObject.object.position.x = currentObject.object.position.x + 1;
        } else if (e.key == "ArrowLeft") {
            currentObject.object.position.x = currentObject.object.position.x - 1;
        } else if (e.key == "ArrowUp") {
            currentObject.object.position.y = currentObject.object.position.y - 1;
        } else if (e.key == "ArrowDown") {
            currentObject.object.position.y = currentObject.object.position.y + 1;
        }
        currentObject.location = { "x": currentObject.object.position.x, "y": currentObject.object.position.y, "z": currentObject.object.position.z, "xrot": currentObject.object.rotation.x, "yrot": currentObject.object.rotation.y, "zrot": currentObject.object.rotation.z }
    }

}



/////MOUSE STUFF

var onMouseDownMouseX = 0, onMouseDownMouseY = 0;
var onPointerDownPointerX = 0, onPointerDownPointerY = 0;
var lon = -90, onMouseDownLon = 0;
var lat = 0, onMouseDownLat = 0;
var isUserInteracting = false;


function moveCameraWithMouse() {
    document.addEventListener('keydown', onDocumentKeyDown, false);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);
    document.addEventListener('wheel', onDocumentMouseWheel, false);
    window.addEventListener('resize', onWindowResize, false);
    camera3D.target = new THREE.Vector3(0, 0, 0);
}


function onDocumentMouseDown(event) {
    hitTest(event.clientX, event.clientY);
    onPointerDownPointerX = event.clientX;
    onPointerDownPointerY = event.clientY;
    onPointerDownLon = lon;
    onPointerDownLat = lat;
    isUserInteracting = true;
}

function onDocumentMouseMove(event) {
    if (isUserInteracting) {
        lon = (onPointerDownPointerX - event.clientX) * 0.1 + onPointerDownLon;
        lat = (event.clientY - onPointerDownPointerY) * 0.1 + onPointerDownLat;
        computeCameraOrientation();
    }
}

function onDocumentMouseUp(event) {
    isUserInteracting = false;
}

function onDocumentMouseWheel(event) {
    camera3D.fov += event.deltaY * 0.05;
    camera3D.updateProjectionMatrix();
}

function computeCameraOrientation() {
    lat = Math.max(- 30, Math.min(30, lat));  //restrict movement
    let phi = THREE.Math.degToRad(90 - lat);  //restrict movement
    let theta = THREE.Math.degToRad(lon);
    camera3D.target.x = 100 * Math.sin(phi) * Math.cos(theta);
    camera3D.target.y = 100 * Math.cos(phi);
    camera3D.target.z = 100 * Math.sin(phi) * Math.sin(theta);
    camera3D.lookAt(camera3D.target);
}


function onWindowResize() {
    camera3D.aspect = window.innerWidth / window.innerHeight;
    camera3D.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


