import { fenKey, normalizeFen } from "@/lib/chess/fen";
import { getMoveChoices } from "@/lib/pgn/navigation";
import type { Repertoire } from "@/lib/repertoires/types";
import type { TrainingColor } from "@/lib/training/types";
import { trainingColorToNodeColor } from "@/lib/training/types";

export interface ExtensionBookPosition {
  fenKey: string;
  allowedSans: string[];
}

export interface ExtensionBookExport {
  version: 1;
  repertoireId: string;
  repertoireName: string;
  userColor: TrainingColor;
  exportedAt: string;
  positions: ExtensionBookPosition[];
}

export function isExtensionBookExport(value: unknown): value is ExtensionBookExport {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 ||
    typeof record.repertoireId !== "string" ||
    typeof record.repertoireName !== "string" ||
    (record.userColor !== "white" && record.userColor !== "black") ||
    typeof record.exportedAt !== "string" ||
    !Array.isArray(record.positions)
  ) {
    return false;
  }
  return record.positions.every((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const position = entry as Record<string, unknown>;
    return (
      typeof position.fenKey === "string" &&
      Array.isArray(position.allowedSans) &&
      position.allowedSans.every((san) => typeof san === "string")
    );
  });
}

export function buildExtensionBook(
  repertoire: Repertoire,
  userColor: TrainingColor,
): ExtensionBookExport {
  const userNodeColor = trainingColorToNodeColor(userColor);
  const positionMap = new Map<string, Set<string>>();

  repertoire.games.forEach((game) => {
    for (const node of Object.values(game.nodes)) {
      if (!node.san || node.color !== userNodeColor || !node.parentId) {
        continue;
      }
      const parent = game.nodes[node.parentId];
      if (!parent?.fen) {
        continue;
      }
      const key = fenKey(normalizeFen(parent.fen));
      const choices = getMoveChoices(game, parent.id).map(
        (choice) => choice.node.san,
      );
      const existing = positionMap.get(key) ?? new Set<string>();
      for (const san of choices) {
        existing.add(san);
      }
      positionMap.set(key, existing);
    }
  });

  const positions: ExtensionBookPosition[] = [...positionMap.entries()]
    .map(([key, sans]) => ({
      fenKey: key,
      allowedSans: [...sans].sort(),
    }))
    .sort((a, b) => a.fenKey.localeCompare(b.fenKey));

  return {
    version: 1,
    repertoireId: repertoire.id,
    repertoireName: repertoire.name,
    userColor,
    exportedAt: new Date().toISOString(),
    positions,
  };
}

export function downloadExtensionBook(
  repertoire: Repertoire,
  userColor: TrainingColor,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const payload = buildExtensionBook(repertoire, userColor);
  const slug = repertoire.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}-${userColor}-extension-book.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
