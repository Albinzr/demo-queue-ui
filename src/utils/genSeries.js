export function genSeries(points, base, variance) {
  return Array.from({ length: points }, (_, i) => ({
    t: `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
    publish: Math.max(0, base + Math.sin(i / 3) * variance + (Math.random() - 0.5) * variance * 0.4),
    consume: Math.max(0, base - 20 + Math.sin(i / 3 + 0.5) * variance + (Math.random() - 0.5) * variance * 0.3),
    lag: Math.max(0, 200 + Math.cos(i / 4) * 180 + (Math.random() - 0.5) * 80),
  }));
}
