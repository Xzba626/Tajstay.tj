/**
 * Exact Ed25519 canonical string construction.
 * Fields joined by LF; no trailing newline after last field.
 */

export const ACTIVATE_PATH = "/api/local-vault/devices/activate";
export const HEARTBEAT_PATH = "/api/local-vault/devices/heartbeat";

export const TIMESTAMP_SKEW_SEC = 60;

export function buildDeviceCanonical(input: {
  method: string;
  canonicalPath: string;
  timestamp: string;
  nonce: string;
  deviceId: string;
  bodyHash: string;
}): string {
  return [
    input.method.toUpperCase(),
    input.canonicalPath,
    input.timestamp,
    input.nonce,
    input.deviceId,
    input.bodyHash,
  ].join("\n");
}

export function buildActivateCanonical(input: {
  method: string;
  canonicalPath: string;
  timestamp: string;
  nonce: string;
  publicKey: string;
  bodyHash: string;
}): string {
  return [
    input.method.toUpperCase(),
    input.canonicalPath,
    input.timestamp,
    input.nonce,
    input.publicKey,
    input.bodyHash,
  ].join("\n");
}

export function subjectActivate(publicKeyFp: string): string {
  return `activate:${publicKeyFp}`;
}

export function subjectDevice(deviceId: string): string {
  return `device:${deviceId}`;
}
