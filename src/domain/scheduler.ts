import { Rating, createEmptyCard, fsrs, type Card, type Grade } from "ts-fsrs";

import type { SerializedFsrsCard, Settings, UserRating } from "./models";

const RATING_MAP: Record<UserRating, Grade> = {
  "needed-help": Rating.Again,
  solved: Rating.Good,
  easy: Rating.Easy,
};

const RATING_NAME: Record<UserRating, "Again" | "Good" | "Easy"> = {
  "needed-help": "Again",
  solved: "Good",
  easy: "Easy",
};

function schedulerFor(settings: Settings) {
  return fsrs({
    request_retention: settings.requestRetention,
    maximum_interval: settings.maximumIntervalDays,
    enable_fuzz: true,
    enable_short_term: false,
  });
}

export function serializeCard(card: Card): SerializedFsrsCard {
  const { due, last_review: lastReview, ...rest } = card;
  return {
    ...rest,
    due: due.getTime(),
    ...(lastReview ? { last_review: lastReview.getTime() } : {}),
  };
}

export function deserializeCard(card: SerializedFsrsCard): Card {
  return {
    ...card,
    due: new Date(card.due),
    ...(card.last_review ? { last_review: new Date(card.last_review) } : {}),
  } as Card;
}

export interface ScheduleReviewResult {
  card: SerializedFsrsCard;
  fsrsRating: "Again" | "Good" | "Easy";
  scheduledDays: number;
}

export function scheduleReview(
  existingCard: SerializedFsrsCard | undefined,
  rating: UserRating,
  reviewedAt: number,
  settings: Settings,
): ScheduleReviewResult {
  const scheduler = schedulerFor(settings);
  const card = existingCard
    ? deserializeCard(existingCard)
    : createEmptyCard(new Date(reviewedAt));
  const result = scheduler.next(card, new Date(reviewedAt), RATING_MAP[rating]);

  return {
    card: serializeCard(result.card),
    fsrsRating: RATING_NAME[rating],
    scheduledDays: result.card.scheduled_days,
  };
}

export function getRetrievability(
  card: SerializedFsrsCard,
  at: number,
  settings: Settings,
): number {
  return schedulerFor(settings).get_retrievability(
    deserializeCard(card),
    new Date(at),
    false,
  );
}
