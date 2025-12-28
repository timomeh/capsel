import path from "node:path"
import { fileURLToPath } from "node:url"
import Router from "@koa/router"
import Koa from "koa"
import bodyParser from "koa-bodyparser"
import render from "koa-ejs"
import { Vla } from "vla"
import { AppContext } from "./data/context"
import { ApiListPosts, CreatePost, ShowHome } from "./data/home.actions"
import { kernel } from "./data/kernel"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Koa()
const router = new Router()
const port = process.env.PORT || 3000

// View engine setup
render(app, {
  root: path.join(__dirname, "./views"),
  layout: false,
  viewExt: "ejs",
  cache: false,
  debug: false,
})

// Middleware
app.use(bodyParser())
app.use(async (ctx, next) => {
  await Vla.withKernel(kernel.scoped().context(AppContext, { ctx }), next)
})

// Routes
router.get("/", () => ShowHome.invoke())
router.post("/posts", () => CreatePost.invoke())
router.get("/api/posts", () => ApiListPosts.invoke())

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
