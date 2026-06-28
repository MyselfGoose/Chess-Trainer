"use client";

import type { LichessStudyUrlInfo } from "@/lib/pgn/lichessImport";

interface LichessImportPanelProps {
  studyInfo: LichessStudyUrlInfo | null;
  expanded: boolean;
  onToggle: () => void;
}

export function LichessImportPanel({
  studyInfo,
  expanded,
  onToggle,
}: LichessImportPanelProps) {
  if (!expanded && !studyInfo) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={onToggle}
          className="text-sm font-medium text-accent hover:text-accent-foreground"
        >
          Import from Lichess study
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-info-muted p-4 ring-1 ring-info/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-info-foreground">
            Import from Lichess study
          </h2>
          <p className="mt-1 text-sm text-info-foreground/90">
            RepertoireLab cannot fetch studies directly. Export the PGN from
            Lichess and upload it here.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 text-xs font-medium text-info-foreground hover:underline"
        >
          {expanded ? "Hide" : "Show"}
        </button>
      </div>

      {expanded ? (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-info-foreground/90">
          <li>Open your study on Lichess.</li>
          <li>Use the study menu and choose <strong>Download PGN</strong>.</li>
          <li>Upload or paste the downloaded file below.</li>
        </ol>
      ) : null}

      {studyInfo ? (
        <p className="mt-3 text-sm">
          Detected study:{" "}
          <a
            href={studyInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            {studyInfo.studyId}
            {studyInfo.chapterId ? ` / ${studyInfo.chapterId}` : ""}
          </a>
        </p>
      ) : null}
    </div>
  );
}
