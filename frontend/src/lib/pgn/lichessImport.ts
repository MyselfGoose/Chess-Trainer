export interface LichessStudyUrlInfo {
  studyId: string;
  chapterId?: string;
  url: string;
}

const LICHESS_STUDY_URL_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?lichess\.org\/study\/([a-zA-Z0-9]+)(?:\/([a-zA-Z0-9]+))?(?:[/?#]|$)/;

export function detectLichessStudyUrl(text: string): LichessStudyUrlInfo | null {
  const trimmed = text.trim();
  const match = LICHESS_STUDY_URL_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const studyId = match[1];
  if (!studyId) {
    return null;
  }

  const chapterId = match[2];
  const normalized = trimmed.startsWith("http")
    ? trimmed.split(/[?#]/)[0] ?? trimmed
    : `https://lichess.org/study/${studyId}${chapterId ? `/${chapterId}` : ""}`;

  return {
    studyId,
    chapterId,
    url: normalized,
  };
}

export function isLichessStudyUrl(text: string): boolean {
  return detectLichessStudyUrl(text) !== null;
}
