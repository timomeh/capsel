import type { Kernel } from "./kernel"

type CurrentKernelFn = () => Kernel
let currentKernelFn: CurrentKernelFn | null = null

export function setCurrentKernelFn(fnKernel: CurrentKernelFn) {
  currentKernelFn = fnKernel
}

export function getCurrentKernelFromFn() {
  return currentKernelFn?.()
}
