import crypto from 'crypto';
import log from '../log.js';
import env from '../env.js';

const DEBUG = env.DEBUG;
const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheEntry {
  value: string;
  timestamp: number;
}

class HashStorage {
  private storage: Map<string, CacheEntry>;

  constructor() {
    this.storage = new Map();
    if (DEBUG) log.debug('HashStorage initialized');
    this.startCleanupInterval();
  }

  hash(input: string): string {
    return crypto.createHash('md5').update(input).digest('hex');
  }

  set(key: string, value: string): void {
    const hashedKey = this.hash(key);
    this.storage.set(hashedKey, { value, timestamp: Date.now() });
    if (DEBUG) log.debug(`Hash stored: ${key} (${hashedKey}) -> ${value}`);
  }

  get(key: string): string | undefined {
    const hashedKey = this.hash(key);
    const entry = this.storage.get(hashedKey);
    if (entry && Date.now() - entry.timestamp < CACHE_EXPIRATION_TIME) {
      if (DEBUG) log.debug(`Hash retrieved: ${key} (${hashedKey}) -> ${entry.value}`);
      return entry.value;
    }
    if (entry) {
      this.storage.delete(hashedKey);
      if (DEBUG) log.debug(`Expired hash removed: ${key} (${hashedKey})`);
    }
    return undefined;
  }

  has(key: string): boolean {
    const hashedKey = this.hash(key);
    const entry = this.storage.get(hashedKey);
    const exists = !!entry && (Date.now() - entry.timestamp < CACHE_EXPIRATION_TIME);
    if (DEBUG) log.debug(`Hash existence checked: ${key} (${hashedKey}) -> ${exists}`);
    return exists;
  }

  clear(): void {
    this.storage.clear();
    if (DEBUG) log.debug('HashStorage cleared');
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;
      for (const [key, entry] of this.storage.entries()) {
        if (now - entry.timestamp >= CACHE_EXPIRATION_TIME) {
          this.storage.delete(key);
          expiredCount++;
        }
      }
      if (DEBUG && expiredCount > 0) {
        log.debug(`Cleaned up ${expiredCount} expired entries from HashStorage`);
      }
    }, CACHE_EXPIRATION_TIME);
  }
}

const hashStorage = new HashStorage();

export const saveHash = (key: string, value: string): void => {
  hashStorage.set(key, value);
  if (DEBUG) log.debug(`Hash saved: ${key} -> ${value}`);
};

export const getHashedFile = (key: string): string | undefined => {
  const value = hashStorage.get(key);
  if (DEBUG) log.debug(`Hashed file retrieved: ${key} -> ${value}`);
  return value;
};

if (DEBUG) {
  setInterval(() => {
    log.debug(`Current HashStorage size: ${hashStorage['storage'].size}`);
  }, 60000); // Log the size of the hash storage every minute
}

export default hashStorage;