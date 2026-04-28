"use client";

import { motion } from "framer-motion";
import { CheckSquare } from "lucide-react";

export default function TodoEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 text-center bg-zinc-900/20 border-2 border-dashed border-zinc-900 rounded-[3rem]"
    >
      <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl">
        <CheckSquare className="w-10 h-10 text-zinc-800" />
      </div>
      <h3 className="text-xl font-black text-zinc-300 mb-2 italic">
        Clean Slate
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs font-medium">
        Every great conquest begins with a single objective. Manifest your path
        above.
      </p>
    </motion.div>
  );
}
