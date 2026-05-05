import { type IdeaRecord, IDEA_STATUS_LABELS } from "../shared";

interface IdeaReviewQueueProps {
  reviewQueue: IdeaRecord[];
  reviewCount: number;
  onSelectIdea: (idea: IdeaRecord) => void;
}

export default function IdeaReviewQueue({
  reviewQueue,
  reviewCount,
  onSelectIdea,
}: IdeaReviewQueueProps) {
  if (reviewQueue.length === 0) return null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-50">Review Queue</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Highest-signal ideas surfaced so they do not get buried.
          </p>
        </div>
        {reviewCount > reviewQueue.length ? (
          <span className="text-xs text-zinc-500">
            {reviewCount - reviewQueue.length} more review candidate
            {reviewCount - reviewQueue.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {reviewQueue.map((idea) => (
          <button
            key={idea._id}
            type="button"
            onClick={() => onSelectIdea(idea)}
            className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition-colors hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-accent/35"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              {IDEA_STATUS_LABELS[idea.payload.status]} ·{" "}
              {idea.payload.priority}
            </p>
            <p className="mt-2 text-sm font-semibold text-zinc-50">
              {idea.payload.title}
            </p>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
              {idea.payload.description || "No description yet."}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
