import { index, type RouteConfig, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("api/posts", "routes/api.posts.ts"),
] satisfies RouteConfig
