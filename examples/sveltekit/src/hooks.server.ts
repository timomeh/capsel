import type { Handle } from "@sveltejs/kit"
import { Vla } from "vla"
import { AppContext } from "./data/context"
import { kernel } from "./data/kernel"

export const handle: Handle = async ({ event, resolve }) => {
  return Vla.withKernel(kernel.scoped().context(AppContext, { event }), () =>
    resolve(event),
  )
}
