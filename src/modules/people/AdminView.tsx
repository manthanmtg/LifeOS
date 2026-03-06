"use client";

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
    Plus,
    Trash2,
    Edit3,
    X,
    Users,
    Search,
    RefreshCw,
    Heart,
    Phone,
    Mail,
    Building2,
    Cake,
    Clock,
    MessageSquare,
    Video,
    Gift,
    Link as LinkIcon,
    ArrowLeft,
    AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const RELATIONSHIPS = ["family", "friend", "colleague", "acquaintance", "mentor", "client", "other"] as const;
type Relationship = (typeof RELATIONSHIPS)[number];

const RELATIONSHIP_STYLES: Record<string, string> = {
    family: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    friend: "bg-green-500/15 text-green-300 border-green-500/25",
    colleague: "bg-purple-500/15 text-purple-300 border-purple-500/25",
    acquaintance: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    mentor: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    client: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
    other: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
    family: "Family",
    friend: "Friend",
    colleague: "Colleague",
    acquaintance: "Acquaintance",
    mentor: "Mentor",
    client: "Client",
    other: "Other",
};

const INTERACTION_TYPES = ["call", "meeting", "message", "email", "gift", "other"] as const;
type InteractionType = (typeof INTERACTION_TYPES)[number];

const INTERACTION_ICONS: Record<string, typeof Phone> = {
    call: Phone,
    meeting: Video,
    message: MessageSquare,
    email: Mail,
    gift: Gift,
    other: Clock,
};

const INTERACTION_LABELS: Record<string, string> = {
    call: "Call",
    meeting: "Meeting",
    message: "Message",
    email: "Email",
    gift: "Gift",
    other: "Other",
};

interface SocialLink {
    platform: string;
    url: string;
}

interface Interaction {
    date: string;
    type: InteractionType;
    note?: string;
}

interface Person {
    _id: string;
    created_at: string;
    updated_at: string;
    payload: {
        name: string;
        relationship: Relationship;
        phone?: string;
        email?: string;
        company?: string;
        role?: string;
        birthday?: string;
        avatar_url?: string;
        interests: string[];
        tags: string[];
        notes?: string;
        social_links: SocialLink[];
        interactions: Interaction[];
        last_contacted?: string;
        is_favorite: boolean;
    };
}

function getInitials(name?: string): string {
    if (!name) return "";
    return name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

function daysSince(dateStr?: string): number | null {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (!Number.isFinite(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function contactStatusColor(days: number | null): string {
    if (days === null) return "text-zinc-500";
    if (days < 30) return "text-green-400";
    if (days < 90) return "text-yellow-400";
    return "text-red-400";
}

function contactStatusBg(days: number | null): string {
    if (days === null) return "bg-zinc-500/10";
    if (days < 30) return "bg-green-500/10";
    if (days < 90) return "bg-yellow-500/10";
    return "bg-red-500/10";
}

function isUpcomingBirthday(birthday?: string): boolean {
    if (!birthday) return false;
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const [, month, day] = birthday.split("-").map(Number);
    const thisYear = new Date(now.getFullYear(), month - 1, day);
    const nextYear = new Date(now.getFullYear() + 1, month - 1, day);
    return (thisYear >= now && thisYear <= thirtyDaysLater) ||
        (nextYear >= now && nextYear <= thirtyDaysLater);
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (!Number.isFinite(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntilBirthday(birthday?: string): number {
    if (!birthday) return 0;
    const now = new Date();
    const [, month, day] = birthday.split("-").map(Number);
    const thisYear = new Date(now.getFullYear(), month - 1, day);
    if (thisYear < now) {
        const nextYear = new Date(now.getFullYear() + 1, month - 1, day);
        return Math.ceil((nextYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    return Math.ceil((thisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

const INPUT_CLASS = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/40";
const LABEL_CLASS = "block text-xs text-zinc-500 mb-1.5";

function Portal({ children }: { children: ReactNode }) {
    if (typeof document === "undefined") return null;
    return createPortal(children, document.body);
}

export default function PeopleAdminView() {
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [relationshipFilter, setRelationshipFilter] = useState<string>("all");
    const [tagFilter, setTagFilter] = useState<string>("all");
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState("");
    const [formRelationship, setFormRelationship] = useState<Relationship>("friend");
    const [formPhone, setFormPhone] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formCompany, setFormCompany] = useState("");
    const [formRole, setFormRole] = useState("");
    const [formBirthday, setFormBirthday] = useState("");
    const [formAvatarUrl, setFormAvatarUrl] = useState("");
    const [formInterests, setFormInterests] = useState("");
    const [formTags, setFormTags] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formSocialLinks, setFormSocialLinks] = useState<SocialLink[]>([]);
    const [formIsFavorite, setFormIsFavorite] = useState(false);
    const [formError, setFormError] = useState("");

    // Interaction log form
    const [showInteractionForm, setShowInteractionForm] = useState(false);
    const [interactionType, setInteractionType] = useState<InteractionType>("other");
    const [interactionNote, setInteractionNote] = useState("");
    const [interactionDate, setInteractionDate] = useState(new Date().toISOString().slice(0, 10));

    const fetchPeople = useCallback(async () => {
        try {
            const res = await fetch("/api/content?module_type=person");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch contacts");
            setPeople(data.data || []);
        } catch (err: unknown) {
            console.error("fetchPeople failed:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPeople();
    }, [fetchPeople]);

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        people.forEach((p) => (p.payload.tags || []).forEach((t) => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }, [people]);

    const resetForm = useCallback(() => {
        setFormName("");
        setFormRelationship("friend");
        setFormPhone("");
        setFormEmail("");
        setFormCompany("");
        setFormRole("");
        setFormBirthday("");
        setFormAvatarUrl("");
        setFormInterests("");
        setFormTags("");
        setFormNotes("");
        setFormSocialLinks([]);
        setFormIsFavorite(false);
        setEditingId(null);
        setFormError("");
        setShowForm(false);
    }, []);

    const handleEdit = useCallback((person: Person) => {
        setFormName(person.payload.name);
        setFormRelationship(person.payload.relationship);
        setFormPhone(person.payload.phone || "");
        setFormEmail(person.payload.email || "");
        setFormCompany(person.payload.company || "");
        setFormRole(person.payload.role || "");
        setFormBirthday(person.payload.birthday || "");
        setFormAvatarUrl(person.payload.avatar_url || "");
        setFormInterests((person.payload.interests || []).join(", "));
        setFormTags((person.payload.tags || []).join(", "));
        setFormNotes(person.payload.notes || "");
        setFormSocialLinks(person.payload.social_links || []);
        setFormIsFavorite(person.payload.is_favorite);
        setEditingId(person._id);
        setShowForm(true);
        setViewingPerson(null);
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setFormError("");

        if (!formName.trim()) {
            setFormError("Name is required");
            return;
        }

        const payload: Record<string, unknown> = {
            name: formName.trim(),
            relationship: formRelationship,
            phone: formPhone.trim() || undefined,
            email: formEmail.trim() || "",
            company: formCompany.trim() || undefined,
            role: formRole.trim() || undefined,
            birthday: formBirthday || undefined,
            avatar_url: formAvatarUrl.trim() || "",
            interests: formInterests
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            tags: formTags
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            notes: formNotes.trim() || undefined,
            social_links: formSocialLinks.filter((sl) => sl.platform.trim() && sl.url.trim()),
            is_favorite: formIsFavorite,
        };

        // Preserve existing interactions and last_contacted when editing
        if (editingId) {
            const existing = people.find((p) => p._id === editingId);
            if (existing) {
                payload.interactions = existing.payload.interactions || [];
                payload.last_contacted = existing.payload.last_contacted;
            }
        } else {
            payload.interactions = [];
        }

        setIsSubmitting(true);
        try {
            const res = editingId
                ? await fetch(`/api/content/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload }),
                })
                : await fetch("/api/content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ module_type: "person", is_public: false, payload }),
                });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save contact");

            resetForm();
            await fetchPeople();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeletingId(id);
        try {
            const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            if (viewingPerson?._id === id) setViewingPerson(null);
            setDeleteConfirmId(null);
            await fetchPeople();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete";
            alert(message);
        } finally {
            setIsDeletingId(null);
        }
    };

    const handleToggleFavorite = async (person: Person) => {
        try {
            const res = await fetch(`/api/content/${person._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payload: { ...person.payload, is_favorite: !person.payload.is_favorite },
                }),
            });
            if (!res.ok) throw new Error("Failed to toggle favorite");
            await fetchPeople();
            if (viewingPerson?._id === person._id) {
                setViewingPerson((prev) =>
                    prev ? { ...prev, payload: { ...prev.payload, is_favorite: !prev.payload.is_favorite } } : null
                );
            }
        } catch (err: unknown) {
            console.error("toggleFavorite failed:", err);
        }
    };

    const handleLogInteraction = async () => {
        if (!viewingPerson) return;

        const newInteraction: Interaction = {
            date: interactionDate,
            type: interactionType,
            note: interactionNote.trim() || undefined,
        };

        const updatedInteractions = [...(viewingPerson.payload.interactions || []), newInteraction];

        try {
            const res = await fetch(`/api/content/${viewingPerson._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payload: {
                        ...viewingPerson.payload,
                        interactions: updatedInteractions,
                        last_contacted: interactionDate,
                    },
                }),
            });
            if (!res.ok) throw new Error("Failed to log interaction");

            setInteractionNote("");
            setInteractionType("other");
            setInteractionDate(new Date().toISOString().slice(0, 10));
            setShowInteractionForm(false);
            await fetchPeople();

            // Update the viewing person
            const refreshed = await fetch("/api/content?module_type=person");
            const refreshedData = await refreshed.json();
            const updated = (refreshedData.data || []).find((p: Person) => p._id === viewingPerson._id);
            if (updated) setViewingPerson(updated);
        } catch (err: unknown) {
            console.error("logInteraction failed:", err);
        }
    };

    const sorted = useMemo(() => {
        return [...people].sort((a, b) => {
            // Favorites first, then alphabetical
            if (a.payload.is_favorite !== b.payload.is_favorite) {
                return a.payload.is_favorite ? -1 : 1;
            }
            return a.payload.name.localeCompare(b.payload.name);
        });
    }, [people]);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return sorted.filter((person) => {
            if (showFavoritesOnly && !person.payload.is_favorite) return false;
            if (relationshipFilter !== "all" && person.payload.relationship !== relationshipFilter) return false;
            if (tagFilter !== "all" && !(person.payload.tags || []).includes(tagFilter)) return false;
            if (!query) return true;
            const haystack = `${person.payload.name} ${person.payload.company || ""} ${person.payload.role || ""} ${(person.payload.tags || []).join(" ")} ${(person.payload.interests || []).join(" ")}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [sorted, searchQuery, relationshipFilter, tagFilter, showFavoritesOnly]);

    const stats = useMemo(() => {
        const total = people.length;
        const favorites = people.filter((p) => p.payload.is_favorite).length;
        const upcomingBirthdays = people.filter((p) => isUpcomingBirthday(p.payload.birthday)).length;
        const overdue = people.filter((p) => {
            const days = daysSince(p.payload.last_contacted);
            return days !== null && days > 90;
        }).length;
        return { total, favorites, upcomingBirthdays, overdue };
    }, [people]);

    // Detail view
    if (viewingPerson) {
        const person = viewingPerson;
        const days = daysSince(person.payload.last_contacted);
        const sortedInteractions = [...(person.payload.interactions || [])].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return (
            <div className="animate-fade-in-up space-y-6">
                <button
                    onClick={() => setViewingPerson(null)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to contacts
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6"
                >
                    <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />

                    <div className="relative flex flex-col md:flex-row gap-6">
                        {/* Avatar */}
                        <div className="shrink-0">
                            {person.payload.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={person.payload.avatar_url}
                                    alt={person.payload.name}
                                    className="w-24 h-24 rounded-2xl object-cover border border-zinc-700"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-zinc-400">{getInitials(person.payload.name)}</span>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">{person.payload.name}</h1>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <span className={cn("text-xs px-2.5 py-1 rounded-full border", RELATIONSHIP_STYLES[person.payload.relationship])}>
                                            {RELATIONSHIP_LABELS[person.payload.relationship]}
                                        </span>
                                        {person.payload.is_favorite && (
                                            <span className="text-xs px-2.5 py-1 rounded-full border border-pink-500/25 bg-pink-500/10 text-pink-300 flex items-center gap-1">
                                                <Heart className="w-3 h-3" fill="currentColor" /> Favorite
                                            </span>
                                        )}
                                        {isUpcomingBirthday(person.payload.birthday) && (
                                            <span className="text-xs px-2.5 py-1 rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-300 flex items-center gap-1">
                                                <Cake className="w-3 h-3" /> Birthday in {daysUntilBirthday(person.payload.birthday!)} days
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleToggleFavorite(person)}
                                        className={cn(
                                            "p-2 rounded-xl transition-colors",
                                            person.payload.is_favorite ? "text-pink-400 bg-pink-500/10" : "text-zinc-500 hover:text-pink-400 hover:bg-zinc-800"
                                        )}
                                    >
                                        <Heart className="w-5 h-5" fill={person.payload.is_favorite ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(person)}
                                        className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                                    >
                                        <Edit3 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmId(person._id)}
                                        className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {(person.payload.company || person.payload.role) && (
                                <p className="text-sm text-zinc-400 mt-2 flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5" />
                                    {person.payload.role}{person.payload.role && person.payload.company ? " at " : ""}{person.payload.company}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-4 mt-4 text-sm">
                                {person.payload.phone && (
                                    <span className="flex items-center gap-1.5 text-zinc-400">
                                        <Phone className="w-3.5 h-3.5" /> {person.payload.phone}
                                    </span>
                                )}
                                {person.payload.email && (
                                    <span className="flex items-center gap-1.5 text-zinc-400">
                                        <Mail className="w-3.5 h-3.5" /> {person.payload.email}
                                    </span>
                                )}
                                {person.payload.birthday && (
                                    <span className="flex items-center gap-1.5 text-zinc-400">
                                        <Cake className="w-3.5 h-3.5" /> {formatDate(person.payload.birthday)}
                                    </span>
                                )}
                            </div>

                            {days !== null && (
                                <div className={cn("inline-flex items-center gap-1.5 mt-3 text-xs px-2.5 py-1 rounded-full", contactStatusBg(days), contactStatusColor(days))}>
                                    <Clock className="w-3 h-3" />
                                    Last contacted {days === 0 ? "today" : `${days} day${days !== 1 ? "s" : ""} ago`}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Details grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left column: notes, interests, tags, social */}
                    <div className="space-y-4">
                        {person.payload.notes && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Notes</h3>
                                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{person.payload.notes}</p>
                            </div>
                        )}

                        {(person.payload.interests || []).length > 0 && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Interests</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(person.payload.interests || []).map((interest) => (
                                        <span key={interest} className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs">
                                            {interest}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(person.payload.tags || []).length > 0 && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Tags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {(person.payload.tags || []).map((tag) => (
                                        <span key={tag} className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(person.payload.social_links || []).length > 0 && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Social Links</h3>
                                <div className="space-y-2">
                                    {(person.payload.social_links || []).map((sl, i) => (
                                        <a
                                            key={i}
                                            href={sl.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-accent transition-colors"
                                        >
                                            <LinkIcon className="w-3.5 h-3.5" />
                                            <span className="font-medium">{sl.platform}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right column: interaction timeline */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Interactions</h3>
                            <button
                                onClick={() => setShowInteractionForm(!showInteractionForm)}
                                className="flex items-center gap-1.5 text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Plus className="w-3 h-3" /> Log
                            </button>
                        </div>

                        <AnimatePresence>
                            {showInteractionForm && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="border border-zinc-800 rounded-xl p-4 mb-4 space-y-3 bg-zinc-950/50">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={LABEL_CLASS}>Type</label>
                                                <select
                                                    value={interactionType}
                                                    onChange={(e) => setInteractionType(e.target.value as InteractionType)}
                                                    className={INPUT_CLASS}
                                                >
                                                    {INTERACTION_TYPES.map((t) => (
                                                        <option key={t} value={t}>{INTERACTION_LABELS[t]}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={LABEL_CLASS}>Date</label>
                                                <input
                                                    type="date"
                                                    value={interactionDate}
                                                    onChange={(e) => setInteractionDate(e.target.value)}
                                                    className={INPUT_CLASS}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={LABEL_CLASS}>Note (optional)</label>
                                            <input
                                                type="text"
                                                value={interactionNote}
                                                onChange={(e) => setInteractionNote(e.target.value)}
                                                placeholder="What did you discuss?"
                                                className={INPUT_CLASS}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setShowInteractionForm(false)}
                                                className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleLogInteraction}
                                                className="text-xs bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg transition-colors"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {sortedInteractions.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No interactions logged yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {sortedInteractions.map((interaction, i) => {
                                    const IconComp = INTERACTION_ICONS[interaction.type] || Clock;
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                                                <IconComp className="w-3.5 h-3.5 text-zinc-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-zinc-300">{INTERACTION_LABELS[interaction.type]}</span>
                                                    <span className="text-[10px] text-zinc-600">{formatDate(interaction.date)}</span>
                                                </div>
                                                {interaction.note && (
                                                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{interaction.note}</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete confirmation modal */}
                <Portal>
                    <AnimatePresence>
                        {deleteConfirmId === person._id && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                                onClick={() => setDeleteConfirmId(null)}
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm mx-4 space-y-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-red-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-zinc-50">Delete contact?</h3>
                                            <p className="text-xs text-zinc-500">This action cannot be undone.</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setDeleteConfirmId(null)}
                                            className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleDelete(person._id)}
                                            disabled={isDeletingId === person._id}
                                            className="text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isDeletingId === person._id && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                            Delete
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Portal>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {/* Header with stats */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-accent/20 blur-3xl" />
                <div className="absolute -bottom-16 left-1/4 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">People</h1>
                            <p className="text-zinc-400 mt-1">Your personal CRM for managing contacts and interactions.</p>
                        </div>
                        <button
                            onClick={() => {
                                resetForm();
                                setShowForm(true);
                            }}
                            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add Contact
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Total Contacts</p>
                            <p className="text-lg font-semibold text-zinc-50">{stats.total}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Favorites</p>
                            <p className="text-lg font-semibold text-pink-300">{stats.favorites}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Upcoming Birthdays</p>
                            <p className="text-lg font-semibold text-yellow-300">{stats.upcomingBirthdays}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
                            <p className="text-xs text-zinc-500">Overdue ({">"}90 days)</p>
                            <p className="text-lg font-semibold text-red-300">{stats.overdue}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Portal>
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm py-8"
                            onClick={() => resetForm()}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl mx-4 space-y-4 max-h-[80vh] flex flex-col"
                            >
                                <div className="flex items-center justify-between shrink-0">
                                    <h2 className="text-lg font-semibold text-zinc-50">{editingId ? "Edit" : "Add"} Contact</h2>
                                    <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                            <form onSubmit={handleSubmit} className="space-y-4 flex-1 min-h-0 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL_CLASS}>Name *</label>
                                        <input
                                            type="text"
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            placeholder="Full name"
                                            className={INPUT_CLASS}
                                            autoFocus
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Relationship</label>
                                        <select
                                            value={formRelationship}
                                            onChange={(e) => setFormRelationship(e.target.value as Relationship)}
                                            className={INPUT_CLASS}
                                            disabled={isSubmitting}
                                        >
                                            {RELATIONSHIPS.map((r) => (
                                                <option key={r} value={r}>{RELATIONSHIP_LABELS[r]}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Phone</label>
                                        <input
                                            type="tel"
                                            value={formPhone}
                                            onChange={(e) => setFormPhone(e.target.value)}
                                            placeholder="+1 234 567 8900"
                                            className={INPUT_CLASS}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Email</label>
                                        <input
                                            type="email"
                                            value={formEmail}
                                            onChange={(e) => setFormEmail(e.target.value)}
                                            placeholder="email@example.com"
                                            className={INPUT_CLASS}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Company</label>
                                        <input
                                            type="text"
                                            value={formCompany}
                                            onChange={(e) => setFormCompany(e.target.value)}
                                            placeholder="Company name"
                                            className={INPUT_CLASS}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Role</label>
                                        <input
                                            type="text"
                                            value={formRole}
                                            onChange={(e) => setFormRole(e.target.value)}
                                            placeholder="Job title"
                                            className={INPUT_CLASS}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Birthday</label>
                                        <input
                                            type="date"
                                            value={formBirthday}
                                            onChange={(e) => setFormBirthday(e.target.value)}
                                            className={INPUT_CLASS}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Avatar URL</label>
                                        <input
                                            type="url"
                                            value={formAvatarUrl}
                                            onChange={(e) => setFormAvatarUrl(e.target.value)}
                                            placeholder="https://..."
                                            className={INPUT_CLASS}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Interests (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={formInterests}
                                            onChange={(e) => setFormInterests(e.target.value)}
                                            placeholder="hiking, cooking, chess"
                                            className={INPUT_CLASS}
                                            disabled={isSubmitting}
                                        />
                                        {formInterests.trim() && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {formInterests.split(",").map((s) => s.trim()).filter(Boolean).map((interest) => (
                                                    <span key={interest} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px]">
                                                        {interest}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>Tags (comma-separated)</label>
                                        <input
                                            type="text"
                                            value={formTags}
                                            onChange={(e) => setFormTags(e.target.value)}
                                            placeholder="vip, neighbor, gym-buddy"
                                            className={INPUT_CLASS}
                                            disabled={isSubmitting}
                                        />
                                        {formTags.trim() && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {formTags.split(",").map((s) => s.trim()).filter(Boolean).map((tag) => (
                                                    <span key={tag} className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px]">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>Notes</label>
                                    <textarea
                                        value={formNotes}
                                        onChange={(e) => setFormNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Personal notes about this contact..."
                                        className={cn(INPUT_CLASS, "resize-y")}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Social Links */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs text-zinc-500">Social Links</label>
                                        <button
                                            type="button"
                                            onClick={() => setFormSocialLinks([...formSocialLinks, { platform: "", url: "" }])}
                                            className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                                            disabled={isSubmitting}
                                        >
                                            <Plus className="w-3 h-3" /> Add Link
                                        </button>
                                    </div>
                                    {(formSocialLinks || []).map((sl, i) => (
                                        <div key={i} className="flex items-center gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={sl.platform}
                                                onChange={(e) => {
                                                    const updated = [...formSocialLinks];
                                                    updated[i] = { ...updated[i], platform: e.target.value };
                                                    setFormSocialLinks(updated);
                                                }}
                                                placeholder="Platform"
                                                className={cn(INPUT_CLASS, "flex-[1]")}
                                                disabled={isSubmitting}
                                            />
                                            <input
                                                type="url"
                                                value={sl.url}
                                                onChange={(e) => {
                                                    const updated = [...formSocialLinks];
                                                    updated[i] = { ...updated[i], url: e.target.value };
                                                    setFormSocialLinks(updated);
                                                }}
                                                placeholder="https://..."
                                                className={cn(INPUT_CLASS, "flex-[2]")}
                                                disabled={isSubmitting}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormSocialLinks(formSocialLinks.filter((_, j) => j !== i))}
                                                className="p-2 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                                                disabled={isSubmitting}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Favorite toggle */}
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormIsFavorite(!formIsFavorite)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors border",
                                            formIsFavorite
                                                ? "bg-pink-500/10 border-pink-500/25 text-pink-300"
                                                : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-300"
                                        )}
                                        disabled={isSubmitting}
                                    >
                                        <Heart className="w-4 h-4" fill={formIsFavorite ? "currentColor" : "none"} />
                                        {formIsFavorite ? "Favorited" : "Mark as favorite"}
                                    </button>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-2 shrink-0">
                                    {formError && <span className="text-red-400 text-xs mr-auto">{formError}</span>}
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2.5 transition-colors"
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                        {isSubmitting ? (editingId ? "Updating..." : "Adding...") : (editingId ? "Update" : "Add Contact")}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
                </AnimatePresence>
            </Portal>

            {/* Search & Filters */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, company, tags..."
                            aria-label="Search contacts"
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl pl-10 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                        />
                    </div>
                    <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs border transition-colors flex items-center gap-1.5",
                            showFavoritesOnly
                                ? "bg-pink-500/15 border-pink-500/35 text-pink-300"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        )}
                    >
                        <Heart className="w-3 h-3" fill={showFavoritesOnly ? "currentColor" : "none"} /> Favorites
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setRelationshipFilter("all")}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                            relationshipFilter === "all"
                                ? "bg-accent/15 border-accent/35 text-accent"
                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                        )}
                    >
                        All
                    </button>
                    {RELATIONSHIPS.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRelationshipFilter(r)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                relationshipFilter === r
                                    ? RELATIONSHIP_STYLES[r]
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-300"
                            )}
                        >
                            {RELATIONSHIP_LABELS[r]}
                        </button>
                    ))}
                </div>

                {allTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold">Tags:</span>
                        <button
                            onClick={() => setTagFilter("all")}
                            className={cn(
                                "px-2.5 py-1 rounded-md text-[10px] border transition-colors",
                                tagFilter === "all"
                                    ? "bg-accent/15 border-accent/35 text-accent"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            All
                        </button>
                        {allTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setTagFilter(tag)}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[10px] border transition-colors",
                                    tagFilter === tag
                                        ? "bg-accent/15 border-accent/35 text-accent"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                <p className="text-xs text-zinc-500 text-right">{filtered.length} contact{filtered.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Contact cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 animate-pulse space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-zinc-800" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                                    <div className="h-3 w-1/3 bg-zinc-800 rounded" />
                                </div>
                            </div>
                            <div className="h-3 w-full bg-zinc-800 rounded" />
                            <div className="h-3 w-2/3 bg-zinc-800 rounded" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-zinc-500 py-14 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">{people.length === 0 ? "No contacts yet. Add your first contact to get started." : "No contacts match your filters."}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((person) => {
                        const days = daysSince(person.payload.last_contacted);
                        const upcoming = isUpcomingBirthday(person.payload.birthday);

                        return (
                            <motion.article
                                key={person._id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors group cursor-pointer"
                                onClick={() => setViewingPerson(person)}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                                        {person.payload.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={person.payload.avatar_url} alt={person.payload.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-bold text-zinc-400">{getInitials(person.payload.name)}</span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-zinc-50 truncate">{person.payload.name}</p>
                                            {person.payload.is_favorite && (
                                                <Heart className="w-3 h-3 text-pink-400 shrink-0" fill="currentColor" />
                                            )}
                                            {upcoming && (
                                                <Cake className="w-3 h-3 text-yellow-400 shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", RELATIONSHIP_STYLES[person.payload.relationship])}>
                                                {RELATIONSHIP_LABELS[person.payload.relationship]}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleFavorite(person);
                                            }}
                                            aria-label="Toggle favorite"
                                            className={cn(
                                                "p-1.5 rounded-md transition-colors",
                                                person.payload.is_favorite
                                                    ? "text-pink-400 hover:bg-zinc-800"
                                                    : "text-zinc-500 hover:text-pink-400 hover:bg-zinc-800"
                                            )}
                                        >
                                            <Heart className="w-3.5 h-3.5" fill={person.payload.is_favorite ? "currentColor" : "none"} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(person);
                                            }}
                                            aria-label="Edit contact"
                                            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirmId(person._id);
                                            }}
                                            aria-label="Delete contact"
                                            className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {(person.payload.company || person.payload.role) && (
                                    <p className="text-xs text-zinc-500 flex items-center gap-1.5 truncate">
                                        <Building2 className="w-3 h-3 shrink-0" />
                                        {person.payload.role}{person.payload.role && person.payload.company ? " at " : ""}{person.payload.company}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                                    {person.payload.phone && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {person.payload.phone}
                                        </span>
                                    )}
                                    {person.payload.email && (
                                        <span className="flex items-center gap-1 truncate">
                                            <Mail className="w-3 h-3 shrink-0" /> {person.payload.email}
                                        </span>
                                    )}
                                </div>

                                {days !== null && (
                                    <div className={cn("flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full w-fit", contactStatusBg(days), contactStatusColor(days))}>
                                        <Clock className="w-2.5 h-2.5" />
                                        {days === 0 ? "Today" : `${days}d ago`}
                                    </div>
                                )}

                                {(person.payload.tags || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-auto">
                                        {(person.payload.tags || []).slice(0, 4).map((tag) => (
                                            <span key={tag} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px]">
                                                {tag}
                                            </span>
                                        ))}
                                        {person.payload.tags.length > 4 && (
                                            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-500 text-[10px]">
                                                +{person.payload.tags.length - 4}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </motion.article>
                        );
                    })}
                </div>
            )}

            {/* Delete confirmation modal (list view) */}
            <Portal>
                <AnimatePresence>
                    {deleteConfirmId && !viewingPerson && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                            onClick={() => setDeleteConfirmId(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm mx-4 space-y-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                        <AlertCircle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-zinc-50">Delete contact?</h3>
                                        <p className="text-xs text-zinc-500">This action cannot be undone.</p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleDelete(deleteConfirmId)}
                                        disabled={isDeletingId === deleteConfirmId}
                                        className="text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isDeletingId === deleteConfirmId && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                        Delete
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Portal>
        </div>
    );
}
