class ProductivityForecastEngine {
  constructor(baseline = 78) {
    this.baseline = baseline;
  }

  _homeostaticPressure(hoursAwake) {
    const capped = Math.max(0, hoursAwake);
    return 35 * (1 - Math.exp(-capped / 9));
  }

  _circadianRhythm(hourOfDay) {
    const main = Math.cos(((hourOfDay - 16) / 24) * 2 * Math.PI);
    const dip = 0.35 * Math.cos(((hourOfDay - 14) / 12) * 2 * Math.PI);
    return 16 * main + 8 * dip;
  }

  forecastAt(wakeTime, atTime, adjustments = {}) {
    const { sleepQuality = 3, debtHours = 0, cyclesAchieved = 5 } = adjustments;
    const hoursAwake = Math.max(0, (atTime - wakeTime) / 3600000);
    const hourOfDay = atTime.getHours() + atTime.getMinutes() / 60;

    let score = this.baseline;
    score -= this._homeostaticPressure(hoursAwake);
    score += this._circadianRhythm(hourOfDay);
    score += (sleepQuality - 3) * 4;
    score += Math.max(-15, debtHours * 1.2);
    score += (cyclesAchieved - 5) * 2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

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
}

if (typeof window !== 'undefined') {
  window.ProductivityForecastEngine = ProductivityForecastEngine;
}
if (typeof module !== 'undefined') {
  module.exports = { ProductivityForecastEngine };
}