import type { InstantiableClass, Scope } from "./types"

class UnresolvedDependency<TClass extends InstantiableClass<unknown>> {
  constructor(
    readonly token: TClass,
    readonly scope: Scope,
    readonly unwrap?: PropertyKey,
  ) {}
}

export function tokenizedDependency<
  DefaultClass extends InstantiableClass<unknown>,
>(defaultClass: DefaultClass, scope: Scope, unwrap?: PropertyKey) {
  return new UnresolvedDependency(defaultClass, scope, unwrap)
}

export function getInjectionPoint(v: unknown) {
  if (v instanceof UnresolvedDependency) return v
  return null
}
