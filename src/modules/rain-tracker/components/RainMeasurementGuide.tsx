"use client";

import { useId, useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import { iconActionClass } from "./styles";

const GAUGE_TICKS = [25, 20, 15, 10, 5, 0];

const steps = [
  {
    title: "Set the gauge in the open",
    detail:
      "Mount it upright with the rim level. Choose a spot clear of trees, buildings, roof runoff, and sprinklers.",
  },
  {
    title: "Read the water level",
    detail:
      "Bring your eyes level with the water. Read the scale at the lowest point of the curved surface, as shown in the example.",
  },
  {
    title: "Log it and empty the gauge",
    detail:
      "Check at about the same time each day. Log the depth, date, and time in Rain Tracker, then empty the gauge. Match your display unit to the gauge in Preferences.",
  },
];

export function RainMeasurementGuide({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      isOpen
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      initialFocusRef={closeButton}
      className="flex max-h-full max-w-3xl flex-col rounded-2xl"
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-zinc-800 px-5 py-4 sm:px-7 sm:py-5">
        <div>
          <h2
            id={titleId}
            className="font-serif text-[1.625rem] leading-tight tracking-tight text-zinc-50 sm:text-3xl"
          >
            How to measure rainfall
          </h2>
          <p id={descriptionId} className="mt-1.5 text-sm text-zinc-400">
            Use a manual rain gauge to measure the depth of rain collected since
            you last emptied it.
          </p>
        </div>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Close measurement guide"
          className={iconActionClass}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>

      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="grid items-start gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-7 sm:p-7">
          <figure className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-4 text-center sm:py-5">
            <p className="text-xs font-semibold text-zinc-400">
              Example reading
            </p>
            <div className="my-5 flex items-center justify-center gap-2 sm:my-7">
              <div
                aria-hidden="true"
                className="flex h-28 w-6 flex-col justify-between text-right font-mono text-xs tabular-nums text-zinc-500 sm:h-40"
              >
                {GAUGE_TICKS.map((mark) => (
                  <div key={mark} className="relative h-0">
                    <span className="absolute right-0 -translate-y-1/2">
                      {mark}
                    </span>
                  </div>
                ))}
              </div>
              <div className="relative h-28 w-14 rounded-b-lg border-x-2 border-b-2 border-zinc-500 sm:h-40 sm:w-16">
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 z-10 flex w-3 flex-col justify-between"
                >
                  {GAUGE_TICKS.map((mark) => (
                    <div key={mark} className="relative h-0">
                      <span className="absolute inset-x-0 border-t border-zinc-500" />
                    </div>
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[48%] rounded-b-md bg-accent/20"
                >
                  <div className="absolute inset-x-0 -top-2 h-2 rounded-b-[50%] border-b-2 border-accent" />
                </div>
                <div className="absolute bottom-[48%] left-full flex translate-y-1/2 items-center">
                  <div
                    aria-hidden="true"
                    className="w-3 border-t border-accent"
                  />
                  <span className="whitespace-nowrap rounded-md bg-zinc-950 px-2 py-1 text-xs font-semibold tabular-nums text-zinc-100">
                    12 mm
                  </span>
                </div>
              </div>
              <div aria-hidden="true" className="w-14" />
            </div>
            <figcaption className="text-xs leading-relaxed text-zinc-400">
              The bottom of the water curve lines up with 12 mm.
            </figcaption>
          </figure>

          <div className="space-y-4">
            <ol className="divide-y divide-zinc-800">
              {steps.map(({ title, detail }, index) => (
                <li
                  key={title}
                  className="flex gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-accent/25 bg-accent/5 text-xs font-semibold tabular-nums text-zinc-300"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="mt-0.5 text-sm font-semibold text-zinc-100">
                      {title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                      {detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="border-l-2 border-accent/40 pl-3 text-xs leading-relaxed text-zinc-400">
              <strong className="font-semibold text-zinc-200">
                If your gauge has an overflow cylinder,
              </strong>{" "}
              measure the water from it in batches using the inner tube. Add
              those amounts to the original inner-tube reading.
            </p>
          </div>
        </div>
        <footer className="flex flex-wrap gap-x-5 gap-y-1 border-t border-zinc-800 px-5 py-2 sm:px-7">
          <a
            href="https://www.weather.gov/ilx/swop-rainfall"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded text-xs font-medium text-zinc-400 underline underline-offset-4 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            NWS measurement tips
            <ArrowUpRight aria-hidden="true" className="size-3" />
          </a>
          <a
            href="https://www.weather.gov/media/epz/mesonet/CoCoRaHS-MeasuringRain.pdf"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded text-xs font-medium text-zinc-400 underline underline-offset-4 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            CoCoRaHS reading guide (PDF)
            <ArrowUpRight aria-hidden="true" className="size-3" />
          </a>
        </footer>
      </div>
    </Dialog>
  );
}
