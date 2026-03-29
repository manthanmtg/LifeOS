"use client";

import { useMemo, useState, useEffect } from "react";
import { PenLine, Shapes, Star, Globe } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";
import {
  WidgetStat,
  WidgetHighlight,
} from "@/components/dashboard/widget-primitives";

interface WhiteboardDoc {
  is_public: boolean;
  payload: {
    name: string;
    elements: Record<string, unknown>[];
    is_favorite: boolean;
    tags: string[];
  };
  updated_at: string;
}

export default function WhiteboardWidget() {
  const [boards, setBoards] = useState<WhiteboardDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/content?module_type=whiteboard_note")
      .then((r) => r.json())
      .then((d) => setBoards(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const total = boards.length;
    const totalElements = boards.reduce(
      (sum, b) => sum + (b.payload.elements?.length || 0),
      0,
    );
    const favorites = boards.filter((b) => b.payload.is_favorite).length;
    const publicCount = boards.filter((b) => b.is_public).length;
    return { total, totalElements, favorites, publicCount };
  }, [boards]);

  const latestBoard = useMemo(() => {
    if (boards.length === 0) return null;
    const favs = boards.filter((b) => b.payload.is_favorite);
    const pool = favs.length > 0 ? favs : boards;
    return [...pool].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0];
  }, [boards]);

  return (
    <WidgetCard
      title="Whiteboard"
      icon={PenLine}
      loading={loading}
      href="/admin/whiteboard"
      footer={
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          <div className="flex items-center gap-3">
            {stats.favorites > 0 && (
              <span className="flex items-center gap-1 text-warning">
                <Star className="w-3 h-3" fill="currentColor" />{" "}
                {stats.favorites}
              </span>
            )}
            {stats.publicCount > 0 && (
              <span className="flex items-center gap-1 text-success">
                <Globe className="w-3 h-3" /> {stats.publicCount}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1">
            <Shapes className="w-3 h-3" /> {stats.totalElements} elements
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        <WidgetStat value={stats.total} label="whiteboards" />
        {latestBoard ? (
          <WidgetHighlight
            icon={latestBoard.payload.is_favorite ? Star : PenLine}
            text={latestBoard.payload.name}
            subtext={
              latestBoard.payload.is_favorite ? "favorite" : "last edited"
            }
          />
        ) : (
          <WidgetHighlight icon={PenLine} text="No boards yet" />
        )}
      </div>
    </WidgetCard>
  );
}
