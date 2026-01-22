// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// State
const state = {
    running: true,
    mainCircle: {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 30,
        vx: 75, // pixels per second (increased speed)
        vy: 85,
        color: { h: 200, s: 80, l: 60 } // HSL base color (blue-cyan)
    },
    satellites: [],
    spokeAnimation: {
        progress: 0, // 0 to 1
        duration: 500 // milliseconds
    },
    animationStartTime: null
};

// Generate satellite positions around main circle
// Using polar coordinates: angle and radius from center
function generateSatellites() {
    const count = 8;
    const baseRadius = 150;
    const satellites = [];
    
    for (let i = 0; i < count; i++) {
        // Distribute angles evenly around the circle (2π / count)
        const angle = (Math.PI * 2 / count) * i;
        // Vary radius slightly for visual interest (±20%)
        const radius = baseRadius * (0.8 + Math.random() * 0.4);
        
        satellites.push({
            angle: angle,
            baseRadius: radius,
            // HSL color variation with increased variation: vary hue (±60°), saturation (30-100%), lightness (20-90%)
            color: {
                h: state.mainCircle.color.h + (Math.random() - 0.5) * 120,
                s: 30 + Math.random() * 70,
                l: 20 + Math.random() * 70
            },
            // Spoke color with increased variation: vary hue (±30°), saturation (40-100%), lightness (30-70%)
            spokeColor: {
                h: state.mainCircle.color.h + (Math.random() - 0.5) * 60,
                s: 40 + Math.random() * 60,
                l: 30 + Math.random() * 40
            }
        });
    }
    
    return satellites;
}

// Initialize satellites
state.satellites = generateSatellites();

// Bounce calculation: reflect velocity when hitting edges
// Formula: new_velocity = -old_velocity (with padding for radius)
function updateMainCircle(deltaTime) {
    if (!state.running) return;
    
    const circle = state.mainCircle;
    const padding = circle.radius;
    
    // Update position based on velocity (convert px/sec to px/frame)
    circle.x += (circle.vx * deltaTime) / 1000;
    circle.y += (circle.vy * deltaTime) / 1000;
    
    // Bounce off horizontal edges
    if (circle.x - padding <= 0 || circle.x + padding >= canvas.width) {
        circle.vx = -circle.vx;
        // Clamp position to prevent getting stuck
        circle.x = Math.max(padding, Math.min(canvas.width - padding, circle.x));
    }
    
    // Bounce off vertical edges
    if (circle.y - padding <= 0 || circle.y + padding >= canvas.height) {
        circle.vy = -circle.vy;
        // Clamp position to prevent getting stuck
        circle.y = Math.max(padding, Math.min(canvas.height - padding, circle.y));
    }
}

// Check if point (x, y) is inside a circle
function isPointInCircle(x, y, circleX, circleY, radius) {
    const dx = x - circleX;
    const dy = y - circleY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= radius;
}

// Get the satellite that was clicked (if any)
function getClickedSatellite(x, y) {
    if (state.running || state.satellites.length === 0) return null;
    
    const progress = state.spokeAnimation.progress;
    if (progress < 1) return null; // Only allow clicks when fully animated
    
    for (let satellite of state.satellites) {
        const pos = getSatellitePosition(satellite);
        const satelliteRadius = 15; // Base radius of satellite
        const scale = 0.3 + progress * 0.7;
        const actualRadius = satelliteRadius * scale;
        
        if (isPointInCircle(x, y, pos.x, pos.y, actualRadius)) {
            return satellite;
        }
    }
    
    return null;
}

// Handle click on canvas
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (state.running) {
        // If running, check if click is on main circle to stop
        if (isPointInCircle(x, y, state.mainCircle.x, state.mainCircle.y, state.mainCircle.radius)) {
            state.running = false;
            state.spokeAnimation.progress = 0;
            state.animationStartTime = performance.now();
        }
    } else {
        // If stopped, check if click is on a satellite
        const clickedSatellite = getClickedSatellite(x, y);
        if (clickedSatellite) {
            // Change main circle color to satellite color
            state.mainCircle.color = {
                h: clickedSatellite.color.h,
                s: clickedSatellite.color.s,
                l: clickedSatellite.color.l
            };
            
            // Regenerate satellites with new base color
            state.satellites = generateSatellites();
            
            // Resume movement and hide spokes
            state.running = true;
            state.spokeAnimation.progress = 0;
        }
    }
});

// Update cursor on hover
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (state.running) {
        // When running, show pointer on main circle
        if (isPointInCircle(x, y, state.mainCircle.x, state.mainCircle.y, state.mainCircle.radius)) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    } else {
        // When stopped, show pointer on satellites
        const hoveredSatellite = getClickedSatellite(x, y);
        if (hoveredSatellite) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    }
});

// Calculate satellite positions (static, no floating motion)
function getSatellitePosition(satellite) {
    // Base position in polar coordinates
    const angle = satellite.angle;
    const radius = satellite.baseRadius;
    
    // Convert to Cartesian coordinates relative to main circle
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    return {
        x: state.mainCircle.x + x,
        y: state.mainCircle.y + y
    };
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const circle = state.mainCircle;
    
    // Draw spokes and satellites (only when stopped)
    if (!state.running && state.satellites.length > 0) {
        // Update spoke animation progress
        if (state.animationStartTime) {
            const elapsed = performance.now() - state.animationStartTime;
            state.spokeAnimation.progress = Math.min(1, elapsed / state.spokeAnimation.duration);
        }
        
        const progress = state.spokeAnimation.progress;
        
        // Draw spokes with varied colors
        ctx.lineWidth = 1.5;
        
        state.satellites.forEach(satellite => {
            const pos = getSatellitePosition(satellite);
            
            // Draw spokes in white
            ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
            
            // Animate spoke length from 0 to full
            const startX = circle.x;
            const startY = circle.y;
            const endX = circle.x + (pos.x - circle.x) * progress;
            const endY = circle.y + (pos.y - circle.y) * progress;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Draw satellite circle (fade in with spoke animation)
            const satelliteAlpha = progress;
            const satColor = satellite.color;
            ctx.fillStyle = `hsla(${satColor.h}, ${satColor.s}%, ${satColor.l}%, ${satelliteAlpha})`;
            
            // Scale in effect
            const scale = 0.3 + progress * 0.7;
            ctx.beginPath();
            ctx.arc(endX, endY, 15 * scale, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    // Draw main circle
    ctx.fillStyle = `hsl(${circle.color.h}, ${circle.color.s}%, ${circle.color.l}%)`;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fill();
}

// Animation loop
let lastTime = performance.now();

function animate(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    updateMainCircle(deltaTime);
    draw();
    
    requestAnimationFrame(animate);
}

// Start animation
requestAnimationFrame(animate);