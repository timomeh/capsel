import { Vla } from "vla"
import { PostsRepo } from "./posts.repo"
import { SessionService } from "./session.service"

export class PostsService extends Vla.Service {
  repo = this.inject(PostsRepo)
  session = this.inject(SessionService)

  async create(content: string) {
    const user = await this.session.findOrCreate()
    await this.repo.create(content, user)
  }

  async list() {
    const posts = await this.repo.findAll()
    return posts
  }
}
