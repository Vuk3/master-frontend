const fixedLabelColors: Record<string, string> = {
  helmet: "#f59e0b",
  "no-helmet": "#e11d48",
  nohelmet: "#e11d48",
  vest: "#16a34a",
  "no-vest": "#0ea5e9",
  novest: "#0ea5e9",
  gloves: "#8b5cf6",
  glove: "#8b5cf6",
  "no-gloves": "#f97316",
  nogloves: "#f97316",
  "no-glove": "#f97316",
  noglove: "#f97316",
};

const fallbackColors = [
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#0f766e",
  "#4f46e5",
  "#65a30d",
  "#be123c",
  "#0284c7",
  "#9333ea",
];

function normalizeLabel(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function hashLabel(label: string) {
  return [...label].reduce(
    (hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0,
    0,
  );
}

export function getDetectionColor(label: string) {
  const normalizedLabel = normalizeLabel(label);
  const fixedColor = fixedLabelColors[normalizedLabel];

  if (fixedColor) {
    return fixedColor;
  }

  return fallbackColors[hashLabel(normalizedLabel) % fallbackColors.length];
}
