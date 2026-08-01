"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useModuleSettings } from "@/hooks/useModuleSettings";

import type {
  Person,
  PersonPayload,
  PersonDocument,
  Interaction,
  InteractionType,
} from "./types";
import { AdminModuleSkeleton } from "@/components/ui/Skeletons";

import PeopleHeader from "./components/PeopleHeader";
import PeopleMetrics from "./components/PeopleMetrics";
import PeopleFilters from "./components/PeopleFilters";
import PeopleFocusStrip from "./components/PeopleFocusStrip";
import PersonCard from "./components/PersonCard";
import PersonProfile from "./components/PersonProfile";
import PersonForm from "./components/PersonForm";
import PeopleNotificationSettingsDialog from "./components/PeopleNotificationSettingsDialog";
import { DEFAULT_PEOPLE_SETTINGS, type PeopleSettings } from "./config";
import {
  filterPeople,
  getPeopleCounts,
  getPeopleSummary,
  toPersonDocument,
  type PeopleFilterType,
} from "./insights";

export default function PeopleAdminView() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "profile">("list");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(
    undefined,
  );
  const [showNotificationSettings, setShowNotificationSettings] =
    useState(false);

  const {
    settings: peopleSettings,
    loaded: peopleSettingsLoaded,
    updateSettings: updatePeopleSettings,
  } = useModuleSettings<PeopleSettings>(
    "peopleSettings",
    DEFAULT_PEOPLE_SETTINGS,
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
      setPeople((data.data || []).map(toPersonDocument));
    } catch (err) {
      console.error("fetchPeople failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const upsertPersonInState = useCallback((updatedPerson: Person) => {
    setPeople((current) => {
      const exists = current.some((person) => person._id === updatedPerson._id);
      const next = exists
        ? current.map((person) =>
            person._id === updatedPerson._id ? updatedPerson : person,
          )
        : [updatedPerson, ...current];
      return next;
    });
    setSelectedPerson((current) =>
      current?._id === updatedPerson._id ? updatedPerson : current,
    );
  }, []);

  const removePersonFromState = useCallback((id: string) => {
    setPeople((current) => current.filter((person) => person._id !== id));
    setSelectedPerson((current) => (current?._id === id ? null : current));
  }, []);

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

    if (isEditing && editingPerson) {
      upsertPersonInState({
        ...editingPerson,
        updated_at: new Date().toISOString(),
        payload,
      });
    } else {
      const data = await res.json();
      upsertPersonInState(toPersonDocument(data.data));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return;

    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      if (selectedPerson?._id === id) {
        setView("list");
      }
      removePersonFromState(id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete contact");
    }
  };

  const handleToggleFavorite = useCallback(
    async (person: Person) => {
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
        upsertPersonInState({
          ...person,
          updated_at: new Date().toISOString(),
          payload: {
            ...person.payload,
            is_favorite: !person.payload.is_favorite,
          },
        });
      } catch (err) {
        console.error(err);
      }
    },
    [upsertPersonInState],
  );

  const handleUpdateInteractions = useCallback(
    async (person: Person, interactions: Interaction[]) => {
      // Calculate last_contacted as the max date from all interactions
      const last_contacted =
        interactions.length > 0
          ? [...interactions].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
            )[0].date
          : undefined;

      const res = await fetch(`/api/content/${person._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: {
            ...person.payload,
            interactions,
            last_contacted,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to update interactions");
      upsertPersonInState({
        ...person,
        updated_at: new Date().toISOString(),
        payload: {
          ...person.payload,
          interactions,
          last_contacted,
        },
      });
    },
    [upsertPersonInState],
  );

  const handleLogInteraction = useCallback(
    async (
      person: Person,
      type: InteractionType,
      date: string,
      note?: string,
    ) => {
      const newInteraction = { date, type, note };
      const updatedInteractions = [
        ...(person.payload.interactions || []),
        newInteraction,
      ];

      await handleUpdateInteractions(person, updatedInteractions);
    },
    [handleUpdateInteractions],
  );

  const handleQuickLog = useCallback(
    (person: Person, type: InteractionType) => {
      handleLogInteraction(
        person,
        type,
        new Date().toISOString().slice(0, 10),
        `Quick Log: ${type}`,
      );
    },
    [handleLogInteraction],
  );

  const handleView = useCallback((p: Person) => {
    setSelectedPerson(p);
    setView("profile");
  }, []);

  const handleUpdateDocuments = async (
    person: Person,
    docs: PersonDocument[],
  ) => {
    try {
      const res = await fetch(`/api/content/${person._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: { ...person.payload, documents: docs },
        }),
      });
      if (!res.ok) throw new Error("Failed to update documents");
      upsertPersonInState({
        ...person,
        updated_at: new Date().toISOString(),
        payload: { ...person.payload, documents: docs },
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Processing Functions
  const filteredPeople = useMemo(() => {
    return filterPeople(people, {
      searchQuery,
      activeBucket,
      relationshipFilter: relationshipFilter as
        | Person["payload"]["relationship"]
        | "all",
    });
  }, [people, searchQuery, activeBucket, relationshipFilter]);

  const counts = useMemo<Record<PeopleFilterType, number>>(
    () => getPeopleCounts(people),
    [people],
  );
  const summary = useMemo(() => getPeopleSummary(people), [people]);

  const handleSavePeopleNotificationSettings = async (next: PeopleSettings) => {
    return updatePeopleSettings({
      birthdayNotifications: next.birthdayNotifications,
      contactNotifications: next.contactNotifications,
    });
  };

  if (loading) return <AdminModuleSkeleton />;

  return (
    <div className="pb-24">
      <PeopleHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNotificationSettings={() => setShowNotificationSettings(true)}
        peopleSettingsLoading={!peopleSettingsLoaded}
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
            {people.length > 0 && <PeopleFocusStrip summary={summary} />}
            <PeopleFilters
              activeFilter={activeBucket}
              onFilterChange={setActiveBucket}
              relationshipFilter={relationshipFilter}
              onRelationshipChange={setRelationshipFilter}
              counts={counts}
            />

            <div className="mb-4 flex flex-col gap-1 rounded-2xl border border-zinc-700/45 bg-zinc-900/45 px-4 py-3 shadow-lg shadow-zinc-950/35 ring-1 ring-zinc-700/20 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  {filteredPeople.length} match
                  {filteredPeople.length === 1 ? "" : "es"}
                </p>
                <p className="text-xs text-zinc-500">
                  Favorites stay pinned, then people who need attention rise up.
                </p>
              </div>
              <p className="text-xs text-zinc-500">
                {summary.stalestPerson?.daysSince !== null &&
                summary.stalestPerson?.daysSince !== undefined
                  ? `${summary.stalestPerson.name} has been quiet for ${summary.stalestPerson.daysSince} days.`
                  : "Fresh list, no overdue follow-ups."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredPeople.map((person) => (
                  <PersonCard
                    key={person._id}
                    person={person}
                    onView={handleView}
                    onToggleFavorite={handleToggleFavorite}
                    onQuickLog={handleQuickLog}
                  />
                ))}
              </AnimatePresence>
            </div>

            {filteredPeople.length === 0 && (
              <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-zinc-800/50 bg-zinc-900/40 py-20">
                {people.length === 0 ? (
                  <Users className="mb-4 h-12 w-12 text-zinc-700" />
                ) : (
                  <Search className="mb-4 h-12 w-12 text-zinc-700" />
                )}
                <h3 className="text-lg font-bold text-zinc-500">
                  {people.length === 0 ? "No one here yet" : "Nothing matches"}
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  {people.length === 0
                    ? "Add someone you care about to get started"
                    : "Try a different search, relationship, or focus bucket."}
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
                onLogInteraction={(_, type, date, note) =>
                  handleLogInteraction(selectedPerson, type, date, note)
                }
                onUpdateInteractions={(interactions) =>
                  handleUpdateInteractions(selectedPerson, interactions)
                }
                onUpdateDocuments={handleUpdateDocuments}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <PersonForm
            person={editingPerson}
            peopleSettings={peopleSettings}
            onClose={() => setShowForm(false)}
            onSave={handleSave}
          />
        )}

        {showNotificationSettings && (
          <PeopleNotificationSettingsDialog
            settings={peopleSettings}
            onSave={handleSavePeopleNotificationSettings}
            onClose={() => setShowNotificationSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
