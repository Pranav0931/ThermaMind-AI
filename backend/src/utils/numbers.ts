export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}
