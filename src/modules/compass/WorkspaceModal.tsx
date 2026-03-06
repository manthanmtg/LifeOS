"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Calendar, Tag, Link as LinkIcon, AlertCircle, Plus, Check, Save, Edit2, Trash2, ChevronUp, ChevronDown, ListCheck, FileText, MessageSquare, ClipboardList, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompassTask } from "./types";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { trackEvent } from "@/lib/analytics";

interface Props {
    task: CompassTask;
    onClose: () => void;
    onUpdate: (task: CompassTask) => void;
}

export default function WorkspaceModal({ task, onClose, onUpdate }: Props) {
    const [payload, setPayload] = useState(task.payload);
    const [saving, setSaving] = useState(false);

    // Auto-save logic
    const initialRender = useRef(true);
    const saveTimeout = useRef<NodeJS.Timeout | null>(null);

    const performSave = useCallback(async (currentPayload: typeof payload) => {
        setSaving(true);
        try {
            await fetch(`/api/content/${task._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: currentPayload }),
            });
            onUpdate({ ...task, payload: currentPayload });
        } catch (e) {
            console.error("Failed to auto-save", e);
        } finally {
            setSaving(false);
        }
    }, [task, onUpdate]);

    const performSaveRef = useRef(performSave);
    useEffect(() => {
        performSaveRef.current = performSave;
    }, [performSave]);

    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            return;
        }

        if (saveTimeout.current) clearTimeout(saveTimeout.current);

        saveTimeout.current = setTimeout(() => {
            performSaveRef.current(payload);
        }, 1000); // Increased slightly for better UX

        return () => {
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
        };
    }, [payload]);

    // Local form states
    const [newTag, setNewTag] = useState("");
    const [newChecklist, setNewChecklist] = useState("");
    const [newComment, setNewComment] = useState("");
    const [newLinkUrl, setNewLinkUrl] = useState("");
    const [newLinkLabel, setNewLinkLabel] = useState("");

    // Bulk Import state
    const [isImporting, setIsImporting] = useState(false);
    const [importText, setImportText] = useState("");

    // Subtask Detail Modal state
    const [selectedSubtaskIndex, setSelectedSubtaskIndex] = useState<number | null>(null);
    const [isEditingSubtaskDescription, setIsEditingSubtaskDescription] = useState(false);
    const [editingSubtaskCommentIndex, setEditingSubtaskCommentIndex] = useState<number | null>(null);
    const [newSubtaskComment, setNewSubtaskComment] = useState("");
    const [isAddingSubtaskComment, setIsAddingSubtaskComment] = useState(false);

    const subtaskDescriptionRef = useRef<HTMLTextAreaElement>(null);
    const subtaskAddCommentRef = useRef<HTMLTextAreaElement>(null);

    // Editing states
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
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

    useEffect(() => {
        if (isEditingSubtaskDescription && subtaskDescriptionRef.current) {
            subtaskDescriptionRef.current.focus();
        }
    }, [isEditingSubtaskDescription]);

    useEffect(() => {
        if (isAddingSubtaskComment && subtaskAddCommentRef.current) {
            subtaskAddCommentRef.current.focus();
        }
    }, [isAddingSubtaskComment]);

    const updateField = (key: keyof typeof payload, value: unknown) => {
        setPayload(prev => ({ ...prev, [key]: value }));
    };

    // --- Checklist Handlers ---
    const addChecklistItem = () => {
        if (!newChecklist.trim()) return;
        const newItem: CompassTask["payload"]["checklist"][0] = {
            id: crypto.randomUUID(),
            text: newChecklist.trim(),
            completed: false,
            comments: []
        };
        updateField("checklist", [...(payload.checklist || []), newItem]);
        setNewChecklist("");
    };

    const handleBulkImport = () => {
        const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) {
            setIsImporting(false);
            return;
        }

        const newItems: CompassTask["payload"]["checklist"] = lines.map(line => ({
            id: crypto.randomUUID(),
            text: line,
            completed: false,
            comments: []
        }));

        updateField("checklist", [...(payload.checklist || []), ...newItems]);
        setImportText("");
        setIsImporting(false);
    };

    const toggleChecklist = (index: number) => {
        const cl = [...payload.checklist];
        cl[index].completed = !cl[index].completed;
        updateField("checklist", cl);

        // Track rich event
        trackEvent({
            module: "compass",
            action: "toggle_checklist",
            label: cl[index].text,
            metadata: { completed: cl[index].completed, task_id: task._id }
        });
    };

    const removeChecklist = (index: number) => {
        updateField("checklist", payload.checklist.filter((_, i) => i !== index));
        if (selectedSubtaskIndex === index) setSelectedSubtaskIndex(null);
    };

    const moveChecklistItem = (index: number, direction: 'up' | 'down') => {
        const cl = [...payload.checklist];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= cl.length) return;

        const [removed] = cl.splice(index, 1);
        cl.splice(targetIndex, 0, removed);
        updateField("checklist", cl);
    };

    // --- Tags ---
    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && newTag.trim()) {
            if (!payload.category_tags.includes(newTag.trim())) {
                updateField("category_tags", [...payload.category_tags, newTag.trim()]);
            }
            setNewTag("");
        }
    };

    const removeTag = (tag: string) => {
        updateField("category_tags", payload.category_tags.filter(t => t !== tag));
    };

    // --- Comments ---
    const addComment = () => {
        if (!newComment.trim()) return;
        updateField("comments", [
            { text: newComment.trim(), created_at: new Date().toISOString() },
            ...payload.comments
        ]);
        setNewComment("");
    };

    const removeComment = (index: number) => {
        updateField("comments", payload.comments.filter((_, i) => i !== index));
    };

    // --- Links ---
    const addLink = () => {
        if (!newLinkUrl.trim()) return;
        updateField("links", [...payload.links, {
            url: newLinkUrl.trim(),
            label: newLinkLabel.trim() || new URL(newLinkUrl.trim()).hostname
        }]);
        setNewLinkUrl("");
        setNewLinkLabel("");
    };

    const removeLink = (index: number) => {
        updateField("links", payload.links.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-zinc-950 border border-zinc-800 shadow-2xl rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                {/* Header Actions */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <select
                            value={payload.status}
                            onChange={(e) => {
                                const newStatus = e.target.value;
                                updateField("status", newStatus);
                                trackEvent({
                                    module: "compass",
                                    action: "update_status",
                                    label: newStatus,
                                    metadata: { task_id: task._id }
                                });
                            }}
                            className="bg-zinc-800 border border-zinc-700 text-sm font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                        >
                            <option value="done">Done</option>
                        </select>
                        <span className="text-xs text-zinc-500 flex items-center gap-1.5 min-w-16">
                            {saving ? (
                                <span className="flex items-center gap-1 animate-pulse"><Save className="w-3 h-3" /> Saving...</span>
                            ) : (
                                <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>
                            )}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Split Workspace */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Main Content Pane */}
                    <div className="flex-1 overflow-y-auto p-8 border-r border-zinc-800 custom-scrollbar">
                        <div className="max-w-2xl mx-auto space-y-10">
                            {/* Title */}
                            <div>
                                <input
                                    type="text"
                                    value={payload.title}
                                    onChange={(e) => updateField("title", e.target.value)}
                                    className="w-full text-3xl font-bold bg-transparent border-none text-zinc-50 focus:outline-none focus:ring-0 p-0 placeholder-zinc-700"
                                    placeholder="Task Title..."
                                />
                            </div>

                            {/* Description Editor */}
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Description</h3>
                                {isEditingDescription ? (
                                    <textarea
                                        ref={descriptionRef}
                                        value={payload.description || ""}
                                        onChange={(e) => updateField("description", e.target.value)}
                                        onBlur={() => setIsEditingDescription(false)}
                                        placeholder="Write markdown here..."
                                        className="w-full min-h-[200px] bg-zinc-900 border border-accent/30 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y font-mono transition-all"
                                    />
                                ) : (
                                    <div
                                        onClick={() => setIsEditingDescription(true)}
                                        className="group relative w-full min-h-[100px] bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700 rounded-xl p-5 cursor-text transition-all"
                                    >
                                        <MarkdownRenderer
                                            content={payload.description || "_No description provided. Click to add one..._"}
                                            className="prose-sm"
                                        />
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Checklist */}
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex justify-between items-center group">
                                    <span className="flex items-center gap-2">
                                        Checklist
                                        <button
                                            onClick={() => setIsImporting(true)}
                                            className="p-1 text-zinc-600 hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                                            title="Bulk Import Items"
                                        >
                                            <ClipboardList className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                    <span className="text-[10px] text-zinc-500">
                                        {payload.checklist?.filter(c => c.completed).length || 0} / {payload.checklist?.length || 0}
                                    </span>
                                </h3>
                                <div className="space-y-2 mb-3">
                                    {payload.checklist?.map((item, i) => (
                                        <div key={item.id || i} className="flex items-start gap-3 group/item bg-zinc-900/40 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-lg p-2 transition-all">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleChecklist(i); }}
                                                className={cn(
                                                    "mt-1 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                    item.completed ? "bg-accent border-accent text-white" : "border-zinc-700 hover:border-zinc-500"
                                                )}
                                            >
                                                {item.completed && <Check className="w-3 h-3" />}
                                            </button>
                                            <div
                                                onClick={() => setSelectedSubtaskIndex(i)}
                                                className={cn(
                                                    "flex-1 text-sm cursor-pointer transition-all",
                                                    item.completed ? "text-zinc-500 line-through" : "text-zinc-300"
                                                )}
                                            >
                                                {item.text}
                                                {(item.description || item.comments?.length > 0) && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {item.description && <FileText className="w-3 h-3 text-zinc-600" />}
                                                        {item.comments?.length > 0 && (
                                                            <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                                                                <MessageSquare className="w-3 h-3" /> {item.comments.length}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveChecklistItem(i, 'up'); }}
                                                    disabled={i === 0}
                                                    className="p-1 text-zinc-500 hover:text-accent disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                                                    title="Move Up"
                                                >
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveChecklistItem(i, 'down'); }}
                                                    disabled={i === (payload.checklist?.length || 0) - 1}
                                                    className="p-1 text-zinc-500 hover:text-accent disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors"
                                                    title="Move Down"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeChecklist(i); }}
                                                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                                                    title="Remove Item"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newChecklist}
                                        onChange={(e) => setNewChecklist(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                                        placeholder="Add an item..."
                                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent/40"
                                    />
                                    <button onClick={addChecklistItem} className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Comments Log */}
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">Activity & Notes</h3>
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
                                                placeholder="Add a comment or update note..."
                                                className="flex-1 min-h-[100px] bg-zinc-900 border border-accent/30 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y font-mono"
                                            />
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => {
                                                        addComment();
                                                        setIsAddingComment(false);
                                                    }}
                                                    disabled={!newComment.trim()}
                                                    className="px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
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
                                            className="group w-full py-4 px-5 bg-zinc-900/40 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl cursor-text flex items-center gap-3 transition-all text-zinc-500 hover:text-zinc-400"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span className="text-sm font-medium">Add a note or comment...</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    {payload.comments.map((comment, i) => (
                                        <div key={i} className="flex gap-4 group/comment">
                                            <div className="w-9 h-9 rounded-full bg-zinc-800/80 flex items-center justify-center shrink-0 border border-zinc-700/50 mt-1">
                                                <span className="text-[10px] font-bold text-zinc-400 tracking-tighter">USER</span>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest leading-none">
                                                        {new Date(comment.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {editingCommentIndex === i ? (
                                                    <div className="flex flex-col gap-2">
                                                        <textarea
                                                            autoFocus
                                                            value={comment.text}
                                                            onChange={(e) => {
                                                                const updated = [...payload.comments];
                                                                updated[i].text = e.target.value;
                                                                updateField("comments", updated);
                                                            }}
                                                            onBlur={() => setEditingCommentIndex(null)}
                                                            className="w-full min-h-[80px] bg-zinc-900 border border-accent/30 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y font-mono"
                                                        />
                                                        <div className="flex justify-end">
                                                            <button
                                                                onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                                                                onClick={() => setEditingCommentIndex(null)}
                                                                className="text-xs text-accent font-semibold hover:underline"
                                                            >
                                                                Done
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="relative bg-zinc-900/20 border border-zinc-800/40 group-hover/comment:border-zinc-800 rounded-2xl p-4 cursor-text transition-all"
                                                    >
                                                        <MarkdownRenderer content={comment.text} className="prose-xs" />
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover/comment:opacity-100 transition-opacity flex gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingCommentIndex(i);
                                                                }}
                                                                className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
                                                                title="Edit Comment"
                                                            >
                                                                <Edit2 className="w-3 h-3 text-zinc-500" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeComment(i);
                                                                }}
                                                                className="p-1.5 hover:bg-red-500/10 rounded-md transition-colors group/delete"
                                                                title="Delete Comment"
                                                            >
                                                                <Trash2 className="w-3 h-3 text-zinc-500 group-hover/delete:text-red-500" />
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
                    </div>

                    {/* Metadata Sidebar Pane */}
                    <div className="w-80 bg-zinc-900/30 overflow-y-auto p-6 space-y-8">
                        {/* Priority */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-500 flex items-center gap-2 mb-3">
                                <AlertCircle className="w-3.5 h-3.5" /> Priority
                            </h4>
                            <select
                                value={payload.priority}
                                onChange={(e) => updateField("priority", e.target.value)}
                                className={cn(
                                    "w-full appearance-none bg-zinc-900 border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1",
                                    payload.priority === "p1" ? "border-red-500/50 text-red-400 focus:ring-red-500" :
                                        payload.priority === "p2" ? "border-orange-500/50 text-orange-400 focus:ring-orange-500" :
                                            payload.priority === "p3" ? "border-blue-500/50 text-blue-400 focus:ring-blue-500" :
                                                payload.priority === "p4" ? "border-zinc-700 text-zinc-400 focus:ring-zinc-400" :
                                                    "border-zinc-800 text-zinc-500 focus:ring-zinc-800"
                                )}
                            >
                                <option value="p1">P1: Urgent</option>
                                <option value="p2">P2: High</option>
                                <option value="p3">P3: Normal</option>
                                <option value="p4">P4: Low</option>
                                <option value="p5">P5: Backburner</option>
                            </select>
                        </div>

                        {/* Target Date */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-500 flex items-center gap-2 mb-3">
                                <Calendar className="w-3.5 h-3.5" /> Target Date
                            </h4>
                            <input
                                type="date"
                                value={payload.target_date ? payload.target_date.slice(0, 10) : ""}
                                onChange={(e) => updateField("target_date", e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent/40"
                            />
                        </div>

                        {/* Category Tags */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-500 flex items-center gap-2 mb-3">
                                <Tag className="w-3.5 h-3.5" /> Tags
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {payload.category_tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-md text-xs border border-zinc-700 group">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="text-zinc-500 hover:text-red-400">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={addTag}
                                placeholder="Add tag..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent/40"
                            />
                        </div>

                        {/* Links Attachments */}
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-500 flex items-center gap-2 mb-3">
                                <LinkIcon className="w-3.5 h-3.5" /> Links
                            </h4>
                            <div className="space-y-2 mb-3">
                                {payload.links.map((link, i) => (
                                    <div key={i} className="flex items-center justify-between group bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline truncate pr-4">
                                            {link.label}
                                        </a>
                                        <button onClick={() => removeLink(i)} className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 shrink-0">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={newLinkLabel}
                                    onChange={(e) => setNewLinkLabel(e.target.value)}
                                    placeholder="Label (optional)"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-accent/40"
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={newLinkUrl}
                                        onChange={(e) => setNewLinkUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-accent/40"
                                    />
                                    <button onClick={addLink} className="px-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 border border-zinc-700">
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {/* Import Modal */}
            {isImporting && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-zinc-950 border border-zinc-800 shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <ListCheck className="w-4 h-4 text-accent" /> Bulk Import Checklist
                            </h3>
                            <button onClick={() => setIsImporting(false)} className="text-zinc-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-zinc-500">Paste your checklist items below. Each new line will become a separate item.</p>
                            <textarea
                                autoFocus
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder="Task 1&#10;Task 2&#10;Task 3..."
                                className="w-full h-64 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/50 font-mono resize-none"
                            />
                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    onClick={() => setIsImporting(false)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkImport}
                                    disabled={!importText.trim()}
                                    className="px-6 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                                >
                                    Import Items
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Subtask Detail Modal (Jira Style) */}
            {selectedSubtaskIndex !== null && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-zinc-950 border border-zinc-800 shadow-2xl rounded-3xl w-full max-w-3xl h-[80vh] overflow-hidden flex flex-col">
                        {/* Subtask Header */}
                        <div className="px-6 py-4 border-b border-zinc-900 bg-zinc-900/30 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <CheckCircle className={cn(
                                    "w-4 h-4 shrink-0",
                                    payload.checklist[selectedSubtaskIndex].completed ? "text-accent" : "text-zinc-600"
                                )} />
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate">Subtask Detail</span>
                            </div>
                            <button
                                onClick={() => setSelectedSubtaskIndex(null)}
                                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
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
                                    value={payload.checklist[selectedSubtaskIndex].text}
                                    onChange={(e) => {
                                        const cl = [...payload.checklist];
                                        cl[selectedSubtaskIndex].text = e.target.value;
                                        updateField("checklist", cl);
                                    }}
                                    className="w-full text-2xl font-bold bg-transparent border-none text-zinc-50 focus:outline-none focus:ring-0 p-0 placeholder-zinc-700"
                                    placeholder="Subtask Title..."
                                />
                            </div>

                            {/* Subtask Description */}
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" /> Description
                                </h3>
                                {isEditingSubtaskDescription ? (
                                    <textarea
                                        ref={subtaskDescriptionRef}
                                        value={payload.checklist[selectedSubtaskIndex].description || ""}
                                        onChange={(e) => {
                                            const cl = [...payload.checklist];
                                            cl[selectedSubtaskIndex].description = e.target.value;
                                            updateField("checklist", cl);
                                        }}
                                        onBlur={() => setIsEditingSubtaskDescription(false)}
                                        placeholder="Add more details about this subtask..."
                                        className="w-full min-h-[150px] bg-zinc-900 border border-accent/30 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y font-mono transition-all"
                                    />
                                ) : (
                                    <div
                                        onClick={() => setIsEditingSubtaskDescription(true)}
                                        className="group relative w-full min-h-[80px] bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700 rounded-xl p-5 cursor-text transition-all"
                                    >
                                        <MarkdownRenderer
                                            content={payload.checklist[selectedSubtaskIndex].description || "_No description. Click to add details..._"}
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
                                    {isAddingSubtaskComment ? (
                                        <div className="flex gap-3 animate-fade-in-up">
                                            <textarea
                                                ref={subtaskAddCommentRef}
                                                value={newSubtaskComment}
                                                onChange={(e) => setNewSubtaskComment(e.target.value)}
                                                onBlur={() => { if (!newSubtaskComment.trim()) setIsAddingSubtaskComment(false); }}
                                                placeholder="Add a comment..."
                                                className="flex-1 min-h-[100px] bg-zinc-900 border border-accent/30 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y font-mono"
                                            />
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => {
                                                        const cl = [...payload.checklist];
                                                        const comments = cl[selectedSubtaskIndex].comments || [];
                                                        cl[selectedSubtaskIndex].comments = [{ text: newSubtaskComment.trim(), created_at: new Date().toISOString() }, ...comments];
                                                        updateField("checklist", cl);
                                                        setNewSubtaskComment("");
                                                        setIsAddingSubtaskComment(false);
                                                    }}
                                                    disabled={!newSubtaskComment.trim()}
                                                    className="px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    Post
                                                </button>
                                                <button
                                                    onClick={() => { setNewSubtaskComment(""); setIsAddingSubtaskComment(false); }}
                                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-medium rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setIsAddingSubtaskComment(true)}
                                            className="group w-full py-3 px-4 bg-zinc-900/40 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl cursor-text flex items-center gap-3 transition-all text-zinc-500 hover:text-zinc-400"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span className="text-sm font-medium">Add a comment...</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    {payload.checklist[selectedSubtaskIndex].comments?.map((comment, i) => (
                                        <div key={i} className="flex gap-4 group/subcomment">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700/50 mt-1">
                                                <span className="text-[10px] font-bold text-zinc-500 tracking-tighter">ME</span>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                                                        {new Date(comment.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                {editingSubtaskCommentIndex === i ? (
                                                    <textarea
                                                        autoFocus
                                                        value={comment.text}
                                                        onChange={(e) => {
                                                            const cl = [...payload.checklist];
                                                            cl[selectedSubtaskIndex].comments[i].text = e.target.value;
                                                            updateField("checklist", cl);
                                                        }}
                                                        onBlur={() => setEditingSubtaskCommentIndex(null)}
                                                        className="w-full bg-zinc-900 border border-accent/20 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none"
                                                    />
                                                ) : (
                                                    <div className="relative bg-zinc-900/20 border border-zinc-800/40 group-hover/subcomment:border-zinc-800 rounded-2xl p-4">
                                                        <MarkdownRenderer content={comment.text} className="prose-xs" />
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover/subcomment:opacity-100 flex gap-1">
                                                            <button onClick={() => setEditingSubtaskCommentIndex(i)} className="p-1 hover:bg-zinc-800 rounded">
                                                                <Edit2 className="w-3 h-3 text-zinc-500" />
                                                            </button>
                                                            <button onClick={() => {
                                                                const cl = [...payload.checklist];
                                                                cl[selectedSubtaskIndex].comments = cl[selectedSubtaskIndex].comments.filter((_, idx) => idx !== i);
                                                                updateField("checklist", cl);
                                                            }} className="p-1 hover:bg-red-500/10 rounded">
                                                                <Trash2 className="w-3 h-3 text-zinc-500 hover:text-red-500" />
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
                                onClick={() => {
                                    const cl = [...payload.checklist];
                                    cl[selectedSubtaskIndex].completed = !cl[selectedSubtaskIndex].completed;
                                    updateField("checklist", cl);
                                }}
                                className={cn(
                                    "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                                    payload.checklist[selectedSubtaskIndex].completed
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-accent text-white hover:bg-accent/80 shadow-lg shadow-accent/20"
                                )}
                            >
                                {payload.checklist[selectedSubtaskIndex].completed ? "Re-open Subtask" : "Complete Subtask"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
