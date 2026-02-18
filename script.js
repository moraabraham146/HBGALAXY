const videoElement = document.getElementsByClassName('input_video')[0];
let scene, camera, renderer, particles, starGeo;
let handX = 0, handY = 0, isHandPresent = false;
let currentMode = 'galaxy'; // Modos: 'galaxy', 'vortex', 'explode'

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 1;
    camera.rotation.x = Math.PI / 2;

    starGeo = new THREE.BufferGeometry();
    let positions = [];
    let velocities = [];

    // Crear 6,000 partículas
    for(let i=0; i<6000; i++) {
        positions.push(Math.random() * 600 - 300);
        positions.push(Math.random() * 600 - 300);
        positions.push(Math.random() * 600 - 300);
        velocities.push(0);
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    let sprite = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png');
    let starMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.7,
        map: sprite,
        transparent: true
    });

    particles = new THREE.Points(starGeo, starMaterial);
    scene.add(particles);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    animate();
}

function animate() {
    const positions = starGeo.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
        // Movimiento base de galaxia (caída constante)
        positions[i+1] -= 0.5; 

        // Interacción con la mano
        if (isHandPresent) {
            let dx = positions[i] - (handX * 400 - 200);
            let dy = positions[i+1] - (-(handY * 400 - 200));
            let dist = Math.sqrt(dx*dx + dy*dy);

            if(dist < 50) {
                // Si la mano está cerca, las partículas orbitan o se alejan
                positions[i] += dx * 0.1;
                positions[i+1] += dy * 0.1;
            }
        }

        // Resetear partículas que salen de pantalla
        if (positions[i+1] < -200) {
            positions[i+1] = 200;
        }
    }
    
    starGeo.attributes.position.needsUpdate = true;
    particles.rotation.y += 0.002;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Configuración de MediaPipe Hands
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        isHandPresent = true;
        const landmarks = results.multiHandLandmarks[0];
        // Usamos el punto medio de la palma (landmark 9)
        handX = landmarks[9].x;
        handY = landmarks[9].y;
    } else {
        isHandPresent = false;
    }
});

const cameraHandler = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 640,
    height: 480
});

cameraHandler.start();
initThree();

// Ajuste de ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
