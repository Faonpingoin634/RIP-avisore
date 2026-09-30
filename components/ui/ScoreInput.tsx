"use client";

import { useId } from "react";

import { FieldErrors } from "./form";

const LABELS: Record<"rating" | "humidity", { legend: string; icon: string; unit: string; hints: string[] }> = {
  rating: {
    legend: "Note",
    icon: "💀",
    unit: "crâne",
    hints: ["Sinistre", "Morne", "Correct", "Charmant", "Paradis éternel"],
  },
  humidity: {
    legend: "Humidité des caveaux",
    icon: "💧",
    unit: "goutte",
    hints: ["Sec comme une momie", "Frais", "Humide", "Suintant", "Marécage"],
  },
};

type Props = {
  name: "rating" | "humidity";
  value: number | null;
  onChange: (value: number) => void;
  errors?: string[];
};

/**
 * 1–5 score as a styled radio group: native radios (arrow keys, required,
 * form submission) visually replaced by skulls or drops.
 */
export default function ScoreInput({ name, value, onChange, errors }: Props) {
  const { legend, icon, unit, hints } = LABELS[name];
  const groupId = useId();
  const errorId = `${groupId}-error`;
  const invalid = Boolean(errors?.length);

  return (
    <fieldset aria-describedby={invalid ? errorId : undefined}>
      <legend className="mb-1 font-semibold">{legend}</legend>
      <div className="flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => {
          const id = `${groupId}-${score}`;
          const active = value !== null && score <= value;
          return (
            <span key={score}>
              <input
                id={id}
                type="radio"
                name={name}
                value={score}
                checked={value === score}
                onChange={() => onChange(score)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                title={hints[score - 1]}
                className={`block cursor-pointer rounded-md px-1.5 py-1 text-3xl transition peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-candle hover:scale-110 ${
                  active ? "" : "opacity-30 grayscale"
                }`}
              >
                <span aria-hidden="true">{icon}</span>
                <span className="sr-only">
                  {score} {unit}
                  {score > 1 ? "s" : ""} — {hints[score - 1]}
                </span>
              </label>
            </span>
          );
        })}
        <span className="ml-2 text-ash" aria-hidden="true">
          {value ? `${value}/5 · ${hints[value - 1]}` : "Non noté"}
        </span>
      </div>
      <FieldErrors id={errorId} errors={errors} />
    </fieldset>
  );
}
