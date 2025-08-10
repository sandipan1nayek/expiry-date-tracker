/**
 * Simple UUID generator for offline-only app
 * Using Math.random() for simplicity in offline-only context
 */

export const generateUUID = (): string => {
  // Simple random UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const generateShortId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};
