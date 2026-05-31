"use client";

import { useState, useMemo } from "react";
import { X, Calculator, HelpCircle, Check, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConstantDef, FieldDef, CalcFieldDef } from "../AdminView";

// --- Formula Builder Component ---
export function FormulaBuilder({
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
    const templates: {
      label: string;
      formula: string;
      description: string;
      category: string;
    }[] = [];

    for (const f of sourceFields) {
      templates.push({
        label: `SUM(${f.name})`,
        formula: `SUM(${f.id})`,
        description: `Total ${f.name} across all areas`,
        category: "Aggregate",
      });
      templates.push({
        label: `AVG(${f.name})`,
        formula: `AVG(${f.id})`,
        description: `Simple average of ${f.name}`,
        category: "Aggregate",
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
              category: "Weighted",
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
        category: "MinMax",
      });
      templates.push({
        label: `MAX(${f.name})`,
        formula: `MAX(${f.id})`,
        description: `Highest ${f.name} across areas`,
        category: "MinMax",
      });
    }

    templates.push({
      label: "COUNT()",
      formula: "COUNT()",
      description: "Number of areas",
      category: "Other",
    });

    return templates;
  }, [sourceFields]);

  // Variable chips for manual formula building
  const variableGroups = useMemo(() => {
    const groups: {
      label: string;
      color: string;
      bgColor: string;
      items: { label: string; value: string; desc: string }[];
    }[] = [];

    if (summaryFields.length > 0) {
      groups.push({
        label: "Period Fields",
        color: "text-success",
        bgColor: "bg-success/10 border-success/20 hover:bg-success/20",
        items: summaryFields.map((f) => ({
          label: f.name,
          value: f.id,
          desc: `Period-level: ${f.name}${f.unit ? ` (${f.unit})` : ""}`,
        })),
      });
    }

    if (constants.length > 0) {
      groups.push({
        label: "Constants",
        color: "text-warning",
        bgColor: "bg-warning/10 border-warning/20 hover:bg-warning/20",
        items: constants.map((c) => ({
          label: c.name,
          value: c.id,
          desc: `Constant = ${c.value}`,
        })),
      });
    }

    if (calculatedFields.length > 0) {
      groups.push({
        label: "Previous Calculations",
        color: "text-accent",
        bgColor: "bg-accent/10 border-accent/20 hover:bg-accent/20",
        items: calculatedFields.map((f) => ({
          label: f.name,
          value: f.id,
          desc: `= ${f.formula}`,
        })),
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
    { label: ")", value: ")", title: "Close bracket" },
  ];

  const hasContent = sourceFields.length > 0 || summaryFields.length > 0;

  return (
    <div className="space-y-3">
      {/* Formula Input */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <label className="text-xs text-zinc-500 font-medium">Formula</label>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 focus-within:border-success/50 focus-within:ring-1 focus-within:ring-success/20 transition-all">
          <Calculator className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <input
            value={formula}
            onChange={(e) => onFormulaChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 font-mono outline-none placeholder-zinc-600"
            placeholder="Pick a function below, or type your formula..."
          />
          {formula && (
            <button
              type="button"
              onClick={() => onFormulaChange("")}
              className="text-zinc-600 hover:text-zinc-400 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Help */}
      {showHelp && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 space-y-1.5">
          <p className="font-medium text-zinc-300">How formulas work:</p>
          <p>
            <strong className="text-accent">Functions</strong> aggregate
            per-area fields: <code className="text-success">SUM(undried)</code>{" "}
            adds undried weight from all areas.
          </p>
          <p>
            <strong className="text-warning">WEIGHTED_AVG(ot, undried)</strong>{" "}
            gives the correct average OT weighted by each area&apos;s undried
            weight.
          </p>
          <p>
            <strong className="text-success">Period fields</strong> like
            avg_price can be used directly in math.
          </p>
          <p>
            <strong className="text-accent">Previous calculations</strong> can
            be referenced by later formulas (order matters!).
          </p>
          <p className="text-zinc-500">
            See the <strong>Docs</strong> tab for full reference and examples.
          </p>
        </div>
      )}

      {/* Function Templates — primary entry point for non-technical users */}
      {hasContent && !formula && (
        <div>
          <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-1.5 block">
            Pick a function
          </label>

          {/* Aggregates (SUM, AVG) */}
          {sourceFields.length > 0 && (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1.5">
                {functionTemplates
                  .filter((t) => t.category === "Aggregate")
                  .map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onFormulaChange(t.formula)}
                      className="text-xs bg-accent/10 border border-accent/20 text-accent px-2.5 py-1.5 rounded-lg hover:bg-accent/20 transition-colors"
                      title={t.description}
                    >
                      {t.label}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Weighted averages */}
          {functionTemplates.filter((t) => t.category === "Weighted").length >
            0 && (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1.5">
                {functionTemplates
                  .filter((t) => t.category === "Weighted")
                  .map((t, i) => (
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
            {functionTemplates
              .filter((t) => t.category === "MinMax" || t.category === "Other")
              .map((t, i) => (
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
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mr-1">
              Operators
            </span>
            {operators.map((op) => (
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
              <label className="text-[10px] text-accent uppercase tracking-wider font-medium mb-1.5 block">
                Functions
              </label>
              <div className="flex flex-wrap gap-1.5">
                {functionTemplates
                  .filter(
                    (t) =>
                      t.category === "Aggregate" || t.category === "Weighted",
                  )
                  .map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertAtCursor(t.formula)}
                      className="text-xs bg-accent/10 border border-accent/20 text-accent px-2 py-1 rounded-lg hover:bg-accent/20 transition-colors"
                      title={t.description}
                    >
                      {t.label}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Variable chips */}
          {variableGroups.map(
            (group) =>
              group.items.length > 0 && (
                <div key={group.label}>
                  <label
                    className={cn(
                      "text-[10px] uppercase tracking-wider font-medium mb-1.5 block",
                      group.color,
                    )}
                  >
                    {group.label}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => insertAtCursor(item.value)}
                        title={item.desc}
                        className={cn(
                          "text-xs border px-2 py-1 rounded-lg transition-colors",
                          group.bgColor,
                          group.color,
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ),
          )}
        </>
      )}

      {/* Preview */}
      {formula && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 flex items-start gap-2">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mt-0.5 shrink-0">
            Formula:
          </span>
          <code className="text-xs text-success font-mono break-all">
            {formula}
          </code>
        </div>
      )}
    </div>
  );
}

// --- Field Add Form (with type + unit) ---
export function FieldAddForm({
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
          onChange={(e) => onFieldNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
          placeholder={placeholder}
        />
      </div>
      <div className="w-24">
        <select
          value={fieldType}
          onChange={(e) => setFieldType(e.target.value as "number" | "text")}
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
          onChange={(e) => setUnit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-300"
          placeholder="Unit (kg, %)"
        />
      </div>
      <button
        onClick={handleAdd}
        className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm transition-colors shrink-0"
      >
        Add
      </button>
    </div>
  );
}

// --- Field Chip (click to edit inline) ---
export function FieldChip({
  field,
  color,
  onRemove,
  onUpdate,
}: {
  field: FieldDef;
  color: string;
  onRemove: () => void;
  onUpdate: (updated: FieldDef) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(field.name);
  const [editUnit, setEditUnit] = useState(field.unit || "");
  const [editType, setEditType] = useState(field.type || "number");

  const handleSave = () => {
    if (!editName.trim()) return;
    onUpdate({
      ...field,
      name: editName.trim(),
      id: editName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_"),
      type: editType as "number" | "text",
      unit: editUnit.trim() || undefined,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className={cn(
          "text-xs border rounded-lg flex items-center gap-1.5 bg-zinc-950 border-zinc-700 p-1",
        )}
      >
        <input
          autoFocus
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-24 bg-transparent text-zinc-100 outline-none px-1.5 py-0.5 text-xs"
          placeholder="Name"
        />
        <select
          value={editType}
          onChange={(e) => setEditType(e.target.value as "number" | "text")}
          className="bg-transparent text-zinc-400 outline-none text-[10px] py-0.5"
        >
          <option value="number">Num</option>
          <option value="text">Text</option>
        </select>
        <input
          value={editUnit}
          onChange={(e) => setEditUnit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-12 bg-transparent text-zinc-400 outline-none px-1 py-0.5 text-[10px]"
          placeholder="unit"
        />
        <button
          onClick={handleSave}
          className="text-success hover:text-success p-0.5"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-zinc-500 hover:text-zinc-300 p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "text-xs border px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer group",
        color,
      )}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {field.name}
      {field.unit && (
        <span className="text-[10px] opacity-60">({field.unit})</span>
      )}
      {field.type === "text" && (
        <span className="text-[10px] opacity-60">[text]</span>
      )}
      <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
      <X
        className="w-3 h-3 opacity-60 hover:text-danger transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      />
    </span>
  );
}
