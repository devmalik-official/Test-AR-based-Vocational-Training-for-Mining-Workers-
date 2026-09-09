class ARManager {
  constructor() {
    this.supported = false;
    this.session = null;
  }

  async checkSupport() {
    if (!navigator.xr) return false;
    try {
      this.supported = await navigator.xr.isSessionSupported('immersive-ar');
      return this.supported;
    } catch (error) {
      this.supported = false;
      return false;
    }
  }

  async startSession() {
    if (!navigator.xr || !this.supported) return null;
    try {
      this.session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay']
      });
      return this.session;
    } catch (err) {
      return null;
    }
  }
}

window.ARManager = ARManager;
