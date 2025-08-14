export const now = () => performance.now();
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));