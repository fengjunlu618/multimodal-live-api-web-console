/**
 * Storage utilities for persistent data
 */

const STORAGE_KEYS = {
  CONFIG: 'app_config',
  FILTER: 'logger_filter',
  VOLUME: 'audio_volume',
} as const;

export const storage = {
  get: (key: keyof typeof STORAGE_KEYS) => {
    try {
      const item = localStorage.getItem(STORAGE_KEYS[key]);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error(`Error reading from storage: ${key}`, e);
      return null;
    }
  },

  set: (key: keyof typeof STORAGE_KEYS, value: any) => {
    try {
      localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing to storage: ${key}`, e);
    }
  },

  remove: (key: keyof typeof STORAGE_KEYS) => {
    try {
      localStorage.removeItem(STORAGE_KEYS[key]);
    } catch (e) {
      console.error(`Error removing from storage: ${key}`, e);
    }
  }
};
