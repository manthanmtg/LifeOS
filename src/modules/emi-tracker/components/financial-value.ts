import { cn } from "@/lib/utils";

export function financialValueClass(
  value: string,
  scale: "hero" | "major" | "minor" = "major",
) {
  const length = value.length;
  const size =
    scale === "hero"
      ? length > 18
        ? "text-2xl"
        : length > 13
          ? "text-3xl"
          : "text-4xl md:text-5xl"
      : scale === "major"
        ? length > 18
          ? "text-lg"
          : length > 13
            ? "text-xl"
            : "text-2xl"
        : "text-base";

  return cn(
    "font-mono font-black tabular-nums leading-tight text-zinc-50",
    "whitespace-nowrap",
    size,
  );
}
