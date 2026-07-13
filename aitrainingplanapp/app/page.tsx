"use client";

import { useEffect, useRef, useState } from "react";

type MacroKey = "calories" | "protein" | "carbs" | "fats";

type Goals = Record<MacroKey, number>;

type Meal = {
  id: string;
  title: string;
} & Record<MacroKey, number>;

const MACROS: { key: MacroKey; label: string; unit: string }[] = [
  { key: "calories", label: "calories", unit: "" },
  { key: "protein", label: "protein", unit: "g" },
  { key: "carbs", label: "carbs", unit: "g" },
  { key: "fats", label: "fats", unit: "g" },
];

const DEFAULT_GOALS: Goals = {
  calories: 2400,
  protein: 180,
  carbs: 220,
  fats: 70,
};

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function GoalTile({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n) && n > 0) onChange(n);
    setEditing(false);
  };

  return (
    <button
      type="button"
      onClick={() => {
        if (!editing) {
          setDraft(String(value));
          setEditing(true);
        }
      }}
      className="flex flex-col items-start gap-1 rounded-3xl bg-surface p-4 text-left transition-transform active:scale-95"
    >
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          type="number"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full bg-transparent text-xl font-bold text-ink caret-ink outline-none"
        />
      ) : (
        <span className="text-xl font-bold text-ink underline decoration-track decoration-dotted underline-offset-4">
          {value.toLocaleString()}
        </span>
      )}
      <span className="text-xs text-soft">{label}</span>
    </button>
  );
}

function Meter({
  label,
  unit,
  eaten,
  goal,
}: {
  label: string;
  unit: string;
  eaten: number;
  goal: number;
}) {
  const remaining = goal - eaten;
  const over = remaining < 0;
  const pct = Math.min(100, goal > 0 ? (eaten / goal) * 100 : 0);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs text-soft">{label}</span>
      <span
        className={`text-lg font-bold ${over ? "text-danger" : "text-ink"}`}
      >
        {over ? "-" : ""}
        {Math.abs(remaining).toLocaleString()}
        {unit}
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-track">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            over ? "bg-danger" : "bg-ink"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const [title, setTitle] = useState("");
  const [draft, setDraft] = useState<Record<MacroKey, string>>({
    calories: "",
    protein: "",
    carbs: "",
    fats: "",
  });

  useEffect(() => {
    try {
      const g = localStorage.getItem("macro-goals");
      const m = localStorage.getItem("macro-meals");
      if (g) setGoals(JSON.parse(g));
      if (m) setMeals(JSON.parse(m));
    } catch {
      // corrupted storage — fall back to defaults
    }
    setNow(new Date());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("macro-goals", JSON.stringify(goals));
  }, [goals, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem("macro-meals", JSON.stringify(meals));
  }, [meals, loaded]);

  const eaten: Goals = MACROS.reduce(
    (acc, { key }) => ({
      ...acc,
      [key]: meals.reduce((sum, meal) => sum + meal[key], 0),
    }),
    {} as Goals,
  );

  const caloriesLeft = goals.calories - eaten.calories;

  const canAdd =
    title.trim().length > 0 ||
    Object.values(draft).some((v) => v.trim() !== "");

  const addMeal = () => {
    if (!canAdd) return;
    const meal: Meal = {
      id: crypto.randomUUID(),
      title: title.trim() || "untitled",
      calories: parseInt(draft.calories, 10) || 0,
      protein: parseInt(draft.protein, 10) || 0,
      carbs: parseInt(draft.carbs, 10) || 0,
      fats: parseInt(draft.fats, 10) || 0,
    };
    setMeals((m) => [...m, meal]);
    setTitle("");
    setDraft({ calories: "", protein: "", carbs: "", fats: "" });
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10 font-mono">
      {/* goals — tap a tile to edit */}
      <div className="grid grid-cols-4 gap-3 border-2 rounded-lg bg-gray-100">
        {MACROS.map(({ key, label, unit }) => (
          <GoalTile
            key={key}
            label={
              label === "calories"
                ? "kcal goal"
                : `${label}${unit ? ` ${unit}` : ""}`
            }
            value={goals[key]}
            onChange={(v) => setGoals((g) => ({ ...g, [key]: v }))}
          />
        ))}
      </div>

      {/* main widget — what's left today */}
      <div className="flex flex-col gap-6 rounded-[28px] border-2 border-track bg-surface p-6">
        <div className="flex items-start justify-between">
          <p className="text-2xl leading-snug">
            <span
              className={`font-bold ${caloriesLeft < 0 ? "text-danger" : "text-ink"}`}
            >
              {Math.abs(caloriesLeft).toLocaleString()}
            </span>{" "}
            <span className="text-faint">
              kcal
              <br />
              {caloriesLeft < 0 ? "over" : "to go"}
            </span>
          </p>
          <span className="text-2xl text-faint">#{meals.length}</span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {MACROS.map(({ key, label, unit }) => (
            <Meter
              key={key}
              label={label}
              unit={unit}
              eaten={eaten[key]}
              goal={goals[key]}
            />
          ))}
        </div>

        <div className="flex items-baseline justify-between text-xl">
          <span className="font-bold text-ink">
            {now ? DAYS[now.getDay()] : ""}
          </span>
          <span className="text-faint">
            {now
              ? `${String(now.getDate()).padStart(2, "0")}.${String(
                  now.getMonth() + 1,
                ).padStart(2, "0")}`
              : ""}
          </span>
        </div>
      </div>

      {/* meal entry */}

      <div className="flex flex-col gap-4 rounded-[28px] border-2 border-track bg-surface p-6">
        <div>Enter a new meal</div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addMeal();
          }}
          placeholder="meal title"
          className="w-full rounded-2xl bg-white/60 px-4 py-3 text-base text-ink caret-ink outline-none transition-shadow placeholder:text-faint focus:ring-2 focus:ring-ink"
        />

        <div className="grid grid-cols-4 gap-3">
          {MACROS.map(({ key, label }) => (
            <label key={key} className="flex flex-col items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={draft[key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [key]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") addMeal();
                }}
                placeholder="0"
                className="w-full rounded-2xl bg-white/60 px-2 py-3 text-center text-base font-bold text-ink caret-ink outline-none transition-shadow placeholder:font-normal placeholder:text-faint focus:ring-2 focus:ring-ink"
              />
              <span className="text-[11px] text-soft">
                {label === "calories" ? "kcal" : label}
              </span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={addMeal}
          disabled={!canAdd}
          className="rounded-2xl bg-ink py-3 text-base font-bold text-surface transition-all enabled:active:scale-[0.98] disabled:opacity-30"
        >
          add meal
        </button>

        {meals.length > 0 && (
          <ul className="flex flex-col divide-y divide-track border-t border-track">
            {meals.map((meal) => (
              <li key={meal.id} className="flex items-center gap-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold text-ink">
                    {meal.title}
                  </span>
                  <span className="text-xs text-soft">
                    {meal.calories.toLocaleString()} kcal · {meal.protein}p ·{" "}
                    {meal.carbs}c · {meal.fats}f
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMeals((m) => m.filter((x) => x.id !== meal.id))
                  }
                  aria-label={`remove ${meal.title}`}
                  className="rounded-full px-2 text-lg text-faint transition-colors hover:text-danger"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
