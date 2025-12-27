// biome-ignore lint/suspicious/noExplicitAny: needs ts abstract constructor
type BaseCtor<T = object> = abstract new (...args: any[]) => T

export interface DevStableCapable {
  devStable<T>(key: string, init: () => T): T
}

const VLA_DEV_STABLE_PREFIX = "__vla_dev_stable__"

function isDevStableEnabled() {
  if (process.env.VLA_DEV_STABLE === "1") return true
  return process.env.NODE_ENV !== "production"
}

export function DevStable<TBase extends BaseCtor>(Base: TBase) {
  abstract class DevStableBase extends Base implements DevStableCapable {
    devStable<T>(key: string, init: () => T): T {
      if (!isDevStableEnabled()) {
        return init()
      }

      const g = globalThis as unknown as Record<string, unknown>
      const fullKey = `${VLA_DEV_STABLE_PREFIX}${key}`

      if (!(fullKey in g)) g[fullKey] = init()
      return g[fullKey] as T
    }
  }

  return DevStableBase as unknown as typeof DevStableBase & TBase
}
