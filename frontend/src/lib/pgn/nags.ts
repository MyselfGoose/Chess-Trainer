const NAG_SYMBOLS: Record<string, string> = {
  "1": "!",
  "2": "?",
  "3": "!!",
  "4": "??",
  "5": "!?",
  "6": "?!",
  "7": "□",
  "10": "=",
  "13": "∞",
  "14": "⩲",
  "15": "⩱",
  "16": "±",
  "17": "∓",
  "18": "+-",
  "19": "-+",
  "22": "⨀",
  "32": "⟳",
  "36": "→",
  "40": "↑",
  "44": "=∞",
  "132": "⇆",
  "138": "⊕",
  "139": "⇄",
  "141": "○",
  "146": "N",
};

export function formatNag(token: string): string {
  if (token.startsWith("$")) {
    const num = token.slice(1);
    return NAG_SYMBOLS[num] ?? token;
  }
  return token;
}

export function formatAnnotations(annotations: string[] | undefined): string {
  if (!annotations || annotations.length === 0) {
    return "";
  }
  return annotations.map(formatNag).join("");
}

/** Emit raw NAG tokens ($n) for PGN export — not display symbols. */
export function formatNagsForExport(annotations: string[] | undefined): string {
  if (!annotations || annotations.length === 0) {
    return "";
  }
  return annotations
    .map((token) => (token.startsWith("$") ? token : `$${token}`))
    .join(" ");
}
