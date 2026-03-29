"use client";

import { useState, useEffect, useMemo } from "react";
import { Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { Person, PersonPayload, InteractionType } from "./types";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";

import PeopleHeader from "./components/PeopleHeader";
import PeopleMetrics from "./components/PeopleMetrics";
import PeopleFilters, { PeopleFilterType } from "./components/PeopleFilters";
import PersonCard from "./components/PersonCard";
import PersonProfile from "./components/PersonProfile";
import PersonForm from "./components/PersonForm";

export default function PeopleAdminView() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "profile">("list");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(
    undefined,
  );

  // Filters
  const [activeBucket, setActiveBucket] = useState<PeopleFilterType>("all");
  const [relationshipFilter, setRelationshipFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPeople = async () => {
    try {
      const res = await fetch("/api/content?module_type=person");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch contacts");
      setPeople(data.data || []);
    } catch (err) {
      console.error("fetchPeople failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  // CRUD Operations
  const handleSave = async (payload: PersonPayload) => {
    const isEditing = !!editingPerson;
    const url = isEditing
      ? `/api/content/${editingPerson?._id}`
      : "/api/content";
    const method = isEditing ? "PUT" : "POST";

    const body = isEditing
      ? { payload }
      : { module_type: "person", is_public: false, payload };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to save contact");
    }

    await fetchPeople();
    if (selectedPerson && selectedPerson._id === editingPerson?._id) {
      const updated = (
        await (await fetch("/api/content?module_type=person")).json()
      ).data.find((p: Person) => p._id === editingPerson?._id);
      if (updated) setSelectedPerson(updated);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;

    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      if (selectedPerson?._id === id) {
        setSelectedPerson(null);
        setView("list");
      }
      await fetchPeople();
    } catch (err) {
      console.error(err);
      alert("Failed to delete contact");
    }
  };

  const handleToggleFavorite = async (person: Person) => {
    try {
      const res = await fetch(`/api/content/${person._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            ...person.payload,
            is_favorite: !person.payload.is_favorite,
          },
        }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      await fetchPeople();
      if (selectedPerson?._id === person._id) {
        setSelectedPerson((p) =>
          p
            ? {
                ...p,
                payload: { ...p.payload, is_favorite: !p.payload.is_favorite },
              }
            : null,
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogInteraction = async (
    id: string,
    type: InteractionType,
    date: string,
    note?: string,
  ) => {
    const person = people.find((p) => p._id === id);
    if (!person) return;

    const newInteraction = { date, type, note };
    const updatedInteractions = [
      ...(person.payload.interactions || []),
      newInteraction,
    ];

    const res = await fetch(`/api/content/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: {
          ...person.payload,
          interactions: updatedInteractions,
          last_contacted: date,
        },
      }),
    });

    if (!res.ok) throw new Error("Failed to log interaction");
    await fetchPeople();
    if (selectedPerson?._id === id) {
      setSelectedPerson((p) =>
        p
          ? {
              ...p,
              payload: {
                ...p.payload,
                interactions: updatedInteractions,
                last_contacted: date,
              },
            }
          : null,
      );
    }
  };

  const handleQuickLog = (person: Person, type: InteractionType) => {
    handleLogInteraction(
      person._id,
      type,
      new Date().toISOString().slice(0, 10),
      `Quick Log: ${type}`,
    );
  };

  // Processing Functions
  const filteredPeople = useMemo(() => {
    let result = [...people];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.payload.name.toLowerCase().includes(query) ||
          p.payload.company?.toLowerCase().includes(query) ||
          p.payload.interests?.some((i) => i.toLowerCase().includes(query)) ||
          p.payload.tags?.some((t) => t.toLowerCase().includes(query)),
      );
    }

    // Bucket Filters
    if (activeBucket === "favorites") {
      result = result.filter((p) => p.payload.is_favorite);
    } else if (activeBucket === "stale") {
      result = result.filter((p) => {
        if (!p.payload.last_contacted) return true;
        const last = new Date(p.payload.last_contacted);
        const diff = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 90;
      });
    } else if (activeBucket === "upcoming") {
      // Simplified birthday check for filtering
      const now = new Date();
      result = result.filter((p) => {
        if (!p.payload.birthday) return false;
        const b = new Date(p.payload.birthday);
        return b.getMonth() === now.getMonth();
      });
    }

    // Relationship Filter
    if (relationshipFilter !== "all") {
      result = result.filter(
        (p) => p.payload.relationship === relationshipFilter,
      );
    }

    // Sort: Favorites first, then alphabetical
    return result.sort((a, b) => {
      if (a.payload.is_favorite !== b.payload.is_favorite)
        return a.payload.is_favorite ? -1 : 1;
      return a.payload.name.localeCompare(b.payload.name);
    });
  }, [people, searchQuery, activeBucket, relationshipFilter]);

  const counts: Record<PeopleFilterType, number> = {
    all: people.length,
    favorites: people.filter((p) => p.payload.is_favorite).length,
    stale: people.filter((p) => {
      if (!p.payload.last_contacted) return true;
      const last = new Date(p.payload.last_contacted);
      return (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24) > 90;
    }).length,
    upcoming: people.filter(
      (p) =>
        p.payload.birthday &&
        new Date(p.payload.birthday).getMonth() === new Date().getMonth(),
    ).length,
  };

  if (loading) return <AdminModuleSkeleton />;

  return (
    <div className="pb-24">
      <PeopleHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddPerson={() => {
          setEditingPerson(undefined);
          setShowForm(true);
        }}
      />

      <AnimatePresence mode="wait">
        {view === "list" ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PeopleMetrics people={people} />
            <PeopleFilters
              activeFilter={activeBucket}
              onFilterChange={setActiveBucket}
              relationshipFilter={relationshipFilter}
              onRelationshipChange={setRelationshipFilter}
              counts={counts}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
              <AnimatePresence mode="popLayout">
                {filteredPeople.map((person) => (
                  <PersonCard
                    key={person._id}
                    person={person}
                    onView={(p) => {
                      setSelectedPerson(p);
                      setView("profile");
                    }}
                    onEdit={(p) => {
                      setEditingPerson(p);
                      setShowForm(true);
                    }}
                    onDelete={handleDelete}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickLog={handleQuickLog}
                  />
                ))}
              </AnimatePresence>
            </div>

            {filteredPeople.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 bg-zinc-900/40 rounded-[3rem] border border-zinc-800/50 mt-10">
                <Users className="w-16 h-16 text-zinc-700 mb-4 opacity-50" />
                <h3 className="text-xl font-black text-zinc-500 italic uppercase tracking-widest">
                  Network Void
                </h3>
                <p className="text-zinc-600 text-sm mt-2">
                  No entities found in this dimension.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="profile-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {selectedPerson && (
              <PersonProfile
                person={selectedPerson}
                onBack={() => setView("list")}
                onEdit={(p) => {
                  setEditingPerson(p);
                  setShowForm(true);
                }}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                onLogInteraction={handleLogInteraction}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <PersonForm
            person={editingPerson}
            onClose={() => setShowForm(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
