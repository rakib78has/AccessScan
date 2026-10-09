/**
 * An in-memory stand-in for one chrome.storage area. Values are cloned on the
 * way in and out, as Chrome serializes them, so tests catch accidental reliance
 * on object identity.
 */

type Listener = (changes: Record<string, chrome.storage.StorageChange>) => void;

export interface FakeStorageArea {
  get(keys: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string): Promise<void>;
  onChanged: {
    addListener(listener: Listener): void;
    removeListener(listener: Listener): void;
  };
  /** Direct access for assertions. */
  data: Map<string, unknown>;
  listenerCount(): number;
}

export function createFakeStorageArea(): FakeStorageArea {
  const data = new Map<string, unknown>();
  const listeners = new Set<Listener>();
  const notify = (changes: Record<string, chrome.storage.StorageChange>) => {
    for (const listener of listeners) listener(changes);
  };

  return {
    data,
    get(key) {
      return Promise.resolve(data.has(key) ? { [key]: structuredClone(data.get(key)) } : {});
    },
    set(items) {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const [key, value] of Object.entries(items)) {
        changes[key] = { oldValue: data.get(key), newValue: structuredClone(value) };
        data.set(key, structuredClone(value));
      }
      notify(changes);
      return Promise.resolve();
    },
    remove(key) {
      if (data.has(key)) {
        const oldValue = data.get(key);
        data.delete(key);
        notify({ [key]: { oldValue } });
      }
      return Promise.resolve();
    },
    onChanged: {
      addListener: (listener) => listeners.add(listener),
      removeListener: (listener) => listeners.delete(listener),
    },
    listenerCount: () => listeners.size,
  };
}

/** The fake satisfies the slice of StorageArea that SiteCheck uses. */
export function asStorageArea(fake: FakeStorageArea): chrome.storage.StorageArea {
  return fake as unknown as chrome.storage.StorageArea;
}
