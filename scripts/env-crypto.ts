/**
 * @author alnosila — https://github.com/alnosila
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ALGORITHM = 'aes-256-cbc';

export interface EncryptedEnvPayload {
  iv: string;
  data: string;
}

function deriveKey(password: string): Buffer {
  return createHash('sha256').update(password, 'utf8').digest();
}

export function encryptEnv(plainText: string, password: string): EncryptedEnvPayload {
  const iv = randomBytes(16);
  const key = deriveKey(password);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);

  return {
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
  };
}

export function decryptEnv(payload: EncryptedEnvPayload, password: string): string {
  const iv = Buffer.from(payload.iv, 'base64');
  const data = Buffer.from(payload.data, 'base64');
  const key = deriveKey(password);
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

function readPassword(path: string): string {
  return readFileSync(path, 'utf8').trim();
}

function cmdEncrypt(): void {
  const keyFile = resolve(process.env.VAULT_KEY_FILE ?? './vault');
  const plainFile = resolve(process.env.ENV_FILE ?? './.env');
  const encFile = resolve(process.env.ENCRYPTED_FILE ?? './env.enc');

  const password = readPassword(keyFile);
  const plain = readFileSync(plainFile, 'utf8');
  const payload = encryptEnv(plain, password);

  writeFileSync(encFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`OK: ${encFile}`);
}

function cmdDecrypt(): void {
  const keyFile = resolve(process.env.VAULT_KEY_FILE ?? './vault');
  const encFile = resolve(process.env.ENCRYPTED_FILE ?? './env.enc');
  const outFile = resolve(process.env.ENV_FILE ?? './.env');

  const password = readPassword(keyFile);
  const payload = JSON.parse(readFileSync(encFile, 'utf8')) as EncryptedEnvPayload;
  const plain = decryptEnv(payload, password);

  writeFileSync(outFile, plain.endsWith('\n') ? plain : `${plain}\n`, { encoding: 'utf8', mode: 0o600 });
  console.log(`OK: ${outFile}`);
}

const command = process.argv[2];
if (command === 'encrypt') {
  cmdEncrypt();
} else if (command === 'decrypt') {
  cmdDecrypt();
} else if (process.argv[1]?.includes('env-crypto')) {
  console.error('Usage: tsx scripts/env-crypto.ts encrypt|decrypt');
  process.exit(1);
}
