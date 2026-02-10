const IMG_SIZE = 280;
const PADDING = 20;
const GAP = 16;

let canvas;
let inputBox;
let combineBtn;
/** Rects of placed images: { x, y } (each is IMG_SIZE x IMG_SIZE). */
let imageRects = [];
/** Last two user-submitted prompts, for Combine. Cleared after each combine so flow is: 1, 2, combine→3, 4, 5, combine→6. */
let lastTwoPrompts = [];
/** True after a combine; next user prompt clears the screen and starts a new sequence. */
let sequenceComplete = false;

init();

function init() {
    initInterface();
}

function rectsOverlap(a, b, gap) {
    return !(a.x + IMG_SIZE + gap <= b.x || b.x + IMG_SIZE + gap <= a.x ||
             a.y + IMG_SIZE + gap <= b.y || b.y + IMG_SIZE + gap <= a.y);
}

function positionOverlapsAny(candidate, rects) {
    return rects.some(function (r) {
        return rectsOverlap(candidate, r, GAP);
    });
}

/** Returns a random position that doesn't overlap any existing image (incl. the last one). */
function randomImagePosition() {
    const maxX = Math.max(PADDING, window.innerWidth - IMG_SIZE - PADDING);
    const maxY = Math.max(PADDING, window.innerHeight - IMG_SIZE - PADDING);
    const rangeX = Math.max(0, maxX - PADDING);
    const rangeY = Math.max(0, maxY - PADDING);

    const maxTries = 120;
    for (let t = 0; t < maxTries; t++) {
        const x = rangeX <= 0 ? PADDING : PADDING + Math.random() * rangeX;
        const y = rangeY <= 0 ? PADDING : PADDING + Math.random() * rangeY;
        const candidate = { x, y };
        if (!positionOverlapsAny(candidate, imageRects)) return candidate;
    }

    // Grid fallback: find first position that doesn't overlap any existing image (avoids stacking on same spot)
    const step = IMG_SIZE + GAP;
    for (let x = PADDING; x + IMG_SIZE <= window.innerWidth - PADDING; x += step) {
        for (let y = PADDING; y + IMG_SIZE <= window.innerHeight - PADDING; y += step) {
            const candidate = { x, y };
            if (!positionOverlapsAny(candidate, imageRects)) return candidate;
        }
    }
    return { x: PADDING, y: PADDING };
}

/** Center of the screen for the combined image. */
function centerImagePosition() {
    return {
        x: Math.max(0, (window.innerWidth - IMG_SIZE) / 2),
        y: Math.max(0, (window.innerHeight - IMG_SIZE) / 2),
    };
}

function clearAllImages() {
    document.querySelectorAll(".generated-image").forEach(function (el) { el.remove(); });
    imageRects = [];
}

function generateImage(prompt) {
    const replicateProxy = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";
    const authToken = "";
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + authToken,
            Accept: "application/json",
        },
        body: JSON.stringify({
            model: "black-forest-labs/flux-schnell",
            input: { prompt: prompt },
        }),
    };
    return fetch(replicateProxy, options).then(function (r) { return r.json(); });
}

function placeImage(url, location, options) {
    options = options || {};
    if (!options.skipRects) imageRects.push({ x: location.x, y: location.y });
    const img = document.createElement("img");
    img.className = "generated-image";
    document.body.appendChild(img);
    img.style.position = "absolute";
    img.style.left = location.x + "px";
    img.style.top = location.y + "px";
    img.style.width = IMG_SIZE + "px";
    img.style.height = IMG_SIZE + "px";
    img.src = url;
}

function updateCombineButton() {
    combineBtn.style.display = lastTwoPrompts.length >= 2 ? "block" : "none";
}

async function askPictures(prompt) {
    if (sequenceComplete) {
        clearAllImages();
        sequenceComplete = false;
    }
    document.body.style.cursor = "progress";
    const location = randomImagePosition();
    const proxy_said = await generateImage(prompt);

    if (proxy_said.output && proxy_said.output.length > 0) {
        placeImage(proxy_said.output[0], location);
        lastTwoPrompts = lastTwoPrompts.concat([prompt]).slice(-2);
        updateCombineButton();
    } else {
        console.log("Something went wrong, try it again");
    }
    document.body.style.cursor = "auto";
}

async function onCombine() {
    if (lastTwoPrompts.length < 2) return;
    const combinedPrompt = lastTwoPrompts[0] + " " + lastTwoPrompts[1];
    document.body.style.cursor = "progress";
    combineBtn.disabled = true;
    const location = centerImagePosition();
    const proxy_said = await generateImage(combinedPrompt);

    if (proxy_said.output && proxy_said.output.length > 0) {
        placeImage(proxy_said.output[0], location, { skipRects: true });
        lastTwoPrompts = [];
        sequenceComplete = true;
        updateCombineButton();
    } else {
        console.log("Something went wrong, try again");
    }
    document.body.style.cursor = "auto";
    combineBtn.disabled = false;
}




function initInterface() {
    // Get the input box and the canvas element
    canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'myCanvas');
    canvas.style.position = 'absolute';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
    console.log('canvas', canvas.width, canvas.height);


    inputBox = document.createElement('input');
    inputBox.setAttribute('type', 'text');
    inputBox.setAttribute('id', 'inputBox');
    inputBox.setAttribute('placeholder', 'Enter text here');
    inputBox.style.position = 'fixed';
    inputBox.style.right = '20px';
    inputBox.style.top = '20px';
    inputBox.style.zIndex = '100';
    inputBox.style.fontSize = '30px';
    inputBox.style.fontFamily = 'Arial';
    inputBox.style.width = '280px';
    document.body.appendChild(inputBox);
    inputBox.setAttribute('autocomplete', 'off');

    inputBox.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            const inputValue = inputBox.value.trim();
            if (inputValue) askPictures(inputValue);
        }
    });

    combineBtn = document.createElement("button");
    combineBtn.setAttribute("type", "button");
    combineBtn.className = "combine-btn";
    combineBtn.textContent = "Combine";
    combineBtn.style.display = "none";
    document.body.appendChild(combineBtn);
    combineBtn.addEventListener("click", onCombine);
    updateCombineButton();
}



