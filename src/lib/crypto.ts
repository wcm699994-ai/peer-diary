// PIN 派生密钥 + AES-GCM 加密层。
// 数据以 { iv, ct } JSON 字符串形式存入 IndexedDB；密钥只在解锁后存在于内存。

export const PBKDF2_ITERATIONS = 310_000;

export function randomSalt(bytes = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(bytes));
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function deriveKey(
  pin: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface SealedBlob {
  iv: string;
  ct: string;
}

/** 加密任意可 JSON 序列化对象，返回可入库的字符串。 */
export async function seal(key: CryptoKey, data: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  );
  return JSON.stringify({ iv: toBase64(iv), ct: toBase64(new Uint8Array(ciphertext)) } satisfies SealedBlob);
}

/** 解密 seal 产生的字符串。密钥错误时抛 OperationError。 */
export async function unseal<T>(key: CryptoKey, blob: string): Promise<T> {
  const parsed = JSON.parse(blob) as SealedBlob;
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(parsed.iv) as BufferSource },
    key,
    fromBase64(parsed.ct) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
