import { randomUUID } from "node:crypto"
import { Vla } from "vla"
import { AppContext } from "./context"
import { FakeDb } from "./db"

export class SessionService extends Vla.Service {
  db = this.inject(FakeDb)
  appCtx = this.inject(AppContext)

  async currentSession() {
    const sessionId = this.appCtx.session.get("userId")
    if (!sessionId) return null
    const user = await this.db.users().findById(sessionId)
    return user || null
  }

  async findOrCreate() {
    const user = await this.currentSession()
    if (user) return user

    const id = randomUUID()
    this.appCtx.session.set("userId", id)
    const newUser = await this.db.users().insert({ name: randomName(), id })

    return newUser
  }
}

function randomName() {
  const adjs = ["curious", "green", "smart", "sneaky", "happy", "nice"]
  const nouns = ["camper", "fellow", "adventurer", "pal", "pudding"]

  const adj = adjs[Math.floor(Math.random() * adjs.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]

  return `${adj}-${noun}`
}
