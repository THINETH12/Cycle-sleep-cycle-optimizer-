const DEFAULT_BASELINE = 78;
const MAX_HOMEOSTATIC_PENALTY = 35;
const HOMEOSTATIC_DECAY_RATE = 9;
const CIRCADIAN_MAIN_WEIGHT = 16;
const CIRCADIAN_DIP_WEIGHT = 8;
const CIRCADIAN_DIP_STRENGTH = 0.35;
const CIRCADIAN_MAIN_PERIOD_HOURS = 24;
const CIRCADIAN_DIP_PERIOD_HOURS = 12;
const CIRCADIAN_MAIN_PEAK_HOUR = 16;
const CIRCADIAN_DIP_PEAK_HOUR = 14;
const NEUTRAL_SLEEP_QUALITY = 3;
const SLEEP_QUALITY_WEIGHT = 4;
const DEBT_PENALTY_RATE = 1.2;
const MAX_DEBT_PENALTY = -15;
const REFERENCE_CYCLES = 5;
const CYCLE_WEIGHT = 2;
const DEFAULT_LOW_ENERGY_THRESHOLD = 55;
const MIN_SCORE = 0;
const MAX_SCORE = 100;
const MS_PER_HOUR = 3600000;
const MINUTES_PER_HOUR = 60;
const DEFAULT_END_HOUR = 23;

class ProductivityForecastEngine {
  constructor(baseline = DEFAULT_BASELINE) {
    this.baseline = baseline;
  }

  _homeostaticPressure(hoursAwake) {
    const safeHours = Math.max(0, hoursAwake);
    const growthFactor = 1 - Math.exp(-safeHours / HOMEOSTATIC_DECAY_RATE);
    return MAX_HOMEOSTATIC_PENALTY * growthFactor;
  }

  _circadianRhythm(hourOfDay) {
    const mainAngle = ((hourOfDay - CIRCADIAN_MAIN_PEAK_HOUR) / CIRCADIAN_MAIN_PERIOD_HOURS) * 2 * Math.PI;
    const dipAngle = ((hourOfDay - CIRCADIAN_DIP_PEAK_HOUR) / CIRCADIAN_DIP_PERIOD_HOURS) * 2 * Math.PI;
    const mainWave = Math.cos(mainAngle);
    const dipWave = CIRCADIAN_DIP_STRENGTH * Math.cos(dipAngle);
    return CIRCADIAN_MAIN_WEIGHT * mainWave + CIRCADIAN_DIP_WEIGHT * dipWave;
  }

  _sleepQualityAdjustment(sleepQuality) {
    return (sleepQuality - NEUTRAL_SLEEP_QUALITY) * SLEEP_QUALITY_WEIGHT;
  }

  _sleepDebtAdjustment(debtHours) {
    return Math.max(MAX_DEBT_PENALTY, debtHours * DEBT_PENALTY_RATE);
  }

  _cycleAdjustment(cyclesAchieved) {
    return (cyclesAchieved - REFERENCE_CYCLES) * CYCLE_WEIGHT;
  }

  _clampScore(score) {
    return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));
  }

  _hoursAwakeSince(wakeTime, atTime) {
    return Math.max(0, (atTime - wakeTime) / MS_PER_HOUR);
  }

  _hourOfDayAsDecimal(atTime) {
    return atTime.getHours() + atTime.getMinutes() / MINUTES_PER_HOUR;
  }

  forecastAt(wakeTime, atTime, adjustments = {}) {
    const {
      sleepQuality = NEUTRAL_SLEEP_QUALITY,
      debtHours = 0,
      cyclesAchieved = REFERENCE_CYCLES,
    } = adjustments;

    const hoursAwake = this._hoursAwakeSince(wakeTime, atTime);
    const hourOfDay = this._hourOfDayAsDecimal(atTime);

    let score = this.baseline;
    score -= this._homeostaticPressure(hoursAwake);
    score += this._circadianRhythm(hourOfDay);
    score += this._sleepQualityAdjustment(sleepQuality);
    score += this._sleepDebtAdjustment(debtHours);
    score += this._cycleAdjustment(cyclesAchieved);

    return this._clampScore(score);
  }

  _formatHourLabel(hour) {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  }

  buildDailyCurve(wakeTime, adjustments = {}, endHour = DEFAULT_END_HOUR) {
    const curve = [];
    const startHour = wakeTime.getHours();

    for (let h = startHour; h <= endHour; h++) {
      const atTime = new Date(wakeTime);
      atTime.setHours(h, 0, 0, 0);

      const label = this._formatHourLabel(h);
      const score = this.forecastAt(wakeTime, atTime, adjustments);

      curve.push({ hour: h, label, score });
    }

    return curve;
  }

  getLowEnergyHours(curve, threshold = DEFAULT_LOW_ENERGY_THRESHOLD) {
    return curve
      .filter((point) => point.score < threshold)
      .map((point) => point.hour);
  }

  getDailyScore(curve) {
    if (curve.length === 0) return 0;
    const total = curve.reduce((sum, point) => sum + point.score, 0);
    return Math.round(total / curve.length);
  }
}

if (typeof window !== 'undefined') {
  window.ProductivityForecastEngine = ProductivityForecastEngine;
}
if (typeof module !== 'undefined') {
  module.exports = { ProductivityForecastEngine };
}
