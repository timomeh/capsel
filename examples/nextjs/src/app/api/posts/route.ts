import { ListPosts } from "../../../data/home.actions"

export async function GET() {
  const posts = await ListPosts.invoke()
  return Response.json({ data: posts })
}
