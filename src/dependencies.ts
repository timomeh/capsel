import type { InstantiableClass, Scope } from "./types"

class UnresolvedDependency<TClass extends InstantiableClass<unknown>> {
  constructor(
    readonly token: TClass,
    readonly scope: Scope,
  ) {}
}

export function tokenizedDependency<
  DefaultClass extends InstantiableClass<unknown>,
>(defaultClass: DefaultClass, scope: Scope) {
  return new UnresolvedDependency(defaultClass, scope)
}

export function getInjectionPoint(v: unknown) {
  if (v instanceof UnresolvedDependency) return v
  return null
}
