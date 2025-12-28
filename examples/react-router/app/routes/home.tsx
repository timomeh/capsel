import { Form, useLoaderData } from "react-router"
import { Vla } from "vla"
import { AppContext } from "../data/context"
import { CreatePost, CurrentUser, ListPosts } from "../data/home.actions"
import { kernel } from "../data/kernel"
import { getSession } from "../lib/session.server"
import type { Route } from "./+types/home"

const vlaMiddleware: Route.MiddlewareFunction = async ({ request }, next) => {
  const session = await getSession(request)

  const scopedKernel = kernel.scoped().context(AppContext, {
    request,
    session,
  })

  return Vla.withKernel(scopedKernel, next)
}

export const middleware: Route.MiddlewareFunction[] = [vlaMiddleware]

export function meta() {
  return [
    { title: "React Router + Vla Example" },
    { name: "description", content: "React Router + Vla Example" },
  ]
}

export async function loader() {
  const [posts, user] = await Promise.all([
    ListPosts.invoke(),
    CurrentUser.invoke(),
  ])

  return {
    posts,
    user,
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const content = formData.get("content")?.toString() || ""

  return CreatePost.invoke(content)
}

export default function Home() {
  const { posts, user } = useLoaderData<typeof loader>()

  return (
    <div>
      <small className="example-label">React Router Example</small>
      <h1>Posts</h1>

      <Form method="POST">
        <textarea
          name="content"
          placeholder="What's on your mind?"
          required
          // quick and dirty force clear after submit
          key={Date.now()}
        />
        <br />
        <button type="submit">Submit</button>
        {" • "}
        <small>Post as: {user ? user.name : "(new user)"}</small>
      </Form>

      <hr />

      {posts.length === 0 ? (
        <h2 className="no-posts">No posts yet</h2>
      ) : (
        <div>
          {posts.map((post) => (
            <article key={post.id}>
              <small>From {post.from.name}</small>
              <p>{post.content}</p>
              <small>
                {new Date(post.createdAt).toISOString()} • ID: {post.id}
              </small>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
