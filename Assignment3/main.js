import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import {QuadTree} from './src/models/QuadTree';


// ================== VARIABLES ==================
let scene, camera, renderer, controls, stats;
let layoutModel, botModel;
let collidableObjects = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;
const bounds = {
    x: { min: -900, max: 900 },
    z: { min: -400, max: 400 },
};
const quadTree = new QuadTree(bounds);

let mixer; // Animation mixer
const clock = new THREE.Clock();
const crossFadeControls = [];
let currentBaseAction = 'idle';
const allActions = [];
const baseActions = {
    idle: { weight: 1 },
    walk: { weight: 0 },
    run: { weight: 0 }
};
let panelSettings;
const loader = new GLTFLoader();

let previousPosition = null; // To store the previous bot position
let pathLines = [];
async function addBotPosition(botName, x, z) {
    // Create an object that includes the bot name, x, and z
    const botPosition = {
        name: botName, // Include bot name
        x: x,
        z: z
    };

    console.log(botName,x,z);



    // Send the object as JSON to the server
    const response = await fetch('http://localhost:3000/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(botPosition) // Send the object as JSON
    });

    if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Inserted document:', data); // Log the inserted document
}




// fetchDocuments(); // Call this to fetch documents


// ================== INITIALIZATION ==================
function init() {
    // ================== SCENE SETUP ==================
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 10, 100000);
    camera.position.set(0, 500, 100);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // ================== LIGHTING ==================
    const ambientLight = new THREE.AmbientLight('white', 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight('white', 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // ================== CONTROLS ==================
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.update();

    // ================== MODEL LOADING ==================
    loadLayoutModel();

    // ================== STATS ==================
    stats = new Stats();
    document.body.appendChild(stats.dom);

    // ================== GUI ==================
    createPanel();



    // ================== EVENT LISTENERS ==================
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);



    
    // ================== START ANIMATION ==================
    animate();
}

// ================== WINDOW RESIZE HANDLER ==================
function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ================== MOUSE INTERACTIONS ==================
function handleMouseDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(collidableObjects);

    if (intersects.length > 0) {
        selectedObject = intersects[0].object;
        selectedObject.material.emissive.set(0xff0000); // Highlight the selected object
    }
}

function handleMouseMove(event) {
    if (selectedObject) {
        const pos = new THREE.Vector3();
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pos);
        selectedObject.position.copy(pos);
    }
}

function handleMouseUp() {
    if (selectedObject) {
        selectedObject.material.emissive.set(0x000000); // Reset the highlight
        selectedObject = null;
    }
}

// ================== DISPOSAL FUNCTION ==================
function disposeObject(object) {
    if (object.geometry) {
        object.geometry.dispose(); // Dispose of the geometry
    }

    if (object.material) {
        if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose()); // Dispose of all materials
        } else {
            object.material.dispose(); // Dispose of single material
        }
    }
}

// Dispose of the model when no longer needed
function disposeModel(model) {
    model.traverse((object) => {
        disposeObject(object); // Dispose each object in the model
    });

    scene.remove(model); // Remove model from the scene
}

// ================== MODEL LOADING ==================
// You already have the loadBotModel and loadLayoutModel functions
// Ensure you call disposeModel when needed

function loadBotModel() {
    loader.load('./assets/Xbot.glb', (gltf) => {
        if (botModel) disposeModel(botModel); // Dispose previous model if it exists

        botModel = gltf.scene;
        scene.add(botModel);
        botModel.scale.set(50, 50, 50);
        botModel.position.set(0, 0, 0);

        botModel.traverse((object) => {
            if (object.isMesh) object.castShadow = true; // Enable shadow casting
        });

        const animations = gltf.animations;
        mixer = new THREE.AnimationMixer(botModel);

        animations.forEach((clip) => {
            const name = clip.name;
            if (baseActions[name]) {
                const action = mixer.clipAction(clip);
                activateAction(action);
                baseActions[name].action = action;
                allActions.push(action);
            }
        });
    }, undefined, (error) => {
        console.error('Error loading bot model:', error);
    });
}



function loadLayoutModel() {
    loader.load('./assets/Main_Layout.gltf', (gltf) => {
        if (layoutModel) disposeModel(layoutModel); // Dispose previous layout if it exists

        layoutModel = gltf.scene;
        scene.add(layoutModel);
        layoutModel.position.set(0, 0, 0);
        console.log(layoutModel.children[0]);

        for (let i = 1; i < layoutModel.children.length; i++) {
            collidableObjects.push(layoutModel.children[i]);
        }

        // Load the bot model after the layout model is loaded
        loadBotModel();

       
    });
}





function addBoxHelper(object, color = 0xff0000) {
    const boxHelper = new THREE.BoxHelper(object, color);
    scene.add(boxHelper);
    return boxHelper;
}


// ================== COLLISION DETECTION ==================
function hasCollision(object) {
 

    // Create a bounding box for the object
    const objectBox = new THREE.Box3().setFromObject(object);

    // // // Add a visual helper for the object
    // addBoxHelper(object, 0x00ff00); // Green for the main object


    // Check for collisions with collidable objects
    for (const collidable of collidableObjects) {
        // Ensure the collidable object is a valid THREE.Object3D
        if (!collidable.isObject3D) {
            continue; // Skip invalid objects
        }

        // Create a bounding box for the collidable object
        const collidableBox = new THREE.Box3().setFromObject(collidable);

        // Add a visual helper for each collidable object
        // addBoxHelper(collidable, 0xff0000); // Red for collidable objects

        // Check for intersection (collision) between object and collidable
        if (objectBox.intersectsBox(collidableBox)) {
            console.log('Collision with object:', collidable);
            return true; // Collision occurred
        }
    }

    return false; // No boundary crossing or collisions detected
}


function updateBotPosition(botPosition) {
    const point = { x: botPosition.x, z: botPosition.z };

    addBotPosition("bot1",point.x, point.z)
    .then(() => console.log('Bot position added successfully'))
    .catch(error => console.error('Error adding bot position:', error));

    

    // Insert the new point in the QuadTree
    const existingPoint = quadTree.insert(point);

    if (existingPoint) {
        console.log(`Point updated: ${JSON.stringify(existingPoint)}`);
    } else {
        console.log(`New point added: ${JSON.stringify(point)}`);
    }

    // Check if there was a previous position to draw a line from
    if (previousPosition) {
        // Create a new line segment between the previous and current positions
        drawLine(previousPosition, botPosition);
    }

    // Update the previous position to the current one
    previousPosition = { x: botPosition.x, y: botPosition.y, z: botPosition.z };
}

// function drawLine(startPosition, endPosition) {
//     const material = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Green line for path

//     const points = [];
//     points.push(new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z));
//     points.push(new THREE.Vector3(endPosition.x, endPosition.y, endPosition.z));

//     const geometry = new THREE.BufferGeometry().setFromPoints(points);

//     const line = new THREE.Line(geometry, material);
//     line.position.y = 1;
//     scene.add(line);

//     // Store the line so that it can be managed later if needed
//     pathLines.push(line);
// }
document.getElementById('bot_1_button').addEventListener('click', () => {
    drawBotLine('bot1'); // Call the function to draw the line for bot1
});

async function fetchBotPositions(botName) {
    try {
        const response = await fetch(`http://localhost:3000/bot/${botName}`); // Use botName parameter
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log('Bot Positions:', data);
        return data; // Return the positions data
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        return []; // Return an empty array in case of error
    }
}

async function drawBotLine(botName) {
    try {
        const positions = await fetchBotPositions(botName);
        console.log('draw inputs',positions);
        
        // Check if positions is not empty
        if (positions.length === 0) {
            console.warn('No positions found for bot:', botName);
            return; // Exit if no positions
        }

        // Create an array of THREE.Vector3 from positions
        const points = positions.map(pos => new THREE.Vector3(pos.x, 0, pos.z)); // Assuming y is 0 for ground level

        // Create a geometry for the line
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Create a material for the line
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });

        // Create the line
        const line = new THREE.Line(geometry, material);

        // Assuming you have a scene variable defined
        scene.add(line);

        line.position.y = 2;
        

    } catch (error) {
        console.error('Error drawing line:', error);
    }
}



document.getElementById('getEntriesButton').addEventListener('click', () => {
    const allPointsWithFrequency = quadTree.retrieve(bounds);
    console.log('All points in the QuadTree with frequency:', allPointsWithFrequency);
});

// ================== KEYBOARD CONTROLS ==================
let isWalking = false; // Flag to track if the bot is currently walking
function handleKeyDown(event) {
    if (botModel) {
        const moveDistance = 10; // Movement distance
        const originalPosition = botModel.position.clone(); // Store the original position

        // Move the bot based on the key pressed
        switch (event.code) {
            case 'ArrowRight':
                botModel.position.x += moveDistance; // Move right
                break;
            case 'ArrowLeft':
                botModel.position.x -= moveDistance; // Move left
                break;
            case 'ArrowUp':
                botModel.position.z -= moveDistance; // Move forward
                break;
            case 'ArrowDown':
                botModel.position.z += moveDistance; // Move backward
                break;
        }

        // Check for collisions after moving
        const collidedObject = hasCollision(botModel);
        if (collidedObject) {
            botModel.position.copy(originalPosition); // Reset position if collision occurs
            console.log('Collision detected with:', collidedObject.name); // Log the colliding object name
            console.log('Collision position:', botModel.position);
        } else {
            updateBotPosition({x:botModel.position.x,z:botModel.position.z});
        }
    }
}






function triggerWalkingActionIfNeeded() {
    if (!isWalking) {
        triggerWalkAction(); // Start the walk action
        isWalking = true; // Set the walking flag to true
    }
}

function triggerIdleAction() {
    const idleAction = baseActions['idle'].action;

    if (idleAction) {
        prepareCrossFade(allActions.find(action => action.getClip().name === currentBaseAction), idleAction, 1);
        isWalking = false; // Reset walking state when idle action is triggered
    }
}

function triggerWalkAction() {
    const walkAction = baseActions['walk'].action;

    if (walkAction) {
        prepareCrossFade(allActions.find(action => action.getClip().name === currentBaseAction), walkAction, 1);
    }
}

// Add keyup event listener to reset walking state
document.addEventListener('keyup', () => {
    if (isWalking) {
        triggerIdleAction(); // Call idle action when any key is released
    }
});



// ================== ANIMATION CONTROLS ==================
function createPanel() {

    const panel = new GUI( { width: 310 } );

    const folder1 = panel.addFolder( 'Base Actions' );
    const folder3 = panel.addFolder( 'General Speed' );

    panelSettings = {
        'modify time scale': 1.0
    };

    const baseNames = [ 'None', ...Object.keys( baseActions ) ];

    for ( let i = 0, l = baseNames.length; i !== l; ++ i ) {

        const name = baseNames[ i ];
        const settings = baseActions[ name ];
        panelSettings[ name ] = function () {

            const currentSettings = baseActions[ currentBaseAction ];
            const currentAction = currentSettings ? currentSettings.action : null;
            const action = settings ? settings.action : null;

            if ( currentAction !== action ) {

                prepareCrossFade( currentAction, action, 0.35 );

            }

        };

        crossFadeControls.push( folder1.add( panelSettings, name ) );

    }

    folder3.add( panelSettings, 'modify time scale', 0.0, 1.5, 0.01 ).onChange( modifyTimeScale );

    folder1.open();
    folder3.open();

    crossFadeControls.forEach( function ( control ) {

        control.setInactive = function () {

            control.domElement.classList.add( 'control-inactive' );

        };

        control.setActive = function () {

            control.domElement.classList.remove( 'control-inactive' );

        };

        const settings = baseActions[ control.property ];

        if ( ! settings || ! settings.weight ) {

            control.setInactive();

        }

    } );

}

function activateAction( action ) {

    const clip = action.getClip();
    const settings = baseActions[ clip.name ] || additiveActions[ clip.name ];
    setWeight( action, settings.weight );
    action.play();

}

function modifyTimeScale( speed ) {

    mixer.timeScale = speed;

}

function prepareCrossFade( startAction, endAction, duration ) {

    // If the current action is 'idle', execute the crossfade immediately;
    // else wait until the current action has finished its current loop

    if ( currentBaseAction === 'idle' || ! startAction || ! endAction ) {

        executeCrossFade( startAction, endAction, duration );

    } else {

        synchronizeCrossFade( startAction, endAction, duration );

    }

    // Update control colors

    if ( endAction ) {

        const clip = endAction.getClip();
        currentBaseAction = clip.name;

    } else {

        currentBaseAction = 'None';

    }

    crossFadeControls.forEach( function ( control ) {

        const name = control.property;

        if ( name === currentBaseAction ) {

            control.setActive();

        } else {

            control.setInactive();

        }

    } );

}

function synchronizeCrossFade( startAction, endAction, duration ) {

    mixer.addEventListener( 'loop', onLoopFinished );

    function onLoopFinished( event ) {

        if ( event.action === startAction ) {

            mixer.removeEventListener( 'loop', onLoopFinished );

            executeCrossFade( startAction, endAction, duration );

        }

    }

}

function executeCrossFade( startAction, endAction, duration ) {

    // Not only the start action, but also the end action must get a weight of 1 before fading
    // (concerning the start action this is already guaranteed in this place)

    if ( endAction ) {

        setWeight( endAction, 1 );
        endAction.time = 0;

        if ( startAction ) {

            // Crossfade with warping

            startAction.crossFadeTo( endAction, duration, true );

        } else {

            // Fade in

            endAction.fadeIn( duration );

        }

    } else {

        // Fade out

        startAction.fadeOut( duration );

    }

}

// This function is needed, since animationAction.crossFadeTo() disables its start action and sets
// the start action's timeScale to ((start animation's duration) / (end animation's duration))

function setWeight(action, weight) {
    if (action) {  // Ensure action is not null or undefined
        action.enabled = true;
        action.setEffectiveTimeScale(1);
        action.setEffectiveWeight(weight);
    }
}
// ================== ANIMATION LOOP ==================
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta); // Update the animation mixer
    stats.update(); // Update stats panel
    renderer.render(scene, camera); // Render the scene
}
// ================== START ==================
init();
