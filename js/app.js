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
  cameraVideo: null,
  placementButton: null,
  drillWorldGroup: null,
  drillInteractiveObjects: [],
  isAlarmActive: false,
  isCorrectExtinguisherSelected: false,
  sprayPressed: false,
  startedDrill: false,
  criticalErrorOverlay: null,
  activeExtinguisher: null,
  heldExtinguisher: null,
  correctExtinguisherSelected: false,
  drillState: 'PLACEMENT_REQUIRED',
  placementReticle: null,
  renderLoopId: null,
  retryButton: null,
  arenaAnchor: null,
  cameraFallbackMode: false,
  previewFire: null,
  fireDetectionTimeout: null,
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
  const toastTranslations = {
    'Virtual fire detected nearby': 'fireDetected',
    'Fire location confirmed. Starting drill.': 'startTraining',
    'Fire extinguished': 'fireExtinguished',
    'Alarm activated': 'alarmLabel',
    'Emergency drill complete': 'trainingComplete',
    'ONLINE MODE': 'online',
    'OFFLINE MODE ✓': 'offline'
  };
  toast.textContent = getTranslation(toastTranslations[message] || '', message);
  toast.classList.add('visible');
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => toast.classList.remove('visible'), 2200);
}

function setScreen(name) {
  Object.entries(screens).forEach(([key, element]) => {
    if (element) element.classList.toggle('active', key === name);
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
  applyTranslations();
}

function getTranslation(key, fallback = key) {
  return window.TRANSLATIONS?.[state.language]?.[key] || fallback;
}

function applyTranslations() {
  document.documentElement.lang = state.language === 'hi' ? 'hi' : state.language === 'sat' ? 'sat' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    const value = getTranslation(key, element.textContent);
    element.textContent = value;
  });
  document.title = getTranslation('appTitle', document.title);
  renderHazardCards();
  renderRouteCards();
}

function renderHazardCards() {
  if (!hazardGrid) return;
  hazardGrid.innerHTML = '';
  const labelKeys = {
    fire: 'fire', electrical: 'electrical', flammable: 'flammable', exit: 'emergencyExit', extinguisher: 'fireExtinguisher'
  };
  state.scenarioData.hazards.forEach((hazard) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hazard-card';
    card.dataset.hazardId = hazard.id;
    card.innerHTML = `<span class="hazard-emoji">${hazard.icon}</span><span>${getTranslation(labelKeys[hazard.id], hazard.label)}</span>`;
    card.addEventListener('click', () => {
      const isCorrect = hazard.correct;
      card.classList.toggle('selected', !card.classList.contains('selected'));
      if (card.classList.contains('selected')) state.selectedHazards.add(hazard.id);
      else state.selectedHazards.delete(hazard.id);
      state.assessmentEngine.recordHazardSelection(hazard, isCorrect);
      showToast(isCorrect ? 'Correct hazard identified' : 'Hazard marked');
    });
    hazardGrid.appendChild(card);
  });
}

function renderRouteCards() {
  if (!routeGrid) return;
  routeGrid.innerHTML = '';
  const labelKeys = {
    'safe-route': 'safeRoute', blocked: 'blockedRoute', 'unsafe-area': 'unsafeArea', assembly: 'assemblyPoint'
  };
  state.scenarioData.routes.forEach((route) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hazard-card';
    card.dataset.routeId = route.id;
    card.innerHTML = `<span class="hazard-emoji">${route.icon}</span><span>${getTranslation(labelKeys[route.id], route.label)}</span>`;
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
      handleAction(event.currentTarget.dataset.action);
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
      handleExtinguisherChoice(button.dataset.extinguisher);
    });
  });

  window.addEventListener('beforeunload', () => {
    if (state.xrSession) state.xrSession.end();
    if (state.cameraStream) state.cameraStream.getTracks().forEach((track) => track.stop());
  });

  window.addEventListener('online', () => showToast('ONLINE MODE'));
  window.addEventListener('offline', () => showToast('OFFLINE MODE ✓'));
}

function handleAction(action) {
  if (state.transitionLock) return;
  state.transitionLock = true;
  window.setTimeout(() => { state.transitionLock = false; }, 350);

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

function ensureCameraVideo() {
  let video = document.getElementById('camera-video');
  const container = document.getElementById('ar-canvas-wrap') || document.body;

  if (!video) {
    video = document.createElement('video');
    video.id = 'camera-video';
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('playsinline', 'true');
    Object.assign(video.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
      background: '#000',
      zIndex: '0',
      pointerEvents: 'none'
    });
    container.appendChild(video);
  }

  if (video.parentElement !== container) {
    container.appendChild(video);
  }

  state.cameraVideo = video;
  video.style.display = 'block';
  return video;
}

function removeCameraVideo() {
  const video = document.getElementById('camera-video');
  if (video) video.remove();
  state.cameraVideo = null;
}

function setObjective(text) {
  const label = document.getElementById('arTaskLabel');
  const textNode = document.getElementById('arTaskText');
  const objectiveTranslations = {
    'Detecting fire in the area...': 'detectingFire',
    'Scan the area around you to find a safe training position.': 'scanPrompt',
    'Tap the red alarm, then choose the CO₂ extinguisher.': 'alarmObjective',
    'Select the correct extinguisher from the four options.': 'extinguisherObjective',
    'Aim at the fire and hold SPRAY.': 'sprayObjective',
    'Fire out. Tap the green EXIT marker to finish the drill.': 'exitObjective'
  };
  if (label) label.textContent = getTranslation('objective', 'OBJECTIVE');
  if (textNode) {
    if (objectiveTranslations[text]) textNode.dataset.i18n = objectiveTranslations[text];
    else delete textNode.dataset.i18n;
    textNode.textContent = getTranslation(objectiveTranslations[text] || '', text);
  }
}

function setScanHudVisible(visible) {
  const hud = document.getElementById('ar-hud');
  if (hud) {
    hud.classList.toggle('hidden', !visible);
    hud.style.display = visible ? '' : 'none';
  }
}

function toggleSprayButton(show) {
  let button = document.querySelector('.spray-button');
  if (!button) {
    button = document.createElement('button');
    button.className = 'spray-button';
    button.textContent = getTranslation('spray', 'SPRAY');
    button.addEventListener('pointerdown', () => {
      if (state.correctExtinguisherSelected) state.sprayPressed = true;
    });
    button.addEventListener('pointerup', () => { state.sprayPressed = false; });
    button.addEventListener('pointerleave', () => { state.sprayPressed = false; });
    document.body.appendChild(button);
  }
  button.classList.toggle('visible', !!show);
}

function showCriticalError(message) {
  let overlay = state.criticalErrorOverlay;
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'critical-error-overlay';
    overlay.innerHTML = `<div class="critical-error-box"><h3>${getTranslation('criticalError', 'CRITICAL SAFETY ERROR')}</h3><p></p></div>`;
    document.body.appendChild(overlay);
    state.criticalErrorOverlay = overlay;
  }
  const textNode = overlay.querySelector('p');
  if (textNode) textNode.textContent = message;
  overlay.classList.add('visible');
  state.assessmentEngine.addCriticalError(message);
  state.drillState = 'CRITICAL_SAFETY_ERROR';
  window.clearTimeout(showCriticalError.timeoutId);
  showCriticalError.timeoutId = window.setTimeout(() => overlay.classList.remove('visible'), 1800);
}

function buildTextLabel(text, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(15,23,42,0.8)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 58px Arial';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.46, 0.12, 1);
  return sprite;
}

function buildObjectBadge(type, label, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(7, 12, 20, 0.94)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 300, 300, 42);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = color;
  if (type === 'alarm') {
    ctx.fillRect(92, 116, 136, 76);
    ctx.fillRect(112, 86, 96, 38);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(128, 132, 64, 22);
    ctx.beginPath();
    ctx.arc(160, 205, 34, 0, Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.stroke();
  } else if (type === 'extinguisher') {
    ctx.fillStyle = color;
    ctx.roundRect(112, 104, 78, 122, 18);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.fillRect(104, 88, 94, 22);
    ctx.fillRect(178, 78, 48, 18);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(160, 114, 48, Math.PI, Math.PI * 1.7);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label === 'CO₂' ? 'CO2' : label, 151, 174);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(98, 78, 124, 150);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(116, 98, 88, 130);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(160, 122);
    ctx.lineTo(194, 160);
    ctx.lineTo(174, 160);
    ctx.lineTo(174, 196);
    ctx.lineTo(146, 196);
    ctx.lineTo(146, 160);
    ctx.lineTo(126, 160);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(label, 160, 278);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(0.28, 0.28, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function buildPhotoSprite(source, width, height) {
  const material = new THREE.SpriteMaterial({ transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width, height, 1);
  sprite.renderOrder = 14;
  new THREE.TextureLoader().load(source, (texture) => {
    material.map = texture;
    material.needsUpdate = true;
  });
  return sprite;
}

function buildExtinguisher({ label, color, correct, position }) {
  const group = new THREE.Group();
  const canisterColor = 0xef3340;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.28, 0.12),
    new THREE.MeshStandardMaterial({ color: canisterColor, metalness: 0.2, roughness: 0.42, emissive: 0x260608, emissiveIntensity: 0.16 })
  );
  body.position.y = 0.02;
  group.add(body);

  const shoulder = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.05, 0.09),
    new THREE.MeshStandardMaterial({ color: canisterColor, roughness: 0.45 })
  );
  shoulder.position.y = 0.185;
  group.add(shoulder);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.06, 12),
    new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.55, roughness: 0.3 })
  );
  neck.position.y = 0.235;
  group.add(neck);

  const handleTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.025, 0.055),
    new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.5, roughness: 0.3 })
  );
  handleTop.position.set(0, 0.28, 0);
  group.add(handleTop);

  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.016, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.5, roughness: 0.3 })
  );
  nozzle.rotation.z = -Math.PI / 2;
  nozzle.position.set(0.075, 0.25, 0);
  group.add(nozzle);

  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.08, 0.025),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.42, roughness: 0.4 })
  );
  handle.position.set(0, 0.225, 0.035);
  group.add(handle);

  group.position.copy(position);
  const photo = buildPhotoSprite('./assets/fire-extinguisher.jpg', 0.22, 0.28);
  photo.position.set(0, 0.08, 0.12);
  group.add(photo);
  const labelSprite = buildNameLabel(label === 'WATER' ? 'H2O' : label);
  labelSprite.position.set(0, -0.2, 0.04);
  labelSprite.scale.set(0.34, 0.065, 1);
  group.add(labelSprite);
  group.userData = { type: 'extinguisher', label, correct };
  return group;
}

function buildBucket(position) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.12, 18),
    new THREE.MeshStandardMaterial({ color: 0xc0c9d4, metalness: 0.2, roughness: 0.75 })
  );
  body.position.y = 0.05;
  group.add(body);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.04, 18),
    new THREE.MeshStandardMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.9 })
  );
  water.position.y = 0.11;
  group.add(water);

  group.position.copy(position);
  group.userData = { type: 'bucket' };
  return group;
}

function buildAlarm(position) {
  const group = new THREE.Group();
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.52, 0.045),
    new THREE.MeshBasicMaterial({ color: 0x26070b, transparent: true, opacity: 0.82 })
  );
  panel.position.z = -0.03;
  group.add(panel);

  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.31, 0.53, 0.05)),
    new THREE.LineBasicMaterial({ color: 0xff1734 })
  );
  border.position.z = -0.01;
  group.add(border);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.12, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xef3340, emissive: 0x610514, emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.35 })
  );
  base.position.set(0, -0.08, 0.04);
  group.add(base);

  const beacon = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.13, 0.045),
    new THREE.MeshStandardMaterial({ color: 0xef3340, emissive: 0x8f0718, emissiveIntensity: 1.1, metalness: 0.15, roughness: 0.28 })
  );
  beacon.position.set(0, 0.08, 0.07);
  group.add(beacon);

  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.04, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xff5263, emissive: 0xd90429, emissiveIntensity: 0.8 })
  );
  cap.position.set(0, 0.15, 0.07);
  group.add(cap);

  const button = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.14, 0.035),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
  );
  button.position.set(0, -0.04, 0.08);
  group.add(button);

  const buttonCenter = new THREE.Mesh(
    new THREE.CircleGeometry(0.025, 20),
    new THREE.MeshBasicMaterial({ color: 0x111827 })
  );
  buttonCenter.position.set(0, -0.04, 0.102);
  group.add(buttonCenter);

  const alarmLight = new THREE.PointLight(0xff233f, 1.4, 1.3);
  alarmLight.position.set(0, 0.22, 0.04);
  group.add(alarmLight);

  group.position.copy(position);
  const photo = buildPhotoSprite('./assets/fire-alarm.jpg', 0.3, 0.25);
  photo.position.set(0, 0.03, 0.12);
  group.add(photo);
  const labelSprite = buildNameLabel(getTranslation('alarmLabel', 'ALARM'));
  labelSprite.position.set(0, -0.36, 0.04);
  labelSprite.scale.set(0.36, 0.07, 1);
  group.add(labelSprite);
  group.userData = { type: 'alarm' };
  return group;
}

function buildNameLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = 'bold 52px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 12;
  context.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  context.fillStyle = '#ffffff';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  label.scale.set(0.42, 0.08, 1);
  label.renderOrder = 12;
  return label;
}

function buildExit(position) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.38, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x15803d, emissive: 0x064e3b, emissiveIntensity: 0.45, roughness: 0.4 })
  );
  group.add(frame);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.3, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x0f5132, roughness: 0.65 })
  );
  door.position.z = 0.04;
  group.add(door);

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.12, 3),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  arrow.rotation.z = -Math.PI / 2;
  arrow.position.set(0, 0.02, 0.07);
  group.add(arrow);

  group.position.copy(position);
  const labelSprite = buildNameLabel(getTranslation('exitLabel', 'EXIT'));
  labelSprite.position.set(0, -0.26, 0.06);
  group.add(labelSprite);
  group.userData = { type: 'exit' };
  return group;
}

function updateDrillVisibility() {
  state.drillInteractiveObjects.forEach((object) => {
    if (!object || !object.userData) return;
    const type = object.userData.type;
    object.visible = (
      type === 'alarm' && state.drillState === 'ALARM_REQUIRED'
    ) || (
      type === 'extinguisher' && state.drillState === 'ALARM_ACTIVATED'
    ) || (
      type === 'exit' && state.drillState === 'EVACUATION_REQUIRED'
    );
  });
}

function buildScenarioDrill(anchorPosition) {
  if (!state.scene) return;
  if (state.drillWorldGroup) {
    state.scene.remove(state.drillWorldGroup);
    state.drillWorldGroup = null;
  }

  state.drillInteractiveObjects = [];
  state.isAlarmActive = false;
  state.isCorrectExtinguisherSelected = false;
  state.correctExtinguisherSelected = false;
  state.sprayPressed = false;
  state.sprayActive = false;
  state.startedDrill = true;
  state.drillState = 'FIRE_STARTING';
  state.effectiveSprayDuration = 0;
  state.extinguished = false;
  state.assessmentEngine.start();

  const world = new THREE.Group();
  world.position.copy(anchorPosition);
  state.drillWorldGroup = world;
  state.scene.add(world);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.22, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.7, metalness: 0.2 })
  );
  panel.position.set(0, 0.1, 0);
  world.add(panel);

  const warning = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.1, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x8a4b00, emissiveIntensity: 0.45 })
  );
  warning.position.set(0.1, 0.18, 0.08);
  world.add(warning);

  const extinguisherRack = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.42, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x263449, roughness: 0.55, metalness: 0.25 })
  );
  extinguisherRack.position.set(0, 0.2, -0.04);
  world.add(extinguisherRack);

  const firePos = new THREE.Vector3(0.28, 0.26, 0.12);
  const fire = new window.Fire({
    scene: world,
    position: firePos,
    config: { fireSize: 0.22, fireIntensity: 1.2, smokeAmount: 12, animationSpeed: 1.3 }
  });
  fire.group.position.copy(firePos);

  state.fireScenario = {
    fire,
    getFirePosition: () => fire.group.getWorldPosition(new THREE.Vector3())
  };

  const alarm = buildAlarm(new THREE.Vector3(-0.5, 0.24, 0.14));
  world.add(alarm);
  state.drillInteractiveObjects.push(alarm);

  const co2 = buildExtinguisher({ label: getTranslation('co2', 'CO₂'), color: 0xf87171, correct: true, position: new THREE.Vector3(-0.48, 0.12, -0.3) });
  const water = buildExtinguisher({ label: getTranslation('water', 'WATER'), color: 0x60a5fa, correct: false, position: new THREE.Vector3(-0.16, 0.12, -0.3) });
  const foam = buildExtinguisher({ label: getTranslation('foam', 'FOAM'), color: 0x22c55e, correct: false, position: new THREE.Vector3(0.16, 0.12, -0.3) });
  const powder = buildExtinguisher({ label: getTranslation('dryPowder', 'POWDER'), color: 0xfacc15, correct: false, position: new THREE.Vector3(0.48, 0.12, -0.3) });
  const exit = buildExit(new THREE.Vector3(0.62, 0.38, 0.08));
  [co2, water, foam, powder, exit].forEach((item) => world.add(item));
  state.drillInteractiveObjects.push(co2, water, foam, powder, exit);

  state.activeExtinguisher = co2;
  setObjective('Tap the red alarm, then choose the CO₂ extinguisher.');
  state.drillState = 'ALARM_REQUIRED';
  updateDrillVisibility();
  showToast('AR drill started');
}

function showFirePreview() {
  if (!state.scene || state.previewFire) return;

  if (state.placementButton) state.placementButton.style.display = 'block';
  setScanHudVisible(true);
  const previewPosition = new THREE.Vector3(
    (Math.random() - 0.5) * 0.9,
    0.12 + Math.random() * 0.32,
    -1.1 - Math.random() * 1.1
  );
  state.previewFire = new window.Fire({
    scene: state.scene,
    position: new THREE.Vector3(),
    config: { fireSize: 0.28, fireIntensity: 1.45, smokeAmount: 18, animationSpeed: 1.2 }
  });
  state.previewFire.group.position.copy(previewPosition);
  setObjective('Scan the area around you to find a safe training position.');
  showToast('Virtual fire detected nearby');
}

function scheduleFireDetection() {
  if (state.fireDetectionTimeout) window.clearTimeout(state.fireDetectionTimeout);
  if (state.placementButton) state.placementButton.style.display = 'none';
  setScanHudVisible(true);
  setObjective('Detecting fire in the area...');
  state.fireDetectionTimeout = window.setTimeout(() => {
    state.fireDetectionTimeout = null;
    showFirePreview();
  }, 15000);
}

function removeFirePreview() {
  if (!state.previewFire) return;
  state.previewFire.destroy();
  state.previewFire = null;
}

function getWorldTouchPoint(event, canvas, camera) {
  const rect = canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  return raycaster;
}

function preparePlacementReticle() {
  if (state.placementReticle) return state.placementReticle;

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.1, 32),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  );
  reticle.rotation.x = -Math.PI / 2;
  reticle.position.set(0, 0.01, -0.8);
  reticle.visible = false;
  state.scene.add(reticle);
  state.placementReticle = reticle;
  return reticle;
}

function setupPlacementButton() {
  if (state.placementButton) return;
  const button = document.createElement('button');
  button.textContent = 'Start Training Here';
  Object.assign(button.style, {
    position: 'fixed',
    left: '50%',
    bottom: '18px',
    transform: 'translateX(-50%)',
    zIndex: '12',
    padding: '12px 18px',
    borderRadius: '12px',
    border: 'none',
    background: '#ff7a18',
    color: '#fff',
    fontWeight: '700'
  });
  button.addEventListener('click', () => {
    const reticle = state.placementReticle;
    if (state.arSession && (!reticle || !reticle.visible)) {
      showToast('Point the camera at the floor before starting');
      return;
    }
    const anchorPos = state.currentPlacement
      ? state.currentPlacement.clone()
      : reticle?.position.clone() || new THREE.Vector3(0, 0.01, -0.8);
    removeFirePreview();
    setScanHudVisible(false);
    state.isPlacementConfirmed = true;
    state.cameraFallbackMode = !state.arSession;
    if (state.arSession) {
      state.arenaAnchor = anchorPos.clone();
      buildScenarioDrill(anchorPos);
    } else {
      buildScenarioDrill(anchorPos);
    }
    if (state.placementButton) {
      state.placementButton.remove();
      state.placementButton = null;
    }
    showToast('Fire location confirmed. Starting drill.');
    setScreen('ar-scan');
  });
  document.body.appendChild(button);
  state.placementButton = button;
}

async function requestCameraPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { allowed: false, reason: 'Camera API unavailable in this app wrapper.' };
  }

  try {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    } catch (firstError) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }
    state.cameraStream = stream;
    const video = ensureCameraVideo();
    video.srcObject = stream;
    await video.play();
    return { allowed: true, reason: '' };
  } catch (error) {
    state.cameraStream = null;
    const reason = error?.name === 'NotAllowedError'
      ? 'Camera permission was denied. Enable Camera permission for this APK.'
      : `Camera could not start: ${error?.name || 'unknown error'}.`;
    return { allowed: false, reason };
  }
}

async function initARScene() {
  const canvas = document.getElementById('arCanvas');
  const stage = document.getElementById('ar-canvas-wrap');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, stage.clientWidth / stage.clientHeight, 0.01, 100);
  camera.position.set(0, 0.8, 1.8);
  camera.lookAt(0, 0, -0.6);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x1b2433, 1.2);
  scene.add(ambient);

  state.renderer = renderer;
  state.scene = scene;
  state.camera = camera;

  const resizeRenderer = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  window.addEventListener('resize', resizeRenderer);

  const reticle = preparePlacementReticle();
  setupPlacementButton();

  const renderFrame = () => {
    if (state.scene && state.camera) {
      if (state.drillWorldGroup) {
        if (state.drillState === 'ALARM_REQUIRED') {
          const flash = 0.35 + Math.sin(performance.now() * 0.02) * 0.15;
          state.drillWorldGroup.children.forEach((child) => {
            if (child.userData && child.userData.type === 'alarm' && child.children[1]) {
              child.children[1].material.emissiveIntensity = flash;
            }
          });
        }

        if (state.fireScenario && state.fireScenario.fire) {
          const fire = state.fireScenario.fire;
          fire.update(performance.now() / 1000, state.sprayPressed && state.correctExtinguisherSelected);
        }

        if (state.heldExtinguisher) {
          state.heldExtinguisher.position.set(0.65, -0.5, -1.2);
          state.heldExtinguisher.rotation.set(0.15, -0.26, 1.0);
        }

        if (state.sprayPressed && state.correctExtinguisherSelected && state.fireScenario && state.fireScenario.fire && !state.fireScenario.fire.isExtinguished) {
          const firePos = state.fireScenario.getFirePosition();
          const muzzlePos = state.heldExtinguisher ? state.heldExtinguisher.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0.7, -0.5, -1.2);
          const direction = firePos.clone().sub(muzzlePos).normalize();
          const distance = muzzlePos.distanceTo(firePos);
          const aimOk = distance < 1.8 && direction.lengthSq() > 0;

          if (aimOk) {
            state.effectiveSprayDuration += 0.02;
            state.assessmentEngine.recordAimAccuracy(0.82);
            state.fireScenario.fire.applySpray(0.02);
            if (state.fireScenario.fire.health <= 0.02) {
              state.fireScenario.fire.isExtinguished = true;
              state.drillState = 'EVACUATION_REQUIRED';
              state.assessmentEngine.recordEffectiveSprayTime(state.effectiveSprayDuration);
              state.assessmentEngine.recordExtinguishingSuccess(true);
              setObjective('Fire out. Tap the green EXIT marker to finish the drill.');
              updateDrillVisibility();
              showToast('Fire extinguished');
            }
          }
        }
      } else if (state.previewFire) {
        state.previewFire.update(performance.now() / 1000);
      }

      if (state.arSession && state.arHitTestSource && state.arReferenceSpace) {
        const frame = renderer.xr.getFrame();
        if (frame) {
          const results = frame.getHitTestResults(state.arHitTestSource);
          if (results.length > 0) {
            const pose = results[0].getPose(state.arReferenceSpace);
            if (pose) {
              const hitPosition = new THREE.Vector3();
              const hitQuaternion = new THREE.Quaternion();
              hitPosition.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
              hitQuaternion.set(pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w);
              reticle.visible = true;
              reticle.position.copy(hitPosition);
              reticle.quaternion.copy(hitQuaternion);
              state.placementReticle = reticle;
              state.currentPlacement = hitPosition.clone();
            }
          }
        }
      }
    }

    renderer.render(scene, camera);
    state.renderLoopId = requestAnimationFrame(renderFrame);
  };

  const handleScenePointer = (event) => {
    if (!state.drillWorldGroup) return;
    const raycaster = getWorldTouchPoint(event, canvas, camera);
    const hitObjects = state.drillInteractiveObjects.filter((item) => item && item.visible !== false);
    const hit = raycaster.intersectObjects(hitObjects, true)[0];
    if (!hit) return;

    const hitTarget = hit.object?.parent?.userData ? hit.object.parent : hit.object;
    if (!hitTarget || !hitTarget.userData) return;

    if (hitTarget.userData.type === 'alarm') {
      state.isAlarmActive = true;
      state.drillState = 'ALARM_ACTIVATED';
      setObjective('Select the correct extinguisher from the four options.');
      updateDrillVisibility();
      showToast('Alarm activated');
      return;
    }

    if (hitTarget.userData.type === 'extinguisher') {
      if (!state.isAlarmActive) {
        showToast('Activate the alarm first');
        return;
      }
      if (hitTarget.userData.correct) {
        state.correctExtinguisherSelected = true;
        state.isCorrectExtinguisherSelected = true;
        state.drillState = 'EXTINGUISHER_REQUIRED';
        updateDrillVisibility();
        state.assessmentEngine.recordExtinguisherChoice('co2');
        setObjective('Aim at the fire and hold SPRAY.');
        toggleSprayButton(true);

        const held = hitTarget.clone();
        held.scale.setScalar(0.9);
        held.position.set(0.65, -0.55, -1.1);
        held.rotation.set(0.18, -0.3, 0.9);
        scene.add(held);
        state.heldExtinguisher = held;
      } else {
        toggleSprayButton(false);
        showCriticalError('Using water is unsafe for this configured electrical-fire training scenario. Follow the approved emergency procedure.');
      }
      return;
    }

    if (hitTarget.userData.type === 'exit') {
      if (state.drillState !== 'EVACUATION_REQUIRED') {
        showToast('Extinguish the fire before evacuating');
        return;
      }
      state.drillState = 'COMPLETED';
      state.assessmentEngine.recordResponseTime();
      state.assessmentEngine.recordEvacuationChoice('safe-route');
      state.extinguished = true;
      completeAssessment();
      setScreen('assessment-result');
      showToast('Emergency drill complete');
      return;
    }

    if (hitTarget.userData.type === 'bucket') {
      toggleSprayButton(false);
      showCriticalError('Using water is unsafe for this configured electrical-fire training scenario. Follow the approved emergency procedure.');
    }
  };

  canvas.addEventListener('pointerdown', handleScenePointer);
  canvas.addEventListener('pointerdown', () => {
    if (state.correctExtinguisherSelected) state.sprayPressed = true;
  });
  canvas.addEventListener('pointerup', () => { state.sprayPressed = false; });
  canvas.addEventListener('pointerleave', () => { state.sprayPressed = false; });

  if (!state.arSession) {
    const fallbackVideo = ensureCameraVideo();
    if (state.cameraStream) {
      fallbackVideo.srcObject = state.cameraStream;
      fallbackVideo.play().catch(() => {});
    } else {
      fallbackVideo.style.display = 'block';
      showToast('Camera unavailable — using 3D fallback');
    }
    state.placementReticle.position.set(0, 0.01, -0.8);
    state.placementReticle.visible = true;
    state.currentPlacement = state.placementReticle.position.clone();
  }

  scheduleFireDetection();

  if (navigator.xr && typeof navigator.xr.isSessionSupported === 'function') {
    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (supported && 'XRWebGLLayer' in window) {
        state.arSupported = true;
        const session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body }
        });
        state.xrSession = session;
        state.arSession = session;
        const viewerSpace = await session.requestReferenceSpace('viewer');
        const localSpace = await session.requestReferenceSpace('local');
        state.arReferenceSpace = localSpace;
        const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
        state.arHitTestSource = hitTestSource;
        renderer.xr.enabled = true;
        renderer.xr.setReferenceSpaceType('local');
        const xrLayer = new XRWebGLLayer(session, renderer.getContext());
        session.updateRenderState({ baseLayer: xrLayer });
        session.addEventListener('end', () => {
          state.arSession = null;
          state.xrSession = null;
          state.arHitTestSource = null;
        });
      } else {
        state.arSupported = false;
        state.cameraFallbackMode = true;
        showToast('WebXR unavailable — using camera training mode');
      }
    } catch (error) {
      state.arSupported = false;
      state.arSession = null;
      state.cameraFallbackMode = true;
      showToast('WebXR unavailable — using camera training mode');
    }
  } else {
    state.arSupported = false;
    state.cameraFallbackMode = true;
    showToast('Using camera training mode');
  }

  renderFrame();
}

function showCompatibilityScreen(message = 'AR mode is not supported on this browser/device. Please use a compatible Android browser/device.') {
  const screen = document.getElementById('compatibility');
  const title = screen?.querySelector('h2');
  const body = screen?.querySelector('p');
  if (title) title.textContent = 'AR mode is not supported on this browser/device.';
  if (body) body.textContent = message;
  setScreen('compatibility');
}

function startARExperience() {
  requestCameraPermission().then((result) => {
    if (!result.allowed) showToast(result.reason);
    setScreen('ar-scan');
    initARScene();
  });
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
    state.correctExtinguisherSelected = true;
    setObjective('Aim at the fire and hold SPRAY.');
    toggleSprayButton(true);
  } else {
    state.assessmentEngine.recordExtinguisherChoice(choice);
    state.assessmentEngine.addCriticalError('Dangerous extinguisher selection');
    showCriticalError('Using water is unsafe for this configured electrical-fire training scenario. Follow the approved emergency procedure.');
    toggleSprayButton(false);
  }
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
  if (state.fireDetectionTimeout) {
    window.clearTimeout(state.fireDetectionTimeout);
    state.fireDetectionTimeout = null;
  }
  if (state.placementButton) {
    state.placementButton.remove();
    state.placementButton = null;
  }
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
    state.cameraStream = null;
  }
  removeCameraVideo();
  toggleSprayButton(false);
  state.selectedHazards = new Set();
  state.selectedRoute = null;
  state.extinguishChoice = null;
  state.scenarioCountdown = 60;
  state.effectiveSprayDuration = 0;
  state.extinguished = false;
  state.assessment = null;
  state.aimCorrect = false;
  state.isPlacementConfirmed = false;
  state.correctExtinguisherSelected = false;
  state.isCorrectExtinguisherSelected = false;
  state.sprayPressed = false;
  state.currentPlacement = null;
  state.drillState = 'PLACEMENT_REQUIRED';
  if (state.timer) window.clearInterval(state.timer);
  state.assessmentEngine = new window.AssessmentEngine();
  if (state.fireScenario && state.fireScenario.fire) state.fireScenario.fire.destroy();
  removeFirePreview();
  if (state.fireExtinguisher) state.fireExtinguisher.destroy();
  if (state.sprayEffect) state.sprayEffect.destroy();
  if (state.drillWorldGroup) {
    state.scene.remove(state.drillWorldGroup);
    state.drillWorldGroup = null;
  }
  state.fireScenario = null;
  state.fireExtinguisher = null;
  state.sprayEffect = null;
  state.heldExtinguisher = null;
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
