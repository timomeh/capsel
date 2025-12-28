import type { Session } from "react-router"
import { Vla } from "vla"

export const AppContext = Vla.createContext<{
  request: Request
  session: Session
}>()
