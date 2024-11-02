import * as THREE from 'three';
import { Human } from './src/models/Human.js'; // Adjust the import path as needed
import Tiles from './src/assets/tiles.jpg';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';


// Set up the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const axesHelper = new THREE.AxesHelper(20);
scene.add(axesHelper);

// Position the camera to look at the scene
camera.position.set(0, 30, 30); // Set camera position higher to view the plane and the human

const orbit = new OrbitControls(camera,renderer.domElement);


const textureLoader = new THREE.TextureLoader();
// Create a plane to serve as the ground
const planeGeometry = new THREE.PlaneGeometry(30, 30);
const planeMaterial = new THREE.MeshBasicMaterial({ color: 'white', side: THREE.DoubleSide, map: textureLoader.load(Tiles) }); // Add double-sided rendering
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // Rotate the plane to be horizontal
scene.add(plane);



// Create an instance of the Human class, passing the scene
const human = new Human(scene, new THREE.Vector3(0, 1.5, 10)); // Set initial position slightly above the plane

const human2 = new Human(scene, new THREE.Vector3(3, 1.5, 6));
const human3 = new Human(scene, new THREE.Vector3(5, 1.5, 3));

const humans = [human,human2,human3];

let selectedHuman = humans[0]; // Default to the first human

// Selection dropdown change event
document.getElementById('human-select').addEventListener('change', (event) => {
    const index = event.target.value;
    selectedHuman = humans[index]; // Update selected human based on dropdown
});

document.getElementById('turn-left').addEventListener('click', () => {
    selectedHuman.movementDirection.set(0, 0, 1); // Turn left (positive z)
});

document.getElementById('turn-right').addEventListener('click', () => {
    selectedHuman.movementDirection.set(0, 0, -1); // Turn right (negative z)
});

document.getElementById('move-forward').addEventListener('click', () => {
    selectedHuman.movementDirection.set(1, 0, 0); // Move forward (negative z)
});

document.getElementById('move-backward').addEventListener('click', () => {
    selectedHuman.movementDirection.set(-1, 0, 0); // Move backward (positive z)
});


// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update the human's walking animation
    human.update();
    human2.update();
    human3.update();

    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate();
