"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Plus, Search, ShoppingBag, Trash2, CheckCircle2,
    Copy, RotateCcw, ChevronDown, ChevronUp, X, Info,
    MoreVertical, CheckSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingListDocument, ShoppingListPayload, ShoppingItem } from "./types";
import ConfirmDialog from "./ConfirmDialog";
import Toast, { ToastType } from "./Toast";


export default function ShoppingListAdminView() {
    const [lists, setLists] = useState<ShoppingListDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [newListTitle, setNewListTitle] = useState("");

    // Quick Add Field State
    const [quickAddItem, setQuickAddItem] = useState("");

    // UI states
    const [isPurchasedCollapsed, setIsPurchasedCollapsed] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: "",
        type: "success",
        isVisible: false
    });

    const showToast = (message: string, type: ToastType = "success") => {
        setToast({ message, type, isVisible: true });
    };

    const fetchLists = useCallback(async () => {
        try {
            const res = await fetch("/api/content?module_type=shopping_list");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch lists");
            setLists(data.data || []);
        } catch {
            showToast("Failed to fetch shopping lists", "error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLists();
    }, [fetchLists]);

    const handleCreateList = async (e: React.FormEvent) => {
        e.preventDefault();
        const title = newListTitle.trim();
        if (!title) return;

        setIsSaving(true);
        const payload: ShoppingListPayload = {
            title,
            items: [],
            is_completed: false,
        };

        try {
            const res = await fetch("/api/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ module_type: "shopping_list", is_public: false, payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create list");
            setLists(prev => [data.data, ...prev]);
            setNewListTitle("");
            setSelectedListId(data.data._id);
            setActiveTab("active");
            showToast("Shopping list created", "success");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Failed to create list", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const updateListPayload = async (listId: string, updatedPayload: ShoppingListPayload) => {
        // Optimistic update
        setLists(prev => prev.map(l => l._id === listId ? { ...l, payload: updatedPayload } : l));

        try {
            const res = await fetch(`/api/content/${listId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: updatedPayload }),
            });
            if (!res.ok) throw new Error("Failed to update list");
        } catch {
            showToast("Failed to save changes", "error");
            fetchLists(); // Rollback
        }
    };

    const deleteList = async (id: string) => {
        setConfirmDeleteId(null);
        setLists(prev => prev.filter(l => l._id !== id));
        if (selectedListId === id) setSelectedListId(null);

        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete list");
            showToast("List deleted", "success");
        } catch {
            showToast("Failed to delete list", "error");
            fetchLists(); // Rollback
        }
    };

    const toggleCompleteList = (list: ShoppingListDocument) => {
        if (!list.payload) return;
        const isNowCompleted = !list.payload.is_completed;
        const updatedPayload: ShoppingListPayload = {
            ...list.payload,
            is_completed: isNowCompleted,
            completed_at: isNowCompleted ? new Date().toISOString() : undefined,
        };
        updateListPayload(list._id, updatedPayload);
        showToast(isNowCompleted ? "List marked as completed" : "List restored to active", "success");
        if (isNowCompleted && selectedListId === list._id) {
            // Option: stay on list or go back to list view? 
            // Stay for now, but the list will move tabs.
        }
    };

    const duplicateList = async (list: ShoppingListDocument) => {
        if (!list.payload) return;
        const payload: ShoppingListPayload = {
            ...list.payload,
            title: `${list.payload.title} (Copy)`,
            is_completed: false,
            completed_at: undefined,
            // Reset items to be unpurchased for the new list
            items: (list.payload.items || []).map(item => ({ ...item, purchased: false }))
        };

        try {
            const res = await fetch("/api/content", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ module_type: "shopping_list", is_public: false, payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error("Failed to duplicate list");
            setLists(prev => [data.data, ...prev]);
            setSelectedListId(data.data._id);
            setActiveTab("active");
            showToast("List duplicated", "success");
        } catch {
            showToast("Failed to duplicate list", "error");
        }
    };

    // ITEM MANAGEMENT
    const parseSmartEntry = (text: string): { name: string, quantity?: string, unit?: string } => {
        // Regex to find quantity and unit at the end
        // Example: "Milk 2", "Tomatoes 2 kg", "Bread 1 pack"
        const regex = /^(.*?)\s+(\d+(\.\d+)?)\s*([a-zA-Z]+)?$/;
        const match = text.trim().match(regex);

        if (match) {
            return {
                name: match[1].trim(),
                quantity: match[2],
                unit: match[4] || undefined
            };
        }

        return { name: text.trim() };
    };

    const handleAddItem = (listId: string, e: React.FormEvent) => {
        e.preventDefault();
        const text = quickAddItem.trim();
        if (!text) return;

        const list = lists.find(l => l._id === listId);
        if (!list) return;

        const { name, quantity, unit } = parseSmartEntry(text);
        const newItem: ShoppingItem = {
            id: crypto.randomUUID(),
            name,
            quantity,
            unit,
            purchased: false
        };

        const updatedPayload: ShoppingListPayload = {
            ...list.payload,
            items: [...(list.payload?.items || []), newItem]
        };

        updateListPayload(listId, updatedPayload);
        setQuickAddItem("");
    };

    const toggleItemPurchased = (listId: string, itemId: string) => {
        const list = lists.find(l => l._id === listId);
        if (!list) return;

        const updatedPayload: ShoppingListPayload = {
            ...list.payload,
            items: (list.payload?.items || []).map(item =>
                item.id === itemId ? { ...item, purchased: !item.purchased } : item
            )
        };
        updateListPayload(listId, updatedPayload);
    };

    const deleteItem = (listId: string, itemId: string) => {
        const list = lists.find(l => l._id === listId);
        if (!list) return;

        const updatedPayload: ShoppingListPayload = {
            ...list.payload,
            items: (list.payload?.items || []).filter(item => item.id !== itemId)
        };
        updateListPayload(listId, updatedPayload);
    };

    const clearPurchased = (listId: string) => {
        const list = lists.find(l => l._id === listId);
        if (!list) return;

        const updatedPayload: ShoppingListPayload = {
            ...list.payload,
            items: (list.payload?.items || []).filter(item => !item.purchased)
        };
        updateListPayload(listId, updatedPayload);
        showToast("Purchased items cleared", "info");
    };

    // FILTERING
    const filteredLists = lists
        .filter(l => l.payload && l.payload.is_completed === (activeTab === "completed"))
        .filter(l => l.payload.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const selectedList = lists.find(l => l._id === selectedListId);
    const toBuyItems = selectedList?.payload?.items?.filter(i => !i.purchased) || [];
    const purchasedItems = selectedList?.payload?.items?.filter(i => i.purchased) || [];

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedListId(null)}>
                        <h1 className="text-2xl font-bold text-zinc-50 font-outfit">Shopping List</h1>
                        {selectedListId && <MoreVertical className="w-4 h-4 text-zinc-600" />}
                        {selectedListId && (
                            <span className="text-xl font-medium text-zinc-400 font-outfit truncate max-w-[200px]">
                                {selectedList?.payload.title}
                            </span>
                        )}
                    </div>
                    <p className="text-zinc-500 text-sm">Plan and track your purchases</p>
                </div>

                <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
                    <button
                        onClick={() => { setActiveTab("active"); setSelectedListId(null); }}
                        className={cn(
                            "px-6 py-2 rounded-xl text-sm font-semibold transition-all",
                            activeTab === "active" ? "bg-zinc-800 text-zinc-50 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => { setActiveTab("completed"); setSelectedListId(null); }}
                        className={cn(
                            "px-6 py-2 rounded-xl text-sm font-semibold transition-all",
                            activeTab === "completed" ? "bg-zinc-800 text-zinc-50 shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Completed
                    </button>
                </div>
            </div>

            {!selectedListId ? (
                <>
                    {/* List Grid View */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <form onSubmit={handleCreateList} className="lg:col-span-2 relative group flex items-center gap-3">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Plus className={cn("w-5 h-5 transition-colors", isSaving ? "text-accent animate-spin" : "text-zinc-500 group-focus-within:text-accent")} />
                                </div>
                                <input
                                    type="text"
                                    value={newListTitle}
                                    onChange={(e) => setNewListTitle(e.target.value)}
                                    placeholder="Create new shopping list..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all placeholder:text-zinc-600 shadow-sm"
                                    disabled={isSaving}
                                />
                            </div>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search lists..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-11 pr-4 py-4 text-sm text-zinc-50 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-600 shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-32 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : filteredLists.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <AnimatePresence mode="popLayout">
                                    {filteredLists.map((list) => (
                                        <motion.div
                                            key={list._id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            onClick={() => setSelectedListId(list._id)}
                                            className="group bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex flex-col justify-between gap-4 hover:border-accent/20 transition-all shadow-sm hover:shadow-accent/5 cursor-pointer relative overflow-hidden"
                                        >
                                            <div>
                                                <div className="flex items-start justify-between mb-2">
                                                    <h3 className="text-lg font-bold text-zinc-50 truncate pr-8 tracking-tight font-outfit">
                                                        {list.payload?.title || "Untitled List"}
                                                    </h3>
                                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(list._id); }}
                                                            className="p-2 text-zinc-500 hover:text-red-400 bg-red-400/0 hover:bg-red-400/10 rounded-xl transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-zinc-500 font-medium">
                                                    {(list.payload?.items || []).length} items • {(list.payload?.items || []).filter(i => i.purchased).length} purchased
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800/50 rounded-full border border-zinc-700/50">
                                                    <CheckSquare className="w-3 h-3 text-zinc-400" />
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                                        {Math.round(((list.payload?.items || []).filter(i => i.purchased).length / ((list.payload?.items || []).length || 1)) * 100)}%
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); duplicateList(list); }}
                                                    className="p-2 text-zinc-500 hover:text-accent bg-accent/0 hover:bg-accent/10 rounded-xl transition-all"
                                                    title="Duplicate"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-zinc-500 bg-zinc-900/20 border-2 border-dashed border-zinc-900 rounded-3xl">
                                <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center mb-6">
                                    <ShoppingBag className="w-8 h-8 opacity-20" />
                                </div>
                                <h3 className="text-zinc-400 font-bold font-outfit text-lg">
                                    {activeTab === "active" ? "No active lists yet" : "No completed lists"}
                                </h3>
                                <p className="text-zinc-600 text-sm mt-1">
                                    {activeTab === "active" ? "Create your first shopping list to get started" : "Lists you complete will appear here"}
                                </p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                /* List Detail View */
                <div className="flex-1 flex flex-col min-h-0 space-y-6">
                    {/* List Detail Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedListId(null)}
                                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-all"
                            >
                                <ChevronUp className="-rotate-90 w-5 h-5" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-zinc-50 font-outfit">{selectedList?.payload.title}</h2>
                                <p className="text-xs text-zinc-500 font-medium">
                                    {toBuyItems.length} to buy • {purchasedItems.length} purchased
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedList?.payload.is_completed ? (
                                <button
                                    onClick={() => toggleCompleteList(selectedList!)}
                                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl text-sm font-bold hover:bg-zinc-700 transition-all"
                                >
                                    <RotateCcw className="w-4 h-4" /> Restore
                                </button>
                            ) : (
                                <button
                                    onClick={() => toggleCompleteList(selectedList!)}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Done
                                </button>
                            )}
                            <button
                                onClick={() => duplicateList(selectedList!)}
                                className="p-2.5 text-zinc-500 hover:text-accent bg-zinc-900 border border-zinc-800 rounded-xl transition-all"
                                title="Duplicate"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setConfirmDeleteId(selectedList!._id)}
                                className="p-2.5 text-zinc-500 hover:text-red-400 bg-zinc-900 border border-zinc-800 rounded-xl transition-all"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Add (Only if active) */}
                    {!selectedList?.payload.is_completed && (
                        <form onSubmit={(e) => handleAddItem(selectedList!._id, e)} className="relative group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Plus className="w-5 h-5 text-zinc-500 group-focus-within:text-accent transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={quickAddItem}
                                onChange={(e) => setQuickAddItem(e.target.value)}
                                placeholder="Add item... (e.g. Milk 2 ltr)"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-zinc-50 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all placeholder:text-zinc-600 shadow-sm"
                            />
                            {quickAddItem && (
                                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl z-10 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                                        <Info className="w-4 h-4 text-accent" />
                                    </div>
                                    <div className="text-xs">
                                        <p className="font-bold text-zinc-300">Smart Preview</p>
                                        <p className="text-zinc-500">
                                            {parseSmartEntry(quickAddItem).name}
                                            {parseSmartEntry(quickAddItem).quantity && <span className="text-accent mx-1">{parseSmartEntry(quickAddItem).quantity}</span>}
                                            {parseSmartEntry(quickAddItem).unit && <span className="text-zinc-400">{parseSmartEntry(quickAddItem).unit}</span>}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}

                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto space-y-8 pr-2">
                        {/* To Buy Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">Items To Buy</h3>
                                <span className="text-[10px] font-bold text-zinc-600 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-lg">{toBuyItems.length}</span>
                            </div>

                            {toBuyItems.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <AnimatePresence mode="popLayout">
                                        {toBuyItems.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="group bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3 hover:border-accent/20 transition-all"
                                            >
                                                <button
                                                    onClick={() => toggleItemPurchased(selectedList!._id, item.id)}
                                                    className="w-5 h-5 rounded-md border-2 border-zinc-700 hover:border-accent flex items-center justify-center transition-all shrink-0"
                                                >
                                                    <div className="w-2.5 h-2.5 bg-accent rounded-sm opacity-0 group-hover:opacity-20 transition-opacity" />
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-zinc-100 truncate">{item.name}</p>
                                                    {(item.quantity || item.unit) && (
                                                        <p className="text-xs text-zinc-500 font-medium">
                                                            {item.quantity} {item.unit}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => deleteItem(selectedList!._id, item.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 rounded-lg transition-all"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="py-8 text-center bg-zinc-900/10 border border-dashed border-zinc-800 rounded-2xl">
                                    <p className="text-xs text-zinc-600 font-medium">Nothing left to buy!</p>
                                </div>
                            )}
                        </section>

                        {/* Purchased Section */}
                        <section className="space-y-4">
                            <div
                                className="flex items-center justify-between px-1 cursor-pointer select-none group/sec"
                                onClick={() => setIsPurchasedCollapsed(!isPurchasedCollapsed)}
                            >
                                <div className="flex items-center gap-2">
                                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] group-hover/sec:text-zinc-400 transition-colors">Purchased</h3>
                                    {isPurchasedCollapsed ? <ChevronDown className="w-3 h-3 text-zinc-700" /> : <ChevronUp className="w-3 h-3 text-zinc-700" />}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); clearPurchased(selectedList!._id); }}
                                        className="text-[10px] font-bold text-zinc-700 hover:text-red-400 uppercase tracking-wider transition-colors"
                                    >
                                        Clear
                                    </button>
                                    <span className="text-[10px] font-bold text-zinc-700 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-lg">{purchasedItems.length}</span>
                                </div>
                            </div>

                            {!isPurchasedCollapsed && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    <AnimatePresence mode="popLayout">
                                        {purchasedItems.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="group bg-zinc-900 p-4 rounded-2xl flex items-center gap-3 border border-zinc-900 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 transition-all"
                                            >
                                                <button
                                                    onClick={() => toggleItemPurchased(selectedList!._id, item.id)}
                                                    className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center transition-all shrink-0"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-zinc-400 line-through truncate">{item.name}</p>
                                                    {(item.quantity || item.unit) && (
                                                        <p className="text-xs text-zinc-600 font-medium">
                                                            {item.quantity} {item.unit}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => deleteItem(selectedList!._id, item.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 rounded-lg transition-all"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    {purchasedItems.length === 0 && (
                                        <div className="col-span-full py-6 text-center text-xs text-zinc-700 font-medium italic">
                                            No items purchased yet
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirmDeleteId}
                title="Delete List"
                description="Are you sure you want to delete this shopping list? All items will be permanently removed."
                onConfirm={() => confirmDeleteId && deleteList(confirmDeleteId)}
                onClose={() => setConfirmDeleteId(null)}
            />

            <Toast
                {...toast}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
        </div>
    );
}
