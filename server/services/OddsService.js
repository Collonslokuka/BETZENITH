class OddsService {
  static calculatePotentialWin(stake, odds) {
    return Number((stake * odds).toFixed(2));
  }

  static calculateAccumulatorOdds(selections) {
    if (!selections || selections.length === 0) return 1;
    const totalOdds = selections.reduce((acc, selection) => {
      return acc * (selection.odds || selection.selectedMarket?.odds || 1);
    }, 1);
    return Number(totalOdds.toFixed(2));
  }

  static calculateAccumulatorWin(totalStake, selections) {
    const totalOdds = this.calculateAccumulatorOdds(selections);
    return Number((totalStake * totalOdds).toFixed(2));
  }

  static validateOdds(odds) {
    return odds >= 1.01 && odds <= 1000;
  }

  static formatOdds(odds) {
    return Number(odds).toFixed(2);
  }

  static decimalToFractional(decimalOdds) {
    const fraction = decimalOdds - 1;
    const denominator = 100;
    const numerator = Math.round(fraction * denominator);
    const gcd = this.greatestCommonDivisor(numerator, denominator);
    return `${numerator / gcd}/${denominator / gcd}`;
  }

  static decimalToAmerican(decimalOdds) {
    if (decimalOdds >= 2) return Math.round((decimalOdds - 1) * 100);
    return Math.round(-100 / (decimalOdds - 1));
  }

  static calculateImpliedProbability(odds) {
    return Number(((1 / odds) * 100).toFixed(2));
  }

  static calculateFairOdds(probability) {
    return Number((100 / probability).toFixed(2));
  }

  static updateOddsDynamically(currentOdds, bettingVolume, totalVolume, movement = 'up') {
    const volumeRatio = bettingVolume / totalVolume;
    let adjustment = 0;
    if (volumeRatio > 0.7) adjustment = movement === 'up' ? 0.15 : -0.15;
    else if (volumeRatio > 0.5) adjustment = movement === 'up' ? 0.1 : -0.1;
    else if (volumeRatio > 0.3) adjustment = movement === 'up' ? 0.05 : -0.05;

    let newOdds = currentOdds * (1 + adjustment);
    newOdds = Math.max(1.01, Math.min(1000, newOdds));
    return Number(newOdds.toFixed(2));
  }

  static calculateMargin(oddsList) {
    const margin = oddsList.reduce((acc, odds) => acc + (1 / odds), 0);
    return Number(((margin - 1) * 100).toFixed(2));
  }

  static calculateNoVigOdds(oddsList) {
    const margin = oddsList.reduce((acc, odds) => acc + (1 / odds), 0);
    return oddsList.map(odds => {
      const fairOdds = 1 / ((1 / odds) / margin);
      return Number(fairOdds.toFixed(2));
    });
  }

  static generateDefaultMarkets(matchType = 'football') {
    switch (matchType.toLowerCase()) {
      case 'football':
      case 'soccer':
        return [
          { name: '1', odds: 2.10, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'X', odds: 3.40, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: '2', odds: 2.10, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'Over 2.5', odds: 1.95, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'Under 2.5', odds: 1.95, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'BTTS', odds: 2.00, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'BTTS No', odds: 1.80, isActive: true, minBet: 10, maxBet: 1000000 },
        ];
      case 'basketball':
        return [
          { name: 'Home', odds: 1.95, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'Away', odds: 1.95, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'Over 220.5', odds: 1.90, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'Under 220.5', odds: 1.90, isActive: true, minBet: 10, maxBet: 1000000 },
        ];
      case 'tennis':
        return [
          { name: 'Home', odds: 1.85, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'Away', odds: 1.95, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'Straight Sets', odds: 2.10, isActive: true, minBet: 10, maxBet: 1000000 },
        ];
      default:
        return [
          { name: '1', odds: 2.00, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'X', odds: 3.20, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: '2', odds: 2.00, isActive: true, minBet: 10, maxBet: 1000000 },
          { name: 'Over 2.5', odds: 1.90, isActive: true, minBet: 10, maxBet: 1000000 },
        ];
    }
  }

  static adjustOddsForLiveEvent(currentOdds, event, minute) {
    let adjustment = 0;
    switch (event) {
      case 'goal': adjustment = -0.3; break;
      case 'red_card': adjustment = 0.25; break;
      case 'injury': adjustment = 0.1; break;
      case 'penalty': adjustment = -0.4; break;
      case 'missed_penalty': adjustment = 0.3; break;
      default: adjustment = 0;
    }

    const timeFactor = minute > 75 ? 1.5 : minute > 60 ? 1.2 : 1;
    adjustment *= timeFactor;

    let newOdds = currentOdds * (1 + adjustment);
    newOdds = Math.max(1.01, Math.min(1000, newOdds));
    return Number(newOdds.toFixed(2));
  }

  static calculateKellyStake(probability, odds, bankroll) {
    const b = odds - 1;
    const q = 1 - probability;
    const kellyFraction = (probability * b - q) / b;
    const recommendedStake = Math.max(0, bankroll * kellyFraction * 0.25);
    return Number(recommendedStake.toFixed(2));
  }

  static checkArbitrage(oddsList) {
    const totalImplied = oddsList.reduce((acc, odds) => acc + (1 / odds), 0);
    return {
      isArbitrage: totalImplied < 1,
      impliedProbability: Number((totalImplied * 100).toFixed(2)),
      profitPercentage: totalImplied < 1 ? Number(((1 / totalImplied - 1) * 100).toFixed(2)) : 0,
    };
  }

  static getOddsMovementStats(oddsHistory) {
    if (!oddsHistory || oddsHistory.length < 2) {
      return { volatility: 0, trend: 'stable', high: 0, low: 0 };
    }
    const changes = [];
    for (let i = 1; i < oddsHistory.length; i++) {
      changes.push(oddsHistory[i] - oddsHistory[i - 1]);
    }
    const avgChange = changes.reduce((a, b) => a + Math.abs(b), 0) / changes.length;
    const trend = oddsHistory[oddsHistory.length - 1] > oddsHistory[0] ? 'increasing'
                : oddsHistory[oddsHistory.length - 1] < oddsHistory[0] ? 'decreasing'
                : 'stable';
    return {
      volatility: Number(avgChange.toFixed(2)),
      trend,
      high: Math.max(...oddsHistory),
      low: Math.min(...oddsHistory),
    };
  }

  static greatestCommonDivisor(a, b) {
    return b === 0 ? a : this.greatestCommonDivisor(b, a % b);
  }
}

module.exports = OddsService;