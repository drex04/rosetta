import '@testing-library/jest-dom'

// jsdom does not implement ResizeObserver; provide a no-op stub for React Flow
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
