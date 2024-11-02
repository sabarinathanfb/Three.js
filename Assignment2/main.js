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
const rectangles = [];
let draggedObject = null;
const floorBoundary = 250;
let selectedObject = objects;
let originalPosition; // Track original position of dragged object

// Main initialization
function init() {
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: true });
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
  setupRectangleObjects();
  setupControls();

  // Event listener for dropdown changes
  const objectSelector = document.getElementById('objectSelector');
  objectSelector.addEventListener('change', function (event) {
    const selectedValue = event.target.value;

    // Update the selected object based on the dropdown choice
    if (selectedValue === 'box') {
      selectedObject = objects;
    } else if (selectedValue === 'rectangle') {
      selectedObject = rectangles;
    }
  });

// Attach mouse and touch event listeners
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);

  // Add touch event listeners
  renderer.domElement.addEventListener('touchstart', onTouchStart);
  renderer.domElement.addEventListener('touchmove', onTouchMove);
  renderer.domElement.addEventListener('touchend', onTouchEnd);
  window.addEventListener('resize', onWindowResize);

  animate();
}

// Set up a GUI for controlling the car
function setupGUI(car) {
  const gui = new GUI();
  const carFolder = gui.addFolder('Car Controls');
  const carSizeController = carFolder.add({ size: 1 }, 'size', 1, 10).name('Car Size');
  carSizeController.onChange((value) => {
    car.scaleCar(value); // Update the car size when the value changes
  });
  carFolder.open();
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
      pillar.position.set(-150 + j * 140, 22, -200 + i * 130);
      pillars.push(pillar);
      scene.add(pillar);
    }
  }
}

// Set up other objects in the scene
function setupObjects() {
  const objMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const objGeometry = new THREE.BoxGeometry(10, 10, 10);
  const numObjects = 5;

  for (let i = 0; i < numObjects; i++) {
    let object;
    let position;

    do {
      position = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(450),
        5,
        THREE.MathUtils.randFloatSpread(450)
      );

      object = new THREE.Mesh(objGeometry, objMaterial);
      object.position.copy(position);
    } while (hasCollision(object));

    objects.push(object);
    scene.add(object);
  }
}

// Set up rectangle objects in the scene
function setupRectangleObjects() {
  const rectMaterial = new THREE.MeshBasicMaterial({ color: 'yellow' });
  const rectWidth = 50;
  const rectHeight = 10;
  const rectDepth = 30;
  const numRectangles = 5;

  for (let i = 0; i < numRectangles; i++) {
    let rectangle;
    let position;

    do {
      position = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(450),
        2.5,
        THREE.MathUtils.randFloatSpread(450)
      );

      rectangle = new THREE.Mesh(
        new THREE.BoxGeometry(rectWidth, rectHeight, rectDepth),
        rectMaterial
      );
      rectangle.position.copy(position);
    } while (hasCollision(rectangle));

    rectangles.push(rectangle);
    scene.add(rectangle);
  }
}

// Collision detection
function hasCollision(object, ignoreObject = null) {
  const objBox = new THREE.Box3().setFromObject(object);

  const coverBoundary = 10;
  // Check collision with floor boundaries
  if (
    object.position.x > floorBoundary + coverBoundary || 
    object.position.x < -floorBoundary + coverBoundary|| 
    object.position.z > floorBoundary + coverBoundary|| 
    object.position.z < -floorBoundary + coverBoundary
  ) {
    return true;
  }

  // Check collision with pillars
  for (let pillar of pillars) {
    const pillarBox = new THREE.Box3().setFromObject(pillar);
    if (objBox.intersectsBox(pillarBox)) {
      return true;
    }
  }

  // Check collision with rectangles
  for (let rectangle of rectangles) {
    if (rectangle !== ignoreObject) {
      const rectBox = new THREE.Box3().setFromObject(rectangle);
      if (objBox.intersectsBox(rectBox)) {
        return true;
      }
    }
  }

  // Check collision with other objects
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
const viewToggle = document.getElementById('viewToggle');
if (viewToggle) {
  viewToggle.addEventListener('change', (event) => {
    is2DView = event.target.value === '2D';
    setupCamera();
    setupControls();
  });
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  selectedObject.forEach(object => {
    let newPosition = object.position.clone();

    if (keyState['ArrowUp']) newPosition.z -= 1;
    if (keyState['ArrowDown']) newPosition.z += 1;
    if (keyState['ArrowLeft']) newPosition.x -= 1;
    if (keyState['ArrowRight']) newPosition.x += 1;

    const tempObject = object.clone();
    tempObject.position.copy(newPosition);

    if (!hasCollision(tempObject, object)) {
      object.position.copy(newPosition);
    }
  });

  renderer.render(scene, camera);
}

// Mouse event handling
function onMouseMove(event) {
  if (draggedObject) {
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
      newPosition.y = draggedObject.position.y; // Keep Y position fixed

      const tempObject = draggedObject.clone();
      tempObject.position.copy(newPosition);

      if (!hasCollision(tempObject, draggedObject)) {
        draggedObject.position.copy(newPosition);
      }
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

  const intersects = raycaster.intersectObjects([...objects, ...rectangles], true);

  if (intersects.length > 0) {
    draggedObject = intersects[0].object;
    originalPosition = draggedObject.position.clone();
  }
}

// function onMouseUp() {
//   draggedObject = null;
// }
// // Mouse event handling
// function onMouseMove(event) {
//   handleDrag(event);
// }

// function onMouseDown(event) {
//   handleDragStart(event);
// }

function onMouseUp() {
  handleDragEnd();
}

// Touch event handling
function onTouchMove(event) {
  handleDrag(event.touches[0]); // Use the first touch
}

function onTouchStart(event) {
  handleDragStart(event.touches[0]); // Use the first touch
}

function onTouchEnd() {
  handleDragEnd();
}

// Generalized drag handling
function handleDrag(event) {
  if (draggedObject) {
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
      newPosition.y = draggedObject.position.y; // Keep Y position fixed

      const tempObject = draggedObject.clone();
      tempObject.position.copy(newPosition);

      if (!hasCollision(tempObject, draggedObject)) {
        draggedObject.position.copy(newPosition);
      }
    }
  }
}

function handleDragStart(event) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects([...objects, ...rectangles], true);

  if (intersects.length > 0) {
    draggedObject = intersects[0].object;
    originalPosition = draggedObject.position.clone();
  }
}

function handleDragEnd() {
  draggedObject = null;
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight); // Adjust the renderer size
  camera.aspect = window.innerWidth / window.innerHeight; // Adjust camera aspect ratio
  camera.updateProjectionMatrix(); // Update camera projection
}

// Key handling for object movement
window.addEventListener('keydown', (event) => {
  keyState[event.key] = true;
});
window.addEventListener('keyup', (event) => {
  keyState[event.key] = false;
});

init();
