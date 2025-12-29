import { createContext, createModule } from "./factories"
import {
  Kernel,
  setGlobalInvokeKernel,
  setInvokeKernelProvider,
  withKernel,
} from "./kernel"

export * from "./factories"
export * from "./kernel"
export * from "./types"

export const Vla = {
  ...createModule("Vla"),
  createModule,
  createContext,
  withKernel,
  setGlobalInvokeKernel,
  setInvokeKernelProvider,
  Kernel,
}
