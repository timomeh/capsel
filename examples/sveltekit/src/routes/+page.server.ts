import { CreatePost, ShowHome } from "$data/home.actions"
import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async () => {
  return ShowHome.invoke()
}

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData()
    const content = data.get("content")?.toString() || ""
    await CreatePost.invoke(content)
  },
}
