import type { UserRating } from "../../domain/models";

interface RatingButtonsProps {
  disabled?: boolean;
  onRate: (rating: UserRating) => void;
}

export function RatingButtons({ disabled, onRate }: RatingButtonsProps) {
  return (
    <div className="rating-buttons">
      <button
        className="rating rating-help"
        disabled={disabled}
        onClick={() => onRate("needed-help")}
      >
        Needed help
      </button>
      <button
        className="rating rating-solved"
        disabled={disabled}
        onClick={() => onRate("solved")}
      >
        Solved
      </button>
      <button
        className="rating rating-easy"
        disabled={disabled}
        onClick={() => onRate("easy")}
      >
        Easy
      </button>
    </div>
  );
}
