"use client";

import { useState, useEffect } from "react";
import {
  X,
  Check,
  Tag as TagIcon,
  Building,
  Wallet,
  Zap,
  Calendar,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Expense,
  ExpenseSettings,
  Prediction,
  DEFAULT_CATEGORIES,
  CURR_SYM,
} from "./types";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface ExpenseFormProps {
  expenses: Expense[];
  settings: ExpenseSettings;
  editingId: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ExpenseForm({
  expenses,
  settings,
  editingId,
  onClose,
  onSave,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [account, setAccount] = useState<Prediction["account"]>("UPI");
  const [category, setCategory] = useState<string>(
    settings.categories[0] || DEFAULT_CATEGORIES[0],
  );
  const [subcategory, setSubcategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<"income" | "expense">("expense");
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [suggestions, setSuggestions] = useState<
    (Prediction & { type: "income" | "expense" })[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (editingId) {
      const exp = expenses.find((e) => e._id === editingId);
      if (exp) {
        setAmount(exp.payload.amount.toString());
        setDescription(exp.payload.description);
        setMerchant(exp.payload.merchant || "");
        setAccount(exp.payload.account || "UPI");
        setCategory(exp.payload.category);
        setSubcategory(exp.payload.subcategory || "");
        setTags(exp.payload.tags || []);
        setDate(exp.payload.date.slice(0, 10));
        setType(exp.payload.type || "expense");
        setIsRecurring(exp.payload.is_recurring);
      }
    }
  }, [editingId, expenses]);

  useEffect(() => {
    if (description.length < 2) {
      setSuggestions([]);
      return;
    }

    const query = description.toLowerCase();
    const sorted = expenses
      .filter((e) => e.payload.description.toLowerCase().includes(query))
      .reduce(
        (acc, e) => {
          const key = `${e.payload.description}|${e.payload.category}|${e.payload.type || "expense"}`;
          const existing = acc.find((x) => x.key === key);
          if (existing) {
            existing.count++;
          } else {
            acc.push({
              key,
              count: 1,
              p: {
                description: e.payload.description,
                merchant: e.payload.merchant,
                account: e.payload.account || "UPI",
                category: e.payload.category,
                subcategory: e.payload.subcategory,
                tags: e.payload.tags || [],
                type: e.payload.type || "expense",
                frequency: 1,
              },
            });
          }
          return acc;
        },
        [] as {
          key: string;
          count: number;
          p: Prediction & { type: "income" | "expense" };
        }[],
      )
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((x) => x.p);

    setSuggestions(sorted);
    setShowSuggestions(sorted.length > 0);
  }, [description, expenses]);

  const applyPrediction = (p: Prediction & { type: "income" | "expense" }) => {
    setDescription(p.description);
    setMerchant(p.merchant || "");
    setAccount(p.account);
    setCategory(p.category);
    setSubcategory(p.subcategory || "");
    setTags(p.tags);
    setType(p.type);
    setShowSuggestions(false);
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return setError("Invalid amount");
    if (!description.trim()) return setError("Description required");

    setIsSubmitting(true);
    try {
      const payload = {
        amount: parsedAmount,
        currency: settings.defaultCurrency,
        description,
        merchant,
        account,
        category,
        subcategory,
        tags,
        date: new Date(date).toISOString(),
        type,
        is_recurring: isRecurring,
      };

      const res = await fetch(
        editingId ? `/api/content/${editingId}` : "/api/content",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module_type: "expense",
            is_public: false,
            payload,
          }),
        },
      );

      if (!res.ok) throw new Error("Save failed");

      trackEvent({
        module: "expenses",
        action: editingId ? `edit_${type}` : `create_${type}`,
        label: category,
        value: parsedAmount,
      });

      onSave();
      onClose();
    } catch {
      setError(`Failed to save ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-accent/5 to-transparent">
          <div>
            <h2 className="text-2xl font-black text-zinc-50 tracking-tight">
              {editingId
                ? `Refine ${type === "income" ? "Income" : "Expense"}`
                : "Master Entry"}
            </h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
              Intelligent Autopilot Active
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar"
        >
          {error && (
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger text-sm font-bold flex items-center gap-2 animate-shake">
              <Zap className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="flex p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                type === "expense"
                  ? "bg-zinc-800 text-zinc-50 shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              <TrendingDown
                className={cn(
                  "w-4 h-4 transition-colors",
                  type === "expense" ? "text-danger" : "text-zinc-500",
                )}
              />
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                type === "income"
                  ? "bg-zinc-800 text-zinc-50 shadow-lg"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              <TrendingUp
                className={cn(
                  "w-4 h-4 transition-colors",
                  type === "income" ? "text-success" : "text-zinc-500",
                )}
              />
              Income
            </button>
          </div>

          {!editingId && suggestions.length > 0 && (
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 px-2 block">
                Frequent Patterns
              </label>
              <div className="grid grid-cols-2 gap-2">
                {suggestions.slice(0, 4).map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyPrediction(p)}
                    className="flex flex-col items-start p-3 bg-zinc-950/20 border border-zinc-800 rounded-2xl hover:border-accent/40 hover:bg-accent/5 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1 w-full text-zinc-300">
                      <Zap
                        className={cn(
                          "w-3 h-3 shrink-0 transition-colors",
                          p.type === "income" ? "text-success" : "text-accent",
                        )}
                      />
                      <span className="text-[10px] font-black group-hover:text-zinc-50 truncate">
                        {p.description}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full opacity-40 text-[8px] font-black uppercase tracking-tighter">
                      <span>{p.category}</span>
                      <span>{p.account}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 block mb-2">
                Amount
              </label>
              <div className="relative">
                <span
                  className={cn(
                    "absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black transition-colors",
                    type === "income" ? "text-success/50" : "text-zinc-700",
                  )}
                >
                  {CURR_SYM[settings.defaultCurrency]}
                </span>
                <input
                  type="number"
                  step="0.01"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={cn(
                    "w-full bg-zinc-950 border border-zinc-800 rounded-3xl pl-16 pr-8 py-6 text-5xl font-black transition-all placeholder:text-zinc-900 focus:outline-none",
                    type === "income"
                      ? "text-success focus:border-success/40"
                      : "text-zinc-50 focus:border-accent",
                  )}
                />
              </div>
            </div>

            <div className="md:col-span-2 relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 block mb-2">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  type === "income"
                    ? "Where did this come from?"
                    : "What was this for?"
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-zinc-50 focus:outline-none focus:border-accent transition-all"
              />
              <AnimatePresence>
                {showSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-full left-0 right-0 z-10 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-1"
                  >
                    {suggestions.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyPrediction(p)}
                        className="w-full p-3 flex items-center justify-between hover:bg-zinc-800 rounded-xl transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Zap
                            className={cn(
                              "w-3 h-3",
                              p.type === "income"
                                ? "text-success"
                                : "text-accent",
                            )}
                          />
                          <span className="text-sm font-bold text-zinc-300 group-hover:text-zinc-50">
                            {p.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border",
                              p.type === "income"
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-zinc-800 text-zinc-500 border-zinc-700",
                            )}
                          >
                            {p.type}
                          </span>
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                            {p.category}
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 block mb-2">
                Merchant / Source
              </label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder={
                    type === "income" ? "e.g. Employer" : "e.g. Amazon"
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-50 focus:outline-none focus:border-zinc-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 block mb-2">
                Account
              </label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <select
                  value={account}
                  onChange={(e) =>
                    setAccount(e.target.value as Prediction["account"])
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-50 appearance-none focus:outline-none focus:border-zinc-600 transition-all"
                >
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 block mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3 text-sm text-zinc-50 appearance-none focus:outline-none focus:border-zinc-600 transition-all"
              >
                {settings.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 block mb-2">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-50 focus:outline-none focus:border-zinc-600 transition-all"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 block mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-xl text-[10px] font-bold text-accent"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((tag) => tag !== t))}
                    >
                      <X className="w-3 h-3 hover:text-zinc-50" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative">
                <TagIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleAddTag())
                  }
                  placeholder="Add tags..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-zinc-50 focus:outline-none focus:border-zinc-600 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-50 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "flex-[2] py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50",
                type === "income"
                  ? "bg-success hover:bg-success-muted text-zinc-50 shadow-success/20"
                  : "bg-accent hover:bg-accent-hover text-zinc-50 shadow-accent/20",
              )}
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              {editingId ? "Update Entry" : "Secure Entry"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
