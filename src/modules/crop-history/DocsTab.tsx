"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpen, Wheat, MapPin, Calculator, Table, Zap } from "lucide-react";

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2.5 mb-4">
                <Icon className="w-5 h-5 text-success" />
                {title}
            </h2>
            <div className="text-sm text-zinc-400 space-y-3 leading-relaxed">{children}</div>
        </div>
    );
}

function Code({ children }: { children: React.ReactNode }) {
    return <code className="text-xs bg-zinc-800 border border-zinc-700 text-success px-1.5 py-0.5 rounded font-mono">{children}</code>;
}

function FormulaRow({ name, syntax, description }: { name: string; syntax: string; description: string }) {
    return (
        <tr className="border-b border-zinc-800/50 last:border-0">
            <td className="py-2.5 pr-3 font-medium text-zinc-200 whitespace-nowrap">{name}</td>
            <td className="py-2.5 pr-3"><Code>{syntax}</Code></td>
            <td className="py-2.5 text-zinc-400">{description}</td>
        </tr>
    );
}

export function DocsTab() {
    return (
        <div className="space-y-6 max-w-4xl">
            {/* Overview */}
            <Section title="How Crop History Works" icon={BookOpen}>
                <p className="text-zinc-300">
                    This module lets you track crop yields, prices, and revenue across multiple areas and time periods — just like a spreadsheet, but with automatic calculations and analytics.
                </p>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 mt-2">
                    <p className="text-zinc-300 font-medium">Quick Start:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-zinc-400 ml-1">
                        <li>Go to <strong className="text-zinc-300">Settings</strong> and add your <strong className="text-zinc-300">Areas</strong> (land/plots)</li>
                        <li>Create a <strong className="text-zinc-300">Crop Type</strong> with fields and formulas</li>
                        <li>Switch to <strong className="text-zinc-300">Spreadsheet</strong> to enter data period by period</li>
                        <li>View <strong className="text-zinc-300">Analytics</strong> for trends and comparisons</li>
                    </ol>
                </div>
            </Section>

            {/* Areas */}
            <Section title="Areas" icon={MapPin}>
                <p>
                    Areas represent your land plots or locations. For example: <Code>Old Home</Code>, <Code>Balehalli Thota</Code>, <Code>Raki Mane</Code>.
                </p>
                <p>
                    Each area gets its own row in the spreadsheet. Per-area fields (like weight or outturn) are entered separately for each area, so you can track performance per plot.
                </p>
                <p className="text-zinc-500">
                    Areas are shared across all crop types — you define them once and reuse for Coffee, Areca, Pepper, etc.
                </p>
            </Section>

            {/* Crop Configuration */}
            <Section title="Crop Configuration" icon={Wheat}>
                <p className="text-zinc-300 font-medium mb-2">Each crop type has three kinds of fields:</p>

                <div className="space-y-4">
                    <div className="bg-sky-500/5 border border-sky-500/10 rounded-lg p-3.5">
                        <p className="text-sky-300 font-medium mb-1">1. Per-Area Fields</p>
                        <p>Values entered for each area, each period. The system can aggregate these across areas using formulas.</p>
                        <p className="text-zinc-500 mt-1">Example: <Code>Undried</Code> (kg) — the raw harvest weight per area. <Code>OT</Code> (%) — outturn percentage per area.</p>
                    </div>

                    <div className="bg-success/5 border border-success/10 rounded-lg p-3.5">
                        <p className="text-success font-medium mb-1">2. Period-Level Fields</p>
                        <p>Values entered once per period (not per area). Shared across all areas for that period.</p>
                        <p className="text-zinc-500 mt-1">Example: <Code>Average Price</Code> (₹/50kg bag) — the market price that period.</p>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3.5">
                        <p className="text-blue-300 font-medium mb-1">3. Calculated Fields</p>
                        <p>Auto-computed from the above fields using formulas. These appear as read-only rows in the spreadsheet.</p>
                        <p className="text-zinc-500 mt-1">Example: <Code>Total Weight = SUM(undried)</Code>, <Code>Approx Income = SUM(undried) * avg_price</Code></p>
                    </div>
                </div>
            </Section>

            {/* Formula Reference */}
            <Section title="Formula Reference" icon={Calculator}>
                <p className="text-zinc-300 mb-3">
                    Formulas let you automatically compute values from your data. You can use <strong>functions</strong> (aggregate across areas), <strong>variables</strong> (reference fields), and <strong>math operators</strong>.
                </p>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-700">
                                <th className="text-left py-2 pr-3 text-zinc-300 font-medium">Function</th>
                                <th className="text-left py-2 pr-3 text-zinc-300 font-medium">Syntax</th>
                                <th className="text-left py-2 text-zinc-300 font-medium">What it does</th>
                            </tr>
                        </thead>
                        <tbody>
                            <FormulaRow name="SUM" syntax="SUM(field)" description="Adds up a per-area field across all areas. e.g. SUM(undried) = total undried weight from all plots." />
                            <FormulaRow name="AVG" syntax="AVG(field)" description="Simple average of a per-area field. e.g. AVG(ot) = arithmetic mean of OT across areas." />
                            <FormulaRow name="WEIGHTED_AVG" syntax="WEIGHTED_AVG(value, weight)" description="Weighted average. e.g. WEIGHTED_AVG(ot, undried) = OT averaged by each area's undried weight." />
                            <FormulaRow name="MIN" syntax="MIN(field)" description="Lowest value of a per-area field across all areas." />
                            <FormulaRow name="MAX" syntax="MAX(field)" description="Highest value of a per-area field across all areas." />
                            <FormulaRow name="COUNT" syntax="COUNT()" description="Number of areas configured." />
                            <FormulaRow name="ROUND" syntax="ROUND(expr, decimals)" description="Rounds a value to N decimal places. e.g. ROUND(SUM(undried) / 120, 1) = bags with 1 decimal." />
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-300 font-medium mb-2">Variables</p>
                    <ul className="space-y-1.5 text-zinc-400">
                        <li><Code>total_fieldname</Code> — same as <Code>SUM(fieldname)</Code>, sum of a per-area field</li>
                        <li><Code>fieldname</Code> — for period-level fields, references that field directly</li>
                        <li><Code>calc_field_id</Code> — reference a previously defined calculated field</li>
                        <li><Code>CONSTANT_NAME</Code> — reference a constant defined in the crop config (e.g. <Code>BAG_SIZE</Code>)</li>
                    </ul>
                </div>

                <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-300 font-medium mb-2">Constants</p>
                    <p className="text-zinc-400 mb-1.5">
                        Constants are fixed values you define per crop (e.g. conversion factors, bag sizes). They can be referenced by name in any formula.
                    </p>
                    <ul className="space-y-1.5 text-zinc-400">
                        <li>Define in <strong className="text-zinc-300">Settings &gt; Crop &gt; Step 3: Constants</strong></li>
                        <li>Names must be UPPERCASE_WITH_UNDERSCORES (e.g. <Code>BAG_SIZE</Code>, <Code>UNDRIED_TO_BAG_CONVERT</Code>)</li>
                        <li>Example: If <Code>BAG_SIZE = 120</Code>, then <Code>SUM(undried) / BAG_SIZE</Code> computes bags from total weight</li>
                    </ul>
                </div>

                <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-300 font-medium mb-2">Math Operators</p>
                    <div className="flex gap-3 text-zinc-400">
                        <span><Code>+</Code> Add</span>
                        <span><Code>-</Code> Subtract</span>
                        <span><Code>*</Code> Multiply</span>
                        <span><Code>/</Code> Divide</span>
                        <span><Code>( )</Code> Grouping</span>
                    </div>
                </div>
            </Section>

            {/* Examples */}
            <Section title="Real Examples" icon={Zap}>
                <div className="space-y-5">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                        <p className="text-zinc-200 font-medium mb-3">Coffee Crop Setup</p>
                        <div className="space-y-2 text-zinc-400">
                            <p><strong className="text-sky-300">Per-Area Fields:</strong> Undried (kg), OT (%)</p>
                            <p><strong className="text-success">Period Fields:</strong> Avg Price (₹/50kg bag)</p>
                            <p><strong className="text-orange-300">Constants:</strong> <Code>UNDRIED_TO_BAG_CONVERT = 120</Code></p>
                            <p><strong className="text-blue-300">Calculated Fields:</strong></p>
                            <ul className="ml-4 space-y-1">
                                <li>Total Weight = <Code>SUM(undried)</Code> <span className="text-zinc-600">→ Number, kg</span></li>
                                <li>Average OT = <Code>WEIGHTED_AVG(ot, undried)</Code> <span className="text-zinc-600">→ Number, %</span></li>
                                <li>Approx Bags = <Code>ROUND(SUM(undried) / UNDRIED_TO_BAG_CONVERT, 1)</Code> <span className="text-zinc-600">→ Number</span></li>
                                <li>Approx Income = <Code>approx_bags * avg_price</Code> <span className="text-zinc-600">→ Currency</span></li>
                            </ul>
                        </div>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                        <p className="text-zinc-200 font-medium mb-3">Areca Crop Setup</p>
                        <div className="space-y-2 text-zinc-400">
                            <p><strong className="text-sky-300">Per-Area Fields:</strong> Weight (kg)</p>
                            <p><strong className="text-success">Period Fields:</strong> Avg Price (₹/kg)</p>
                            <p><strong className="text-blue-300">Calculated Fields:</strong></p>
                            <ul className="ml-4 space-y-1">
                                <li>Total Weight = <Code>SUM(weight)</Code> <span className="text-zinc-600">→ Number, kg</span></li>
                                <li>Total Amount = <Code>SUM(weight) * avg_price</Code> <span className="text-zinc-600">→ Currency</span></li>
                                <li>Best Area Yield = <Code>MAX(weight)</Code> <span className="text-zinc-600">→ Number, kg</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Tips */}
            <Section title="Tips" icon={Table}>
                <ul className="space-y-2 text-zinc-400">
                    <li><strong className="text-zinc-300">Order matters for calculated fields</strong> — later fields can reference earlier ones. Put &quot;Total Weight&quot; before &quot;Approx Income&quot; if income uses total weight.</li>
                    <li><strong className="text-zinc-300">Use WEIGHTED_AVG for percentages</strong> — if each area has a different weight, a simple average of percentages is misleading. <Code>WEIGHTED_AVG(ot, undried)</Code> gives the correct overall OT.</li>
                    <li><strong className="text-zinc-300">Units are for display only</strong> — they appear as labels in the spreadsheet and don&apos;t affect calculations.</li>
                    <li><strong className="text-zinc-300">Add notes per period</strong> — the Notes row at the bottom of the spreadsheet lets you record context (weather, delays, etc.).</li>
                    <li><strong className="text-zinc-300">Save All</strong> — saves all periods at once. You can also save individual period columns.</li>
                </ul>
            </Section>
        </div>
    );
}
