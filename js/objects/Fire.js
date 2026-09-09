class Fire {
  constructor({ scene, position = new THREE.Vector3(), config = {} }) {
    this.scene = scene;
    this.position = position.clone();
    this.config = {
      fireSize: 0.18,
      fireIntensity: 1.0,
      smokeAmount: 10,
      animationSpeed: 1.0,
      ...config
    };
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.intensity = 1;
    this.health = 1;
    this.isExtinguished = false;
    this.flameMeshes = [];
    this.smokeMeshes = [];
    this.light = null;
    this.create();
  }

  create() {
    const flameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffa726,
      emissive: 0xff6a00,
      emissiveIntensity: this.config.fireIntensity,
      transparent: true,
      opacity: 0.95
    });

    for (let i = 0; i < 3; i += 1) {
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05 + i * 0.02, 16, 16), flameMaterial.clone());
      flame.scale.set(1, 1.6 + i * 0.35, 1);
      flame.position.set((i - 1) * 0.05, i * 0.04, 0);
      flame.userData.baseScale = flame.scale.clone();
      flame.userData.speed = 0.9 + i * 0.4;
      this.group.add(flame);
      this.flameMeshes.push(flame);
    }

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.04, 18),
      new THREE.MeshStandardMaterial({ color: 0x3c2f2f, emissive: 0x130f0d, roughness: 0.8, metalness: 0.1 })
    );
    base.position.y = -0.02;
    this.group.add(base);

    this.light = new THREE.PointLight(0xff8a1a, this.config.fireIntensity, 3.5, 2);
    this.light.position.set(0, 0.2, 0);
    this.group.add(this.light);

    for (let i = 0; i < this.config.smokeAmount; i += 1) {
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + (i % 3) * 0.01, 10, 10),
        new THREE.MeshStandardMaterial({
          color: 0x8a8f99,
          transparent: true,
          opacity: 0.18,
          emissive: 0x202020,
          roughness: 1
        })
      );
      smoke.position.set((Math.random() - 0.5) * 0.12, 0.10 + Math.random() * 0.18, (Math.random() - 0.5) * 0.12);
      smoke.userData.speed = 0.4 + Math.random() * 0.8;
      smoke.userData.offset = Math.random() * Math.PI * 2;
      this.group.add(smoke);
      this.smokeMeshes.push(smoke);
    }

    this.scene.add(this.group);
  }

  update(time, sprayActive = false) {
    if (!this.group.visible) return;

    const pulse = Math.sin(time * (2.2 * this.config.animationSpeed)) * 0.3 + 0.7;
    this.flameMeshes.forEach((flame, index) => {
      const scaleFactor = (1 + pulse * (0.8 - index * 0.1)) * this.health * (this.isExtinguished ? 0 : 1);
      flame.scale.set(
        flame.userData.baseScale.x * scaleFactor,
        flame.userData.baseScale.y * scaleFactor,
        flame.userData.baseScale.z * scaleFactor
      );
      flame.position.y = index * 0.04 + Math.sin(time * (4 + index) * this.config.animationSpeed) * 0.03;
      const material = flame.material;
      material.emissiveIntensity = this.config.fireIntensity * this.health * (0.75 + pulse * 0.6);
      material.opacity = 0.8 * this.health;
    });

    this.light.intensity = this.config.fireIntensity * this.health * (0.8 + pulse * 0.7);
    this.light.visible = !this.isExtinguished;

    this.smokeMeshes.forEach((smoke, index) => {
      smoke.position.y += 0.002 * this.config.animationSpeed;
      if (smoke.position.y > 0.35) smoke.position.y = 0.08;
      smoke.position.x += Math.sin(time * 1.4 + smoke.userData.offset) * 0.0008;
      smoke.position.z += Math.cos(time * 1.6 + smoke.userData.offset) * 0.0008;
      smoke.material.opacity = 0.08 + (1 - this.health) * 0.2 + (index % 2) * 0.04;
    });

    if (sprayActive && this.health > 0) {
      this.health = Math.max(0, this.health - 0.015 * this.config.animationSpeed);
    }

    if (this.health <= 0.02) {
      this.isExtinguished = true;
      this.group.visible = false;
      this.light.visible = false;
    }
  }

  setHealth(value) {
    this.health = Math.max(0, Math.min(1, value));
    if (this.health <= 0.02) {
      this.isExtinguished = true;
      this.group.visible = false;
      if (this.light) this.light.visible = false;
    }
  }

  applySpray(amount) {
    this.setHealth(this.health - amount);
  }

  destroy() {
    this.scene.remove(this.group);
    this.flameMeshes.forEach((mesh) => {
      if (mesh.material) mesh.material.dispose();
      mesh.geometry.dispose();
    });
    this.smokeMeshes.forEach((mesh) => {
      if (mesh.material) mesh.material.dispose();
      mesh.geometry.dispose();
    });
    if (this.light) this.light.dispose();
  }
}

window.Fire = Fire;
