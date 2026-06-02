"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { parseAmenitiesJson } from "@/lib/pms/amenities";
import { AmenityCheckboxGrid } from "./AmenityCheckboxGrid";

/** Hidden comma-separated ids for legacy owner room form POST handlers */
export function OwnerRoomAmenitiesField({
  locale,
  name,
  defaultValue
}: {
  locale: Locale;
  name: string;
  defaultValue?: string | null;
}) {
  const initial = useMemo(() => parseAmenitiesJson(defaultValue), [defaultValue]);
  const [amenities, setAmenities] = useState<string[]>(initial);

  return (
    <div className="md:col-span-2">
      <input type="hidden" name={name} value={amenities.join(", ")} />
      <AmenityCheckboxGrid locale={locale} value={amenities} onChange={setAmenities} variant="light" />
    </div>
  );
}
