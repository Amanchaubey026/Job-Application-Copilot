export type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
};

type PositionedItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL: boolean;
};

function toPositioned(items: PdfTextItem[]): PositionedItem[] {
  return items
    .map((item) => ({
      str: item.str ?? "",
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      width: item.width ?? 0,
      height: item.height ?? 0,
      hasEOL: Boolean(item.hasEOL)
    }))
    .filter((item) => item.str.length > 0 || item.hasEOL);
}

function joinLine(items: PositionedItem[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  let out = "";
  let prevEnd: number | null = null;

  for (const item of sorted) {
    if (!item.str) continue;
    if (prevEnd !== null) {
      const gap = item.x - prevEnd;
      const charWidth = item.width > 0 && item.str.length > 0 ? item.width / item.str.length : 5;
      if (gap > Math.max(18, charWidth * 4)) {
        out += " | ";
      } else if (gap > Math.max(1.2, charWidth * 0.25) || !/\s$/.test(out)) {
        const needsSpace = gap > 1.2 && !/\s$/.test(out) && !/^\s/.test(item.str);
        if (needsSpace) out += " ";
      }
    }
    out += item.str;
    prevEnd = item.x + (item.width || item.str.length * 5);
  }

  return out.replace(/\s+/g, " ").trim();
}

function clusterLines(items: PositionedItem[]): PositionedItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PositionedItem[][] = [];

  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (!last) {
      lines.push([item]);
      continue;
    }
    const avgY = last.reduce((sum, row) => sum + row.y, 0) / last.length;
    const lineHeight = Math.max(...last.map((row) => row.height), item.height, 4);
    const tolerance = Math.max(lineHeight * 0.55, 3);
    if (Math.abs(item.y - avgY) <= tolerance) {
      last.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines.map((line) => line.sort((a, b) => a.x - b.x));
}

function linesFromItems(items: PositionedItem[]): string {
  return clusterLines(items)
    .map((line) => {
      const text = joinLine(line);
      return text;
    })
    .filter(Boolean)
    .join("\n");
}

function looksLikeTwoColumns(items: PositionedItem[]): boolean {
  if (items.length < 16) return false;
  const minX = Math.min(...items.map((item) => item.x));
  const maxX = Math.max(...items.map((item) => item.x + item.width));
  const width = maxX - minX;
  if (width < 280) return false;

  const leftBound = minX + width * 0.4;
  const rightBound = minX + width * 0.58;
  const left = items.filter((item) => item.x + item.width * 0.5 < leftBound).length;
  const right = items.filter((item) => item.x > rightBound).length;
  return left >= 8 && right >= 8 && left + right > items.length * 0.7;
}

export function reconstructPdfText(items: PdfTextItem[]): string {
  const positioned = toPositioned(items);
  if (positioned.length === 0) return "";

  if (looksLikeTwoColumns(positioned)) {
    const minX = Math.min(...positioned.map((item) => item.x));
    const maxX = Math.max(...positioned.map((item) => item.x + item.width));
    const mid = minX + (maxX - minX) * 0.5;
    const left = positioned.filter((item) => item.x + item.width * 0.5 < mid);
    const right = positioned.filter((item) => item.x + item.width * 0.5 >= mid);
    return [linesFromItems(left), linesFromItems(right)].filter(Boolean).join("\n\n");
  }

  return linesFromItems(positioned);
}
