export type ChatMessageDto = {
  id: number;
  senderId: number;
  senderRole: string;
  senderName: string;
  message: string;
  imageUrl?: string | null;
  status?: string;
  readAt?: string | null;
  createdAt: string;
};

export function rowToChatMessageDto(row: {
  id: number;
  body: string;
  imageUrl: string | null;
  createdAt: Date;
  senderId: number;
  senderRole: string;
  senderName: string;
  status: string;
  readAt: Date | null;
}): ChatMessageDto {
  return {
    id: row.id,
    senderId: row.senderId,
    senderRole: row.senderRole,
    senderName: row.senderName,
    message: row.body,
    imageUrl: row.imageUrl,
    status: row.status,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  };
}
