export default function isColorDark(rgb: [number, number, number]) {
  const [r, g, b] = rgb;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? true : false;
}