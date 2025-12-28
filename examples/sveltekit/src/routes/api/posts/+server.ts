import { json } from "@sveltejs/kit"
import { ApiListPosts } from "$data/home.actions"
import type { RequestHandler } from "./$types"

export const GET: RequestHandler = async () => {
  const result = await ApiListPosts.invoke()
  return json(result)
}
