class SurfaceDetector {
  constructor() {
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;
  }

  async requestHitTestSource(session, referenceSpace) {
    if (!session || !referenceSpace) return null;
    const source = await session.requestReferenceSpace('viewer');
    return source;
  }

  async detectSurface(frame, referenceSpace) {
    if (!frame || !referenceSpace) return null;
    const hitTestResults = frame.getHitTestResults ? frame.getHitTestResults(referenceSpace) : [];
    if (!hitTestResults || hitTestResults.length === 0) return null;
    const result = hitTestResults[0];
    const pose = result.getPose(referenceSpace);
    if (!pose) return null;
    return pose.transform;
  }
}

window.SurfaceDetector = SurfaceDetector;
