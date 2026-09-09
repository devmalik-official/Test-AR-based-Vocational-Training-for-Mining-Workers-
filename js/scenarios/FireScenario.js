class FireScenario {
  constructor({ scene, camera, config = {} }) {
    this.scene = scene;
    this.camera = camera;
    this.config = {
      fireSize: 0.18,
      fireIntensity: 1,
      smokeAmount: 10,
      animationSpeed: 1.0,
      scenarioDuration: 60,
      ...config
    };
    this.fire = null;
    this.fireWorldPosition = new THREE.Vector3();
    this.trainingAreaPosition = new THREE.Vector3();
    this.fireSpawned = false;
  }

  setPlacedArea(position) {
    this.trainingAreaPosition.copy(position);
  }

  spawnFire(position) {
    this.fireWorldPosition.copy(position);
    this.fire = new Fire({ scene: this.scene, position, config: this.config });
    this.fire.group.position.copy(position);
    this.fireSpawned = true;
    return this.fire;
  }

  getFirePosition() {
    return this.fireWorldPosition.clone();
  }

  update(time) {
    if (this.fire && !this.fire.isExtinguished) {
      this.fire.update(time, false);
    }
  }
}

window.FireScenario = FireScenario;
