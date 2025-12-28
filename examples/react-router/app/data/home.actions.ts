import { redirect } from "react-router"
import { Vla } from "vla"
import { sessionStorage } from "../lib/session.server"
import { AppContext } from "./context"
import { PostsService } from "./posts.service"
import { SessionService } from "./session.service"

export class CreatePost extends Vla.Action {
  postsService = this.inject(PostsService)
  appCtx = this.inject(AppContext)

  async handle(content: string) {
    await this.postsService.create(content)
    return redirect("/", {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(this.appCtx.session),
      },
    })
  }
}

export class ListPosts extends Vla.Action {
  postsService = this.inject(PostsService)

  async handle() {
    const posts = await this.postsService.list()
    return posts
  }
}

export class CurrentUser extends Vla.Action {
  session = this.inject(SessionService)

  async handle() {
    const user = await this.session.currentSession()
    return user
  }
}

export class GetSession extends Vla.Action {
  appCtx = this.inject(AppContext)

  async handle() {
    return this.appCtx.session
  }
}
