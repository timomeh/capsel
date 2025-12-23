import { getInjectionPoint } from "./dependencies"
import type { InstantiableClass, Scope } from "./types"

type Token<T = unknown> = InstantiableClass<T> & {
  readonly scope?: Scope
}
type Ctor<T = unknown> = InstantiableClass<T> & {
  readonly scope?: Scope
}

type Binding<T = unknown> = {
  impl: Ctor<T>
  scope: Scope
}

let rootKernel: Kernel | null = null

export function setRootKernel(kernel: Kernel) {
  rootKernel = kernel
}

export function getRootKernel() {
  return rootKernel
}

export class Kernel {
  private readonly singletons = new Map<Token, unknown>()
  private readonly invokeCache = new Map<Token, unknown>()
  private readonly bindings = new Map<Token, Binding>()

  private readonly parent?: Kernel
  private readonly root: Kernel

  constructor(opts: { parent?: Kernel } = {}) {
    this.root = opts.parent?.root ?? this
    this.parent = opts.parent
  }

  private fork(): Kernel {
    return new Kernel({ parent: this })
  }

  private getBinding(key: Token): Binding<unknown> | undefined {
    return this.bindings.get(key) ?? this.parent?.getBinding(key)
  }

  bind<T>(key: Token<T>, impl: Ctor<unknown>, scope: Scope = "transient") {
    this.singletons.delete(key)
    this.bindings.set(key, { impl, scope })
  }

  resolve<T>(key: Token<T>, scope?: Scope): T {
    const binding = this.getBinding(key)
    const impl = binding?.impl ?? key
    const requestedScope = binding?.scope ?? scope ?? impl.scope

    if (requestedScope === "singleton") {
      if (this.root.singletons.has(key)) {
        return this.root.singletons.get(key) as T
      }

      const created = this.instantiate(impl)
      this.root.singletons.set(key, created)
      return created as T
    }

    if (requestedScope === "invoke" && !!this.parent) {
      if (this.invokeCache.has(key)) {
        return this.invokeCache.get(key) as T
      }

      const created = this.instantiate(impl)
      this.invokeCache.set(key, created)
      return created as T
    }

    const created = this.instantiate(impl)
    return created as T
  }

  scoped() {
    const forked = this.fork()
    return forked
  }

  setGlobal() {
    setRootKernel(this)
  }

  create<T>(cls: Ctor<T>) {
    const created = this.instantiate(cls)
    return created
  }

  private instantiate<T>(cls: Ctor<T>): T {
    const instance = new cls()
    this.injectInto(instance)
    return instance
  }

  private injectInto<T>(instance: InstanceType<Ctor<T>>): void {
    const obj = instance as unknown as Record<string, unknown>

    Object.entries(obj)
      .map(([key, value]) => {
        const injectionPoint = getInjectionPoint(value)
        if (!injectionPoint) return null

        return [key, injectionPoint] as const
      })
      .filter((entry) => entry !== null)
      .forEach(([key, injectionPoint]) => {
        const dependency = this.resolve(
          injectionPoint.token,
          injectionPoint.scope,
        )

        obj[key] = dependency
      })
  }
}
