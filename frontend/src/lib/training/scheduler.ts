import type { LineMastery } from "./mastery";
import { addDaysToUtcDate, utcDateString } from "./mastery";
import type { TrainingLine } from "./types";

export function scheduleAfterReview(
  current: LineMastery,
  quality: number,
  reviewDate: string = utcDateString(),
): LineMastery {
  let easeFactor = current.easeFactor;
  let intervalDays = current.intervalDays;
  let repetitions = current.repetitions;
  let level = current.level;

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 1;
    level = "learning";
    return {
      ...current,
      easeFactor,
      intervalDays,
      repetitions,
      level,
      dueAt: addDaysToUtcDate(reviewDate, 1),
    };
  }

  repetitions += 1;
  if (repetitions === 1) {
    intervalDays = 1;
  } else if (repetitions === 2) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(intervalDays * easeFactor);
  }

  level = intervalDays > 21 && current.passCount + 1 >= 3 ? "mastered" : "review";

  return {
    ...current,
    easeFactor,
    intervalDays,
    repetitions,
    level,
    dueAt: addDaysToUtcDate(reviewDate, intervalDays),
  };
}

export function qualityFromPass(passed: boolean): number {
  return passed ? 4 : 2;
}

export function prioritizeLines(
  lines: TrainingLine[],
  mastery: Map<string, LineMastery>,
  now: Date = new Date(),
): TrainingLine[] {
  const today = utcDateString(now);

  const due: TrainingLine[] = [];
  const neverSeen: TrainingLine[] = [];
  const failed: TrainingLine[] = [];
  const rest: TrainingLine[] = [];

  for (const line of lines) {
    const record = mastery.get(line.id);
    if (!record) {
      neverSeen.push(line);
    } else if (record.dueAt <= today) {
      due.push(line);
    } else if (record.lastResult === "fail") {
      failed.push(line);
    } else {
      rest.push(line);
    }
  }

  due.sort((a, b) => {
    const aDue = mastery.get(a.id)?.dueAt ?? "";
    const bDue = mastery.get(b.id)?.dueAt ?? "";
    return aDue.localeCompare(bDue);
  });

  return [
    ...due,
    ...shuffleLines(neverSeen),
    ...shuffleLines(failed),
    ...shuffleLines(rest),
  ];
}

function shuffleLines<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
