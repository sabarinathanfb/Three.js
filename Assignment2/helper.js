import * as THREE from 'three';
import stars from './assets/stars.jpeg';
import { GUI } from 'dat.gui'; // Import dat.gui
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Car } from './models/Car.js'; // Import the Car class from your file

let scene, camera, renderer, controls;
let is2DView = true;
const objects = [];
const pillars = [];
const keyState = {};
const carObjects = [];
let draggedObject = null;
const floorBoundary = 250;
let selectedObject = null; // To store the selected object
let borderMesh = null; // To store the border mesh

// Main initialization
function init() {
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  renderer.setClearColor(0x000000, 1);

  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([stars, stars, stars, stars, stars, stars]);
  scene.background = texture;

  setupFloor();
  setupCamera();
  setupPillars();
  setupObjects();
  setupCarObjects();
  setupControls();

  // Create and add the car
 



  // Attach event listeners after initializing renderer
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  window.addEventListener('resize', onWindowResize);

  animate();
}

function setupGUI(car) {
  const gui = new GUI(); // Create a new GUI instance
  const carFolder = gui.addFolder('Car Controls'); // Create a folder for car controls

  // Add a controller to adjust the car size
  const carSizeController = carFolder.add({ size: 1 }, 'size', 1, 10).name('Car Size'); 
  carSizeController.onChange((value) => {
    car.scaleCar(value); // Update the car size when the value changes
  });

  carFolder.open(); // Open the folder by default
}

// Floor setup
function setupFloor() {
  const floorGeometry = new THREE.PlaneGeometry(500, 500);
  const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = Math.PI / 2;
  floor.position.y = -5;
  scene.add(floor);
}

// Camera setup for 2D and 3D views
function setupCamera() {
  if (is2DView) {
    camera = new THREE.OrthographicCamera(
      window.innerWidth / -2, window.innerWidth / 2,
      window.innerHeight / 2, window.innerHeight / -2,
      1, 1000
    );
    camera.position.set(0, 500, 0);
    camera.lookAt(0, 0, 0);
  } else {
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 100, 200);
    camera.lookAt(0, 0, 0);
  }
}

// Set up controls for 3D view
function setupControls() {
  if (!is2DView) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
  } else if (controls) {
    controls.dispose();
    controls = null;
  }
}

// Set up randomly placed pillars
function setupPillars() {
  const pillarMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const pillarGeometry = new THREE.BoxGeometry(30, 50, 30);

  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 4; i++) {
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set(-150 + (j * 140), 22, -200 + (i * 130));
      pillars.push(pillar);
      scene.add(pillar);
    }
  }
}

function setupObjects() {
  const objMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const objGeometry = new THREE.BoxGeometry(10, 10, 10);
  const numObjects = 5; // Number of objects to create

  const objectSelector = document.getElementById('objectSelector');

  const allOption = document.createElement('option');
  allOption.value = 'All Objects';
  allOption.textContent = 'All Objects';
  objectSelector.appendChild(allOption);

  for (let i = 0; i < numObjects; i++) {
    let object;
    let position;

    // Initialize object and check for collisions
    do {
      position = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(450), // Random x position
        5, // y position (above the ground)
        THREE.MathUtils.randFloatSpread(450) // Random z position
      );

      object = new THREE.Mesh(objGeometry, objMaterial);
      object.position.copy(position);
      object.name = `Object ${i + 1}`; // Assign a unique name
    } while (hasCollision(object)); // Check for collisions with pillars and other objects

    // If no collision, add object to the scene
    objects.push(object);
    scene.add(object); // Ensure `scene` is defined

    // Add object to the dropdown
    const option = document.createElement('option');
    option.value = object.name; // Set value to the object's name
    option.textContent = object.name; // Display name in dropdown
    objectSelector.appendChild(option); // Add the option to the select element
  }

  // Event listener for the dropdown
  objectSelector.addEventListener('change', function(event) {
    const selectedValue = event.target.value;

    // Clear previous borders
    if (borderMesh) {
      scene.remove(borderMesh);
      borderMesh = null; // Reset borderMesh after removing
    }

    if (selectedValue === 'All Objects') {
      // Create a border around all objects
      const borderMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });

      objects.forEach((obj) => {
        const borderGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 10, 10));
        const tempBorderMesh = new THREE.LineSegments(borderGeometry, borderMaterial);
        tempBorderMesh.position.copy(obj.position); // Position it at each object
        scene.add(tempBorderMesh); // Add each border to the scene
      });
    } else if (selectedValue) {
      // Handle selection of a single object
      const newSelectedObject = objects.find(obj => obj.name === selectedValue);
      if (newSelectedObject) {
        selectedObject = newSelectedObject;
        console.log(`Selected: ${selectedObject.name}`);

        // Create a border around the selected object
        const borderMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const borderGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 10, 10));
        borderMesh = new THREE.LineSegments(borderGeometry, borderMaterial);
        borderMesh.position.copy(selectedObject.position); // Position it at the selected object
        scene.add(borderMesh); // Add the border to the scene
      }
    } else {
      // If no valid selection, do nothing
      console.log("No object selected.");
    }
  });
}



// Event listener for the dropdown
objectSelector.addEventListener('change', function(event) {
  const selectedValue = event.target.value;

  // Handle selection change
  const selectedObject = objects.find(obj => obj.name === selectedValue);
  if (selectedObject) {
    console.log(`Selected: ${selectedObject.name}`);
    // Additional functionality can be implemented here
  }
});

function setupCarObjects(){


  for (let i = 0; i < 5; i++) {
    let car;
    let position;

    // Initialize car and check for collisions
    do {
      position = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(450), // Random x position
        0.5, // y position (above the ground)
        THREE.MathUtils.randFloatSpread(450) // Random z position
      );

      car = new Car(); // Assuming the Car class has a default constructor
      car.mesh.position.copy(position);
    } while (hasCollision(car.mesh)); // Check for collisions with pillars

    // If no collision, add car to the scene
    carObjects.push(car);
    scene.add(car.mesh);
    
    // Setup GUI for the car
    setupGUI(car);
  }

}

// Updated hasCollision function
function hasCollision(object, ignoreObject = null) {
  // Create a bounding box for the object
  const objBox = new THREE.Box3().setFromObject(object);
  
  // Check collision with floor boundaries
  if (
    object.position.x > floorBoundary || 
    object.position.x < -floorBoundary || 
    object.position.z > floorBoundary || 
    object.position.z < -floorBoundary
  ) {
    return true;
  }

  // Check collision with each pillar
  for (let pillar of pillars) {
    const pillarBox = new THREE.Box3().setFromObject(pillar);
    
    if (objBox.intersectsBox(pillarBox)) {
      return true;
    }
  }

  for (let car of carObjects) {
    if (car.mesh !== ignoreObject) {
      const carBox = new THREE.Box3().setFromObject(car.mesh);
      if (objBox.intersectsBox(carBox)) {
        return true;
      }
    }
  }


  // Check collision with other objects, unless it's the ignored one
  for (let otherObject of objects) {
    if (otherObject !== ignoreObject) {
      const otherBox = new THREE.Box3().setFromObject(otherObject);
      if (objBox.intersectsBox(otherBox)) {
        return true;
      }
    }
  }

  return false;
}

// View toggle
const viewToggle = document.getElementById("viewToggle");
if (viewToggle) {
  viewToggle.addEventListener("change", (event) => {
    is2DView = event.target.value === "2D";
    setupCamera();
    setupControls();
  });
}

function animate() {
  requestAnimationFrame(animate);

  // Update object positions based on key states
  if (keyState['ArrowUp'] || keyState['ArrowDown'] || keyState['ArrowLeft'] || keyState['ArrowRight']) {
    const movementVector = new THREE.Vector3();

    if (keyState['ArrowUp']) movementVector.z -= 1;
    if (keyState['ArrowDown']) movementVector.z += 1;
    if (keyState['ArrowLeft']) movementVector.x -= 1;
    if (keyState['ArrowRight']) movementVector.x += 1;

    movementVector.normalize(); // Normalize to ensure consistent movement speed

    if (document.getElementById('objectSelector').value === 'All Objects') {
      // Move all objects
      objects.forEach(object => {
        const tempObject = object.clone(); // Clone to check for collisions
        tempObject.position.add(movementVector);

        if (!hasCollision(tempObject)) {
          object.position.add(movementVector);
        }
      });
    } else if (selectedObject) {
      // Move only the selected object
      const tempObject = selectedObject.clone();
      tempObject.position.add(movementVector);

      if (!hasCollision(tempObject, selectedObject)) {
        selectedObject.position.add(movementVector);
      }
    }
  }

  renderer.render(scene, camera);
}






// Window resize handling
function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (camera.isPerspectiveCamera) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
}

let originalPosition = null; 
let isDraggingCar = false;
let carOriginalPosition = null;
const speedFactor = 0.5; // Adjust this value to control the speed of movement

function onMouseMove(event) {
  if (isDraggingCar || draggedObject) {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const floorIntersect = raycaster.intersectObject(
      scene.children.find(obj => obj.geometry instanceof THREE.PlaneGeometry)
    );

    if (floorIntersect.length > 0) {
      const newPosition = floorIntersect[0].point.clone();

      // Maintain the Y position to prevent going under the plane surface
      newPosition.y = draggedObject.position.y;

      // Calculate movement speed
      const moveDistanceX = (newPosition.x - draggedObject.position.x) * speedFactor;
      const moveDistanceZ = (newPosition.z - draggedObject.position.z) * speedFactor;

      // Update the dragged object's position with clamped values
      const clampedX = THREE.MathUtils.clamp(draggedObject.position.x + moveDistanceX, -floorBoundary, floorBoundary);
      const clampedZ = THREE.MathUtils.clamp(draggedObject.position.z + moveDistanceZ, -floorBoundary, floorBoundary);
      
      draggedObject.position.set(clampedX, draggedObject.position.y, clampedZ);
    }
  }
}

function onMouseDown(event) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  
  // Check if the car is clicked
  const intersectsCar = raycaster.intersectObjects(carObjects.map(car => car.mesh));
  if (intersectsCar.length > 0) {
    isDraggingCar = true;
    draggedObject = intersectsCar[0].object;
    carOriginalPosition = draggedObject.position.clone(); // Save the original position
    return; // Exit to avoid checking for other objects
  }

  // Check if any other object is clicked
  const intersects = raycaster.intersectObjects(objects);
  if (intersects.length > 0) {
    draggedObject = intersects[0].object;
    originalPosition = draggedObject.position.clone(); // Save the original position
  }
}

function onMouseUp() {
  if (isDraggingCar) {
    if (hasCollision(draggedObject, draggedObject)) {
      // Snap back to the original position if there's a collision
      draggedObject.position.copy(carOriginalPosition);
    }
    isDraggingCar = false; // Reset dragging state for the car
  } else {
    if (draggedObject && hasCollision(draggedObject, draggedObject)) {
      // Snap back to the original position if there's a collision
      draggedObject.position.copy(originalPosition);
    }
  }
  draggedObject = null; // Clear the dragged object
}




// Keyboard event handling
window.addEventListener('keydown', (event) => {
  keyState[event.key] = true; // Track pressed keys
});

window.addEventListener('keyup', (event) => {
  keyState[event.key] = false; // Track released keys
});

// Start the application
init();
