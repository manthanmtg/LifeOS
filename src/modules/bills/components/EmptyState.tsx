"use client";

import { Receipt, FolderOpen, FolderPlus, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  isFolder: boolean;
  onAddBill: () => void;
  onAddFolder: () => void;
}

export default function EmptyState({
  isFolder,
  onAddBill,
  onAddFolder,
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
          {isFolder ? (
            <FolderOpen className="w-10 h-10 text-zinc-700" />
          ) : (
            <Receipt className="w-10 h-10 text-zinc-700" />
          )}
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Plus className="w-4 h-4 text-accent" />
        </div>
      </div>
      
      <h3 className="text-xl font-black text-zinc-200 mb-2 italic">
        {isFolder ? "This Vault is Empty" : "No Records Found"}
      </h3>
      <p className="text-sm text-zinc-500 mb-10 max-w-xs font-medium leading-relaxed">
        {isFolder
          ? "Deep dive into organization by adding bills or creating subfolders right here."
          : "Start your digital paper trail today. Organized, accessible, and enlightened."}
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={onAddFolder}
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 border border-zinc-700 text-zinc-400 text-sm font-bold rounded-2xl hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-500 transition-all active:scale-95"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Folder</span>
        </button>
        <button
          onClick={onAddBill}
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3 bg-accent text-zinc-950 text-sm font-black rounded-2xl hover:bg-accent-hover shadow-xl shadow-accent/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Enlighten First Bill</span>
        </button>
      </div>
    </motion.div>
  );
}
