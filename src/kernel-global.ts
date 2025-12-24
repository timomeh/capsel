import type { Kernel } from "./kernel"

let globalKernel: Kernel | null = null

export function setGlobalKernel(kernel: Kernel) {
  globalKernel = kernel
}

export function getGlobalKernel() {
  return globalKernel
}
