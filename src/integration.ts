export const TARGET_PLUGIN_ID = 'obsidian-paste-image-rename';

export type GuardStatus = 'waiting' | 'active' | 'incompatible' | 'conflict';
type Rename = (this: unknown, ...args: unknown[]) => unknown;
interface RenameTarget { startRenameProcess: Rename }
interface Hook {
  target: RenameTarget;
  wrapped: Rename;
  descriptor: PropertyDescriptor | undefined;
  gate: { excludes: ((path: string) => boolean) | null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRenameTarget(value: unknown): value is RenameTarget {
  return isRecord(value) && typeof value.startRenameProcess === 'function';
}

/** Obsidian exposes no public API for finding another plugin. Keep this boundary guarded. */
export function findTarget(app: unknown): unknown {
  if (!isRecord(app) || !isRecord(app.plugins) || !isRecord(app.plugins.plugins)) return undefined;
  return app.plugins.plugins[TARGET_PLUGIN_ID];
}

/** Changes only the dependency's automatic rename entry point, never files or settings. */
export class RenameGuard {
  private hook: Hook | null = null;

  constructor(private readonly excludes: (path: string) => boolean) {}

  connect(target: unknown): GuardStatus {
    if (this.hook && this.hook.target === target) {
      return this.hook.target.startRenameProcess === this.hook.wrapped ? 'active' : 'conflict';
    }
    this.disconnect();
    if (target == null) return 'waiting';
    if (!isRenameTarget(target)) return 'incompatible';

    const original = target.startRenameProcess;
    const descriptor = Object.getOwnPropertyDescriptor(target, 'startRenameProcess');
    // Do not override accessors or non-writable methods on an incompatible dependency.
    if (descriptor && (!('value' in descriptor) || !descriptor.writable)) return 'incompatible';
    const gate: Hook['gate'] = { excludes: this.excludes };
    const wrapped: Rename = function (...args) {
      const file = args[0];
      if (gate.excludes && isRecord(file) && typeof file.path === 'string' && gate.excludes(file.path)) {
        return Promise.resolve();
      }
      // Preserve this, all arguments, the original return value and rejection behavior.
      return original.apply(this, args);
    };
    try {
      Object.defineProperty(target, 'startRenameProcess', descriptor
        ? { ...descriptor, value: wrapped }
        : { configurable: true, enumerable: false, writable: true, value: wrapped });
    } catch {
      return 'incompatible';
    }
    this.hook = { target, wrapped, descriptor, gate };
    return 'active';
  }

  disconnect(): void {
    const hook = this.hook;
    if (!hook) return;
    // If another extension wrapped us, its chain becomes a transparent pass-through.
    // Clearing the predicate also releases the owning plugin from that chain.
    hook.gate.excludes = null;
    this.hook = null;
    if (hook.target.startRenameProcess !== hook.wrapped) return;
    try {
      if (hook.descriptor) Object.defineProperty(hook.target, 'startRenameProcess', hook.descriptor);
      else Reflect.deleteProperty(hook.target, 'startRenameProcess');
    } catch {
      // A third party may have frozen the object. The surviving wrapper is inactive.
    }
  }
}
