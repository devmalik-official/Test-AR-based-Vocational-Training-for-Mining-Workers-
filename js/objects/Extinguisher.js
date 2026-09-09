class Extinguisher {
  constructor({ scene, position = new THREE.Vector3(), config = {} }) {
    this.scene = scene;
    this.position = position.clone();
    this.config = { nozzleLength: 0.5, ...config };
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.nozzle = null;
    this.triggerHeld = false;
    this.isActive = false;
    this.create();
  }

  create() {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.4, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 18), bodyMaterial);
    body.rotation.z = Math.PI / 2;
    this.group.add(body);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.4, roughness: 0.4 }));
    tank.rotation.z = Math.PI / 2;
    tank.position.x = -0.1;
    this.group.add(tank);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.6, roughness: 0.4 }));
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.x = 0.15;
    this.group.add(nozzle);
    this.nozzle = nozzle;

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    handle.position.set(-0.02, -0.08, 0);
    this.group.add(handle);

    this.scene.add(this.group);
  }

  setPosition(position) {
    this.group.position.copy(position);
  }

  setRotation(quaternion) {
    this.group.quaternion.copy(quaternion);
  }

  getNozzleWorldPosition() {
    const worldPosition = new THREE.Vector3();
    this.nozzle.getWorldPosition(worldPosition);
    return worldPosition;
  }

  getNozzleDirection() {
    const direction = new THREE.Vector3(1, 0, 0);
    this.nozzle.getWorldDirection(direction);
    return direction.normalize();
  }

  setActive(active) {
    this.isActive = active;
    this.triggerHeld = active;
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

window.Extinguisher = Extinguisher;
