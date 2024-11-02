// Human.js
import * as THREE from 'three';

export class Human {
    constructor(scene, position) {
        this.human = new THREE.Group();

        // Create body
        const body = this.createBox(0.5, 1.5, 0.3, 0xffd700);
        this.human.add(body);

        // Create head
        const head = this.createBox(0.5, 0.5, 0.5, 0xffcc99);
        head.position.y = 1.25; // Position the head on top of the body
        this.human.add(head);

        // Create arms
        this.leftArm = this.createBox(0.2, 1, 0.2, 0xffd700);
        this.leftArm.position.set(-0.4, 0.25, 0);
        this.human.add(this.leftArm);

        this.rightArm = this.createBox(0.2, 1, 0.2, 0xffd700);
        this.rightArm.position.set(0.4, 0.25, 0);
        this.human.add(this.rightArm);

        // Create legs
        this.leftLeg = this.createBox(0.2, 1, 0.2, 0x006400);
        this.leftLeg.position.set(-0.15, -1, 0);
        this.human.add(this.leftLeg);

        this.rightLeg = this.createBox(0.2, 1, 0.2, 0x006400);
        this.rightLeg.position.set(0.15, -1, 0);
        this.human.add(this.rightLeg);

        // Set initial position
        this.human.position.copy(position);
        scene.add(this.human);

        // Animation properties
        this.legAngle = 0;
        this.armAngle = 0;
        this.swingSpeed = 0.1;

        // Movement direction and speed
        this.movementDirection = new THREE.Vector3(0, 0, 1); // Start moving along the positive z-axis
        this.speed = 0.05; // Speed of movement
    }

    // Function to create a box (for body parts)
    createBox(width, height, depth, color) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshBasicMaterial({ color });
        return new THREE.Mesh(geometry, material);
    }

    // Update function to animate movement and handle direction changes
    update() {
        // Simulate walking motion by swinging legs and arms
        this.legAngle += this.swingSpeed;
        this.armAngle += this.swingSpeed;
    
        // Swing arms and legs
        this.leftArm.rotation.x = Math.sin(this.armAngle) * 0.5;
        this.rightArm.rotation.x = -Math.sin(this.armAngle) * 0.5;
        this.leftLeg.rotation.x = Math.sin(this.legAngle) * 0.5;
        this.rightLeg.rotation.x = -Math.sin(this.legAngle) * 0.5;
    
        // Move human in the current direction
        this.human.position.add(this.movementDirection.clone().multiplyScalar(this.speed));
    
        // Optional: Smooth rotation based on movement direction
        if (this.movementDirection.x !== 0) {
            this.human.rotation.y = Math.atan2(this.movementDirection.x, this.movementDirection.z);
        }
    
        // Check boundaries and change direction accordingly
        if (this.human.position.z > 15) {
            this.human.position.z = 15; // Stop at the boundary
            this.movementDirection.set(-1, 0, 0); // Turn to negative x-axis
        } else if (this.human.position.x < -15) {
            this.human.position.x = -15; // Stop at the boundary
            this.movementDirection.set(0, 0, -1); // Turn to negative z-axis
        } else if (this.human.position.z < -15) {
            this.human.position.z = -15; // Stop at the boundary
            this.movementDirection.set(1, 0, 0); // Turn to positive x-axis
        } else if (this.human.position.x > 15) {
            this.human.position.x = 15; // Stop at the boundary
            this.movementDirection.set(0, 0, 1); // Turn to positive z-axis
        }
    }
    
    
}
