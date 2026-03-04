/**
 * U.S. Navy Method for estimating body fat percentage.
 * Men:   %BF = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
 * Women: %BF = 163.205 × log10(waist + hip - neck) - 97.684 × log10(height) - 78.387
 */
interface NavyParams {
  sex: string; // 'male' | 'female'
  heightCm: number;
  neckCm: number;
  waistCm: number;
  hipCm?: number | null;
}

export function estimateBodyFatNavy({ sex, heightCm, neckCm, waistCm, hipCm }: NavyParams): number | null {
  if (heightCm <= 0 || neckCm <= 0 || waistCm <= 0) return null;

  if (sex === 'female') {
    if (!hipCm || hipCm <= 0) return null;
    const circumference = waistCm + hipCm - neckCm;
    if (circumference <= 0) return null;
    const bf = 163.205 * Math.log10(circumference) - 97.684 * Math.log10(heightCm) - 78.387;
    return Math.round(bf * 10) / 10;
  }

  // Male (default)
  const diff = waistCm - neckCm;
  if (diff <= 0) return null;
  const bf = 86.010 * Math.log10(diff) - 70.041 * Math.log10(heightCm) + 36.76;
  return Math.round(bf * 10) / 10;
}
