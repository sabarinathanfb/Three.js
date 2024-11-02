// models/Car.js
import * as THREE from 'three';

export class Car {
  constructor() {
    this.mesh = new THREE.Group(); // Group for the car parts
    this.SCALE_FACTOR = 10; // Define a constant scaling factor
    this.createBody();
    this.createWheels();
  }

  createBody() {
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(4 * this.SCALE_FACTOR, 1 * this.SCALE_FACTOR, 2 * this.SCALE_FACTOR); // Use the scaling factor
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = (1 * this.SCALE_FACTOR); // Raise body above ground using the scaling factor
    this.mesh.add(body); // Add body to car group
  }

  createWheels() {
    // Create wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5 * this.SCALE_FACTOR, 0.5 * this.SCALE_FACTOR, 0.5 * this.SCALE_FACTOR, 32); // Use the scaling factor
    const wheelMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2; // Rotate to align with the ground
      wheel.position.y = 0; // Position at ground level

      // Position wheels
      if (i < 2) {
        wheel.position.x = (-1.5 * this.SCALE_FACTOR); // Left wheels
      } else {
        wheel.position.x = (1.5 * this.SCALE_FACTOR); // Right wheels
      }
      wheel.position.z = (i % 2 === 0) ? (-1 * this.SCALE_FACTOR) : (1 * this.SCALE_FACTOR); // Front and back wheels

      this.mesh.add(wheel); // Add wheel to car group
    }
  }

  // Method to scale the car if needed
  scaleCar(size) {
    this.mesh.scale.set(size, size, size); // Scale the car uniformly
  }
}

