"use client";

import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ChevronDown, Plus, Wrench, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  highlight,
  sublabel,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  highlight?: boolean;
  sublabel?: string;
}) {
  return (
    <div
      className={cn(
        "bg-zinc-900 border rounded-2xl p-4 flex items-center gap-4 transition-colors",
        highlight ? "border-danger/30 bg-danger/10" : "border-zinc-800",
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          bgColor,
        )}
      >
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <p
          className={cn(
            "text-2xl font-bold tracking-tight",
            highlight ? "text-danger" : "text-zinc-50",
          )}
        >
          {value}
        </p>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          {label}
          {sublabel && (
            <span className="text-zinc-600 ml-1 normal-case font-normal italic">
              ({sublabel})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md z-50 overflow-y-auto overscroll-contain"
    >
      <div className="min-h-full flex items-center justify-center px-4 py-6 sm:py-10">
        {children}
      </div>
    </motion.div>,
    document.body,
  );
}

export function ModalSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="pl-0.5">{children}</div>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors pr-8"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  );
}

export function EmptyState({
  hasAnyTasks,
  onAdd,
  onClearFilters,
}: {
  hasAnyTasks: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
        <Wrench className="w-8 h-8 text-zinc-600" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-300 mb-1">
        {hasAnyTasks
          ? "No tasks match your filters"
          : "No maintenance tasks yet"}
      </h3>
      <p className="text-sm text-zinc-500 max-w-md mb-6">
        {hasAnyTasks
          ? "Try adjusting your search or filter criteria."
          : "Track recurring maintenance for your home, vehicles, appliances, and more. Never miss a service date again."}
      </p>
      {hasAnyTasks ? (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 text-zinc-200 font-medium text-sm hover:bg-zinc-700 transition-colors"
        >
          <X className="w-4 h-4" /> Clear filters
        </button>
      ) : (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-50 text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Your First Task
        </button>
      )}
    </div>
  );
}
