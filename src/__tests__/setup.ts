import '@testing-library/jest-dom'

// jsdom does not implement ResizeObserver; provide a no-op stub for React Flow
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// jsdom does not implement indexedDB; provide a minimal stub so idb-keyval
// (used by useAutoSave) does not throw during tests.
if (!('indexedDB' in globalThis)) {
  const noop = () => {}
  const fakeRequest = { result: undefined, error: null, onsuccess: noop, onerror: noop }
  globalThis.indexedDB = {
    open: () => {
      const req = {
        ...fakeRequest,
        result: {
          objectStoreNames: { contains: () => false },
          createObjectStore: () => ({}),
          transaction: () => ({
            objectStore: () => ({
              get: () => fakeRequest,
              put: () => fakeRequest,
            }),
            oncomplete: noop,
            onerror: noop,
          }),
        },
        onupgradeneeded: noop,
        onsuccess: noop,
        onerror: noop,
      }
      // Fire onsuccess asynchronously so idb-keyval resolves
      setTimeout(() => { if (typeof req.onsuccess === 'function') req.onsuccess() }, 0)
      return req
    },
  } as unknown as IDBFactory
}
