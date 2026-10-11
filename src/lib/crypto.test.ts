import { describe, expect, it } from 'vitest';
import { deriveKey, fromBase64, randomSalt, seal, toBase64, unseal } from './crypto';

describe('crypto 加密层', () => {
  it('seal / unseal 往返一致', async () => {
    const key = await deriveKey('1234', randomSalt(), 1000);
    const blob = await seal(key, { hello: '世界', n: 42 });
    const restored = await unseal<{ hello: string; n: number }>(key, blob);
    expect(restored).toEqual({ hello: '世界', n: 42 });
  });

  it('错误的密钥无法解密', async () => {
    const key1 = await deriveKey('1234', randomSalt(), 1000);
    const key2 = await deriveKey('5678', randomSalt(), 1000);
    const blob = await seal(key1, { secret: true });
    await expect(unseal(key2, blob)).rejects.toThrow();
  });

  it('base64 往返一致', () => {
    const bytes = randomSalt(32);
    expect(fromBase64(toBase64(bytes))).toEqual(bytes);
  });

  it('同一 PIN + 盐派生出的密钥可解密彼此的密文', async () => {
    const salt = randomSalt();
    const key1 = await deriveKey('987654', salt, 1000);
    const key2 = await deriveKey('987654', salt, 1000);
    const blob = await seal(key1, { a: 1 });
    await expect(unseal(key2, blob)).resolves.toEqual({ a: 1 });
  });
});
