"use client";

import { useEffect, useMemo, useState } from "react";
import { CalculatorDefinition, CalculatorMetric } from "./types";
import { ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalculatorCardProps {
    definition: CalculatorDefinition;
    categoryLabel: string;
    startExpanded?: boolean;
}

function metricToneClass(tone: CalculatorMetric["tone"]) {
    if (tone === "good") return "text-green-300";
    if (tone === "warn") return "text-amber-300";
    if (tone === "bad") return "text-red-300";
    return "text-zinc-300";
}

export default function CalculatorCard({ definition, categoryLabel, startExpanded = false }: CalculatorCardProps) {
    const defaults = useMemo(
        () => Object.fromEntries(definition.inputs.map((input) => [input.key, input.defaultValue])),
        [definition]
    );

    const [isExpanded, setIsExpanded] = useState(startExpanded);
    const [values, setValues] = useState<Record<string, string>>(defaults);

    useEffect(() => {
        setValues(defaults);
    }, [defaults]);

    const result = useMemo(() => definition.compute(values), [definition, values]);

    return (
        <article className="group rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="relative p-4 sm:p-5 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{categoryLabel}</p>
                        <h3 className="text-base sm:text-lg font-semibold text-zinc-50 mt-1">{definition.name}</h3>
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1 leading-relaxed">{definition.description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsExpanded((prev) => !prev)}
                        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:text-zinc-50 hover:border-zinc-600 transition-colors"
                        aria-label={isExpanded ? `Collapse ${definition.name}` : `Expand ${definition.name}`}
                    >
                        <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                    </button>
                </div>

                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 sm:p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{result.primaryLabel}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-zinc-50 mt-1">{result.primaryValue}</p>
                    {result.secondaryValue && (
                        <p className="text-xs sm:text-sm text-zinc-400 mt-1">{result.secondaryValue}</p>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/60">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Inputs</p>
                        <button
                            type="button"
                            onClick={() => setValues(defaults)}
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {definition.inputs.map((input) => {
                            const value = values[input.key] ?? "";

                            if (input.kind === "textarea") {
                                return (
                                    <div key={input.key} className="sm:col-span-2 space-y-1.5">
                                        <label htmlFor={`calc-${definition.id}-${input.key}`} className="block text-xs text-zinc-400">{input.label}</label>
                                        <textarea
                                            id={`calc-${definition.id}-${input.key}`}
                                            rows={5}
                                            value={value}
                                            onChange={(event) => {
                                                const next = event.target.value;
                                                setValues((prev) => ({ ...prev, [input.key]: next }));
                                            }}
                                            placeholder={input.placeholder}
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35 font-mono"
                                        />
                                        {input.helper && <span className="mt-1 block text-[11px] text-zinc-500">{input.helper}</span>}
                                    </div>
                                );
                            }

                            if (input.kind === "select") {
                                return (
                                    <div key={input.key} className="space-y-1.5">
                                        <label htmlFor={`calc-${definition.id}-${input.key}`} className="block text-xs text-zinc-400">{input.label}</label>
                                        <select
                                            id={`calc-${definition.id}-${input.key}`}
                                            value={value}
                                            onChange={(event) => {
                                                const next = event.target.value;
                                                setValues((prev) => ({ ...prev, [input.key]: next }));
                                            }}
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent/35 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.75rem_center] bg-no-repeat"
                                        >
                                            {(input.options || []).map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        {input.helper && <span className="mt-1 block text-[11px] text-zinc-500">{input.helper}</span>}
                                    </div>
                                );
                            }

                            return (
                                <div key={input.key} className="space-y-1.5">
                                    <label htmlFor={`calc-${definition.id}-${input.key}`} className="block text-xs text-zinc-400">{input.label}</label>
                                    <div className="relative">
                                        <input
                                            id={`calc-${definition.id}-${input.key}`}
                                            type="number"
                                            value={value}
                                            min={input.min}
                                            max={input.max}
                                            step={input.step}
                                            onChange={(event) => {
                                                const next = event.target.value;
                                                setValues((prev) => ({ ...prev, [input.key]: next }));
                                            }}
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent/35"
                                        />
                                        {input.unit && (
                                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-500">
                                                {input.unit}
                                            </span>
                                        )}
                                    </div>
                                    {input.helper && <span className="mt-1 block text-[11px] text-zinc-500">{input.helper}</span>}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-5">
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500 mb-2">Breakdown</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {result.metrics.map((metric) => (
                                <div key={metric.label} className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                                    <p className="text-[11px] text-zinc-500">{metric.label}</p>
                                    <p className={cn("text-sm font-medium mt-1", metricToneClass(metric.tone))}>{metric.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {result.notes && result.notes.length > 0 && (
                        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500 mb-2">Notes</p>
                            <ul className="space-y-1">
                                {result.notes.map((note) => (
                                    <li key={note} className="text-xs text-zinc-400">• {note}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}
