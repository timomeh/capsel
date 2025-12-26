import { getInjectionPoint } from "./dependencies"
import type { InstantiableClass, Resolved, Scope, Token } from "./types"

type Ctor<T = unknown> = InstantiableClass<T> & { readonly scope?: Scope }

type Binding<T = unknown> =
  | { kind: "class"; impl: Ctor<unknown>; scope: Scope }
  | { kind: "value"; value: T; scope: Scope }

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

  bind<TKey extends Token>(
    key: TKey,
    impl: Ctor<unknown>,
    scope: Scope = "transient",
  ) {
    this.singletons.delete(key)
    this.bindings.set(key, { kind: "class", impl, scope })
  }

  bindValue<TKey extends Token>(
    key: TKey,
    value: Resolved<TKey>,
    scope: Scope = "singleton",
  ) {
    this.singletons.delete(key)
    this.bindings.set(key, { kind: "value", value, scope })
  }

  resolve<T>(key: Token<T>, scope?: Scope): T {
    const binding = this.getBinding(key)

    // handle value bindings
    if (binding?.kind === "value") {
      const requestedScope = binding?.scope ?? scope ?? "singleton"

      if (requestedScope === "singleton") {
        if (this.root.singletons.has(key)) {
          return this.root.singletons.get(key) as T
        }

        this.root.singletons.set(key, binding.value)
        return binding.value as T
      }

      if (requestedScope === "invoke" && !!this.parent) {
        if (this.invokeCache.has(key)) {
          return this.invokeCache.get(key) as T
        }

        this.invokeCache.set(key, binding.value)
        return binding.value as T
      }

      return binding.value as T
    }

    // handle class bindings
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

  get<T>(key: Token<T>, scope?: Scope): T {
    const dependency = this.resolve(key, scope)

    const binding = this.getBinding(key)
    if (binding?.kind === "value") {
      return dependency
    }

    const unwrapKey = getUnwrapKey(key)
    if (!unwrapKey) {
      return dependency
    }

    if (
      (typeof dependency === "object" && dependency !== null) ||
      typeof dependency === "function"
    ) {
      if (unwrapKey in dependency) {
        return (dependency as Record<PropertyKey, unknown>)[unwrapKey] as T
      }
    }

    return dependency
  }

  scoped() {
    const forked = this.fork()
    return forked
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
        const dependency = this.get(injectionPoint.token, injectionPoint.scope)

        obj[key] = dependency
      })
  }
}

function getUnwrapKey(v: unknown): PropertyKey | undefined {
  if (typeof v !== "function" || v === null) return undefined
  if (!("unwrap" in v)) return undefined
  const k = (v as { unwrap?: unknown }).unwrap
  return typeof k === "string" || typeof k === "number" || typeof k === "symbol"
    ? k
    : undefined
}
