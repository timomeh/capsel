import type { Kernel } from "../kernel/kernel"
import { getInvokeKernel } from "../kernel/scoped-invoke"

export abstract class BaseAction {
  static readonly __vla_layer = "action" as const
  static readonly __vla_module: string = "none"
  static readonly __vla_visibility = "private" as const

  static readonly scope = "transient" as const
  static readonly parentLayers = [] as const

  abstract handle(...args: unknown[]): unknown | Promise<unknown>

  /** Executes the action with the arguments of the handler. */
  static async invoke<
    TAction extends BaseAction,
    TResult = Awaited<ReturnType<TAction["handle"]>>,
  >(
    this: new () => TAction,
    ...args: Parameters<TAction["handle"]>
  ): Promise<TResult> {
    const kernel = await getInvokeKernel()
    // biome-ignore lint/complexity/noThisInStatic: it's fine
    const instance = kernel.create(this)
    return instance.handle(...args) as TResult
  }

  /**
   * Helper to invoke an action with a kernel instance.
   * @example
   * ExampleAction.withKernel(kernel).invoke(...)
   */
  static withKernel<TAction extends BaseAction>(
    this: new () => TAction,
    kernel: Kernel,
  ) {
    // biome-ignore lint/complexity/noThisInStatic: it's fine
    const ActionClass = this
    return {
      /** Executes the action with the arguments of the handler. */
      async invoke<TResult = Awaited<ReturnType<TAction["handle"]>>>(
        ...args: Parameters<TAction["handle"]>
      ): Promise<TResult> {
        const scoped = kernel.scoped()
        const instance = scoped.create(ActionClass)
        return instance.handle(...args) as TResult
      },
    }
  }
}
