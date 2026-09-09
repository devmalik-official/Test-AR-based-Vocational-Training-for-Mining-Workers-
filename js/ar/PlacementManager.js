class PlacementManager {
  constructor() {
    this.currentSurface = null;
    this.placementIndicator = null;
  }

  setPlacementIndicator(placementIndicator) {
    this.placementIndicator = placementIndicator;
  }

  updateIndicatorFromTransform(transform) {
    if (!this.placementIndicator || !transform) return;
    this.currentSurface = transform;
    this.placementIndicator.position.set(transform.position.x, transform.position.y, transform.position.z);
    this.placementIndicator.visible = true;
  }

  createIndicator() {
    const indicatorGroup = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.06, 0.08, 32),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;
    indicatorGroup.add(ring);

    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.015, 24),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9 })
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.y = 0.002;
    indicatorGroup.add(dot);

    indicatorGroup.visible = false;
    return indicatorGroup;
  }
}

window.PlacementManager = PlacementManager;
