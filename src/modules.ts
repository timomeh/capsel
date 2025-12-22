import { tokenizedDependency } from "./dependencies"
import type { InstantiableClass, Scope } from "./types"

export const BRAND = Symbol("_capsel_brand")
export const TOKEN = Symbol("_capsel_token")

type Layer = "facade" | "service" | "repo" | "controller" | "other"

type Branded<ModuleName extends string, LayerName extends Layer> = {
  readonly [BRAND]: ClassBrand<ModuleName, LayerName>
}
type Scoped = {
  readonly scope: Scope
}
type ModuleClass<
  ModuleName extends string,
  LayerName extends Layer = Layer,
> = InstantiableClass<unknown> & Branded<ModuleName, LayerName> & Scoped

type LayerOf<T> = T extends ModuleClass<string, infer L> ? L : never
type ForbiddenCrossModuleClass = ModuleClass<string, Exclude<Layer, "facade">>
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

export function createModule<const ModuleName extends string>(
  moduleName: ModuleName,
) {
  function inject<TKey extends ModuleClass<string>>(
    key: AllowedDependency<ModuleName, TKey>,
    scope?: Scope,
  ): InstanceType<TKey> {
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

    const token = tokenizedDependency(key, scope ?? key.scope)
    return token as unknown as InstanceType<TKey>
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
  abstract class Repo extends BaseClass {
    static readonly [BRAND] = new ClassBrand(moduleName, "repo")
    static scope: Scope = "invoke"
  }
  abstract class Controller extends BaseClass {
    static readonly [BRAND] = new ClassBrand(moduleName, "controller")
    static scope: Scope = "transient"
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
    Controller,
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
