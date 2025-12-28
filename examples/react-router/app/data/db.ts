import { randomUUID } from "node:crypto"
import { Vla } from "vla"

export type Post = { id: string; content: string; createdAt: Date; from: User }
export type User = { id: string; name: string }

export class FakeDb extends Vla.Resource {
  private store: { posts: Post[]; users: User[] } = {
    posts: [],
    users: [],
  }

  static readonly unwrap = "db"
  db = {
    posts: () => this.fakePostsDb,
    users: () => this.fakeUsersDb,
  }

  // You would usually just return an instance of your ORM DB here as db.
  // This is just fake for the sake of the demo

  private fakePostsDb = {
    insert: async (post: { content: string; from: User }) => {
      this.store.posts.unshift({
        ...post,
        id: randomUUID(),
        createdAt: new Date(),
      })
    },
    all: async () => {
      return this.store.posts
    },
  }

  private fakeUsersDb = {
    insert: async (user: { id: string; name: string }) => {
      this.store.users.push({
        ...user,
      })
      return user
    },
    findById: async (id: string) => {
      return this.store.users.find((user) => user.id === id)
    },
  }
}
