"use client";

type CategoryBarColor = "pink" | "amber" | "emerald" | "blue" | "slate";

interface CategoryBarMarker {
  value: number;
  tooltip?: string;
  showAnimation?: boolean;
}

interface CategoryBarProps {
  values: number[];
  marker?: CategoryBarMarker;
  colors?: CategoryBarColor[];
  className?: string;
}

function toUnits(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

function colorClass(color: CategoryBarColor): string {
  if (color === "pink") {
    return "bg-pink-400";
  }
  if (color === "amber") {
    return "bg-amber-400";
  }
  if (color === "emerald") {
    return "bg-emerald-400";
  }
  if (color === "blue") {
    return "bg-sky-400";
  }
  return "bg-slate-400";
}

export function CategoryBar({
  values,
  marker,
  colors = ["emerald", "amber", "pink"],
  className,
}: CategoryBarProps) {
  const normalized = values.map(toUnits);
  const totalUnits = normalized.reduce((sum, value) => sum + value, 0);

  const units: Array<{ key: string; bgClass: string }> = [];
  if (totalUnits === 0) {
    units.push({ key: "empty", bgClass: "bg-slate-700/70" });
  } else {
    normalized.forEach((value, groupIndex) => {
      const bgClass = colorClass(colors[groupIndex] ?? "slate");
      for (let i = 0; i < value; i += 1) {
        units.push({ key: `${groupIndex}-${i}`, bgClass });
      }
    });
  }

  const markerIndex =
    marker && totalUnits > 0
      ? Math.min(Math.max(toUnits(marker.value), 1), totalUnits) - 1
      : -1;

  return (
    <div className={className}>
      <div className="flex h-4 w-full overflow-hidden rounded-full border border-white/15 bg-black/25">
        {units.map((unit, index) => {
          const markerClass =
            markerIndex === index
              ? marker?.showAnimation
                ? "ring-2 ring-white/90 animate-pulse"
                : "ring-2 ring-white/90"
              : "";

          return (
            <span
              key={unit.key}
              className={`h-full flex-1 ${unit.bgClass} ${markerClass}`.trim()}
              title={markerIndex === index ? marker?.tooltip : undefined}
            />
          );
        })}
      </div>
      {marker ? (
        <p className="mt-2 text-xs text-orange-100/75">
          Marker: {toUnits(marker.value)}
          {marker.tooltip ? ` (${marker.tooltip})` : ""}
        </p>
      ) : null}
    </div>
  );
}
