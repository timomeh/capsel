import { Vla } from "vla"
import { PostsService } from "./posts.service"
import { SessionService } from "./session.service"

export class CreatePost extends Vla.Action {
  postsService = this.inject(PostsService)

  async handle(content: string) {
    await this.postsService.create(content)
  }
}

export class ShowHome extends Vla.Action {
  postsService = this.inject(PostsService)
  session = this.inject(SessionService)

  async handle() {
    const posts = await this.postsService.list()
    const user = await this.session.currentSession()

    return { posts, user }
  }
}

export class ApiListPosts extends Vla.Action {
  postsService = this.inject(PostsService)

  async handle() {
    const posts = await this.postsService.list()
    return { data: posts }
  }
}
