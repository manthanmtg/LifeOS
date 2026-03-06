"use client";

import { useMemo, useState, useEffect } from "react";
import { Users, Heart, Cake, Clock } from "lucide-react";
import WidgetCard from "@/components/dashboard/WidgetCard";

interface Person {
    payload: {
        name: string;
        birthday?: string;
        last_contacted?: string;
        is_favorite?: boolean;
    };
}

function getUpcomingBirthdays(people: Person[]): number {
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    return people.filter((p) => {
        if (!p.payload.birthday) return false;
        const [, month, day] = p.payload.birthday.split("-").map(Number);
        const thisYear = new Date(now.getFullYear(), month - 1, day);
        const nextYear = new Date(now.getFullYear() + 1, month - 1, day);
        return (thisYear >= now && thisYear <= thirtyDaysLater) ||
            (nextYear >= now && nextYear <= thirtyDaysLater);
    }).length;
}

function getRecentlyContacted(people: Person[]): number {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return people.filter((p) => {
        if (!p.payload.last_contacted) return false;
        return new Date(p.payload.last_contacted) >= thirtyDaysAgo;
    }).length;
}

export default function PeopleWidget() {
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/content?module_type=person")
            .then((response) => response.json())
            .then((data) => setPeople(data.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        const total = people.length;
        const favorites = people.filter((p) => p.payload.is_favorite).length;
        const upcomingBirthdays = getUpcomingBirthdays(people);
        const recentlyContacted = getRecentlyContacted(people);

        return { total, favorites, upcomingBirthdays, recentlyContacted };
    }, [people]);

    return (
        <WidgetCard
            title="People"
            icon={Users}
            loading={loading}
            href="/admin/people"
            footer={
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-pink-400/80">
                        <Heart className="w-3 h-3" fill="currentColor" /> {summary.favorites} Favorites
                    </span>
                    <span className="flex items-center gap-1.5 text-green-400/80">
                        <Clock className="w-3 h-3" /> {summary.recentlyContacted} Recent
                    </span>
                </div>
            }
        >
            <div className="py-2 space-y-4">
                <div>
                    <p className="text-4xl font-bold text-zinc-50 tracking-tight">{summary.total}</p>
                    <p className="text-xs text-zinc-500 mt-1 font-medium italic">contacts in your network</p>
                </div>

                {summary.upcomingBirthdays > 0 ? (
                    <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50">
                        <div className="flex items-center gap-2">
                            <Cake className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            <p className="text-[13px] text-zinc-300 font-medium leading-relaxed">
                                {summary.upcomingBirthdays} upcoming birthday{summary.upcomingBirthdays !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1 ml-5.5">within the next 30 days</p>
                    </div>
                ) : (
                    <div className="p-3 rounded-xl border border-dashed border-zinc-800 opacity-40">
                        <p className="text-[11px] text-zinc-500 text-center font-medium">No upcoming birthdays.</p>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
}
