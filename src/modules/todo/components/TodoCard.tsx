"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  Edit2, 
  Trash2, 
  Flag, 
  Calendar,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TodoDocument } from "../types";

interface TodoCardProps {
  todo: TodoDocument;
  onToggle: (todo: TodoDocument) => void;
  onEdit: (todo: TodoDocument) => void;
  onDelete: (id: string) => void;
}

export default function TodoCard({ 
  todo, 
  onToggle, 
  onEdit, 
  onDelete 
}: TodoCardProps) {
  const isCompleted = todo.payload.completed;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:border-accent/40 transition-all shadow-sm hover:shadow-accent/5",
        isCompleted && "bg-zinc-950/40 border-zinc-900 grayscale-[0.3]"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Satisfying Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(todo);
          }}
          className="relative group/check shrink-0 -m-1 p-1 touch-manipulation z-10"
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        >
          <div
            className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              isCompleted
                ? "bg-success border-success scale-100 shadow-lg shadow-success/20"
                : "border-zinc-700 group-hover/check:border-accent group-hover/check:scale-110"
            )}
          >
            <AnimatePresence mode="wait">
              {isCompleted ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="dot"
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-accent/40"
                />
              )}
            </AnimatePresence>
          </div>
        </button>

        {/* Title + Strikethrough Animation */}
        <div className="flex-1 min-w-0 relative">
          <div className="relative inline-block max-w-full">
            <h3
              className={cn(
                "text-sm font-bold text-zinc-100 truncate transition-all tracking-tight pr-3",
                isCompleted && "text-zinc-600 font-medium"
              )}
            >
              {todo.payload.title}
            </h3>
            
            {/* Animated SVG Strikethrough */}
            <svg 
              className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[3px] pointer-events-none overflow-visible"
              viewBox="0 0 100 1"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M 0,0.5 L 100,0.5"
                fill="transparent"
                strokeWidth="1.2"
                stroke="currentColor"
                className="text-zinc-600"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: isCompleted ? 1 : 0,
                  opacity: isCompleted ? 0.8 : 0
                }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.65, 0, 0.35, 1],
                  delay: isCompleted ? 0.15 : 0
                }}
              />
            </svg>
          </div>
          
          {todo.payload.notes && (
            <p className={cn(
              "text-xs text-zinc-500 truncate mt-0.5 font-medium transition-opacity line-clamp-1",
              isCompleted ? "opacity-30" : "opacity-100"
            )}>
              {todo.payload.notes}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(todo);
            }}
            className="p-2.5 text-zinc-600 hover:text-accent hover:bg-accent/10 rounded-xl transition-all"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo._id);
            }}
            className="p-2.5 text-zinc-600 hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metadata Badges */}
      {(todo.payload.priority || todo.payload.due_date) && (
        <div className="flex items-center gap-2 mt-3 ml-10 flex-wrap">
          {todo.payload.priority && (
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[10px] font-bold uppercase tracking-wider",
                isCompleted
                  ? "bg-zinc-950 border-zinc-900 text-zinc-700 shadow-none"
                  : todo.payload.priority === "high"
                    ? "bg-danger/10 border-danger/20 text-danger"
                    : todo.payload.priority === "medium"
                      ? "bg-warning/10 border-warning/20 text-warning"
                      : "bg-success/10 border-success/20 text-success"
              )}
            >
              <Flag className={cn(
                "w-3 h-3",
                !isCompleted && (
                  todo.payload.priority === "high" ? "text-danger" : 
                  todo.payload.priority === "medium" ? "text-warning" : "text-success"
                )
              )} />
              {todo.payload.priority}
            </div>
          )}
          
          {todo.payload.due_date && (
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[10px] font-bold uppercase tracking-wider",
                isCompleted
                  ? "bg-zinc-950 border-zinc-900 text-zinc-700"
                  : new Date(todo.payload.due_date) < new Date()
                    ? "bg-danger/10 border-danger/30 text-danger shadow-lg shadow-danger/10"
                    : "bg-zinc-800/50 border-zinc-800 text-zinc-500"
              )}
            >
              <Calendar className="w-3 h-3" />
              {new Date(todo.payload.due_date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
