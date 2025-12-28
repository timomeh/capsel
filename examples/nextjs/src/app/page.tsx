import { revalidatePath } from "next/cache"
import Form from "next/form"
import { CreatePost, CurrentUser, ListPosts } from "../data/home.actions"

export default function Home() {
  return (
    <div>
      <h1>Posts</h1>
      <CreatePostForm />
      <hr />
      <PostList />
    </div>
  )
}

async function PostList() {
  const posts = await ListPosts.invoke()

  if (posts.length === 0) return <h2>No posts yet</h2>

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>
          <small>From {post.from.name}</small>
          <p>{post.content}</p>
          <small>
            {post.createdAt.toISOString()} • ID: {post.id}
          </small>
        </article>
      ))}
    </div>
  )
}

async function CreatePostForm() {
  const user = await CurrentUser.invoke()

  return (
    <Form
      action={async (formData: FormData) => {
        "use server"

        const content = formData.get("content")?.toString() || ""
        await CreatePost.invoke(content)
        revalidatePath("/")
      }}
    >
      <textarea name="content" placeholder="What's on your mind?" required />
      <br />
      <button type="submit">Submit</button>
      {" • "}
      <small>Post as: {user ? user.name : "(new user)"}</small>
    </Form>
  )
}
