import { Kernel } from "./kernel"
import { getAlsKernel } from "./kernel-als"
import { getCurrentKernelFromFn } from "./kernel-current"
import { getGlobalKernel } from "./kernel-global"

export function getInvokeKernel() {
  return (
    getCurrentKernelFromFn() ??
    getAlsKernel() ??
    getGlobalKernel()?.scoped() ??
    new Kernel()
  )
}
