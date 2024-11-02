import * as THREE from 'three';

// Create the scene
const scene = new THREE.Scene();

// Create the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5; // Move the camera back so we can see the object

// Create the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create the geometry (a cube)
const obj = new THREE.BoxGeometry(1, 1, 1);

// Create the material (red color)
const objMaterial = new THREE.MeshBasicMaterial({ color: 'red' });

// Combine geometry and material into a mesh
const objMesh = new THREE.Mesh(obj, objMaterial);
scene.add(objMesh);

// Render the scene once
renderer.render(scene, camera);
