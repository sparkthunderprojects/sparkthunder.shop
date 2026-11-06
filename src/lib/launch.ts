/** True while a launch date is still in the future. */
export function isUpcoming(launchAt?: string | null, now: number = Date.now()): boolean {
  if (!launchAt) return false;
  const t = Date.parse(launchAt);
  return Number.isFinite(t) && t > now;
}
