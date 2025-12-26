export type Scope = "singleton" | "invoke" | "transient"

export type InstantiableClass<T> = new () => T

export type Token<T = unknown> = InstantiableClass<T> & {
  readonly scope?: Scope
  readonly unwrap?: PropertyKey
}

export type UnwrapKey<TKey> = TKey extends { readonly unwrap: infer K }
  ? K extends PropertyKey
    ? K
    : never
  : never

export type Resolved<TKey extends Token> = [UnwrapKey<TKey>] extends [never]
  ? InstanceType<TKey>
  : UnwrapKey<TKey> extends keyof InstanceType<TKey>
    ? InstanceType<TKey>[UnwrapKey<TKey>]
    : InstanceType<TKey>
