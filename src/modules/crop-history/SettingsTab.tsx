"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Edit3, Save, X, Calculator, HelpCircle, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "./ConfirmDialog";
import Toast, { ToastType } from "./Toast";

import { AreaDef, CropConfig, ModuleSettings as Settings, ConstantDef, FieldDef, CalcFieldDef } from "./AdminView";

// --- Formula Builder Component ---
function FormulaBuilder({
    formula,
    onFormulaChange,
    sourceFields,
    summaryFields,
    calculatedFields,
    constants = [],
}: {
    formula: string;
    onFormulaChange: (f: string) => void;
    sourceFields: FieldDef[];
    summaryFields: FieldDef[];
    calculatedFields: CalcFieldDef[];
    constants?: ConstantDef[];
    periodOrder?: string[];
}) {
    const [showHelp, setShowHelp] = useState(false);

    const insertAtCursor = (text: string) => {
        onFormulaChange(formula ? `${formula} ${text}` : text);
    };

    // Function templates — the primary way non-technical users build formulas
    const functionTemplates = useMemo(() => {
        const templates: { label: string; formula: string; description: string; category: string }[] = [];

        for (const f of sourceFields) {
            templates.push({
                label: `SUM(${f.name})`,
                formula: `SUM(${f.id})`,
                description: `Total ${f.name} across all areas`,
                category: "Aggregate"
            });
            templates.push({
                label: `AVG(${f.name})`,
                formula: `AVG(${f.id})`,
                description: `Simple average of ${f.name}`,
                category: "Aggregate"
            });
        }

        // Weighted averages (need 2 source fields)
        if (sourceFields.length >= 2) {
            for (const valField of sourceFields) {
                for (const weightField of sourceFields) {
                    if (valField.id !== weightField.id) {
                        templates.push({
                            label: `WEIGHTED_AVG(${valField.name}, ${weightField.name})`,
                            formula: `WEIGHTED_AVG(${valField.id}, ${weightField.id})`,
                            description: `${valField.name} averaged, weighted by ${weightField.name}`,
                            category: "Weighted"
                        });
                    }
                }
            }
        }

        for (const f of sourceFields) {
            templates.push({
                label: `MIN(${f.name})`,
                formula: `MIN(${f.id})`,
                description: `Lowest ${f.name} across areas`,
                category: "MinMax"
            });
            templates.push({
                label: `MAX(${f.name})`,
                formula: `MAX(${f.id})`,
                description: `Highest ${f.name} across areas`,
                category: "MinMax"
            });
        }

        templates.push({
            label: "COUNT()",
            formula: "COUNT()",
            description: "Number of areas",
            category: "Other"
        });

        return templates;
    }, [sourceFields]);

    // Variable chips for manual formula building
    const variableGroups = useMemo(() => {
        const groups: { label: string; color: string; bgColor: string; items: { label: string; value: string; desc: string }[] }[] = [];

        if (summaryFields.length > 0) {
            groups.push({
                label: "Period Fields",
                color: "text-success",
                bgColor: "bg-success/10 border-success/20 hover:bg-success/20",
                items: summaryFields.map(f => ({
                    label: f.name,
                    value: f.id,
                    desc: `Period-level: ${f.name}${f.unit ? ` (${f.unit})` : ''}`
                }))
            });
        }

        if (constants.length > 0) {
            groups.push({
                label: "Constants",
                color: "text-orange-400",
                bgColor: "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20",
                items: constants.map(c => ({
                    label: c.name,
                    value: c.id,
                    desc: `Constant = ${c.value}`
                }))
            });
        }

        if (calculatedFields.length > 0) {
            groups.push({
                label: "Previous Calculations",
                color: "text-violet-400",
                bgColor: "bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20",
                items: calculatedFields.map(f => ({
                    label: f.name,
                    value: f.id,
                    desc: `= ${f.formula}`
                }))
            });
        }

        return groups;
    }, [summaryFields, calculatedFields, constants]);

    const operators = [
        { label: "+", value: "+", title: "Add" },
        { label: "-", value: "-", title: "Subtract" },
        { label: "\u00d7", value: "*", title: "Multiply" },
        { label: "\u00f7", value: "/", title: "Divide" },
        { label: "(", value: "(", title: "Open bracket" },
        { label: "&quot;)", value: ")", title: "Close bracket" },
    ];

    const hasContent = sourceFields.length > 0 || summaryFields.length > 0;

    return (
        <div className="space-y-3">
            {/* Formula Input */}
            <div>
                <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs text-zinc-500 font-medium">Formula</label>
                    <button type="button" onClick={() => setShowHelp(!showHelp)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                        <HelpCircle className="w-3 h-3" />
                    </button>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 focus-within:border-success/50 focus-within:ring-1 focus-within:ring-success/20 transition-all">
                    <Calculator className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <input
                        value={formula}
                        onChange={e => onFormulaChange(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-zinc-100 font-mono outline-none placeholder-zinc-600"
                        placeholder="Pick a function below, or type your formula..."
                    />
                    {formula && (
                        <button type="button" onClick={() => onFormulaChange("")} className="text-zinc-600 hover:text-zinc-400 shrink-0">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Help */}
            {showHelp && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 space-y-1.5">
                    <p className="font-medium text-zinc-300">How formulas work:</p>
                    <p><strong className="text-sky-300">Functions</strong> aggregate per-area fields: <code className="text-success">SUM(undried)</code> adds undried weight from all areas.</p>
                    <p><strong className="text-warning">WEIGHTED_AVG(ot, undried)</strong> gives the correct average OT weighted by each area&apos;s undried weight.</p>
                    <p><strong className="text-success">Period fields</strong> like avg_price can be used directly in math.</p>
                    <p><strong className="text-violet-300">Previous calculations</strong> can be referenced by later formulas (order matters!).</p>
                    <p className="text-zinc-500">See the <strong>Docs</strong> tab for full reference and examples.</p>
                </div>
            )}

            {/* Function Templates — primary entry point for non-technical users */}
            {hasContent && !formula && (
                <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-1.5 block">Pick a function</label>

                    {/* Aggregates (SUM, AVG) */}
                    {sourceFields.length > 0 && (
                        <div className="mb-2">
                            <div className="flex flex-wrap gap-1.5">
                                {functionTemplates.filter(t => t.category === "Aggregate").map((t, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => onFormulaChange(t.formula)}
                                        className="text-xs bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2.5 py-1.5 rounded-lg hover:bg-sky-500/20 transition-colors"
                                        title={t.description}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Weighted averages */}
                    {functionTemplates.filter(t => t.category === "Weighted").length > 0 && (
                        <div className="mb-2">
                            <div className="flex flex-wrap gap-1.5">
                                {functionTemplates.filter(t => t.category === "Weighted").map((t, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => onFormulaChange(t.formula)}
                                        className="text-xs bg-warning/10 border border-warning/20 text-warning px-2.5 py-1.5 rounded-lg hover:bg-warning/20 transition-colors"
                                        title={t.description}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MIN/MAX/COUNT */}
                    <div className="flex flex-wrap gap-1.5">
                        {functionTemplates.filter(t => t.category === "MinMax" || t.category === "Other").map((t, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => onFormulaChange(t.formula)}
                                className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2.5 py-1.5 rounded-lg hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                                title={t.description}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Operators + variable chips — shown when formula has content (user is building) */}
            {formula && (
                <>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mr-1">Operators</span>
                        {operators.map(op => (
                            <button
                                key={op.value}
                                type="button"
                                onClick={() => insertAtCursor(op.value)}
                                title={op.title}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 transition-colors text-sm font-mono font-medium"
                            >
                                {op.label}
                            </button>
                        ))}
                    </div>

                    {/* Functions to append */}
                    {sourceFields.length > 0 && (
                        <div>
                            <label className="text-[10px] text-sky-500 uppercase tracking-wider font-medium mb-1.5 block">Functions</label>
                            <div className="flex flex-wrap gap-1.5">
                                {functionTemplates.filter(t => t.category === "Aggregate" || t.category === "Weighted").map((t, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => insertAtCursor(t.formula)}
                                        className="text-xs bg-sky-500/10 border border-sky-500/20 text-sky-300 px-2 py-1 rounded-lg hover:bg-sky-500/20 transition-colors"
                                        title={t.description}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Variable chips */}
                    {variableGroups.map(group => group.items.length > 0 && (
                        <div key={group.label}>
                            <label className={cn("text-[10px] uppercase tracking-wider font-medium mb-1.5 block", group.color)}>{group.label}</label>
                            <div className="flex flex-wrap gap-1.5">
                                {group.items.map(item => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => insertAtCursor(item.value)}
                                        title={item.desc}
                                        className={cn("text-xs border px-2 py-1 rounded-lg transition-colors", group.bgColor, group.color)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* Preview */}
            {formula && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-start gap-2">
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mt-0.5 shrink-0">Formula:</span>
                    <code className="text-xs text-success font-mono break-all">{formula}</code>
                </div>
            )}
        </div>
    );
}

// --- Field Add Form (with type + unit) ---
function FieldAddForm({
    onAdd,
    placeholder,
    fieldNameValue,
    onFieldNameChange,
}: {
    onAdd: (name: string, type: "number" | "text", unit: string) => void;
    placeholder: string;
    fieldNameValue: string;
    onFieldNameChange: (v: string) => void;
}) {
    const [fieldType, setFieldType] = useState<"number" | "text">("number");
    const [unit, setUnit] = useState("");

    const handleAdd = () => {
        if (!fieldNameValue.trim()) return;
        onAdd(fieldNameValue.trim(), fieldType, unit.trim());
        onFieldNameChange("");
        setUnit("");
        setFieldType("number");
    };

    return (
        <div className="flex gap-2 items-end">
            <div className="flex-1">
                <input
                    value={fieldNameValue}
                    onChange={e => onFieldNameChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                    placeholder={placeholder}
                />
            </div>
            <div className="w-24">
                <select
                    value={fieldType}
                    onChange={e => setFieldType(e.target.value as "number" | "text")}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-300"
                    title="Field type"
                >
                    <option value="number">Number</option>
                    <option value="text">Text</option>
                </select>
            </div>
            <div className="w-28">
                <input
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-300"
                    placeholder="Unit (kg, %)"
                />
            </div>
            <button onClick={handleAdd} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm transition-colors shrink-0">Add</button>
        </div>
    );
}

// --- Field Chip (click to edit inline) ---
function FieldChip({ field, color, onRemove, onUpdate }: { field: FieldDef; color: string; onRemove: () => void; onUpdate: (updated: FieldDef) => void }) {
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(field.name);
    const [editUnit, setEditUnit] = useState(field.unit || "");
    const [editType, setEditType] = useState(field.type || "number");

    const handleSave = () => {
        if (!editName.trim()) return;
        onUpdate({
            ...field,
            name: editName.trim(),
            id: editName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'),
            type: editType,
            unit: editUnit.trim() || undefined,
        });
        setEditing(false);
    };

    if (editing) {
        return (
            <div className={cn("text-xs border rounded-lg flex items-center gap-1.5 bg-zinc-950 border-zinc-700 p-1")}>
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                    className="w-24 bg-transparent text-zinc-100 outline-none px-1.5 py-0.5 text-xs" placeholder="Name" />
                <select value={editType} onChange={e => setEditType(e.target.value as "number" | "text")}
                    className="bg-transparent text-zinc-400 outline-none text-[10px] py-0.5">
                    <option value="number">Num</option>
                    <option value="text">Text</option>
                </select>
                <input value={editUnit} onChange={e => setEditUnit(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                    className="w-12 bg-transparent text-zinc-400 outline-none px-1 py-0.5 text-[10px]" placeholder="unit" />
                <button onClick={handleSave} className="text-success hover:text-success p-0.5"><Check className="w-3 h-3" /></button>
                <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-zinc-300 p-0.5"><X className="w-3 h-3" /></button>
            </div>
        );
    }

    return (
        <span className={cn("text-xs border px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer group", color)}
            onClick={() => setEditing(true)} title="Click to edit">
            {field.name}
            {field.unit && <span className="text-[10px] opacity-60">({field.unit})</span>}
            {field.type === "text" && <span className="text-[10px] opacity-60">[text]</span>}
            <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
            <X className="w-3 h-3 opacity-60 hover:text-danger transition-colors"
                onClick={e => { e.stopPropagation(); onRemove(); }} />
        </span>
    );
}

// --- Main Settings Tab ---
export function SettingsTab({ settings, updateSettings, saving }: { settings: Settings; updateSettings: (s: Partial<Settings>) => Promise<void>; saving: boolean }) {
    const [isEditingArea, setIsEditingArea] = useState(false);
    const [areaName, setAreaName] = useState("");
    const [areaId, setAreaId] = useState("");

    const [isEditingCrop, setIsEditingCrop] = useState(false);
    const [cropForm, setCropForm] = useState<CropConfig>({
        id: "", name: "", scheduleType: "yearly",
        sourceFields: [], summaryFields: [], calculatedFields: [], constants: [],
        analyticsConfig: {}
    });
    const [newConstName, setNewConstName] = useState("");
    const [newConstValue, setNewConstValue] = useState("");

    const [newSourceField, setNewSourceField] = useState("");
    const [newSummaryField, setNewSummaryField] = useState("");
    const [newCalcName, setNewCalcName] = useState("");
    const [newCalcFormula, setNewCalcFormula] = useState("");
    const [newCalcFormat, setNewCalcFormat] = useState("number");
    const [newCalcUnit, setNewCalcUnit] = useState("");

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: "danger" | "warning";
    }>({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: () => { }
    });

    const [toastState, setToastState] = useState<{
        isVisible: boolean;
        message: string;
        type: ToastType;
    }>({
        isVisible: false,
        message: "",
        type: "success"
    });

    const showToast = (message: string, type: ToastType = "success") => {
        setToastState({ isVisible: true, message, type });
    };

    const resetNewFields = () => {

        setNewSourceField(""); setNewSummaryField("");
        setNewCalcName(""); setNewCalcFormula(""); setNewCalcFormat("number"); setNewCalcUnit("");
    };

    const handleAddArea = () => {
        if (!areaName) return;
        const newId = areaId || areaName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (settings.sources.some((s: AreaDef) => s.id === newId)) {
            showToast("An area with this ID already exists.", "error");
            return;
        }
        updateSettings({ sources: [...(settings.sources || []), { id: newId, name: areaName }] });
        setIsEditingArea(false); setAreaName(""); setAreaId("");
        showToast("Area added successfully");
    };

    const handleDeleteArea = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: "Delete Area",
            description: "Delete this area? Historical data is kept but the area won't appear for new entries.",
            onConfirm: () => {
                updateSettings({ sources: settings.sources.filter((s: AreaDef) => s.id !== id) });
                showToast("Area deleted");
            },
            variant: "danger"
        });
    };

    const handleSaveCrop = () => {
        if (!cropForm.name) return;
        const newId = cropForm.id || cropForm.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const existingIndex = (settings.crops || []).findIndex((c: CropConfig) => c.id === newId);
        const newCrops = [...(settings.crops || [])];
        const cropData = { ...cropForm, id: newId };
        if (existingIndex >= 0) { newCrops[existingIndex] = cropData; } else { newCrops.push(cropData); }
        updateSettings({ crops: newCrops });
        setIsEditingCrop(false);
        setCropForm({ id: "", name: "", scheduleType: "yearly", sourceFields: [], summaryFields: [], calculatedFields: [], constants: [], analyticsConfig: {} });
        resetNewFields();
        showToast(existingIndex >= 0 ? "Crop type updated" : "Crop type created");
    };

    const handleDeleteCrop = (id: string) => {
        setConfirmState({
            isOpen: true,
            title: "Delete Crop Type",
            description: "Are you sure you want to delete this crop type? This action cannot be undone.",
            onConfirm: () => {
                updateSettings({ crops: settings.crops.filter((c: CropConfig) => c.id !== id) });
                showToast("Crop type deleted");
            },
            variant: "danger"
        });
    };

    const handleEditCrop = (crop: CropConfig) => {
        setCropForm(crop);
        resetNewFields();
        setIsEditingCrop(true);
    };

    const addCalcField = () => {
        if (!newCalcName.trim() || !newCalcFormula.trim()) return;
        setCropForm({
            ...cropForm,
            calculatedFields: [...cropForm.calculatedFields, {
                id: newCalcName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_'),
                name: newCalcName.trim(),
                formula: newCalcFormula.trim(),
                format: newCalcFormat as "number" | "currency" | "percentage",
                unit: newCalcUnit.trim() || undefined,
            }]
        });
        setNewCalcName(""); setNewCalcFormula(""); setNewCalcFormat("number"); setNewCalcUnit("");
    };

    return (
        <div className="space-y-6">
            {/* AREAS SECTION */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h2 className="text-lg font-medium text-zinc-200">Areas</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Locations or plots where your crops grow. Data is tracked separately per area.</p>
                    </div>
                    <button onClick={() => setIsEditingArea(true)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Area
                    </button>
                </div>

                {isEditingArea && (
                    <div className="my-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex items-end gap-3">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs text-zinc-500">Area Name</label>
                            <input autoFocus value={areaName}
                                onChange={e => {
                                    const newName = e.target.value;
                                    setAreaName(newName);
                                    // Always update ID if it currently matches the slug of the name (or if it's empty)
                                    // This allows auto-gen to work but respects manual changes if they diverge.
                                    setAreaId(newName.toLowerCase().replace(/[^a-z0-9]/g, '_'));
                                }}
                                placeholder="e.g. Old Home, Balehalli Thota"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs text-zinc-500">Unique ID (auto-generated)</label>
                            <input value={areaId} onChange={e => setAreaId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                                placeholder="e.g. old_home"
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono" />
                        </div>
                        <button onClick={handleAddArea} className="bg-success-muted hover:bg-success text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Save</button>
                        <button onClick={() => { setIsEditingArea(false); setAreaName(""); setAreaId(""); }} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                    {(settings.sources || []).map((src: AreaDef) => (
                        <div key={src.id} className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex justify-between items-center group">
                            <div>
                                <div className="text-sm text-zinc-200 font-medium">{src.name}</div>
                                <div className="text-[10px] text-zinc-500 font-mono">{src.id}</div>
                            </div>
                            <button onClick={() => handleDeleteArea(src.id)} className="text-zinc-500 hover:text-danger p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    {!settings.sources?.length && !isEditingArea && (
                        <p className="text-sm text-zinc-500 col-span-full py-4 text-center border-dashed border-2 border-zinc-800 rounded-xl">No areas configured. Add your first area to get started.</p>
                    )}
                </div>
            </div>

            {/* CROPS SECTION */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-lg font-medium text-zinc-200">Crop Configurations</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Define crop types with their fields and calculation formulas.</p>
                    </div>
                    <button onClick={() => { setCropForm({ id: "", name: "", scheduleType: "yearly", sourceFields: [], summaryFields: [], calculatedFields: [], constants: [], analyticsConfig: {} }); resetNewFields(); setIsEditingCrop(true); }}
                        className="text-xs bg-success-muted hover:bg-success text-zinc-50 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Create New Crop Type
                    </button>
                </div>

                {isEditingCrop && (
                    <div className="mb-6 bg-zinc-950 border border-zinc-800 rounded-xl p-5 animate-fade-in-down">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-zinc-100 font-semibold text-lg">{cropForm.id ? "Edit Crop Type" : "New Crop Type"}</h3>
                            <button onClick={() => setIsEditingCrop(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Crop Name</label>
                                <input value={cropForm.name}
                                    onChange={e => {
                                        const newName = e.target.value;
                                        const isNew = !settings.crops.find(c => c.id === cropForm.id);
                                        setCropForm({
                                            ...cropForm,
                                            name: newName,
                                            id: isNew ? newName.toLowerCase().replace(/[^a-z0-9]/g, '_') : cropForm.id
                                        });
                                    }}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100" placeholder="e.g. Coffee, Areca, Pepper" />
                            </div>
                            <div>
                                <label className="text-xs text-zinc-500 block mb-1">Schedule Type</label>
                                <select value={cropForm.scheduleType} onChange={e => setCropForm({ ...cropForm, scheduleType: e.target.value as "yearly" | "half-yearly" | "quarterly" | "monthly" | "custom" })}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100">
                                    <option value="yearly">Yearly (e.g. 2024-25)</option>
                                    <option value="half-yearly">Half Yearly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-6 border-t border-zinc-800 pt-5">
                            {/* Step 1: Per-Area Fields */}
                            <div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <label className="text-sm text-zinc-300 font-medium">Step 1: Per-Area Fields</label>
                                    <span className="text-[10px] text-zinc-600">Entered for each area, each period</span>
                                </div>
                                <p className="text-xs text-zinc-500 mb-3">e.g. &quot;Undried&quot; weight in kg, &quot;OT&quot; percentage. Each area will have its own value.</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {cropForm.sourceFields.map((f: FieldDef, i: number) => (
                                        <FieldChip key={i} field={f} color="bg-sky-500/10 border-sky-500/20 text-sky-300"
                                            onRemove={() => setCropForm({ ...cropForm, sourceFields: cropForm.sourceFields.filter((_: FieldDef, idx: number) => idx !== i) })}
                                            onUpdate={(updated) => { const next = [...cropForm.sourceFields]; next[i] = updated; setCropForm({ ...cropForm, sourceFields: next }); }} />
                                    ))}
                                </div>
                                <FieldAddForm
                                    placeholder="Field name (e.g. Undried)"
                                    fieldNameValue={newSourceField}
                                    onFieldNameChange={setNewSourceField}
                                    onAdd={(name, type, unit) => {
                                        setCropForm({ ...cropForm, sourceFields: [...cropForm.sourceFields, { id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'), name, type: type as "number" | "text", unit: unit || undefined }] });
                                        setNewSourceField("");
                                    }}
                                />
                            </div>

                            {/* Step 2: Period-Level Fields */}
                            <div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <label className="text-sm text-zinc-300 font-medium">Step 2: Period-Level Fields</label>
                                    <span className="text-[10px] text-zinc-600">One value per period (not per area)</span>
                                </div>
                                <p className="text-xs text-zinc-500 mb-3">e.g. &quot;Average Price&quot; in ₹ per 50kg bag — shared across all areas for that period.</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {cropForm.summaryFields.map((f: FieldDef, i: number) => (
                                        <FieldChip key={i} field={f} color="bg-success/10 border-success/20 text-success"
                                            onRemove={() => setCropForm({ ...cropForm, summaryFields: cropForm.summaryFields.filter((_: FieldDef, idx: number) => idx !== i) })}
                                            onUpdate={(updated) => { const next = [...cropForm.summaryFields]; next[i] = updated; setCropForm({ ...cropForm, summaryFields: next }); }} />
                                    ))}
                                </div>
                                <FieldAddForm
                                    placeholder="Field name (e.g. Average Price)"
                                    fieldNameValue={newSummaryField}
                                    onFieldNameChange={setNewSummaryField}
                                    onAdd={(name, type, unit) => {
                                        setCropForm({ ...cropForm, summaryFields: [...cropForm.summaryFields, { id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'), name, type: type as "number" | "text", unit: unit || undefined }] });
                                        setNewSummaryField("");
                                    }}
                                />
                            </div>

                            {/* Step 3: Constants */}
                            <div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <label className="text-sm text-zinc-300 font-medium">Step 3: Constants</label>
                                    <span className="text-[10px] text-zinc-600">Fixed values reusable in formulas</span>
                                </div>
                                <p className="text-xs text-zinc-500 mb-3">e.g. bag size (120kg), conversion factors. Use the constant name directly in formulas.</p>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(cropForm.constants || []).map((c: ConstantDef, i: number) => (
                                        <span key={i} className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                            {c.name} <span className="text-orange-400/60">=</span> <span className="font-mono">{c.value}</span>
                                            <X className="w-3 h-3 cursor-pointer hover:text-danger transition-colors"
                                                onClick={() => setCropForm({ ...cropForm, constants: (cropForm.constants || []).filter((_: ConstantDef, idx: number) => idx !== i) })} />
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <input value={newConstName} onChange={e => setNewConstName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newConstName && newConstValue) {
                                                    e.preventDefault();
                                                    setCropForm({ ...cropForm, constants: [...(cropForm.constants || []), { id: newConstName, name: newConstName, value: Number(newConstValue) }] });
                                                    setNewConstName(""); setNewConstValue("");
                                                }
                                            }}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono"
                                            placeholder="CONSTANT_NAME (e.g. BAG_SIZE)" />
                                    </div>
                                    <div className="w-28">
                                        <input type="number" value={newConstValue} onChange={e => setNewConstValue(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && newConstName && newConstValue) {
                                                    e.preventDefault();
                                                    setCropForm({ ...cropForm, constants: [...(cropForm.constants || []), { id: newConstName, name: newConstName, value: Number(newConstValue) }] });
                                                    setNewConstName(""); setNewConstValue("");
                                                }
                                            }}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="Value" />
                                    </div>
                                    <button onClick={() => {
                                        if (newConstName && newConstValue) {
                                            setCropForm({ ...cropForm, constants: [...(cropForm.constants || []), { id: newConstName, name: newConstName, value: Number(newConstValue) }] });
                                            setNewConstName(""); setNewConstValue("");
                                        }
                                    }} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm transition-colors shrink-0">Add</button>
                                </div>
                            </div>

                            {/* Step 4: Calculated Fields */}
                            <div>
                                <div className="flex items-baseline gap-2 mb-1">
                                    <label className="text-sm text-zinc-300 font-medium">Step 4: Calculated Fields</label>
                                    <span className="text-[10px] text-zinc-600">Auto-computed using functions and formulas</span>
                                </div>
                                <p className="text-xs text-zinc-500 mb-3">
                                    Use functions like <code className="text-success bg-zinc-800 px-1 rounded">SUM(undried)</code> or <code className="text-warning bg-zinc-800 px-1 rounded">WEIGHTED_AVG(ot, undried)</code>. Click chips to build your formula.
                                </p>

                                {/* Existing calculated fields */}
                                {cropForm.calculatedFields.length > 0 && (
                                    <div className="flex flex-col gap-2 mb-4">
                                        {cropForm.calculatedFields.map((f: CalcFieldDef, i: number) => (
                                            <div key={i} className="bg-zinc-800/50 border border-zinc-800 px-3 py-2.5 rounded-lg flex justify-between items-center group">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="text-xs font-medium text-blue-400">{f.name}</span>
                                                    {f.unit && <span className="text-[10px] text-zinc-500">({f.unit})</span>}
                                                    <span className="text-zinc-600">=</span>
                                                    <code className="text-xs text-zinc-400 font-mono bg-black/20 px-2 py-0.5 rounded">{f.formula}</code>
                                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                                                        f.format === 'currency' ? "bg-success-muted/50 text-success" :
                                                            f.format === 'percentage' ? "bg-warning-muted/50 text-warning" :
                                                                "bg-zinc-800 text-zinc-400"
                                                    )}>{f.format || 'number'}</span>
                                                </div>
                                                <button onClick={() => setCropForm({ ...cropForm, calculatedFields: cropForm.calculatedFields.filter((_: CalcFieldDef, idx: number) => idx !== i) })}
                                                    className="text-zinc-600 hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* New calculated field form */}
                                <div className="bg-zinc-900 border border-zinc-700 border-dashed rounded-xl p-4 space-y-3">
                                    <div className="grid grid-cols-[1fr_auto_auto] gap-3">
                                        <div>
                                            <label className="text-xs text-zinc-500 mb-1 block">Field Name</label>
                                            <input value={newCalcName} onChange={e => setNewCalcName(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
                                                placeholder="e.g. Total Weight, Average OT, Approx Income" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-zinc-500 mb-1 block">Display as</label>
                                            <select value={newCalcFormat} onChange={e => setNewCalcFormat(e.target.value as "number" | "currency" | "percentage")}
                                                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 h-[38px]">
                                                <option value="number">Number</option>
                                                <option value="currency">Currency (₹)</option>
                                                <option value="percentage">Percentage</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-zinc-500 mb-1 block">Unit</label>
                                            <input value={newCalcUnit} onChange={e => setNewCalcUnit(e.target.value)}
                                                className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm text-zinc-100 placeholder-zinc-600"
                                                placeholder="kg, %" />
                                        </div>
                                    </div>

                                    <FormulaBuilder
                                        formula={newCalcFormula}
                                        onFormulaChange={setNewCalcFormula}
                                        sourceFields={cropForm.sourceFields}
                                        summaryFields={cropForm.summaryFields}
                                        calculatedFields={cropForm.calculatedFields}
                                        constants={cropForm.constants || []}
                                    />

                                    <div className="flex justify-end pt-1">
                                        <button onClick={addCalcField}
                                            disabled={!newCalcName.trim() || !newCalcFormula.trim()}
                                            className="bg-success-muted hover:bg-success disabled:opacity-40 disabled:hover:bg-success-muted text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                            <Plus className="w-4 h-4" /> Add Calculated Field
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Step 5: Analytics Config */}
                            {(cropForm.sourceFields.length > 0 || cropForm.calculatedFields.length > 0) && (
                                <div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <label className="text-sm text-zinc-300 font-medium">Step 5: Analytics Tags</label>
                                        <span className="text-[10px] text-zinc-600">Tell the analytics tab which fields matter</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mb-3">Select the primary yield field and revenue field so KPIs and charts display correctly.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-zinc-500 mb-1 block">Primary Yield (per-area field)</label>
                                            <select
                                                value={cropForm.analyticsConfig?.yieldFieldId || ""}
                                                onChange={e => setCropForm({ ...cropForm, analyticsConfig: { ...cropForm.analyticsConfig, yieldFieldId: e.target.value || undefined } })}
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                                            >
                                                <option value="">Auto-detect (first field)</option>
                                                {cropForm.sourceFields.map((f: FieldDef) => (
                                                    <option key={f.id} value={f.id}>{f.name}{f.unit ? ` (${f.unit})` : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-zinc-500 mb-1 block">Revenue / Income (calculated field)</label>
                                            <select
                                                value={cropForm.analyticsConfig?.revenueFieldId || ""}
                                                onChange={e => setCropForm({ ...cropForm, analyticsConfig: { ...cropForm.analyticsConfig, revenueFieldId: e.target.value || undefined } })}
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                                            >
                                                <option value="">Auto-detect (first currency field)</option>
                                                {cropForm.calculatedFields.map((f: CalcFieldDef) => (
                                                    <option key={f.id} value={f.id}>{f.name} ({f.format})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-800">
                            <button onClick={() => setIsEditingCrop(false)} className="px-5 py-2.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">Cancel</button>
                            <button onClick={handleSaveCrop} disabled={!cropForm.name.trim()}
                                className="bg-success-muted hover:bg-success disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Crop Type
                            </button>
                        </div>
                    </div>
                )}

                {/* Existing Crops */}
                <div className="space-y-4">
                    {(settings.crops || []).map((crop: CropConfig) => (
                        <div key={crop.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-zinc-100 font-semibold text-lg">{crop.name}</h3>
                                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full mt-1 inline-block">{crop.scheduleType}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditCrop(crop)} className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-lg hover:text-zinc-200"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteCrop(crop.id)} className="p-2 text-zinc-400 hover:bg-zinc-800 rounded-lg hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-zinc-800">
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Per-Area Fields</h4>
                                    <div className="flex flex-col gap-1.5">
                                        {(crop.sourceFields || []).map((f: FieldDef) => (
                                            <div key={f.id} className="flex justify-between items-center bg-sky-500/5 border border-sky-500/10 px-2.5 py-1.5 rounded-md">
                                                <span className="text-xs text-sky-300">{f.name} {f.unit && <span className="text-sky-500/50">({f.unit})</span>}</span>
                                                <span className="text-[10px] text-zinc-500 font-mono">{f.type || 'number'}</span>
                                            </div>
                                        ))}
                                        {!crop.sourceFields?.length && <p className="text-xs text-zinc-600">None</p>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Period-Level Fields</h4>
                                    <div className="flex flex-col gap-1.5">
                                        {(crop.summaryFields || []).map((f: FieldDef) => (
                                            <div key={f.id} className="flex justify-between items-center bg-success/5 border border-success/10 px-2.5 py-1.5 rounded-md">
                                                <span className="text-xs text-success">{f.name} {f.unit && <span className="text-success/50">({f.unit})</span>}</span>
                                                <span className="text-[10px] text-zinc-500 font-mono">{f.type || 'number'}</span>
                                            </div>
                                        ))}
                                        {!crop.summaryFields?.length && <p className="text-xs text-zinc-600">None</p>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Constants</h4>
                                    <div className="flex flex-col gap-1.5">
                                        {(crop.constants || []).map((c: ConstantDef) => (
                                            <div key={c.id} className="flex justify-between items-center bg-orange-500/5 border border-orange-500/10 px-2.5 py-1.5 rounded-md">
                                                <span className="text-xs text-orange-300 font-mono">{c.name}</span>
                                                <span className="text-xs text-orange-400/60 font-mono">{c.value}</span>
                                            </div>
                                        ))}
                                        {!crop.constants?.length && <p className="text-xs text-zinc-600">None</p>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Calculated Fields</h4>
                                    <div className="flex flex-col gap-2">
                                        {(crop.calculatedFields || []).map((f: CalcFieldDef) => (
                                            <div key={f.id} className="bg-blue-950/20 border border-blue-900/20 p-2.5 rounded-md">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-medium text-blue-400">{f.name} {f.unit && <span className="text-blue-500/40">({f.unit})</span>}</span>
                                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                                                        f.format === 'currency' ? "bg-success-muted/50 text-success" :
                                                            f.format === 'percentage' ? "bg-warning-muted/50 text-warning" :
                                                                "bg-zinc-800 text-zinc-400"
                                                    )}>{f.format}</span>
                                                </div>
                                                <code className="text-[10px] text-blue-200/40 mt-1.5 block font-mono bg-black/20 p-1.5 rounded">{f.formula}</code>
                                            </div>
                                        ))}
                                        {!crop.calculatedFields?.length && <p className="text-xs text-zinc-600">None</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!settings.crops?.length && !isEditingCrop && (
                        <p className="text-sm text-zinc-500 py-8 text-center border-dashed border-2 border-zinc-800 rounded-xl">No crops configured. Click &quot;Create New Crop Type&quot; to begin.</p>
                    )}
                </div>
            </div>

            {saving && (
                <div className="fixed bottom-6 right-6 bg-zinc-800 border border-zinc-700 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-xl animate-fade-in-up z-50">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving Settings...
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
                variant={confirmState.variant}
            />

            <Toast
                message={toastState.message}
                type={toastState.type}
                isVisible={toastState.isVisible}
                onClose={() => setToastState({ ...toastState, isVisible: false })}
            />
        </div>
    );
}
