export type Scope = "singleton" | "invoke" | "transient"

export type InstantiableClass<T> = new () => T
