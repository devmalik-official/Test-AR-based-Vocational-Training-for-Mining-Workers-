class SprayEffect {
  constructor({ scene, origin = new THREE.Vector3(), direction = new THREE.Vector3(0, 0, -1) }) {
    this.scene = scene;
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
    this.group = new THREE.Group();
    this.points = [];
    this.life = 0;
    this.visible = true;
    this.create();
  }

  create() {
    for (let i = 0; i < 14; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xaeebff, transparent: true, opacity: 0.85 })
      );
      particle.position.copy(this.origin);
      this.group.add(particle);
      this.points.push({ mesh: particle, offset: i * 0.05, life: 1 });
    }
    this.scene.add(this.group);
  }

  update(delta, targetPosition) {
    this.life += delta;
    this.points.forEach((point, index) => {
      const t = (this.life * 0.14 + point.offset) % 1;
      const particlePosition = this.origin.clone().add(this.direction.clone().multiplyScalar(t * 0.9));
      particlePosition.x += (index % 3 - 1) * 0.01;
      particlePosition.y += ((index % 2) - 0.5) * 0.01;
      particlePosition.z += ((index % 4) - 1.5) * 0.015;
      point.mesh.position.copy(particlePosition);
      point.mesh.visible = this.visible && this.life < 0.24;
    });

    if (targetPosition) {
      const targetDirection = targetPosition.clone().sub(this.origin).normalize();
      this.direction.lerp(targetDirection, 0.08);
    }
  }

  destroy() {
    this.scene.remove(this.group);
    this.points.forEach((point) => {
      if (point.mesh.geometry) point.mesh.geometry.dispose();
      if (point.mesh.material) point.mesh.material.dispose();
    });
  }
}

window.SprayEffect = SprayEffect;
