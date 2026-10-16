import { afterEach, vi } from "vitest";

const storage = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return storage.size;
  },
  clear: () => storage.clear(),
  getItem: (key) => storage.get(key) ?? null,
  key: (index) => [...storage.keys()][index] ?? null,
  removeItem: (key) => {
    storage.delete(key);
  },
  setItem: (key, value) => {
    storage.set(key, String(value));
  },
};
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
}

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];
  readonly observed = new Set<Element>();
  constructor(private readonly callback: IntersectionObserverCallback) {
    IntersectionObserverMock.instances.push(this);
  }
  observe(element: Element): void {
    this.observed.add(element);
  }
  unobserve(element: Element): void {
    this.observed.delete(element);
  }
  disconnect(): void {
    this.observed.clear();
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  trigger(element: Element, isIntersecting: boolean): void {
    this.callback(
      [
        {
          target: element,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

if (typeof window !== "undefined") {
  Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    value: IntersectionObserverMock,
  });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Object.defineProperty(Element.prototype, "animate", {
    writable: true,
    value: vi.fn(() => ({ finished: Promise.resolve(), cancel: vi.fn() })),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    writable: true,
    value: vi.fn(() => ({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      }),
      putImageData: vi.fn(),
    })),
  });
}

afterEach(() => {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-alt-theme");
  document.body.innerHTML = "";
  window.localStorage.clear();
  vi.clearAllMocks();
  IntersectionObserverMock.instances.length = 0;
});
export { IntersectionObserverMock };
