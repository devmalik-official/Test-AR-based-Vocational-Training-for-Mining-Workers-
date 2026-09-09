class AssessmentEngine {
  constructor(config = {}) {
    this.config = {
      hzScoreWeight: 0.2,
      responseTimeWeight: 0.15,
      extinguisherWeight: 0.2,
      aimingWeight: 0.15,
      evacuationWeight: 0.15,
      effectiveSprayWeight: 0.15,
      ...config
    };
    this.state = {
      hazardIdentification: [],
      hazardsCorrect: 0,
      hazardsTotal: 0,
      extinguisherSelection: 'none',
      responseTime: 0,
      aimAccuracy: 0,
      effectiveSprayTime: 0,
      extinguishingSuccess: false,
      evacuationChoice: null,
      criticalErrors: [],
      startTime: null,
      endTime: null
    };
  }

  start() {
    this.state.startTime = performance.now();
  }

  recordHazardSelection(item, selected) {
    this.state.hazardIdentification.push({ item, selected });
    this.state.hazardsTotal += 1;
    if (selected === item.correct) {
      this.state.hazardsCorrect += 1;
    }
  }

  recordExtinguisherChoice(choice) {
    this.state.extinguisherSelection = choice;
  }

  recordResponseTime() {
    if (!this.state.startTime) return 0;
    const elapsed = (performance.now() - this.state.startTime) / 1000;
    this.state.responseTime = elapsed;
    return elapsed;
  }

  recordAimAccuracy(value) {
    this.state.aimAccuracy = Math.max(0, Math.min(1, value));
  }

  recordEffectiveSprayTime(seconds) {
    this.state.effectiveSprayTime = seconds;
  }

  recordExtinguishingSuccess(value) {
    this.state.extinguishingSuccess = value;
  }

  recordEvacuationChoice(choice) {
    this.state.evacuationChoice = choice;
  }

  addCriticalError(message) {
    this.state.criticalErrors.push(message);
  }

  computeScore() {
    const hazardRatio = this.state.hazardsTotal ? this.state.hazardsCorrect / this.state.hazardsTotal : 0.5;
    const responseScore = Math.max(0, 1 - (this.state.responseTime / 60));
    const extinguisherScore = this.state.extinguisherSelection === 'co2' ? 1 : 0;
    const aimScore = this.state.aimAccuracy;
    const sprayScore = Math.min(1, this.state.effectiveSprayTime / 5);
    const evacuationScore = this.state.evacuationChoice === 'safe-route' ? 1 : 0;

    const overall = (
      hazardRatio * this.config.hzScoreWeight +
      responseScore * this.config.responseTimeWeight +
      extinguisherScore * this.config.extinguisherWeight +
      aimScore * this.config.aimingWeight +
      evacuationScore * this.config.evacuationWeight +
      sprayScore * this.config.effectiveSprayWeight
    ) / (
      this.config.hzScoreWeight +
      this.config.responseTimeWeight +
      this.config.extinguisherWeight +
      this.config.aimingWeight +
      this.config.evacuationWeight +
      this.config.effectiveSprayWeight
    );

    const scorePercent = Math.round(overall * 100);
    const failed = this.state.criticalErrors.length > 0 || scorePercent < 70;

    return {
      hazardIdentificationScore: Math.round(hazardRatio * 100),
      extinguisherSelection: extinguisherScore * 100,
      responseTime: Math.round(responseScore * 100),
      aimAccuracy: Math.round(aimScore * 100),
      effectiveSprayTime: Math.round(sprayScore * 100),
      evacuationChoice: evacuationScore * 100,
      extinguishingSuccess: this.state.extinguishingSuccess,
      criticalErrors: this.state.criticalErrors,
      overall: scorePercent,
      status: failed ? 'FAILED' : 'PASSED'
    };
  }
}

window.AssessmentEngine = AssessmentEngine;
