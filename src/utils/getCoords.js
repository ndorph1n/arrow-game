export function randomPointInRing(minR, maxR) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(
    Math.random() * (maxR * maxR - minR * minR) + minR * minR
  );

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}
