window.SCENARIO_DATA = {
  module: 'fire-explosion-response',
  title: 'Fire & Explosion Response',
  language: 'en',
  moduleId: 'module-01',
  config: {
    countdownSeconds: 60,
    fireSize: 0.16,
    fireIntensity: 1.0,
    smokeAmount: 10,
    animationSpeed: 1.0,
    scenarioDuration: 60,
    sprayRange: 1.9,
    aimTolerance: 0.28,
    extinguishingRate: 0.08,
    requiredSprayDuration: 5,
    criticalErrorsAllowed: 0
  },
  hazards: [
    { id: 'fire', label: 'Fire', icon: '🔥', correct: true },
    { id: 'electrical', label: 'Electrical hazard', icon: '⚡', correct: true },
    { id: 'flammable', label: 'Flammable material', icon: '🛢️', correct: true },
    { id: 'exit', label: 'Emergency exit', icon: '🚪', correct: false },
    { id: 'extinguisher', label: 'Fire extinguisher', icon: '🧯', correct: false }
  ],
  routes: [
    { id: 'safe-route', label: 'Safe route', icon: '✅', correct: true },
    { id: 'blocked', label: 'Blocked route', icon: '🚫', correct: false },
    { id: 'unsafe-area', label: 'Unsafe area', icon: '⚠️', correct: false },
    { id: 'assembly', label: 'Assembly point', icon: '📍', correct: true }
  ],
  scenarioText: {
    en: {
      intro: 'Electrical fires require a suitable non-conductive extinguishing agent. Do not use water.',
      hazardPrompt: 'Identify the hazards.',
      extinguisherPrompt: 'Select the correct extinguisher for electrical equipment fire.',
      evacuationPrompt: 'Choose the safest evacuation route.'
    },
    hi: {
      intro: 'विद्युत अग्नि के लिए उपयुक्त गैर-विद्युतिक उग्रता एजेंट आवश्यक है। पानी का उपयोग न करें।',
      hazardPrompt: 'खतरों की पहचान करें।',
      extinguisherPrompt: 'विद्युत उपकरण की आग के लिए सही अग्निशामक चुनें।',
      evacuationPrompt: 'सबसे सुरक्षित निकासी मार्ग चुनें।'
    }
  }
};
