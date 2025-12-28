import { Vla } from "vla"
import { FakeDb, type User } from "./db"

export class PostsRepo extends Vla.Repo {
  db = this.inject(FakeDb)

  async create(content: string, user: User) {
    await this.db.posts().insert({ content, from: user })
  }

  async findAll() {
    const posts = await this.db.posts().all()
    return posts
  }
}
