import { useState, useRef, useEffect } from "react";
import { X, FileText, MessageSquare, CheckCircle, Edit2, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { CompassTask } from "../types";

type Subtask = NonNullable<CompassTask["payload"]["checklist"]>[number];

interface Props {
  subtask: Subtask;
  onClose: () => void;
  onUpdate: (subtask: Subtask) => void;
}

export default function CompassSubtaskModal({ subtask, onClose, onUpdate }: Props) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const addCommentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditingDescription && descriptionRef.current) {
      descriptionRef.current.focus();
    }
  }, [isEditingDescription]);

  useEffect(() => {
    if (isAddingComment && addCommentRef.current) {
      addCommentRef.current.focus();
    }
  }, [isAddingComment]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-950 border border-zinc-800 shadow-2xl rounded-3xl w-full max-w-3xl h-[80vh] overflow-hidden flex flex-col">
        {/* Subtask Header */}
        <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <CheckCircle
              className={cn(
                "w-4 h-4 shrink-0",
                subtask.completed ? "text-accent" : "text-zinc-600"
              )}
            />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">
              Subtask Detail
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-50 hover:bg-zinc-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subtask Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
          {/* Subtask Title */}
          <div>
            <input
              type="text"
              value={subtask.text}
              onChange={(e) => onUpdate({ ...subtask, text: e.target.value })}
              maxLength={200}
              className="w-full text-2xl font-bold bg-transparent border-none text-zinc-50 focus:outline-none focus:ring-0 p-0 placeholder-zinc-700"
              placeholder="Subtask Title..."
            />
          </div>

          {/* Subtask Description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Description
            </h3>
            {isEditingDescription ? (
              <textarea
                ref={descriptionRef}
                value={subtask.description || ""}
                onChange={(e) => onUpdate({ ...subtask, description: e.target.value })}
                onBlur={() => setIsEditingDescription(false)}
                placeholder="Add more details about this subtask..."
                maxLength={2000}
                className="w-full min-h-[150px] bg-zinc-900 border border-accent/30 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y font-mono transition-all"
              />
            ) : (
              <div
                onClick={() => setIsEditingDescription(true)}
                className="group relative w-full min-h-[80px] bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700 rounded-xl p-5 cursor-text transition-all"
              >
                <MarkdownRenderer
                  content={subtask.description || "_No description. Click to add details..._"}
                  className="prose-sm"
                />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                </div>
              </div>
            )}
          </div>

          {/* Subtask Activity/Comments */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Activity
            </h3>

            <div className="mb-8">
              {isAddingComment ? (
                <div className="flex gap-3 animate-fade-in-up">
                  <textarea
                    ref={addCommentRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onBlur={() => {
                      if (!newComment.trim()) setIsAddingComment(false);
                    }}
                    placeholder="Add a comment..."
                    maxLength={2000}
                    className="flex-1 min-h-[100px] bg-zinc-900 border border-accent/30 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y font-mono"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        const comments = subtask.comments || [];
                        onUpdate({
                          ...subtask,
                          comments: [
                            { text: newComment.trim(), created_at: new Date().toISOString() },
                            ...comments,
                          ],
                        });
                        setNewComment("");
                        setIsAddingComment(false);
                      }}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-accent hover:bg-accent/80 text-zinc-50 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      Post
                    </button>
                    <button
                      onClick={() => {
                        setNewComment("");
                        setIsAddingComment(false);
                      }}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsAddingComment(true)}
                  className="group w-full py-3 px-4 bg-zinc-900/40 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl cursor-text flex items-center gap-3 transition-all text-zinc-500 hover:text-zinc-400"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add a comment...</span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {subtask.comments?.map((comment, i) => (
                <div key={i} className="flex gap-4 group/subcomment">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700/50 mt-1">
                    <span className="text-[10px] font-bold text-zinc-500 tracking-tighter">
                      ME
                    </span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                        {new Date(comment.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {editingCommentIndex === i ? (
                      <textarea
                        autoFocus
                        value={comment.text}
                        onChange={(e) => {
                          const newComments = [...(subtask.comments || [])];
                          newComments[i].text = e.target.value;
                          onUpdate({ ...subtask, comments: newComments });
                        }}
                        onBlur={() => setEditingCommentIndex(null)}
                        maxLength={2000}
                        className="w-full bg-zinc-900 border border-accent/20 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none"
                      />
                    ) : (
                      <div className="relative bg-zinc-900/20 border border-zinc-800/40 group-hover/subcomment:border-zinc-800 rounded-2xl p-4">
                        <MarkdownRenderer
                          content={comment.text}
                          className="prose-xs"
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover/subcomment:opacity-100 flex gap-1">
                          <button
                            onClick={() => setEditingCommentIndex(i)}
                            className="p-1 hover:bg-zinc-800 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-zinc-500" />
                          </button>
                          <button
                            onClick={() => {
                              const newComments = (subtask.comments || []).filter((_, idx) => idx !== i);
                              onUpdate({ ...subtask, comments: newComments });
                            }}
                            className="p-1 hover:bg-danger/10 rounded"
                          >
                            <Trash2 className="w-3 h-3 text-zinc-500 hover:text-danger" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subtask Footer */}
        <div className="px-8 py-4 border-t border-zinc-900 bg-zinc-900/50 flex justify-end shrink-0">
          <button
            onClick={() => onUpdate({ ...subtask, completed: !subtask.completed })}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              subtask.completed
                ? "bg-success/10 text-success border border-success/20"
                : "bg-accent text-zinc-50 hover:bg-accent/80 shadow-lg shadow-accent/20"
            )}
          >
            {subtask.completed ? "Re-open Subtask" : "Complete Subtask"}
          </button>
        </div>
      </div>
    </div>
  );
}
