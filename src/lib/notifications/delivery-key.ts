import { createHash } from "node:crypto";

export interface DeliveryDedupeKeyParts {
  module_type: string;
  document_id: string;
  event: string;
  event_date: string;
  offset_days: number;
  channel_id: string;
}

export function buildDeliveryDedupeKey(parts: DeliveryDedupeKeyParts): string {
  const canonical = [
    parts.module_type,
    parts.document_id,
    parts.event,
    parts.event_date,
    String(parts.offset_days),
    parts.channel_id,
  ].join("\n");

  return createHash("sha256").update(canonical).digest("hex");
}
