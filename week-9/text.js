import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.1/three.module.min.js';
let camera, scene, renderer;
let labelCount = 0;
let labelCounterEl = null;
const ALIEN_WELCOME_LS_KEY = 'sharedMinds_week9_alienWelcomeClosed';

initHTML();
init3D();

function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    ///document.body.appendChild(renderer.domElement);

    //this puts the three.js stuff in a particular div
    document.getElementById('THREEcontainer').appendChild(renderer.domElement)

    let bgGeometery = new THREE.SphereGeometry(1000, 60, 40);
    // let bgGeometery = new THREE.CylinderGeometry(725, 725, 1000, 10, 10, true)
    bgGeometery.scale(-1, 1, 1);
    // has to be power of 2 like (4096 x 2048) or(8192x4096).  i think it goes upside down because texture is not right size
    let panotexture = new THREE.TextureLoader().load("360-beach.jpeg");
    // var material = new THREE.MeshBasicMaterial({ map: panotexture, transparent: true,   alphaTest: 0.02,opacity: 0.3});
    let backMaterial = new THREE.MeshBasicMaterial({ map: panotexture });
    let back = new THREE.Mesh(bgGeometery, backMaterial);
    scene.add(back);

    moveCameraWithMouse();

    camera.position.z = 0;
    animate();
}

function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

function initHTML() {
    const THREEcontainer = document.createElement("div");
    THREEcontainer.setAttribute("id", "THREEcontainer");
    document.body.appendChild(THREEcontainer);
    THREEcontainer.style.position = "absolute";
    THREEcontainer.style.top = "0";
    THREEcontainer.style.left = "0";
    THREEcontainer.style.width = "100%";
    THREEcontainer.style.height = "100%";
    THREEcontainer.style.zIndex = "1";

    const textInput = document.createElement("input");
    textInput.setAttribute("type", "text");
    textInput.setAttribute("id", "textInput");
    textInput.setAttribute("placeholder", "Enter text here");
    document.body.appendChild(textInput);
    textInput.style.position = "absolute";
    textInput.style.top = "50%";
    textInput.style.left = "50%";
    textInput.style.transform = "translate(-50%, -50%)";
    textInput.style.zIndex = "5";
    textInput.style.padding = "10px 12px";
    textInput.style.width = "260px";
    textInput.style.borderRadius = "10px";
    textInput.style.border = "2px solid rgba(57, 255, 20, 0.8)";
    textInput.style.background = "rgba(0, 0, 0, 0.85)";
    textInput.style.color = "rgb(57, 255, 20)";
    textInput.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    textInput.style.fontSize = "14px";
    textInput.style.outline = "none";
    textInput.style.boxShadow = "0 0 0 2px rgba(57, 255, 20, 0.15), 0 10px 25px rgba(0,0,0,0.35)";

    // Label counter overlay (top-right).
    const counter = document.createElement("div");
    counter.setAttribute("id", "labelCounter");
    counter.textContent = "Labeled: 0";
    document.body.appendChild(counter);
    labelCounterEl = counter;
    counter.style.position = "fixed";
    counter.style.top = "16px";
    counter.style.right = "16px";
    counter.style.zIndex = "10000";
    counter.style.padding = "10px 12px";
    counter.style.borderRadius = "10px";
    counter.style.border = "2px solid rgba(57, 255, 20, 0.6)";
    counter.style.background = "rgba(0, 0, 0, 0.75)";
    counter.style.color = "rgb(57, 255, 20)";
    counter.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    counter.style.fontSize = "14px";
    counter.style.boxShadow = "0 0 0 2px rgba(57, 255, 20, 0.08)";
    counter.style.userSelect = "none";

    textInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {  //checks whether the pressed key is "Enter"
            const pos = find3DCoornatesInFrontOfCamera(150 - camera.fov);
            createNewText(textInput.value, pos);
        }
    });

    createAlienWelcomeModal();
}

function find3DCoornatesInFrontOfCamera(distance) {
    let vector = new THREE.Vector3();
    vector.set(0, 0, 0); //middle of the screen where input box is
    vector.unproject(camera);
    vector.multiplyScalar(distance)
    return vector;
}

function createNewText(text_msg, posInWorld) {

    console.log("Created New Text", posInWorld);
    const labelText = String(text_msg || "").trim();
    if (!labelText) return;

    labelCount += 1;
    if (labelCounterEl) labelCounterEl.textContent = `Labeled: ${labelCount}`;

    var canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    var context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    const fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    var fontSize = Math.max(camera.fov / 2, 72);
    context.font = `800 ${fontSize}px ${fontFamily}`;
    context.textAlign = "center";
    context.fillStyle = "rgb(57, 255, 20)";
    // Outer "box" highlight around the text for a detection-overlay feel.
    const boxPad = 40;
    context.strokeStyle = "rgba(57, 255, 20, 0.95)";
    context.lineWidth = 6;
    context.strokeRect(boxPad, boxPad, canvas.width - boxPad * 2, canvas.height - boxPad * 2);

    context.fillText(labelText, canvas.width / 2, canvas.height / 2);
    
    // Scanline effect for a "computer vision" look.
    context.strokeStyle = "rgba(57, 255, 20, 0.18)";
    context.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
        const y = Math.floor((canvas.height / 10) * i + 4);
        context.beginPath();
        context.moveTo(40, y);
        context.lineTo(canvas.width - 40, y);
        context.stroke();
    }
    var textTexture = new THREE.Texture(canvas);
    textTexture.needsUpdate = true;
    var material = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true });
    var geo = new THREE.PlaneGeometry(1, 1);
    var mesh = new THREE.Mesh(geo, material);

    mesh.position.x = posInWorld.x;
    mesh.position.y = posInWorld.y;
    mesh.position.z = posInWorld.z;

    console.log(posInWorld);
    mesh.lookAt(0, 0, 0);
    mesh.scale.set(10, 10, 10);
    scene.add(mesh);
}

function createAlienWelcomeModal() {
    const overlay = document.createElement("div");
    overlay.setAttribute("id", "alienWelcomeOverlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    const modal = document.createElement("div");
    modal.setAttribute("id", "alienWelcomeModal");

    const closeButton = document.createElement("button");
    closeButton.setAttribute("type", "button");
    closeButton.setAttribute("aria-label", "Close welcome window");
    closeButton.textContent = "X";

    const content = document.createElement("div");
    content.setAttribute("id", "alienWelcomeContent");

    content.innerHTML = `
        <h2 style="margin:0 0 8px 0; font-size:18px;">Welcome to Earth, trainee</h2>
        <p style="margin:0 0 10px 0; line-height:1.35;">
            Greetings! You are an alien who has arrived on Earth for the first time.
            Your current training location: <b>the beach</b>.
        </p>
        <p style="margin:0 0 10px 0; line-height:1.35;">
            As part of your training, practice labeling Earth things. When you recognize an item,
            type its name and press <b>Enter</b>.
        </p>
        <p style="margin:0; line-height:1.35; opacity:0.95;">
            Example labels: <i>sand</i>, <i>waves</i>, <i>seagulls</i>.
        </p>
    `;

    overlay.appendChild(modal);
    modal.appendChild(closeButton);
    modal.appendChild(content);
    document.body.appendChild(overlay);

    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.display = "none"; // shown conditionally below
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.background = "rgba(0, 0, 0, 0.6)";
    overlay.style.zIndex = "9999";
    overlay.style.padding = "18px";

    modal.style.background = "rgba(0, 0, 0, 0.88)";
    modal.style.borderRadius = "12px";
    modal.style.border = "2px solid rgba(57, 255, 20, 0.65)";
    modal.style.maxWidth = "520px";
    modal.style.width = "100%";
    modal.style.boxShadow = "0 0 0 2px rgba(57, 255, 20, 0.08), 0 12px 30px rgba(0,0,0,0.55), 0 0 35px rgba(57, 255, 20, 0.10)";
    modal.style.position = "relative";
    modal.style.padding = "18px 18px 16px 18px";
    modal.style.color = "rgb(57, 255, 20)";
    modal.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    modal.style.textShadow = "0 0 10px rgba(57, 255, 20, 0.22)";
    modal.style.backdropFilter = "blur(6px)";

    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "10px";
    closeButton.style.width = "34px";
    closeButton.style.height = "34px";
    closeButton.style.borderRadius = "999px";
    closeButton.style.border = "2px solid rgba(57, 255, 20, 0.65)";
    closeButton.style.background = "rgba(0,0,0,0.45)";
    closeButton.style.color = "rgb(57, 255, 20)";
    closeButton.style.boxShadow = "0 0 0 2px rgba(57, 255, 20, 0.08), 0 0 20px rgba(57, 255, 20, 0.12)";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontSize = "16px";
    closeButton.style.lineHeight = "30px";

    const hide = () => {
        overlay.style.display = "none";
    };

    closeButton.addEventListener("click", () => {
        hide();
        setAlienWelcomeClosed();
    });

    document.addEventListener("keydown", (e) => {
        if (overlay.style.display !== "flex") return;
        if (e.key === "Escape") {
            hide();
            setAlienWelcomeClosed();
        }
    });

    // Always show on every site open.
    overlay.style.display = "flex";
}

function setAlienWelcomeClosed() {
    try {
        localStorage.setItem(ALIEN_WELCOME_LS_KEY, "1");
    } catch (err) {
        // ignore
    }
}



/////MOUSE STUFF

let mouseDownX = 0, mouseDownY = 0;
let lon = -90, mouseDownLon = 0;
let lat = 0, mouseDownLat = 0;
let isUserInteracting = false;


function moveCameraWithMouse() {
    //set up event handlers
    const div3D = document.getElementById('THREEcontainer');
    div3D.addEventListener('mousedown', div3DMouseDown, false);
    div3D.addEventListener('mousemove', div3DMouseMove, false);
    div3D.addEventListener('mouseup', div3DMouseUp, false);
    div3D.addEventListener('wheel', div3DMouseWheel, false);
    window.addEventListener('resize', onWindowResize, { passive: true });
    //document.addEventListener('keydown', onDocumentKeyDown, false);
    camera.target = new THREE.Vector3(0, 0, 0);  //something for the camera to look at
}

function div3DMouseDown(event) {
    mouseDownX = event.clientX;
    mouseDownY = event.clientY;
    mouseDownLon = lon;
    mouseDownLat = lat;
    isUserInteracting = true;
}

function div3DMouseMove(event) {
    if (isUserInteracting) {
        lon = (mouseDownX - event.clientX) * 0.1 + mouseDownLon;
        lat = (event.clientY - mouseDownY) * 0.1 + mouseDownLat;
        computeCameraOrientation();
    }
}

function div3DMouseUp(event) {
    isUserInteracting = false;
}

function div3DMouseWheel(event) {
    camera.fov += event.deltaY * 0.05;
    camera.fov = Math.max(5, Math.min(100, camera.fov)); //limit zoom
    camera.updateProjectionMatrix();
}

function computeCameraOrientation() {
    lat = Math.max(- 30, Math.min(30, lat));  //restrict movement
    let phi = THREE.MathUtils.degToRad(90 - lat);  //restrict movement
    let theta = THREE.MathUtils.degToRad(lon);
    //move the target that the camera is looking at
    camera.target.x = 100 * Math.sin(phi) * Math.cos(theta);
    camera.target.y = 100 * Math.cos(phi);
    camera.target.z = 100 * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(camera.target);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log('Resized');
}

