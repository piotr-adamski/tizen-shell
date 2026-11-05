// Copyright 2026 Piotr Adamski (piotr-adamski)
// SPDX-License-Identifier: Apache-2.0
export const MAX_STORE_CHARS = 18000;
export const MAX_INPUT_BYTES = 65536;
export const validSessionName = name => /^[A-Za-z0-9_-]{1,64}$/.test(name);
export const validUsername = name => typeof name==='string' && /^[A-Za-z_][A-Za-z0-9_.-]{0,62}$/.test(name) && name!=='root';
export function newStore(target = {}) {
  return {
    schemaVersion: 1,
    profile: {label: '', host: target.host || '', port: target.port || 22, username: target.username || 'tvuser'},
    expectedFingerprint: target.fingerprintSha256 || '', hostTrust: null,
    panes: Array.from({length: 4}, (_, i) => ({id: i+1, tmuxSession: `tizen-shell-${i+1}`, identity: null})),
    preferences: {fontSize: 24, contrast: 'dark', safeMargin: 3}
  };
}
export function validateStore(value) {
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.panes) || value.panes.length !== 4) throw new Error('STORE_SCHEMA');
  const p = value.profile;
  if (!p || !validUsername(p.username) || typeof p.host !== 'string' || p.host.length > 253 || /[\s/\\@]/.test(p.host) || !Number.isInteger(p.port) || p.port < 1 || p.port > 65535) throw new Error('INVALID_TARGET');
  if (typeof value.expectedFingerprint !== 'string' || (value.expectedFingerprint && !/^SHA256:[A-Za-z0-9+/]{43}$/.test(value.expectedFingerprint))) throw new Error('INVALID_FINGERPRINT');
  const keys = new Set();
  value.panes.forEach((pane, i) => {
    if (pane.id !== i+1 || !validSessionName(pane.tmuxSession)) throw new Error('INVALID_SESSION_NAME');
    const key = pane.identity;
    if (key) {
      if (key.algorithm !== 'ssh-ed25519' || key.keyFormatVersion !== 1 || !/^ssh-ed25519 [A-Za-z0-9+/]+=*$/.test(key.publicKey) || !/^[A-Za-z0-9+/]+=*$/.test(key.encryptedPrivateKey) || key.encryptedPrivateKey.length > 3000 || keys.has(key.publicKey)) throw new Error('INVALID_KEY');
      keys.add(key.publicKey);
    }
  });
  if (value.hostTrust && (value.hostTrust.host !== p.host || value.hostTrust.port !== p.port || value.hostTrust.algorithm !== 'ssh-ed25519' || value.hostTrust.fingerprintSha256 !== value.expectedFingerprint)) throw new Error('HOSTKEY_MISMATCH');
  if (!value.preferences || !Number.isFinite(value.preferences.fontSize) || value.preferences.fontSize < 16 || value.preferences.fontSize > 40 || !Number.isFinite(value.preferences.safeMargin) || value.preferences.safeMargin < 0 || value.preferences.safeMargin > 10) throw new Error('INVALID_PREFERENCES');
  if (JSON.stringify(value).length > MAX_STORE_CHARS) throw new Error('STORE_TOO_LARGE');
  return value;
}
export function verifyHost(store, candidate) {
  if (!store.expectedFingerprint || candidate.algorithm !== 'ssh-ed25519' || candidate.fingerprintSha256 !== store.expectedFingerprint) throw new Error('HOSTKEY_MISMATCH');
  if (store.hostTrust && (store.hostTrust.host !== store.profile.host || store.hostTrust.port !== store.profile.port || store.hostTrust.publicKey !== candidate.publicKey)) throw new Error('HOSTKEY_MISMATCH');
  return {...candidate, host: store.profile.host, port: store.profile.port};
}
export function serializeStore(value) { return JSON.stringify(validateStore(value)); }

export class InputQueue {
  constructor() { this.parts=[]; this.size=0; }
  push(bytes) {
    if (this.size + bytes.length > MAX_INPUT_BYTES) throw new Error('INPUT_OVERFLOW');
    this.parts.push(bytes); this.size += bytes.length;
  }
  head() { return this.parts[0]; }
  consume(n) {
    const first=this.parts[0];
    if (!first || n < 0 || n > first.length) throw new Error('INVALID_INPUT_COUNT');
    this.size-=n;
    if (n===first.length) this.parts.shift(); else this.parts[0]=first.subarray(n);
  }
}
