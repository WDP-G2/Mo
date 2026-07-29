import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@wdp/activity-log/';

function storageKey(userKey) {
  return `${STORAGE_PREFIX}${String(userKey || 'guest')}`;
}

export const activityStorage = {
  async load(userKey) {
    const raw = await AsyncStorage.getItem(storageKey(userKey));
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
    } catch {
      return [];
    }
  },

  save(userKey, items) {
    return AsyncStorage.setItem(
      storageKey(userKey),
      JSON.stringify((Array.isArray(items) ? items : []).slice(0, 30)),
    );
  },
};
