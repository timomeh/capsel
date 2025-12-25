import { tokenizedDependency } from "./dependencies"
import type { Kernel } from "./kernel"
import { getInvokeKernel } from "./kernel-invoke"
import { Memoizable } from "./memo"
import type { InstantiableClass, Scope } from "./types"

export const BRAND = Symbol("_vla_brand")
export const TOKEN = Symbol("_vla_token")

type Layer = "facade" | "service" | "repo" | "action" | "resource" | "other"

type Branded<ModuleName extends string, LayerName extends Layer> = {
  readonly [BRAND]: ClassBrand<ModuleName, LayerName>
}
type Scoped = {
  readonly scope: Scope
}
type ModuleClass<
  ModuleName extends string,
  LayerName extends Layer = Layer,
> = InstantiableClass<unknown> &
  Branded<ModuleName, LayerName> &
  Scoped & {
    readonly unwrap?: PropertyKey
  }

type LayerOf<T> = T extends ModuleClass<string, infer L> ? L : never
type ForbiddenCrossModuleClass = ModuleClass<
  string,
  Exclude<Layer, "facade" | "resource">
>
type AllowedDependency<
  ModuleName extends string,
  Key,
> = Key extends ModuleClass<ModuleName, Layer>
  ? Key
  : Key extends ForbiddenCrossModuleClass
    ? `Cross-module ${Capitalize<LayerOf<Key>>} injection is not allowed. Use a Facade.`
    : Key

class ClassBrand<ModuleName extends string, LayerName extends Layer> {
  constructor(
    readonly moduleName: ModuleName,
    readonly layerName: LayerName,
  ) {}
}

type UnwrapKey<TKey> = TKey extends { readonly unwrap: infer K }
  ? K extends PropertyKey
    ? K
    : never
  : never

// biome-ignore lint/suspicious/noExplicitAny: needs for ts
type Injected<TKey extends abstract new (...args: any[]) => any> = [
  UnwrapKey<TKey>,
] extends [never]
  ? InstanceType<TKey>
  : UnwrapKey<TKey> extends keyof InstanceType<TKey>
    ? InstanceType<TKey>[UnwrapKey<TKey>]
    : InstanceType<TKey>

export function createModule<const ModuleName extends string>(
  moduleName: ModuleName,
) {
  function inject<TKey extends ModuleClass<string>>(
    key: AllowedDependency<ModuleName, TKey>,
    scope?: Scope,
  ): Injected<TKey> {
    if (
      key[BRAND].moduleName !== moduleName &&
      key[BRAND].layerName !== "facade"
    ) {
      throw new Error(
        `Cross-module ${key[BRAND].layerName} dependency is not allowed.` +
          ` Use a Facade.` +
          ` (Tried to inject a ${key[BRAND].layerName} from ${key[BRAND].moduleName} into ${moduleName})`,
      )
    }

    const unwrap = getUnwrapKey(key)
    const token = tokenizedDependency(key, scope ?? key.scope, unwrap)
    return token as unknown as Injected<TKey>
  }

  // biome-ignore-start lint/complexity/noStaticOnlyClass: abstract classes
  abstract class BaseClass {
    static InvokeScope: Scope = "invoke"
    static TransientScope: Scope = "transient"
    static SingletonScope: Scope = "singleton"
    inject = inject.bind(this)
  }
  abstract class Facade extends BaseClass {
    static readonly [BRAND] = new ClassBrand(moduleName, "facade")
    static scope: Scope = "transient"
  }
  abstract class Service extends BaseClass {
    static readonly [BRAND] = new ClassBrand(moduleName, "service")
    static scope: Scope = "invoke"
  }
  abstract class Repo extends Memoizable(BaseClass) {
    static readonly [BRAND] = new ClassBrand(moduleName, "repo")
    static scope: Scope = "invoke"
  }
  abstract class Action extends BaseClass {
    static readonly [BRAND] = new ClassBrand(moduleName, "action")
    static scope: Scope = "transient"

    abstract handle(...args: unknown[]): unknown | Promise<unknown>

    static invoke<
      TAction extends Action,
      TResult = ReturnType<TAction["handle"]>,
    >(
      this: new () => TAction,
      ...args: Parameters<TAction["handle"]>
    ): TResult {
      const kernel = getInvokeKernel()
      // biome-ignore lint/complexity/noThisInStatic: it's fine
      const instance = kernel.create(this)
      return instance.handle(...args) as TResult
    }

    static withKernel<TAction extends Action>(
      this: new () => TAction,
      kernel: Kernel,
    ) {
      // biome-ignore lint/complexity/noThisInStatic: it's fine
      const ActionClass = this
      return {
        invoke<TResult = ReturnType<TAction["handle"]>>(
          ...args: Parameters<TAction["handle"]>
        ): TResult {
          const scoped = kernel.scoped()
          const instance = scoped.create(ActionClass)
          return instance.handle(...args) as TResult
        },
      }
    }
  }
  abstract class Resource extends BaseClass {
    static readonly [BRAND] = new ClassBrand(moduleName, "resource")
    static scope: Scope = "singleton"
  }
  abstract class Singleton extends BaseClass {
    static readonly [BRAND] = new ClassBrand(moduleName, "other")
    static scope: Scope = "singleton"
  }
  abstract class Class extends BaseClass {
    static readonly [BRAND] = new ClassBrand(moduleName, "other")
    static scope: Scope = "transient"
  }
  // biome-ignore-end lint/complexity/noStaticOnlyClass: abstract classes

  return {
    Facade,
    Service,
    Repo,
    Action,
    Resource,
    Singleton,
    Class,
  }
}

function isObject(v: unknown): v is Record<PropertyKey, unknown> {
  return (typeof v === "object" || typeof v === "function") && v !== null
}

type Class = abstract new (...args: readonly unknown[]) => unknown
export function isClass(v: unknown): v is { constructor: Class } {
  return (
    isObject(v) && "constructor" in v && typeof v.constructor === "function"
  )
}

function getUnwrapKey(v: unknown): PropertyKey | undefined {
  if (typeof v !== "function" || v === null) return undefined
  if (!("unwrap" in v)) return undefined
  const k = (v as { unwrap?: unknown }).unwrap
  return typeof k === "string" || typeof k === "number" || typeof k === "symbol"
    ? k
    : undefined
}
