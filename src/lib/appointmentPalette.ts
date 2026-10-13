// Derive readable pastel surfaces from each salon's saved service colour.
export function appointmentPalette(color: string) {
  const hex = /^#[0-9a-f]{6}$/i.test(color) ? color.slice(1)
    : /^#[0-9a-f]{3}$/i.test(color) ? color.slice(1).split('').map(char => char + char).join('') : '64748b';
  const channels = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
  const tint = (white: number) => `rgb(${channels.map(channel => Math.round(channel * (1 - white) + 255 * white)).join(', ')})`;
  return { background: tint(0.82), border: tint(0.57), accent: tint(0.25) };
}
