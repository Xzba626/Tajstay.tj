-- BLOCK 5.6D: additive, nullable semantic system-event fields on ChatMessage.
-- Legacy rows keep eventType=NULL and continue rendering the existing `body` verbatim; only
-- new SYSTEM-role messages written after this migration populate eventType/eventPayload.
-- No column removed, no column renamed, no NOT NULL added, no data touched.
ALTER TABLE "ChatMessage" ADD COLUMN "eventType" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "eventPayload" TEXT;
