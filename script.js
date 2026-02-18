const videoElement = document.getElementsByClassName('input_video')[0];
const statusText = document.getElementById('status');
let scene, camera, renderer, starGeo;
let particles = [];
let currentMode = 'idle'; // 'idle', 'heart', 'papa'

const PARTICLE_COUNT = 5000;

// Geometrías para las formas
let heartPoints = [];
let papaPoints = [];

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 250;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    createShapes();
    createParticles();
    initMediaPipe();
    animate();
}

function createShapes() {
    // 1. Crear Corazón (Ecuación paramétrica)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        let t = Math.random() * Math.PI * 2;
        let x = 16 * Math.pow(Math.sin(t), 3);
        let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        heartPoints.push(new THREE.Vector3(x * 6, y * 6, 0));
    }

    // 2. Crear mensaje "PAPA" (Puntos simplificados en cuadrícula)
    // Esto es una aproximación, puedes refinar los puntos si deseas
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        papaPoints.push(new THREE.Vector3((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 100, 0));
    }
}

function createParticles() {
    starGeo = new THREE.BufferGeometry();
    let positions = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        let p = {
            x: (Math.random() - 0.5) * 800,
            y: (Math.random() - 0.5) * 800,
            z: (Math.random() - 0.5) * 800,
            originX: 0, originY: 0, originZ: 0,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5
        };
        p.originX = p.x; p.originY = p.y; p.originZ = p.z;
        particles.push(p);
        
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    let material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        transparent: true,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(starGeo, material);
    scene.add(points);
}

function animate() {
    const positions = starGeo.attributes.position.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        let p = particles[i];
        let target = null;

        if (currentMode === 'heart') target = heartPoints[i];
        else if (currentMode === 'papa') target = papaPoints[i];

        if (target) {
            // Suavizado de movimiento hacia el objetivo (Lerp)
            p.x += (target.x - p.x) * 0.08;
            p.y += (target.y - p.y) * 0.08;
            p.z += (target.z - p.z) * 0.08;
        } else {
            // Modo Galaxia: flotar libremente
            p.x += p.vx;
            p.y += p.vy;
            if (Math.abs(p.x) > 400) p.vx *= -1;
            if (Math.abs(p.y) > 400) p.vy *= -1;
        }

        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
    }

    starGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

function initMediaPipe() {
    const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
    
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });

    hands.onResults((results) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Lógica de Gestos
            const isFist = landmarks[8].y > landmarks[6].y && landmarks[12].y > landmarks[10].y;
            const isHandOpen = landmarks[8].y < landmarks[6].y && landmarks[4].y < landmarks[2].y;

            if (isFist) {
                currentMode = 'heart';
                statusText.innerText = "❤️ ¡Te quiero, Papá! ❤️";
            } else if (isHandOpen) {
                currentMode = 'papa';
                statusText.innerText = "✨ ¡Eres el mejor! ✨";
            } else {
                currentMode = 'idle';
                statusText.innerText = "Mueve tus manos para descubrir las formas";
            }
        } else {
            currentMode = 'idle';
        }
    });

    const cameraProvider = new Camera(videoElement, {
        onFrame: async () => await hands.send({image: videoElement}),
        width: 640, height: 480
    });
    cameraProvider.start();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
