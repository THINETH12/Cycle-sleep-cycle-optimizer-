/**
 * ============================================================
 * MEMBER 3 — PRODUCTIVITY FORECAST ENGINE
 * (COHNDSE252F-017, D Elangovan)
 * Algorithm: simplified two-process model of alertness
 *   Process S: homeostatic sleep pressure, builds the longer you're awake
 *   Process C: circadian rhythm, sum of a 24h wave and a 12h wave
 *     (the 12h wave is what produces the well-known early-afternoon dip
 *      on top of the main day/night cycle)
 * Owns: js/productivityForecast.js
 * ============================================================
 *
 * Pure math over plain numbers/Dates — no DOM dependency and no
 * dependency on sleepEngine.js or taskScheduler.js.
 */

class ProductivityForecastEngine {
  /** @param {number} baseline - resting alertness level on a 0-100 scale */
  constructor(baseline = 78) {
    this.baseline = baseline;
  }

  /**
   * Process S — homeostatic pressure. Saturating curve: diminishing
   * extra penalty the longer you're awake, capped at 35 points.
   * @param {number} hoursAwake
   */
  _homeostaticPressure(hoursAwake) {
    const capped = Math.max(0, hoursAwake);
    return 35 * (1 - Math.exp(-capped / 9));
  }

  /**
   * Process C — circadian rhythm. Sum of a 24h and a 12h cosine wave,
   * scaled to roughly +/-20 points.
   * @param {number} hourOfDay - 0-23.999
   */
  _circadianRhythm(hourOfDay) {
    const main = Math.cos(((hourOfDay - 16) / 24) * 2 * Math.PI); // peak ~4pm
    const dip = 0.35 * Math.cos(((hourOfDay - 14) / 12) * 2 * Math.PI); // afternoon dip
    return 16 * main + 8 * dip;
  }

  /**
   * Combines both processes plus sleep quality, weekly debt, and cycles
   * achieved into a single 0-100 alertness score for one moment in time.
   * @param {Date} wakeTime
   * @param {Date} atTime
   * @param {{sleepQuality?:number, debtHours?:number, cyclesAchieved?:number}} adjustments
   */
  forecastAt(wakeTime, atTime, adjustments = {}) {
    const { sleepQuality = 3, debtHours = 0, cyclesAchieved = 5 } = adjustments;
    const hoursAwake = Math.max(0, (atTime - wakeTime) / 3600000);
    const hourOfDay = atTime.getHours() + atTime.getMinutes() / 60;

    let score = this.baseline;
    score -= this._homeostaticPressure(hoursAwake);
    score += this._circadianRhythm(hourOfDay);
    score += (sleepQuality - 3) * 4; // +/-8 for great/rough sleep
    score += Math.max(-15, debtHours * 1.2); // sleep debt drags score down
    score += (cyclesAchieved - 5) * 2; // fewer/more full cycles nudge score

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Builds an hourly forecast from wake time to endHour.
   * @param {Date} wakeTime
   * @param {object} adjustments
   * @param {number} endHour - last hour of the day to forecast (default 23)
   * @returns {{hour:number, label:string, score:number}[]}
   */
  buildDailyCurve(wakeTime, adjustments = {}, endHour = 23) {
    const curve = [];
    const startHour = wakeTime.getHours();
    for (let h = startHour; h <= endHour; h++) {
      const atTime = new Date(wakeTime);
      atTime.setHours(h, 0, 0, 0);
      const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
      curve.push({ hour: h, label, score: this.forecastAt(wakeTime, atTime, adjustments) });
    }
    return curve;
  }

  /** @param {{hour:number,score:number}[]} curve @param {number} threshold */
  getLowEnergyHours(curve, threshold = 55) {
    return curve.filter((p) => p.score < threshold).map((p) => p.hour);
  }

  /** @param {{score:number}[]} curve */
  getDailyScore(curve) {
    if (curve.length === 0) return 0;
    return Math.round(curve.reduce((s, p) => s + p.score, 0) / curve.length);
  }
}

if (typeof window !== 'undefined') {
  window.ProductivityForecastEngine = ProductivityForecastEngine;
}
if (typeof module !== 'undefined') {
  module.exports = { ProductivityForecastEngine };
}
