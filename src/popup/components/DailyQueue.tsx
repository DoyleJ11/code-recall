import type { DashboardPlanItem } from "../../domain/models";

interface DailyQueueProps {
  items: DashboardPlanItem[];
  onOpen: (url: string) => void;
}

export function DailyQueue({ items, onOpen }: DailyQueueProps) {
  if (items.length === 0) {
    return <p className="empty">Nothing is scheduled today.</p>;
  }

  return (
    <ol className="queue">
      {items.map((item) => (
        <li
          className={item.completedAt ? "queue-item completed" : "queue-item"}
          key={item.problemId}
        >
          <button
            className="problem-link"
            disabled={item.completedAt !== undefined}
            onClick={() => onOpen(item.problem.url)}
          >
            <span className="problem-copy">
              <strong>{item.problem.title}</strong>
              <small>
                {item.problem.category} · {item.problem.difficulty}
              </small>
            </span>
            <span className={`pill pill-${item.kind}`}>
              {item.completedAt ? "Done" : item.kind}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
