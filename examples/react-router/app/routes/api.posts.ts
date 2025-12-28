import { ListPosts } from "../data/home.actions"
import { kernel } from "../data/kernel"

export async function loader() {
  const posts = await ListPosts.withKernel(kernel).invoke()

  return Response.json({ data: posts })
}
