import { tokenizedDependency } from "../lib/tokenizeDeps"
import type { Layer, ModuleClass, Resolved, Scope, UserSurface } from "../types"

type AllowedDependency<
  ModuleName extends string,
  ParentLayer extends Layer,
  Key,
> = Key extends ModuleClass<string, infer TargetLayer>
  ? Key extends { readonly parentLayers: readonly Layer[] }
    ? Key extends ModuleClass<ModuleName, Layer>
      ? ParentLayer extends Key["parentLayers"][number]
        ? Key // Same module, parent layer allowed
        : `A ${Capitalize<ParentLayer>} is not allowed to inject a ${Capitalize<TargetLayer>}. Allowed parent layer: ${Key["parentLayers"][number] extends Layer ? Capitalize<Key["parentLayers"][number]> : never}`
      : Key extends { readonly __vla_visibility: "global" | "public" }
        ? Key // Cross-module with global/public visibility - allowed for all layers
        : `Cross-module ${Capitalize<TargetLayer>} dependency is not allowed. Use a Facade or Resource.`
    : never
  : Key

// biome-ignore lint/suspicious/noExplicitAny: needs ts abstract constructor
type BaseCtor<T = object> = abstract new (...args: any[]) => T

type ClassBase = {
  readonly __vla_module: string
  readonly __vla_layer: Layer
  readonly __vla_visibility: "private" | "module" | "global"
  readonly parentLayers: readonly Layer[]
}

// Extract layer from base class type
type LayerOfClass<T> = T extends { readonly __vla_layer: infer L extends Layer }
  ? L
  : never

export interface InjectCapable<
  ModuleName extends string,
  ParentLayer extends Layer,
> {
  inject<TKey extends ModuleClass<string>>(
    key: AllowedDependency<ModuleName, ParentLayer, TKey>,
    scope?: Scope,
  ): UserSurface<Resolved<TKey>>
}

export function createInjectable<ModuleName extends string>() {
  return function Injectable<TBase extends BaseCtor>(Base: TBase) {
    type ParentLayer = LayerOfClass<TBase>

    abstract class InjectableBase
      extends Base
      implements InjectCapable<ModuleName, ParentLayer>
    {
      inject<TKey extends ModuleClass<string>>(
        key: AllowedDependency<ModuleName, ParentLayer, TKey>,
        scope?: Scope,
      ): UserSurface<Resolved<TKey>> {
        const parentClass = this.constructor as typeof Base & ClassBase
        const parentModule = parentClass.__vla_module
        const parentLayer = parentClass.__vla_layer

        const targetKey = key as TKey
        const targetModule = targetKey.__vla_module
        const targetLayer = targetKey.__vla_layer
        const targetParentLayers = targetKey.parentLayers

        if (!targetParentLayers.includes(parentLayer)) {
          throw new Error(
            `Layer ${parentLayer} is not allowed to inject ${targetLayer}.` +
              ` Allowed parent layers for ${targetLayer}: ${targetParentLayers.join(", ")}`,
          )
        }

        // Check cross-module injection rules
        if (targetModule !== parentModule) {
          const targetVisibility = targetKey.__vla_visibility

          if (targetVisibility === "private" || targetVisibility === "module") {
            throw new Error(
              `Cross-module ${targetLayer} dependency is not allowed.` +
                ` Use a Facade or Resource.` +
                ` (Tried to inject a ${targetLayer} from ${targetModule} into ${parentModule})`,
            )
          }
        }

        const token = tokenizedDependency(targetKey, scope ?? targetKey.scope)
        return token as unknown as UserSurface<Resolved<TKey>>
      }
    }

    return InjectableBase as unknown as typeof InjectableBase & TBase
  }
}
