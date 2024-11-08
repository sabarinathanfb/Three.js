import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import {QuadTree} from './src/models/QuadTree';


// ================== VARIABLES ==================
let scene, camera, renderer, controls, stats;
let layoutModel, botModel;
let collidableObjects = [];
let zoneList = [];
let botList = [];
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
    // window.addEventListener('mousedown', handleMouseDown);
    // window.addEventListener('mousemove', handleMouseMove);
    // window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);



    
    // ================== START ANIMATION ==================
    animate();
}

const botDropdown = document.getElementById('botDropdown');

// Function to update the dropdown with the bot names
function updateBotDropdown() {
    // Clear existing options
    botDropdown.innerHTML = '<option value="">Select Bot</option>';

    // Add new options based on botList
    botList.forEach((bot) => {
        const option = document.createElement('option');
        option.value = bot.name;
        option.textContent = bot.name;
        botDropdown.appendChild(option);
    });
}



// Set selectedObject when a bot is chosen from the dropdown
botDropdown.addEventListener('change', (event) => {
    const selectedBotName = event.target.value;

    if (selectedBotName) {
        // Find the selected bot from botList
        const selectedBot = botList.find((bot) => bot.name === selectedBotName);

        if (selectedBot) {
            selectedObject = selectedBot;  // Update selectedObject with the selected bot
            console.log(`Selected Bot: ${selectedObject.name}`);
        }
    } else {
        selectedObject = null;  // If no bot is selected, set selectedObject to null
    }
});

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

// // ================== DISPOSAL FUNCTION ==================
// function disposeObject(object) {
//     if (object.geometry) {
//         object.geometry.dispose(); // Dispose of the geometry
//     }

//     if (object.material) {
//         if (Array.isArray(object.material)) {
//             object.material.forEach(material => material.dispose()); // Dispose of all materials
//         } else {
//             object.material.dispose(); // Dispose of single material
//         }
//     }
// }

// // Dispose of the model when no longer needed
// function disposeModel(model) {
//     model.traverse((object) => {
//         disposeObject(object); // Dispose each object in the model
//     });

//     scene.remove(model); // Remove model from the scene
// }
function loadLayoutModel() {
    loader.load('./assets/Main_Layout.gltf', (gltf) => {
        // if (layoutModel) disposeModel(layoutModel); // Dispose previous layout if it exists

        layoutModel = gltf.scene;
        scene.add(layoutModel);
        layoutModel.position.set(0, 0, 0);
        console.log(layoutModel.children[0]);

        for (let i = 1; i < layoutModel.children.length; i++) {
            collidableObjects.push(layoutModel.children[i]);
        }
    });

    
    // botList.push(createBotModel('x',50,50,50,0,0));
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

function drawLine(startPosition, endPosition) {
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Green line for path

    const points = [];
    points.push(new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z));
    points.push(new THREE.Vector3(endPosition.x, endPosition.y, endPosition.z));

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const line = new THREE.Line(geometry, material);
    line.position.y = 1;
    scene.add(line);

    // Store the line so that it can be managed later if needed
    pathLines.push(line);
}
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
    if (selectedObject) {
        const moveDistance = 10; // Movement distance
        const originalPosition = selectedObject.position.clone(); // Store the original position
        console.log(selectedObject);

        // Move the bot based on the key pressed
        switch (event.code) {
            case 'ArrowRight':
                selectedObject.position.x += moveDistance; // Move right
                break;
            case 'ArrowLeft':
                selectedObject.position.x -= moveDistance; // Move left
                break;
            case 'ArrowUp':
                selectedObject.position.z -= moveDistance; // Move forward
                break;
            case 'ArrowDown':
                selectedObject.position.z += moveDistance; // Move backward
                break;
        }

        checkBotInZone(selectedObject);
        // Check for collisions after moving
        const collidedObject = hasCollision(selectedObject);
        if (collidedObject) {
            selectedObject.position.copy(originalPosition); // Reset position if collision occurs
            console.log('Collision detected with:', collidedObject.name); // Log the colliding object name
            console.log('Collision position:', selectedObject.position);
        } else {
            // updateBotPosition({x:selectedObject.position.x,z:selectedObject.position.z});
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

function createBoxFromPoints(width, height, positionX, positionZ, zoneName) {
    // Create the box geometry (this will define the shape)
    const boxGeometry = new THREE.BoxGeometry(width, 0.01, height);

    // Create the edges geometry from the box geometry
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);

    // Create a line material for the edges
    const lineMaterial = new THREE.LineBasicMaterial({ color: 'green' });

    // Create the line segments that represent the border of the box
    const borderBox = new THREE.LineSegments(edgesGeometry, lineMaterial);

    // Optionally position the box on the ground (set y position)
    borderBox.position.set(positionX, 1, positionZ);

    // Create a group to hold both borderBox and textMesh
    const zoneGroup = new THREE.Group();
    
    // Add the border box to the group
    zoneGroup.add(borderBox);

    const fontLoader = new FontLoader();

    // Load the font file and create the text
    fontLoader.load('./assets/fonts/gentilis_bold.typeface.json', function (font) {
        const textGeometry = new TextGeometry(zoneName, {
            font: font,
            size: 10,              // Adjust text size as needed
            depth: 1,             // Depth of the text
            curveSegments: 12,     // Number of segments for curves
            bevelEnabled: true,    // Enable/Disable bevel
            bevelThickness: 0.2,   // Thickness of the bevel
            bevelSize: 0.1,        // Distance from text outline to bevel
            bevelOffset: 0,
            bevelSegments: 3
        });

        // Center the text inside the box
        textGeometry.computeBoundingBox();
        const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
        const textHeight = textGeometry.boundingBox.max.y - textGeometry.boundingBox.min.y;

        const textMesh = new THREE.Mesh(textGeometry, new THREE.MeshBasicMaterial({ color: 0xffffff }));

        // Position the text in the center of the box
        textMesh.position.set(positionX - width / 2 + textWidth / 2, 1, positionZ);
        textMesh.rotation.x = -Math.PI / 2;

        // Add the text to the group
        zoneGroup.add(textMesh);
    });

    // Add the group to the scene
    scene.add(zoneGroup);

    // Return the group for further manipulation if needed
    return { zoneGroup,zoneName, hasEntered: false };
}
function deleteZone(zoneName) {
    // Find the zone object by its name in the array
    const zoneIndex = zoneList.findIndex(zone => zone.zoneName === zoneName);

    if (zoneIndex !== -1) {
        const zone = zoneList[zoneIndex];

        // Remove the border box and the text from the scene
        scene.remove(zone.zoneGroup);

        // Remove the zone from the list
        zoneList.splice(zoneIndex, 1);
        console.log(`Zone "${zoneName}" has been deleted.`);
        console.log(zoneList);
    } else {
        console.warn(`No zone found with the name "${zoneName}".`);
    }
}
// Function to check if the bot has entered a zone
function checkBotInZone(bot) {
    const botPosition = bot.position;
    console.log("checking bot is inside zone");
    zoneList.forEach(zone => {
        const boxPos = zone.zoneGroup.children[0].position
        console.log(boxPos);
        const geometry = zone.zoneGroup.children[0].geometry.parameters.geometry.parameters
        const width = geometry.width;
        const depth = geometry.depth;

        // Calculate the zone's boundaries based on its position and size
        const minX = boxPos.x - width / 2;
        const maxX = boxPos.x + width / 2;
        const minZ = boxPos.z - depth / 2;
        const maxZ = boxPos.z + depth / 2;

        console.log("Zone boundaries:");
        console.log("minX:", minX, "maxX:", maxX);
        console.log("minZ:", minZ, "maxZ:", maxZ);
        console.log("Bot position:", botPosition.x, botPosition.z);

        if (botPosition.x >= minX && botPosition.x <= maxX &&
            botPosition.z >= minZ && botPosition.z <= maxZ) {

            // Check if the bot has already entered the zone
            if (!zone.hasEntered) {
                console.log("Bot enters zone");

                // Bot has entered the zone for the first time, trigger alert
                alert(`${bot.name} entered ${zone.zoneName}`);

                // Set the flag to true so the alert won't trigger again for this zone
                zone.hasEntered = true;
            }
           
        }else {
            // If the bot has entered the zone previously and is now outside, trigger exit alert
            if (zone.hasEntered) {
                console.log("Bot exits zone");
    
                // Bot has exited the zone, trigger exit alert
                alert(`${bot.name} exited ${zone.zoneName}`);
    
                // Set the flag to false so the entry alert can trigger again next time
                zone.hasEntered = false;
            }
        }
    });
}

// ================== MODEL LOADING ==================
// You already have the loadBotModel and loadLayoutModel functions
// Ensure you call disposeModel when needed

async function createBotModel(botName, scaleX, scaleY, scaleZ, posX, posZ) {
    return new Promise((resolve, reject) => {
        loader.load('./assets/Xbot.glb', (gltf) => {
            botModel = gltf.scene;
            scene.add(botModel);
            botModel.name = botName;
            botModel.scale.set(scaleX, scaleY, scaleZ);
            botModel.position.set(posX, 0, posZ);

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

            resolve(botModel); // Resolve with botModel when done
        }, undefined, (error) => {
            console.error('Error loading bot model:', error);
            reject(error); // Reject in case of error
        });
    });
}
// ================== ANIMATION CONTROLS ==================
function createPanel() {

    const panel = new GUI( { width: 310 } );

    // Folder for zone management
    const zoneFolder = panel.addFolder('Zone Management');

    // Zone object to store data
    const zoneData = {
        width: 10,
        height: 10,
        positionX: 0,
        positionZ: 0,
        zoneName: 'Zone 1'
    };
    // Add controls for zone properties
    zoneFolder.add(zoneData, 'zoneName').name('Zone Name');
    zoneFolder.add(zoneData, 'width', 1, 100).name('Width');
    zoneFolder.add(zoneData, 'height', 1, 100).name('Height');
    zoneFolder.add(zoneData, 'positionX', -900, 900).name('Position X');
    zoneFolder.add(zoneData, 'positionZ', -400, 400).name('Position Z');

    // Button to create zone
    zoneFolder.add({
        createZone: () => {
            const zoneName = zoneData.zoneName;

            // Check if zone already exists
            if (!zoneList.some(zone => zone.zoneName === zoneName)) {
                // Create zone
                const newZone = createBoxFromPoints(zoneData.width, zoneData.height, zoneData.positionX, zoneData.positionZ, zoneName);

                // Store the entire zone object (borderBox, textMesh, and zoneName)
                zoneList.push(newZone);
                console.log(zoneList);
                updateZoneList();
            } else {
                console.warn('Zone with this name already exists.');
            }
        }
    }, 'createZone').name('Create Zone');

    // Dropdown to show created zones
    let zoneDropdown = zoneFolder.add({ selectedZone: '' }, 'selectedZone', zoneList.map(zone => zone.zoneName)).name('Select Zone');

    // Button to delete selected zone
    zoneFolder.add({
        deleteZone: () => {
            const zoneName = zoneDropdown.getValue();

            // Check if selected zone exists
            const index = zoneList.findIndex(zone => zone.zoneName === zoneName);
            if (index !== -1) {
                // Delete zone from Three.js scene
                deleteZone(zoneName);
                console.log('Zone deleted:', zoneName);
                updateZoneList();
            } else {
                console.warn('No zone selected or zone does not exist.');
            }
        }
    }, 'deleteZone').name('Delete Selected Zone');

    // Function to update dropdown list when zones are added or deleted
    function updateZoneList() {
        const zoneNames = zoneList.map(zone => zone.zoneName);
        zoneDropdown = zoneDropdown.options(zoneNames.length ? zoneNames : ['']);
        console.log("----------", zoneDropdown.setValue(zoneNames.length ? zoneNames[0] : ''));
    }

    zoneFolder.open();

    // Folder for Bot-Model
    const botFolder = panel.addFolder('Bot Management');

    // Bot settings object
    const botData = {
        botName: 'Bot 1', // Default bot name
        scaleX: 50,
        scaleY: 50,
        scaleZ: 50,
        posX: 0,
        posY: 0,
        posZ: 0
    };

    // Add controls for bot name, scale, and position
    botFolder.add(botData, 'botName').name('Bot Name'); // Text input for bot name
    botFolder.add(botData, 'scaleX', 1, 100).name('Scale X');
    botFolder.add(botData, 'scaleY', 1, 100).name('Scale Y');
    botFolder.add(botData, 'scaleZ', 1, 100).name('Scale Z');
    botFolder.add(botData, 'posX', -500, 500).name('Position X');
    botFolder.add(botData, 'posY', -500, 500).name('Position Y');
    botFolder.add(botData, 'posZ', -500, 500).name('Position Z');

    // Function to handle bot creation and update the bot list
    botFolder.add({
        async createBot() {
            const botName = botData.botName;

            if (!botList.some(bot => bot.name === botName)) {
                try {
                    const newBot = await createBotModel(
                        botData.botName,
                        botData.scaleX,
                        botData.scaleY,
                        botData.scaleZ,
                        botData.posX,
                        botData.posZ
                    );

                    botList.push(newBot); // Add the created bot to the list
                    console.log('Bot List:', botList);

                    // // Update the bot dropdown when a new bot is created
                    // updateBotList();
                    // Call this function whenever the bot list changes
                    updateBotDropdown();
                

                } catch (error) {
                    console.error('Failed to create bot:', error);
                }
            } else {
                console.warn('Bot with this name already exists');
            }
        }
    }, 'createBot').name('Create Bot');

    // let botDropdown = botFolder.add({selectedBot: ''}, 'selectedBot', botList.map((bot) => bot.name)).name('Select Bot');

    // // Function to update dropdown list when zones are added or deleted
    // function updateBotList() {
    //     const botNames = botList.map(bot => bot.name);
        
    //     // Save the current selected name before updating dropdown options
    //     const currentSelectedName = botDropdown.getValue();
    
    //     // Update the dropdown options (only when the bot list changes, not on user selection)
    //     botDropdown = botDropdown.options(botNames.length ? botNames : ['']);
    
    //     // Set the value to the previously selected name or default to the first bot
    //     const selectedName = botNames.includes(currentSelectedName) ? currentSelectedName : (botNames.length ? botNames[0] : '');
    //     botDropdown.setValue(selectedName);  // Update the dropdown value based on bot list changes
    
    //     // Optionally update the selected bot object in case the current selection has changed
    //     const selectedBot = botList.find((bot) => bot.name === selectedName);
    //     if (selectedBot) {
    //         selectedObject = selectedBot;
    //         console.log(`Selected bot after list update: ${selectedObject.name}`);
    //     }
    // }
    



    botFolder.open();


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
