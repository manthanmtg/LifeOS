"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, Pause, Play, Trash2 } from "lucide-react";
import type { ExpenseSpaceSummary } from "../types";

type Share = {
  spaceId: string;
  name: string;
  paused: boolean;
  token: string | null;
};
type Props = { spaces: ExpenseSpaceSummary[]; spaceId?: string };

export default function ExpenseSpaceShareManager({ spaces, spaceId }: Props) {
  const [shares, setShares] = useState<Share[]>([]);
  const [selection, setSelection] = useState(spaceId ?? "");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState("");
  const reload = useCallback(async () => {
    const response = await fetch("/api/expense-spaces/shares", {
      cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to load shares");
    if (
      !Array.isArray(body.data) ||
      !body.data.every(
        (item: Share) =>
          typeof item.spaceId === "string" &&
          typeof item.name === "string" &&
          typeof item.paused === "boolean" &&
          (typeof item.token === "string" || item.token === null),
      )
    )
      throw new Error("Invalid share response");
    setShares(body.data);
    setLoadFailed(false);
  }, []);
  useEffect(() => {
    let active = true;
    reload()
      .catch(() => {
        if (active) {
          setLoadFailed(true);
          setMessage("Unable to load public shares.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  async function action(
    method: "POST" | "PATCH" | "DELETE",
    id: string,
    paused?: boolean,
  ) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/expense-spaces/shares", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId: id,
          ...(paused === undefined ? {} : { paused }),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update share");
      await reload();
      setMessage(
        method === "POST"
          ? "Link created. Anyone with it can view this space."
          : method === "DELETE"
            ? "Link deleted permanently."
            : paused
              ? "Link paused."
              : "Link resumed.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update share",
      );
    } finally {
      setPending(false);
    }
  }
  const visible = spaceId
    ? shares.filter((share) => share.spaceId === spaceId)
    : shares;
  const available = spaces.filter(
    (space) => !shares.some((share) => share.spaceId === space._id),
  );
  const canCreate = spaceId
    ? !shares.some((share) => share.spaceId === spaceId)
    : available.length > 0;
  return (
    <section
      aria-label="Public shares"
      className="rounded-3xl border border-zinc-800 bg-zinc-900/55 p-5 sm:p-7"
    >
      <div className="flex items-start gap-3">
        <Link2 className="mt-1 h-5 w-5 text-accent" aria-hidden="true" />
        <div>
          <h2 className="text-xl font-bold text-zinc-50">Public shares</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            Anyone with an active link can view this space’s full ledger,
            budget, and documents, including future changes. Short links can be
            guessed, so only share spaces whose contents you are comfortable
            exposing.
          </p>
        </div>
      </div>
      {loading ? (
        <div
          role="status"
          className="mt-4 h-12 animate-pulse rounded-xl bg-zinc-800"
          aria-label="Loading public shares"
        />
      ) : loadFailed ? (
        <button
          type="button"
          className="mt-4 rounded-lg border border-zinc-700 px-3 py-2 text-sm"
          onClick={() => {
            setLoading(true);
            reload()
              .then(() => setMessage(""))
              .catch(() => setMessage("Unable to load public shares."))
              .finally(() => setLoading(false));
          }}
        >
          Retry loading shares
        </button>
      ) : (
        <div className="mt-5 space-y-3">
          {visible.length === 0 && (
            <p className="text-sm text-zinc-400">
              No public links {spaceId ? "for this space" : "yet"}.
            </p>
          )}
          {visible.map((share) => (
            <div
              key={share.spaceId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 p-4"
            >
              <div>
                <p className="font-semibold text-zinc-100">{share.name}</p>
                <p className="text-xs text-zinc-400">
                  {share.paused
                    ? "Paused · visitors cannot access this link"
                    : "Active · anyone with the link can view"}
                  {!share.token &&
                    " · Server key changed; delete and create a new link to copy it."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {share.token && (
                  <a
                    href={`/shared/expense-space/${share.token}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800"
                  >
                    Open link
                  </a>
                )}
                <button
                  type="button"
                  disabled={pending || !share.token}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}/shared/expense-space/${share.token}`,
                      );
                      setMessage("Link copied.");
                    } catch {
                      setMessage(
                        "Could not copy the link. Check clipboard permissions.",
                      );
                    }
                  }}
                >
                  <Copy className="mr-1 inline h-4 w-4" />
                  Copy
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 disabled:opacity-50"
                  onClick={() =>
                    void action("PATCH", share.spaceId, !share.paused)
                  }
                >
                  {share.paused ? (
                    <Play className="mr-1 inline h-4 w-4" />
                  ) : (
                    <Pause className="mr-1 inline h-4 w-4" />
                  )}
                  {share.paused ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg border border-danger/30 px-3 py-2 text-sm text-danger hover:bg-danger-muted/20 disabled:opacity-50"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete the public link for ${share.name}? The link will stop working permanently.`,
                      )
                    )
                      void action("DELETE", share.spaceId);
                  }}
                >
                  <Trash2 className="mr-1 inline h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
          {canCreate && (
            <div className="flex flex-wrap items-end gap-3 pt-2">
              {!spaceId && (
                <label className="text-sm text-zinc-300">
                  Expense space
                  <select
                    value={selection}
                    onChange={(event) => setSelection(event.target.value)}
                    className="mt-1 block rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
                  >
                    <option value="">Choose a space</option>
                    {available.map((space) => (
                      <option key={space._id} value={space._id}>
                        {space.payload.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                disabled={
                  pending ||
                  !(
                    spaceId ||
                    available.some((space) => space._id === selection)
                  )
                }
                onClick={() => void action("POST", spaceId || selection)}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-accent-hover disabled:opacity-50"
              >
                Generate link
              </button>
            </div>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm text-zinc-300">
          {message}
        </p>
      )}
    </section>
  );
}
