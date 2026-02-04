let inputLocationX = window.innerWidth / 2;
let inputLocationY = window.innerHeight / 2;

let canvas;
let inputBox;
let loadingMessage;
let currentBgColor = '#f5f5f5';

// Store text outputs for animation (text, type, basePosition, phase offsets for unique motion)
let textOutputs = [];
let animationTime = 0;


init();

function init() {

    // Perform initialization logic here
    initInterface();
    animate();
}

// Animate loop
function animate() {
    animationTime += 0.004;

    // Redraw all text outputs with animation
    drawAllTextOutputs();
    requestAnimationFrame(animate);
}

function getColorForType(type) {
    if (type === 'song') return '#2563eb';
    if (type === 'movie') return '#16a34a';
    return '#000000'; // word
}

function wordToPastelColor(word) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash = ((hash << 5) - hash) + word.charCodeAt(i) | 0;
    const h = Math.abs(hash % 360);
    const s = 0.35, l = 0.94;
    const hue2rgb = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const toHex = x => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0');
    return '#' + toHex(hue2rgb(p, q, h/360 + 1/3)) + toHex(hue2rgb(p, q, h/360)) + toHex(hue2rgb(p, q, h/360 - 1/3));
}

function drawAllTextOutputs() {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = currentBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = inputLocationX;
    const centerY = inputLocationY;

    for (let i = 0; i < textOutputs.length; i++) {
        const output = textOutputs[i];
        const t = animationTime + output.phaseX;
        const t2 = animationTime + output.phaseY;

        // Pulse: oscillate font size between 24 and 36 (slow)
        const pulseScale = 0.5 + 0.5 * Math.sin(t * 0.4);
        const fontSize = Math.round(24 + pulseScale * 12);

        // Slight drift: reduced range of motion
        const driftX = Math.sin(t) * 4 + Math.cos(t2 * 1.3) * 2;
        const driftY = Math.cos(t * 0.9) * 3 + Math.sin(t2) * 2;

        const x = output.basePosition.x + driftX;
        const y = output.basePosition.y + driftY;

        // Draw line from center (text box) to text
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = getColorForType(output.type);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = getColorForType(output.type);
        const textWidth = ctx.measureText(output.text).width;
        ctx.fillText(output.text, x - textWidth / 2, y);
    }
}


async function askWord(word, location) {
    const url = "https://itp-ima-replicate-proxy.web.app/api/create_n_get";
    //Get Auth Token from: https://itp-ima-replicate-proxy.web.app/
    let authToken = "";

    let prompt = "a json list of 5 words, 1 movie title,and 3 song titles that are related to " + word + " with no extra words or punctuation";
    document.body.style.cursor = "progress";
    if (loadingMessage) loadingMessage.style.display = 'block';
    const data = {
        model: "openai/gpt-5",
        input: {
            prompt: prompt,
        },
    };
    console.log("Making a Fetch Request", data);
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: 'application/json',
            'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(data),
    };
    try {
        const raw_response = await fetch(url, options);
        const json_response = await raw_response.json();
        console.log("json_response", json_response);
        currentBgColor = wordToPastelColor(word.trim() || 'default');
        let parsedResponse = JSON.parse(json_response.output.join(""));
        let responseCount = parsedResponse.length;

        const typeForIndex = (i) => {
            if (i < 5) return 'word';
            if (i === 5) return 'movie';
            return 'song';
        };

        textOutputs = [];
        const orbitRadius = 280;
        for (let i = 0; i < responseCount; i++) {
            let textResponse = String(parsedResponse[i]);
            let type = typeForIndex(i);
            let angle = (i * 2 * Math.PI) / responseCount;
            textOutputs.push({
                text: textResponse,
                type: type,
                basePosition: {
                    x: location.x + orbitRadius * Math.cos(angle),
                    y: location.y + orbitRadius * Math.sin(angle)
                },
                phaseX: i * 0.7,
                phaseY: i * 0.5 + 1.3
            });
        }
    } catch (err) {
        console.error("Error fetching related words:", err);
    } finally {
        document.body.style.cursor = "auto";
        if (loadingMessage) loadingMessage.style.display = 'none';
    }
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
    inputBox.style.position = 'absolute';
    inputBox.style.left = '50%';
    inputBox.style.top = '50%';
    inputBox.style.transform = 'translate(-50%, -50%)';
    inputBox.style.zIndex = '100';
    inputBox.style.fontSize = '30px';
    inputBox.style.fontFamily = 'Arial';
    document.body.appendChild(inputBox);
    inputBox.setAttribute('autocomplete', 'off');

    loadingMessage = document.createElement('div');
    loadingMessage.textContent = 'Loading...';
    loadingMessage.style.position = 'absolute';
    loadingMessage.style.left = '50%';
    loadingMessage.style.top = 'calc(50% + 50px)';
    loadingMessage.style.transform = 'translateX(-50%)';
    loadingMessage.style.zIndex = '101';
    loadingMessage.style.fontSize = '18px';
    loadingMessage.style.fontFamily = 'Arial';
    loadingMessage.style.color = '#666';
    loadingMessage.style.display = 'none';
    document.body.appendChild(loadingMessage);

    // Add event listener to the input box
    inputBox.addEventListener('keydown', function (event) {
        // Check if the Enter key is pressed

        if (event.key === 'Enter') {
            const inputValue = inputBox.value;
            askWord(inputValue, { x: inputLocationX, y: inputLocationY });

        }
    });

}



