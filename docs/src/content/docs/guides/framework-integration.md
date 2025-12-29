---
title: Framework Integration
description: Integrate Vla with Next.js, SvelteKit, Express, and other frameworks
---

Vla works seamlessly with any server-side JavaScript framework. This guide shows you how to integrate Vla with popular frameworks.

## Next.js App Router

Next.js App Router uses React Server Components. Use React's `cache()` to create a scoped kernel per request.

### Setup

```ts
// src/data/kernel.ts
import { Kernel, Vla } from 'vla'
import { cache } from 'react'
import { cookies } from 'next/headers'

export const kernel = new Kernel()

Vla.setInvokeKernelProvider(
  cache(async () => {
    return kernel.scoped().context(AppContext, {
      cookies: await cookies()
    })
  })
)
```

### Import in Layout

Import the kernel in your root layout to initialize it:

```tsx
// app/layout.tsx
import './data/kernel' // Import to initialize

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### Use in Server Components

```tsx
// app/users/[id]/page.tsx
import { GetUser } from '@/data/users.actions'

export default async function UserPage({
  params
}: {
  params: { id: string }
}) {
  const user = await GetUser.invoke(params.id)

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

### Use in Server Actions

```ts
// app/users/actions.ts
'use server'

import { CreateUser } from '@/data/users.actions'

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string

  const user = await CreateUser.invoke({ name, email })
  return user
}
```

### Use in Route Handlers

```ts
// app/api/users/[id]/route.ts
import { GetUser } from '@/data/users.actions'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await GetUser.invoke(params.id)
  return Response.json(user)
}
```

## SvelteKit

SvelteKit uses hooks for middleware. Set up a scoped kernel in the `handle` hook.

### Setup

```ts
// src/lib/data/kernel.ts
import { Kernel, Vla } from 'vla'

export const kernel = new Kernel()
```

### Handle Hook

```ts
// src/hooks.server.ts
import { Vla } from 'vla'
import type { Handle } from '@sveltejs/kit'
import { kernel } from '$lib/data/kernel'
import { AppContext } from '$lib/data/context'

export const handle: Handle = async ({ event, resolve }) => {
  const scoped = kernel.scoped().context(AppContext, {
    cookies: event.cookies,
    url: event.url
  })

  return Vla.withKernel(scoped, () => resolve(event))
}
```

### Use in Load Functions

```ts
// src/routes/users/[id]/+page.server.ts
import { GetUser } from '$lib/data/users.actions'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const user = await GetUser.invoke(params.id)
  return { user }
}
```

### Use in Form Actions

```ts
// src/routes/users/+page.server.ts
import { CreateUser } from '$lib/data/users.actions'
import type { Actions } from './$types'

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData()
    const name = data.get('name') as string
    const email = data.get('email') as string

    const user = await CreateUser.invoke({ name, email })
    return { success: true, user }
  }
}
```

## Express

Express uses middleware. Create a scoped kernel in middleware.

### Setup

```ts
// src/data/kernel.ts
import { Kernel, Vla } from 'vla'

export const kernel = new Kernel()
```

### Middleware

```ts
// src/middleware/vla.ts
import { Vla } from 'vla'
import { kernel } from '../data/kernel'
import { AppContext } from '../data/context'
import type { Request, Response, NextFunction } from 'express'

export function vlaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const scoped = kernel.scoped().context(AppContext, {
    cookies: req.cookies,
    headers: req.headers,
    ip: req.ip
  })

  Vla.withKernel(scoped, () => next())
}
```

### Use Middleware

```ts
// src/app.ts
import express from 'express'
import { vlaMiddleware } from './middleware/vla'

const app = express()

app.use(express.json())
app.use(vlaMiddleware)

// Your routes here
```

### Use in Routes

```ts
// src/routes/users.ts
import express from 'express'
import { GetUser, CreateUser } from '../data/users.actions'

const router = express.Router()

router.get('/:id', async (req, res) => {
  try {
    const user = await GetUser.invoke(req.params.id)
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' })
  }
})

router.post('/', async (req, res) => {
  try {
    const user = await CreateUser.invoke(req.body)
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' })
  }
})

export default router
```

## Koa

Koa is similar to Express but uses async middleware.

### Setup

```ts
// src/data/kernel.ts
import { Kernel } from 'vla'

export const kernel = new Kernel()
```

### Middleware

```ts
// src/middleware/vla.ts
import { Vla } from 'vla'
import { kernel } from '../data/kernel'
import { AppContext } from '../data/context'
import type { Context, Next } from 'koa'

export async function vlaMiddleware(ctx: Context, next: Next) {
  const scoped = kernel.scoped().context(AppContext, {
    cookies: ctx.cookies,
    headers: ctx.headers,
    ip: ctx.ip
  })

  return Vla.withKernel(scoped, () => next())
}
```

### Use in App

```ts
// src/app.ts
import Koa from 'koa'
import { vlaMiddleware } from './middleware/vla'
import { GetUser } from './data/users.actions'

const app = new Koa()

app.use(vlaMiddleware)

app.use(async (ctx) => {
  if (ctx.path.startsWith('/users/')) {
    const id = ctx.path.split('/')[2]
    const user = await GetUser.invoke(id)
    ctx.body = user
  }
})

app.listen(3000)
```

## TanStack Start

TanStack Start uses Vinxi for server functions.

### Setup

```ts
// app/data/kernel.ts
import { Kernel, Vla } from 'vla'
import { cache } from 'react'
import { getWebRequest } from 'vinxi/http'

export const kernel = new Kernel()

Vla.setInvokeKernelProvider(
  cache(() => {
    const request = getWebRequest()
    return kernel.scoped().context(AppContext, {
      headers: request.headers
    })
  })
)
```

### Use in Routes

```tsx
// app/routes/users.$id.tsx
import { createFileRoute } from '@tanstack/react-router'
import { GetUser } from '../data/users.actions'

export const Route = createFileRoute('/users/$id')({
  loader: async ({ params }) => {
    const user = await GetUser.invoke(params.id)
    return { user }
  },
  component: UserPage
})

function UserPage() {
  const { user } = Route.useLoaderData()
  return <div>{user.name}</div>
}
```

## React Router (Remix)

Remix uses loaders and actions for data fetching.

### Setup

```ts
// app/data/kernel.ts
import { Kernel } from 'vla'

export const kernel = new Kernel()
```

### Root Loader

```ts
// app/root.tsx
import { Vla } from 'vla'
import { kernel } from './data/kernel'
import { AppContext } from './data/context'

export async function loader({ request }: LoaderFunctionArgs) {
  const scoped = kernel.scoped().context(AppContext, {
    headers: request.headers
  })

  return Vla.withKernel(scoped, async () => {
    // Your loader logic
    return {}
  })
}
```

### Use in Route Loaders

```ts
// app/routes/users.$id.tsx
import { GetUser } from '../data/users.actions'
import { Vla } from 'vla'
import { kernel } from '../data/kernel'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const scoped = kernel.scoped().context(AppContext, {
    headers: request.headers
  })

  return Vla.withKernel(scoped, async () => {
    const user = await GetUser.invoke(params.id!)
    return { user }
  })
}
```

## Fastify

Fastify uses decorators and plugins.

### Setup

```ts
// src/data/kernel.ts
import { Kernel } from 'vla'

export const kernel = new Kernel()
```

### Plugin

```ts
// src/plugins/vla.ts
import fp from 'fastify-plugin'
import { Vla } from 'vla'
import { kernel } from '../data/kernel'
import { AppContext } from '../data/context'

export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const scoped = kernel.scoped().context(AppContext, {
      headers: request.headers,
      ip: request.ip
    })

    request.vla = scoped
  })
})

declare module 'fastify' {
  interface FastifyRequest {
    vla: Kernel
  }
}
```

### Use in Routes

```ts
// src/routes/users.ts
import { GetUser } from '../data/users.actions'
import { Vla } from 'vla'

export default async function (fastify: FastifyInstance) {
  fastify.get('/:id', async (request) => {
    const { id } = request.params as { id: string }

    return Vla.withKernel(request.vla, async () => {
      return GetUser.invoke(id)
    })
  })
}
```

## Hono

Hono is a lightweight web framework.

### Setup

```ts
// src/data/kernel.ts
import { Kernel } from 'vla'

export const kernel = new Kernel()
```

### Middleware

```ts
// src/middleware/vla.ts
import { Vla } from 'vla'
import { kernel } from '../data/kernel'
import { AppContext } from '../data/context'
import type { MiddlewareHandler } from 'hono'

export const vlaMiddleware: MiddlewareHandler = async (c, next) => {
  const scoped = kernel.scoped().context(AppContext, {
    headers: c.req.header()
  })

  return Vla.withKernel(scoped, () => next())
}
```

### Use in App

```ts
// src/app.ts
import { Hono } from 'hono'
import { vlaMiddleware } from './middleware/vla'
import { GetUser } from './data/users.actions'

const app = new Hono()

app.use('*', vlaMiddleware)

app.get('/users/:id', async (c) => {
  const id = c.req.param('id')
  const user = await GetUser.invoke(id)
  return c.json(user)
})

export default app
```

## Common Patterns

### AsyncLocalStorage (Alternative)

For frameworks that don't support per-request scoping easily, use AsyncLocalStorage:

```ts
// src/data/kernel.ts
import { Kernel, Vla } from 'vla'

export const kernel = new Kernel()

export async function withRequestKernel<T>(
  context: any,
  fn: () => Promise<T>
): Promise<T> {
  const scoped = kernel.scoped().context(AppContext, context)
  return Vla.withKernel(scoped, fn)
}
```

### Error Handling

Wrap Vla calls in try-catch for proper error handling:

```ts
app.get('/users/:id', async (req, res) => {
  try {
    const user = await GetUser.invoke(req.params.id)
    res.json(user)
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: 'User not found' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})
```

### Logging and Tracing

Add logging middleware:

```ts
export const handle: Handle = async ({ event, resolve }) => {
  const requestId = crypto.randomUUID()

  const scoped = kernel.scoped().context(TraceContext, {
    requestId,
    startTime: Date.now()
  })

  return Vla.withKernel(scoped, async () => {
    const response = await resolve(event)
    console.log({
      requestId,
      duration: Date.now() - Date.now(),
      path: event.url.pathname
    })
    return response
  })
}
```

## Next Steps

- [Context](/guides/context/) - Deep dive into request context
- [Testing](/guides/testing/) - Test framework integrations
- [Best Practices](/guides/best-practices/) - Production-ready patterns
