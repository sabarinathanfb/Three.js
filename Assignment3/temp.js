import * as THREE from 'three';

// Create the scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 1000;

// Create the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a 2D canvas to draw a circle in the center
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 256;
const context = canvas.getContext('2d');

// Fill the background with white
context.fillStyle = 'white';
context.fillRect(0, 0, canvas.width, canvas.height);

// Draw a red circle in the center
context.beginPath();
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = 100;  // Radius of the circle
context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
context.fillStyle = 'red';
context.fill();

// Create a texture from the canvas
const texture = new THREE.CanvasTexture(canvas);

// Create a plane geometry (single segment)
const geometry = new THREE.PlaneGeometry(1800, 800);

// Apply a basic material with the texture
const material = new THREE.MeshBasicMaterial({ map: texture });

// Create the mesh
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Render loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

