/** Id сообщений из таблицы ChatArchive в API админа = offset + archive.id (клиентский чат не тянет server-only модули). */
export const ADMIN_ARCHIVE_MESSAGE_ID_OFFSET = 1_000_000_000;

export function syntheticArchiveChatMessageId(archiveRowId: number): number {
  return ADMIN_ARCHIVE_MESSAGE_ID_OFFSET + archiveRowId;
}

export function isSyntheticArchiveChatMessageId(id: number): boolean {
  return id >= ADMIN_ARCHIVE_MESSAGE_ID_OFFSET;
}
