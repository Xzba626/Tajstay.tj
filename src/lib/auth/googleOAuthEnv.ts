/** Сервер: оба значения должны быть непустыми, иначе Google OAuth даёт «Missing required parameter: client_id». */
export function isGoogleOAuthConfigured(): boolean {
  const id = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const secret = (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
  return id.length > 0 && secret.length > 0;
}
