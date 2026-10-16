import type { SectionVisitOptions } from "./types.js";
import type { ThemeManager } from "./theme-manager.js";
import { elementFrom } from "./utils.js";

interface VisitRecord {
  options: SectionVisitOptions;
  element: HTMLElement;
  observer?: IntersectionObserver;
  originalTheme: string | null;
  entered: boolean;
  completed: boolean;
}

interface PendingVisit {
  options: SectionVisitOptions;
  cancelled: boolean;
  attached?: HTMLElement;
}

/** Independent IntersectionObserver-powered section themes. Nesting follows normal CSS-variable inheritance. */
export class SectionThemeManager {
  private readonly records = new Map<HTMLElement, VisitRecord>();
  private readonly pending = new Set<PendingVisit>();
  private mutation: MutationObserver | undefined;
  private destroyed = false;
  constructor(private readonly manager: ThemeManager) {}
  observe(options: SectionVisitOptions): () => void {
    if (this.destroyed)
      throw new Error("SectionThemeManager has been destroyed.");
    if (options.enabled === false) return () => undefined;
    const registration: PendingVisit = { options, cancelled: false };
    this.pending.add(registration);
    const element = this.resolve(options.element);
    if (element) {
      registration.attached = element;
      this.attach(element, options);
    }
    if (typeof MutationObserver !== "undefined") this.ensureMutationObserver();
    return () => {
      registration.cancelled = true;
      this.pending.delete(registration);
      if (registration.attached) this.detach(registration.attached);
      this.stopMutationWhenIdle();
    };
  }
  destroy(): void {
    this.destroyed = true;
    for (const record of this.records.values()) record.observer?.disconnect();
    this.mutation?.disconnect();
    this.records.clear();
    this.pending.clear();
  }
  private resolve(value: HTMLElement | string): HTMLElement | null {
    return typeof document === "undefined" ? null : elementFrom(value);
  }
  private attach(element: HTMLElement, options: SectionVisitOptions): void {
    if (!this.manager.getTheme(options.theme))
      throw new Error(`Unknown theme "${options.theme}" for changeOnVisit.`);
    this.detach(element);
    const record: VisitRecord = {
      options,
      element,
      originalTheme: element.getAttribute(this.manager.attribute),
      entered: false,
      completed: false,
    };
    this.records.set(element, record);
    if (typeof IntersectionObserver === "undefined") {
      if (options.initial !== false) void this.enter(record);
      return;
    }
    record.observer = this.createObserver(options);
    record.observer.observe(element);
  }
  private createObserver(options: SectionVisitOptions): IntersectionObserver {
    return new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const record = this.records.get(entry.target as HTMLElement);
          if (!record) continue;
          if (entry.isIntersecting) void this.enter(record);
          else void this.exit(record);
        }
      },
      {
        threshold: options.threshold ?? 0.25,
        rootMargin: options.rootMargin ?? "0px",
      },
    );
  }
  private async enter(record: VisitRecord): Promise<void> {
    if (record.completed && record.options.once) return;
    if (record.entered) return;
    record.entered = true;
    record.options.onEnter?.(record.element);
    await this.manager.transitionTo(record.options.theme, {
      ...record.options.transition,
      target: record.element,
    });
    record.completed = true;
    record.options.onThemeChange?.(record.options.theme, record.element);
  }
  private async exit(record: VisitRecord): Promise<void> {
    if (!record.entered) return;
    record.entered = false;
    record.options.onExit?.(record.element);
    if (!record.options.reverseOnExit) return;
    if (
      record.options.restoreOriginal &&
      record.originalTheme &&
      this.manager.getTheme(record.originalTheme)
    ) {
      await this.manager.transitionTo(record.originalTheme, {
        ...record.options.transition,
        target: record.element,
      });
    } else if (record.options.restoreOriginal && !record.originalTheme) {
      this.manager.clearThemeFrom(record.element);
    }
  }
  private detach(element: HTMLElement): void {
    const record = this.records.get(element);
    record?.observer?.unobserve(element);
    record?.observer?.disconnect();
    this.records.delete(element);
  }
  private ensureMutationObserver(): void {
    if (this.mutation || typeof document === "undefined") return;
    this.mutation = new MutationObserver(() => {
      for (const registration of this.pending) {
        if (registration.cancelled) continue;
        if (registration.attached && !registration.attached.isConnected) {
          this.detach(registration.attached);
          delete registration.attached;
        }
        if (!registration.attached) {
          const target = this.resolve(registration.options.element);
          if (target) {
            registration.attached = target;
            this.attach(target, registration.options);
          }
        }
      }
      this.stopMutationWhenIdle();
    });
    this.mutation.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
  private stopMutationWhenIdle(): void {
    if (this.pending.size > 0) return;
    this.mutation?.disconnect();
    this.mutation = undefined;
  }
}

export function changeOnVisit(
  manager: ThemeManager,
  options: SectionVisitOptions,
): () => void {
  const sections = new SectionThemeManager(manager);
  const stop = sections.observe(options);
  return () => {
    stop();
    sections.destroy();
  };
}
