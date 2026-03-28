/**
 * Economic savings calculations based on CO₂ reduction.
 * Conversion rates derived from Italian average costs (ISPRA, ENEA, ISTAT 2024):
 * - Transport: fuel cost ~1.75€/L, ~2.3kg CO₂/L → ~€0.76/kg CO₂
 * - Diet: food waste value ~2€/kg, diet shift savings → ~€0.55/kg CO₂
 * - Home: electricity ~0.25€/kWh at ~0.4kg CO₂/kWh, gas ~0.90€/m³ → ~€0.60/kg CO₂
 * - Shopping: fast fashion vs sustainable → ~€0.85/kg CO₂
 * - Blended average: ~€0.65/kg CO₂
 */

export const SAVINGS_RATES = {
  transport: 0.76,
  diet: 0.55,
  home: 0.60,
  shopping: 0.85,
  general: 0.65,
} as const;

/** Convert kg CO₂ saved to € saved using blended rate */
export function co2ToEuros(co2Kg: number): number {
  return co2Kg * SAVINGS_RATES.general;
}

/** Convert grams CO₂ saved to € saved */
export function co2GramsToEuros(co2Grams: number): number {
  return (co2Grams / 1000) * SAVINGS_RATES.general;
}

/** Convert kg CO₂ by category to € saved */
export function co2ToEurosByCategory(category: keyof typeof SAVINGS_RATES, co2Kg: number): number {
  return co2Kg * (SAVINGS_RATES[category] || SAVINGS_RATES.general);
}

/** Format euro amount for display */
export function formatEuros(amount: number): string {
  if (amount < 0.01) return "0,00€";
  if (amount < 10) return `${amount.toFixed(2).replace(".", ",")}€`;
  return `${amount.toFixed(1).replace(".", ",")}€`;
}

/** Estimate annual savings from weekly carbon profile (by category) */
export function annualSavingsFromProfile(
  profile: { transport: number; diet: number; home: number; shopping: number; total: number },
  nationalAvgTotal: number = 8.2
): {
  totalAnnual: number;
  byCategory: { transport: number; diet: number; home: number; shopping: number };
  weeklyTotal: number;
} {
  // National average breakdown (approximate)
  const natAvg = { transport: 3.0, diet: 2.2, home: 1.8, shopping: 1.2 };

  const savTransport = Math.max(0, natAvg.transport - profile.transport) * SAVINGS_RATES.transport;
  const savDiet = Math.max(0, natAvg.diet - profile.diet) * SAVINGS_RATES.diet;
  const savHome = Math.max(0, natAvg.home - profile.home) * SAVINGS_RATES.home;
  const savShopping = Math.max(0, natAvg.shopping - profile.shopping) * SAVINGS_RATES.shopping;
  const weeklyTotal = savTransport + savDiet + savHome + savShopping;

  return {
    totalAnnual: weeklyTotal * 52,
    byCategory: {
      transport: savTransport * 52,
      diet: savDiet * 52,
      home: savHome * 52,
      shopping: savShopping * 52,
    },
    weeklyTotal,
  };
}
