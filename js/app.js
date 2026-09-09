const state = {
  currentScreen: 'splash',
  language: 'en',
  scenarioData: window.SCENARIO_DATA,
  selectedHazards: new Set(),
  selectedRoute: null,
  extinguishChoice: null,
  fireScenario: null,
  assessment: null,
  timer: null,
  scenarioCountdown: 60,
  fireStartTime: 0,
  sprayActive: false,
  sprayStartTime: 0,
  aimCorrect: false,
  effectiveSprayDuration: 0,
  extinguished: false,
  canContinue: false,
  arSession: null,
  arSupported: false,
  arReady: false,
  isPlacementConfirmed: false,
  currentPlacement: null,
  renderer: null,
  scene: null,
  camera: null,
  xrSession: null,
  placementManager: null,
  surfaceDetector: null,
  fireExtinguisher: null,
  sprayEffect: null,
  interactionRenderer: null,
  interactionScene: null,
  interactionCamera: null,
  pointerDown: false,
  transitionLock: false,
  worldHitPose: null,
  cameraStream: null,
  certificateGenerator: new window.CertificateGenerator(),
  storageManager: new window.LocalStorageManager(),
  assessmentEngine: new window.AssessmentEngine({
    hzScoreWeight: 0.22,
    responseTimeWeight: 0.18,
    extinguisherWeight: 0.2,
    aimingWeight: 0.18,
    evacuationWeight: 0.12,
    effectiveSprayWeight: 0.1
  })
};

const screens = {
  splash: document.getElementById('splash'),
  language: document.getElementById('language'),
  home: document.getElementById('home'),
  'module-intro': document.getElementById('module-intro'),
  'safety-instructions': document.getElementById('safety-instructions'),
  'ar-scan': document.getElementById('ar-scan'),
  'fire-detected': document.getElementById('fire-detected'),
  'hazard-identification': document.getElementById('hazard-identification'),
  'extinguisher-selection': document.getElementById('extinguisher-selection'),
  'extinguisher-interaction': document.getElementById('extinguisher-interaction'),
  'fire-extinguished': document.getElementById('fire-extinguished'),
  evacuation: document.getElementById('evacuation'),
  'assessment-result': document.getElementById('assessment-result'),
  remediation: document.getElementById('remediation'),
  certificate: document.getElementById('certificate'),
  compatibility: document.getElementById('compatibility')
};

const toast = document.getElementById('toast');
const langButtons = [...document.querySelectorAll('.lang-btn')];
const hazardGrid = document.getElementById('hazardGrid');
const routeGrid = document.getElementById('routeGrid');
const extinguisherFeedback = document.getElementById('extinguisherFeedback');
const scoreSummary = document.getElementById('scoreSummary');
const remediationContent = document.getElementById('remediationContent');
const certificateCanvas = document.getElementById('certificateCanvas');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove('visible'), 2200);
}

function showCompatibilityScreen(message) {
  const compatibilityScreen = document.getElementById('compatibility');
  const title = compatibilityScreen?.querySelector('h2');
  if (title) {
    title.textContent = 'AR mode is not supported on this browser/device.';
  }
  const body = compatibilityScreen?.querySelector('p');
  if (body) {
    body.textContent = message;
  }
  setScreen('compatibility');
}

function setScreen(name) {
  Object.entries(screens).forEach(([key, element]) => {
    element.classList.toggle('active', key === name);
  });
  state.currentScreen = name;
}

function formatTime(value) {
  const total = Math.max(0, Math.ceil(value));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateTimerDisplay() {
  const element = document.getElementById('scanTimer');
  if (element) element.textContent = formatTime(state.scenarioCountdown);
  const scenarioTimer = document.getElementById('scenarioTimer');
  if (scenarioTimer) scenarioTimer.textContent = formatTime(state.scenarioCountdown);
  const progressLabel = document.getElementById('extinguisherProgressLabel');
  if (progressLabel) {
    const percent = Math.max(0, Math.min(100, Math.round((state.effectiveSprayDuration / 5) * 100)));
    progressLabel.textContent = `${percent}%`;
  }
}

function initLanguageUI() {
  langButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.lang === state.language);
  });
}

function applyTranslations() {
  const translations = window.TRANSLATIONS[state.language] || window.TRANSLATIONS.en;
  document.title = translations.appTitle;
  const labels = document.querySelectorAll('[data-i18n]');
  labels.forEach((el) => {
    const key = el.dataset.i18n;
    if (translations[key]) el.textContent = translations[key];
  });
}

function renderHazardCards() {
  hazardGrid.innerHTML = '';
  const hazards = state.scenarioData.hazards;
  hazards.forEach((hazard) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hazard-card';
    card.dataset.hazardId = hazard.id;
    card.innerHTML = `<span class="hazard-emoji">${hazard.icon}</span><span>${hazard.label}</span>`;
    card.addEventListener('click', () => {
      const isCorrect = hazard.correct;
      card.classList.toggle('selected', !card.classList.contains('selected'));
      if (card.classList.contains('selected')) {
        state.selectedHazards.add(hazard.id);
      } else {
        state.selectedHazards.delete(hazard.id);
      }
      const hazardLabels = [...state.selectedHazards];
      const validSelection = hazardLabels.length > 0;
      state.assessmentEngine.recordHazardSelection(hazard, isCorrect);
      if (validSelection) {
        showToast(isCorrect ? 'Correct hazard identified' : 'Hazard marked');
      }
    });
    hazardGrid.appendChild(card);
  });
}

function renderRouteCards() {
  routeGrid.innerHTML = '';
  state.scenarioData.routes.forEach((route) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hazard-card';
    card.dataset.routeId = route.id;
    card.innerHTML = `<span class="hazard-emoji">${route.icon}</span><span>${route.label}</span>`;
    card.addEventListener('click', () => {
      state.selectedRoute = route.id;
      document.querySelectorAll('.hazard-card[data-route-id]').forEach((node) => {
        node.classList.toggle('selected', node.dataset.routeId === route.id);
      });
      showToast(route.correct ? 'Safe route selected' : 'Unsafe route selected');
    });
    routeGrid.appendChild(card);
  });
}

function setupEventListeners() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const action = event.currentTarget.dataset.action;
      handleAction(action);
    });
  });

  langButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.language = button.dataset.lang;
      initLanguageUI();
    });
  });

  document.querySelectorAll('.choice-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const choice = button.dataset.extinguisher;
      handleExtinguisherChoice(choice);
    });
  });

  window.addEventListener('beforeunload', () => {
    if (state.xrSession) {
      state.xrSession.end();
    }
  });

  window.addEventListener('online', () => showToast('ONLINE MODE')); 
  window.addEventListener('offline', () => showToast('OFFLINE MODE ✓'));
}

function handleAction(action) {
  if (state.transitionLock) return;
  state.transitionLock = true;
  window.setTimeout(() => {
    state.transitionLock = false;
  }, 350);

  switch (action) {
    case 'go-to-language':
      setScreen('language');
      break;
    case 'go-to-home':
      setScreen('home');
      break;
    case 'go-to-module-intro':
      setScreen('module-intro');
      break;
    case 'go-to-safety':
      setScreen('safety-instructions');
      break;
    case 'start-ar-scan':
      startARExperience();
      break;
    case 'go-to-hazard-id':
      setScreen('hazard-identification');
      renderHazardCards();
      break;
    case 'go-to-extinguisher-selection':
      setScreen('extinguisher-selection');
      break;
    case 'go-to-evacuation':
      setScreen('evacuation');
      renderRouteCards();
      break;
    case 'go-to-assessment':
      completeAssessment();
      setScreen('assessment-result');
      break;
    case 'show-remediation-or-certificate':
      if (state.assessment && state.assessment.status === 'PASSED') {
        generateCertificate();
        setScreen('certificate');
      } else {
        setScreen('remediation');
      }
      break;
    case 'retry-training':
      resetScenario();
      setScreen('language');
      break;
    case 'download-certificate':
      downloadCertificate();
      break;
    default:
      break;
  }
}

async function requestCameraPermission() {
  const isSecureContext = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { allowed: false, reason: 'AR mode is not supported on this browser/device. Please use a compatible Android browser/device.' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    state.cameraStream = stream;
    return { allowed: true, reason: '' };
  } catch (error) {
    return { allowed: false, reason: 'Camera permission was denied. Please allow camera access to start the AR safety simulation.' };
  }
}

async function startARExperience() {
  const cameraPermission = await requestCameraPermission();
  if (!cameraPermission.allowed) {
    showCompatibilityScreen(cameraPermission.reason);
    return;
  }

  const xr = navigator.xr;
  if (!xr || !('isSessionSupported' in xr)) {
    showCompatibilityScreen('AR mode is not supported on this browser/device. Please use a compatible Android browser/device with WebXR AR support.');
    return;
  }

  xr.isSessionSupported('immersive-ar').then((supported) => {
    state.arSupported = supported;
    if (!supported) {
      showCompatibilityScreen('AR mode is not supported on this browser/device. Please use a compatible Android browser/device with WebXR AR support.');
      return;
    }
    setScreen('ar-scan');
    initARScene();
  }).catch(() => {
    showCompatibilityScreen('AR mode is not supported on this browser/device. Please use a compatible Android browser/device with WebXR AR support.');
  });
}

function initARScene() {
  const canvas = document.getElementById('arCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  scene.add(light);

  const placementManager = new window.PlacementManager();
  const placementIndicator = placementManager.createIndicator();
  scene.add(placementIndicator);
  placementManager.setPlacementIndicator(placementIndicator);

  const surfaceDetector = new window.SurfaceDetector();

  state.renderer = renderer;
  state.scene = scene;
  state.camera = camera;
  state.placementManager = placementManager;
  state.surfaceDetector = surfaceDetector;

  const hitTestReferenceSpace = null;
  const controller = renderer.xr.getController(0);
  scene.add(controller);

  animatePlacementFrame();

  const button = document.createElement('button');
  button.textContent = 'Confirm Placement';
  button.style.position = 'fixed';
  button.style.bottom = '18px';
  button.style.left = '50%';
  button.style.transform = 'translateX(-50%)';
  button.style.zIndex = '11';
  button.style.padding = '12px 18px';
  button.style.borderRadius = '12px';
  button.style.border = 'none';
  button.style.background = '#ff7a18';
  button.style.color = '#fff';
  button.style.fontWeight = '700';
  button.addEventListener('click', () => {
    if (state.placementManager && state.placementManager.currentSurface) {
      state.currentPlacement = state.placementManager.currentSurface;
      state.isPlacementConfirmed = true;
      const newPos = new THREE.Vector3(state.currentPlacement.position.x, state.currentPlacement.position.y, state.currentPlacement.position.z);
      createScenarioAtPosition(newPos);
      setScreen('fire-detected');
      startScenarioCountdown();
      state.assessmentEngine.start();
      state.assessment = null;
      showToast('Training area placed');
    }
  });

  document.body.appendChild(button);

  if (navigator.xr) {
    navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body }
    }).then((session) => {
      state.xrSession = session;
      state.arReady = true;
      renderer.xr.setReferenceSpaceType('local');
      session.updateRenderState({ baseLayer: new XRWebGLLayer(session, renderer.getContext()) });
      session.requestReferenceSpace('viewer').then((referenceSpace) => {
        session.requestReferenceSpace('local').then((localSpace) => {
          const hitTestSource = session.requestHitTestSource({ space: referenceSpace });
          state.hitTestSource = hitTestSource;
          session.addEventListener('end', () => {
            state.arReady = false;
          });
          session.addEventListener('select', () => {
            if (!state.isPlacementConfirmed && state.placementManager && state.placementManager.currentSurface) {
              const placement = state.placementManager.currentSurface;
              const position = new THREE.Vector3(placement.position.x, placement.position.y, placement.position.z);
              createScenarioAtPosition(position);
              setScreen('fire-detected');
              startScenarioCountdown();
            }
          });
          renderer.xr.setSession(session, referenceSpace);
          session.addEventListener('inputsourceschange', () => {});
        });
      });
    }).catch(() => {
      setScreen('compatibility');
    });
  }

  function animatePlacementFrame() {
    const frame = renderer.xr.getFrame();
    if (renderer.xr.enabled && state.xrSession && frame) {
      const pose = frame.getViewerPose ? frame.getViewerPose(state.xrSession.referenceSpace) : null;
      if (pose && pose.transform) {
        const ray = new THREE.Vector3(0, -1, -0.5);
        const cameraPos = new THREE.Vector3();
        const cameraQuat = new THREE.Quaternion();
        if (pose.transform.position) cameraPos.copy(pose.transform.position);
        if (pose.transform.orientation) cameraQuat.copy(pose.transform.orientation);
        const localRay = ray.clone().applyQuaternion(cameraQuat);
        const surfaceHit = state.surfaceDetector.detectSurface(frame, state.xrSession.referenceSpace);
        if (surfaceHit) {
          state.placementManager.updateIndicatorFromTransform({ position: new THREE.Vector3(surfaceHit.position.x, surfaceHit.position.y, surfaceHit.position.z) });
        }
      }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(animatePlacementFrame);
  }
}

function createScenarioAtPosition(position) {
  const scenario = new window.FireScenario({
    scene: state.scene,
    camera: state.camera,
    config: {
      fireSize: state.scenarioData.config.fireSize,
      fireIntensity: state.scenarioData.config.fireIntensity,
      smokeAmount: state.scenarioData.config.smokeAmount,
      animationSpeed: state.scenarioData.config.animationSpeed,
      scenarioDuration: state.scenarioData.config.scenarioDuration
    }
  });
  const firePos = position.clone();
  firePos.y += 0.1;
  scenario.spawnFire(firePos);
  state.fireScenario = scenario;
  showToast('Fire spawned at world position');
}

function startScenarioCountdown() {
  state.scenarioCountdown = state.scenarioData.config.countdownSeconds || 60;
  updateTimerDisplay();
  if (state.timer) window.clearInterval(state.timer);
  state.timer = window.setInterval(() => {
    state.scenarioCountdown -= 1;
    updateTimerDisplay();
    if (state.scenarioCountdown <= 0) {
      window.clearInterval(state.timer);
      state.assessmentEngine.addCriticalError('Failed to respond within the required time');
      completeAssessment();
      setScreen('assessment-result');
    }
  }, 1000);
}

function handleExtinguisherChoice(choice) {
  state.extinguishChoice = choice;
  const feedback = {
    water: 'Incorrect response. Water conducts electricity and can worsen the hazards.',
    co2: 'Correct choice. CO₂ is non-conductive and suitable for electrical fire.',
    powder: 'Dry chemical powder can be used in some scenarios, but for this electrical equipment fire the safest choice is CO₂.'
  };
  extinguisherFeedback.textContent = feedback[choice];

  if (choice === 'co2') {
    state.assessmentEngine.recordExtinguisherChoice(choice);
    setScreen('extinguisher-interaction');
    setupExtinguisherInteraction();
  } else {
    state.assessmentEngine.recordExtinguisherChoice(choice);
    state.assessmentEngine.addCriticalError('Dangerous extinguisher selection');
    showToast('Incorrect extinguisher');
    setScreen('extinguisher-selection');
  }
}

function setupExtinguisherInteraction() {
  const canvas = document.getElementById('interactionCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
  camera.position.set(0, 0.6, 1.7);

  const light = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.4);
  scene.add(light);

  const firePos = state.fireScenario ? state.fireScenario.getFirePosition() : new THREE.Vector3(0, 0, -0.6);
  const extinguisher = new window.Extinguisher({ scene, position: new THREE.Vector3(-0.3, -0.2, -0.9) });
  extinguisher.setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2.4)));
  state.fireExtinguisher = extinguisher;

  const plane = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 32),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95, metalness: 0.1 })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.25;
  scene.add(plane);

  let sprayEffect = null;
  let effectiveSprayTime = 0;
  let lastNow = performance.now();

  const trigger = () => {
    const nozzlePos = extinguisher.getNozzleWorldPosition();
    const nozzleDirection = extinguisher.getNozzleDirection();
    const targetVector = firePos.clone().sub(nozzlePos);
    const angle = nozzleDirection.dot(targetVector.clone().normalize());
    const distance = nozzlePos.distanceTo(firePos);
    const isAimed = distance < state.scenarioData.config.sprayRange && angle > 0.6;

    if (isAimed) {
      state.aimCorrect = true;
      effectiveSprayTime += (performance.now() - lastNow) / 1000;
      state.effectiveSprayDuration = effectiveSprayTime;
      state.assessmentEngine.recordAimAccuracy(Math.max(0.5, angle));
      state.assessmentEngine.recordEffectiveSprayTime(effectiveSprayTime);
      if (!sprayEffect) {
        sprayEffect = new window.SprayEffect({ scene, origin: nozzlePos.clone(), direction: nozzleDirection.clone() });
      }
      state.fireScenario.fire.applySpray(0.012);
      if (state.fireScenario.fire.health <= 0.03) {
        state.fireScenario.fire.isExtinguished = true;
        state.extinguished = true;
        setScreen('fire-extinguished');
        showToast('FIRE EXTINGUISHED ✓');
      }
    } else {
      state.aimCorrect = false;
      if (sprayEffect) {
        sprayEffect.visible = false;
      }
    }

    const percent = Math.max(0, Math.min(100, Math.round((effectiveSprayTime / 5) * 100)));
    document.getElementById('extinguisherProgressLabel').textContent = `${percent}%`;
    lastNow = performance.now();
  };

  canvas.addEventListener('pointerdown', () => {
    state.pointerDown = true;
    extinguisher.setActive(true);
    trigger();
  });

  canvas.addEventListener('pointerup', () => {
    state.pointerDown = false;
    extinguisher.setActive(false);
  });

  canvas.addEventListener('pointerleave', () => {
    state.pointerDown = false;
    extinguisher.setActive(false);
  });

  const renderLoop = () => {
    const now = performance.now();
    const delta = (now - lastNow) / 1000;
    if (state.pointerDown) {
      trigger();
    }

    if (state.fireScenario && state.fireScenario.fire) {
      state.fireScenario.fire.update(now / 1000, state.pointerDown);
    }

    if (sprayEffect) {
      sprayEffect.update(delta, firePos);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(renderLoop);
  };

  renderLoop();
}

function completeAssessment() {
  const scoreData = state.assessmentEngine.computeScore();
  state.assessment = scoreData;
  state.storageManager.saveAssessment(scoreData);
  const resultTitle = scoreData.status === 'PASSED' ? 'Training Complete' : 'Training Not Passed';
  document.getElementById('assessmentTitle').textContent = resultTitle;
  scoreSummary.innerHTML = `
    <div>Hazard Identification: ${scoreData.hazardIdentificationScore}%</div>
    <div>Extinguisher Selection: ${scoreData.extinguisherSelection}%</div>
    <div>Response Time: ${scoreData.responseTime}%</div>
    <div>Extinguisher Handling: ${scoreData.aimAccuracy}%</div>
    <div>Evacuation: ${scoreData.evacuationChoice}%</div>
    <div>Overall Score: ${scoreData.overall}%</div>
    <div>Critical Errors: ${scoreData.criticalErrors.length}</div>
    <div>Status: ${scoreData.status}</div>
  `;

  if (scoreData.status === 'FAILED') {
    remediationContent.innerHTML = `
      <div><strong>Mistakes made:</strong> ${scoreData.criticalErrors.length ? scoreData.criticalErrors.join(', ') : 'No critical errors recorded.'}</div>
      <div><strong>Correct response:</strong> Identify the electrical fire, select CO₂, maintain proper aim, and choose the safe evacuation route.</div>
    `;
  }
}

function generateCertificate() {
  const certificate = {
    traineeName: 'Trainee',
    score: state.assessment.overall,
    criticalErrors: state.assessment.criticalErrors.length,
    status: state.assessment.status,
    certificateId: `SIH-${Date.now()}`,
    dateString: new Date().toLocaleString()
  };

  const canvas = state.certificateGenerator.createCertificate(certificate);
  certificateCanvas.getContext('2d').clearRect(0, 0, certificateCanvas.width, certificateCanvas.height);
  certificateCanvas.getContext('2d').drawImage(canvas, 0, 0);
  state.storageManager.saveCertificate(certificate);
}

function downloadCertificate() {
  const link = document.createElement('a');
  link.href = certificateCanvas.toDataURL('image/png');
  link.download = 'safety-certificate.png';
  link.click();
}

function resetScenario() {
  state.selectedHazards = new Set();
  state.selectedRoute = null;
  state.extinguishChoice = null;
  state.scenarioCountdown = 60;
  state.effectiveSprayDuration = 0;
  state.extinguished = false;
  state.assessment = null;
  state.aimCorrect = false;
  if (state.timer) window.clearInterval(state.timer);
  state.assessmentEngine = new window.AssessmentEngine();
  if (state.fireScenario && state.fireScenario.fire) {
    state.fireScenario.fire.destroy();
  }
  if (state.fireExtinguisher) {
    state.fireExtinguisher.destroy();
  }
  if (state.sprayEffect) {
    state.sprayEffect.destroy();
  }
  state.fireScenario = null;
  state.fireExtinguisher = null;
  state.sprayEffect = null;
  extinguisherFeedback.textContent = '';
  scoreSummary.innerHTML = '';
  remediationContent.innerHTML = '';
  updateTimerDisplay();
}

function init() {
  setScreen('splash');
  setupEventListeners();
  initLanguageUI();
  updateTimerDisplay();
  if (!navigator.onLine) showToast('OFFLINE MODE ✓');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
  renderHazardCards();
  renderRouteCards();
}

init();
