import type { RequestEvent } from "@sveltejs/kit"
import { Vla } from "vla"

export const AppContext = Vla.createContext<{
  event: RequestEvent
}>()
