export interface RackTargetOptions {
  count: number;
  width: number;
  garmentWidth: number;
  active: number;
  profileHalfRatio?: number;
  frontHalfRatio?: number;
  minimumSpread?: number;
}

export function calculateRackPositions({
  count,
  width,
  garmentWidth,
  active = -1,
  profileHalfRatio = 0.08,
  frontHalfRatio = 0.43,
  minimumSpread = 0,
}: RackTargetOptions): number[] {
  if (count <= 0) return [];
  const pitch = width / count;
  const rest = Array.from({ length: count }, (_, i) => (i + 0.5) * pitch);
  if (active < 0 || active >= count || count === 1) return rest;

  const profileHalf = garmentWidth * profileHalfRatio;
  const gap = garmentWidth * (frontHalfRatio + profileHalfRatio) + 14;
  const center = rest[active];
  const positions = [...rest];

  for (const direction of [-1, 1]) {
    const n = direction < 0 ? active : count - active - 1;
    if (!n) continue;
    const room = direction < 0 ? center - profileHalf : width - profileHalf - center;
    const separation = Math.min(Math.max(gap, pitch + minimumSpread), room);
    const neighborPitch = n > 1 ? Math.min(pitch, (room - separation) / (n - 1)) : pitch;
    for (let j = 1; j <= n; j++) {
      positions[active + direction * j] = center + direction * (separation + (j - 1) * neighborPitch);
    }
  }
  return positions;
}

export function slideStep(position: number, velocity: number, target: number, deltaMs: number, omega: number = 20) {
  const dt = Math.min(deltaMs, 50) / 1000;
  const offset = position - target;
  const term = velocity + omega * offset;
  const decay = Math.exp(-omega * dt);
  const next = target + (offset + term * dt) * decay;
  const nextVelocity = (velocity - omega * term * dt) * decay;
  if (Math.abs(next - target) < 0.05 && Math.abs(nextVelocity) < 0.2) {
    return { position: target, velocity: 0 };
  }
  return { position: next, velocity: nextVelocity };
}
