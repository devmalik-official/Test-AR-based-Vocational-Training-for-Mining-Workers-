function createFlameTexture(innerColor, outerColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 188, 18, 128, 175, 138);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.42, innerColor);
  gradient.addColorStop(0.78, outerColor);
  gradient.addColorStop(1, 'rgba(255, 60, 0, 0)');

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(128, 306);
  context.bezierCurveTo(42, 300, 34, 244, 72, 192);
  context.bezierCurveTo(94, 162, 84, 120, 124, 34);
  context.bezierCurveTo(132, 86, 173, 94, 158, 151);
  context.bezierCurveTo(213, 113, 220, 194, 188, 224);
  context.bezierCurveTo(169, 244, 185, 281, 128, 306);
  context.closePath();
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

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
    this.sparks = [];
    this.create();
  }

  create() {
    const size = this.config.fireSize / 0.18;
    const flameTextures = [
      createFlameTexture('rgba(255, 245, 190, 1)', 'rgba(255, 180, 0, 0.95)'),
      createFlameTexture('rgba(255, 235, 80, 1)', 'rgba(255, 92, 0, 0.92)'),
      createFlameTexture('rgba(255, 150, 20, 0.95)', 'rgba(198, 25, 0, 0.82)')
    ];
    const flameProfiles = [
      [-0.72, 0.26, 0.42, 0.52], [-0.48, 0.24, 0.55, 0.67], [-0.23, 0.3, 0.48, 0.56],
      [0.04, 0.27, 0.64, 0.78], [0.3, 0.31, 0.46, 0.55], [0.56, 0.25, 0.57, 0.68],
      [0.8, 0.22, 0.38, 0.48]
    ];

    flameProfiles.forEach((profile, index) => {
      const [x, width, height, y] = profile;
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({
        map: flameTextures[index % flameTextures.length],
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.96
      }));
      flame.scale.set(width * size, height * size, 1);
      flame.position.set(x * size, y * size, (index % 2) * 0.025);
      flame.rotation.z = (index % 3 - 1) * 0.12;
      flame.userData.baseScale = flame.scale.clone();
      flame.userData.basePosition = flame.position.clone();
      flame.userData.baseRotation = flame.rotation.z;
      flame.userData.speed = 1.3 + (index % 3) * 0.45;
      flame.userData.phase = index * 0.8;
      this.group.add(flame);
      this.flameMeshes.push(flame);
    });

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff4b0, transparent: true, opacity: 0.92 })
    );
    core.scale.set(size, size * 1.5, 0.7);
    core.position.set(0, 0.08 * size, 0.06);
    core.userData.baseScale = core.scale.clone();
    core.userData.basePosition = core.position.clone();
    core.userData.baseRotation = core.rotation;
    core.userData.speed = 1.8;
    core.userData.phase = 0.8;
    this.group.add(core);
    this.flameMeshes.push(core);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.05, 24),
      new THREE.MeshStandardMaterial({ color: 0x17100d, emissive: 0x4a1608, emissiveIntensity: 0.8, roughness: 0.9, metalness: 0.1 })
    );
    base.scale.set(3.2 * size, 1, 0.9 * size);
    base.position.y = -0.02;
    this.group.add(base);

    const emberGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2 * size, 0.2 * size),
      new THREE.MeshBasicMaterial({ color: 0xff5a0a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    emberGlow.rotation.x = -Math.PI / 2;
    emberGlow.position.y = -0.005;
    this.group.add(emberGlow);

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

    for (let i = 0; i < 12; i += 1) {
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85 })
      );
      spark.position.set((Math.random() - 0.5) * 0.18, 0.06 + Math.random() * 0.2, (Math.random() - 0.5) * 0.18);
      spark.userData.speed = 0.8 + Math.random() * 0.9;
      spark.userData.offset = Math.random() * Math.PI * 2;
      this.group.add(spark);
      this.sparks.push(spark);
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
      const basePosition = flame.userData.basePosition;
      flame.position.copy(basePosition);
      flame.position.y += Math.sin(time * (4 + index) * this.config.animationSpeed + flame.userData.phase) * 0.018;
      flame.position.x += Math.sin(time * flame.userData.speed + flame.userData.phase) * 0.018;
      flame.rotation.z = flame.userData.baseRotation + Math.sin(time * flame.userData.speed) * 0.08;
      flame.material.opacity = (index === this.flameMeshes.length - 1 ? 0.92 : 0.8) * this.health;
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

    this.sparks.forEach((spark) => {
      spark.position.y += Math.sin(time * spark.userData.speed + spark.userData.offset) * 0.003;
      spark.position.x += Math.cos(time * (spark.userData.speed + 1) + spark.userData.offset) * 0.004;
      spark.position.z += Math.sin(time * (spark.userData.speed + 0.5) + spark.userData.offset) * 0.004;
      spark.material.opacity = 0.3 + (1 - this.health) * 0.6;
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
