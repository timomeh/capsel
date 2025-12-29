---
title: Context
description: Access request-scoped data like cookies, headers, and user sessions
---

Context allows you to inject request-scoped data (like cookies, headers, or user sessions) into your Vla classes. This is essential for building applications that need to access request-specific information.

## The Problem

Your services and repos often need access to request-specific data:

```ts
class UserService extends Vla.Service {
  async getCurrentUser() {
    // How do we access the current request's cookies?
    // How do we know which user is logged in?
  }
}
```

Passing this data through every method call becomes unwieldy:

```ts
// ❌ Not ideal
async function handler(req: Request) {
  const user = await userService.getCurrentUser(req.cookies)
  const posts = await postService.getPosts(req.cookies)
  // ...
}
```

## The Solution

Vla's context system provides request-scoped dependency injection:

```ts
// 1. Define your context type
const RequestContext = Vla.createContext<{
  cookies: Record<string, string>
  headers: Headers
}>()

// 2. Inject it in your classes
class SessionService extends Vla.Service {
  ctx = this.inject(RequestContext)

  async currentUser() {
    const userId = this.ctx.cookies['user_id']
    return this.findUser(userId)
  }
}

// 3. Provide the context when creating a scoped kernel
const scoped = kernel.scoped().context(RequestContext, {
  cookies: req.cookies,
  headers: req.headers
})
```

## Creating Context

Define a context with `Vla.createContext()`:

```ts
// Simple context
const AppContext = Vla.createContext<{
  cookies: Record<string, string>
}>()

// Multiple contexts for different concerns
const RequestContext = Vla.createContext<{
  headers: Headers
  ip: string
}>()

const AuthContext = Vla.createContext<{
  userId: string | null
  isAuthenticated: boolean
}>()
```

## Using Context in Classes

Inject context like any other dependency:

```ts
class UserService extends Vla.Service {
  ctx = this.inject(RequestContext)
  auth = this.inject(AuthContext)

  async getCurrentUser() {
    if (!this.auth.isAuthenticated) {
      throw new Error('Not authenticated')
    }

    const userId = this.auth.userId
    return this.findUserById(userId)
  }

  async logRequest() {
    console.log('Request from:', this.ctx.ip)
    console.log('User-Agent:', this.ctx.headers.get('user-agent'))
  }
}
```

## Providing Context

### With Scoped Kernels

The most common approach is to provide context when creating a scoped kernel:

```ts
import { Kernel, Vla } from 'vla'

const kernel = new Kernel()

// In your request handler
app.use((req, res, next) => {
  const scoped = kernel
    .scoped()
    .context(RequestContext, {
      cookies: req.cookies,
      headers: req.headers
    })

  Vla.withKernel(scoped, () => next())
})
```

### Multiple Contexts

You can provide multiple contexts:

```ts
const scoped = kernel
  .scoped()
  .context(RequestContext, {
    headers: req.headers,
    ip: req.ip
  })
  .context(AuthContext, {
    userId: session.userId,
    isAuthenticated: session.isAuthenticated
  })
```

### Async Context Values

Context values can be promises:

```ts
import { cookies } from 'next/headers'

const scoped = kernel.scoped().context(AppContext, {
  // Next.js cookies() returns a promise in some versions
  cookies: cookies()
})
```

Vla will automatically await the promise when you access it.

## Framework Integration

### Next.js App Router

Use React's `cache()` to create a scoped kernel per request:

```ts
// src/data/kernel.ts
import { Kernel, Vla } from 'vla'
import { cache } from 'react'
import { cookies } from 'next/headers'

const kernel = new Kernel()

Vla.setInvokeKernelProvider(
  cache(async () => {
    return kernel.scoped().context(AppContext, {
      cookies: await cookies()
    })
  })
)
```

### SvelteKit

Use the `handle` hook to provide context:

```ts
// src/hooks.server.ts
import { Vla } from 'vla'
import type { Handle } from '@sveltejs/kit'
import { kernel } from './lib/data/kernel'

export const handle: Handle = async ({ event, resolve }) => {
  const scoped = kernel.scoped().context(RequestContext, {
    cookies: event.cookies,
    headers: event.request.headers
  })

  return Vla.withKernel(scoped, () => resolve(event))
}
```

### Express

Use middleware to provide context:

```ts
import express from 'express'
import { Vla } from 'vla'
import { kernel } from './data/kernel'

const app = express()

app.use((req, res, next) => {
  const scoped = kernel.scoped().context(RequestContext, {
    cookies: req.cookies,
    headers: req.headers,
    ip: req.ip
  })

  Vla.withKernel(scoped, () => next())
})
```

## Common Patterns

### Session Management

Create a session service that uses context:

```ts
const AppContext = Vla.createContext<{
  cookies: Record<string, string>
}>()

class SessionService extends Vla.Service {
  ctx = this.inject(AppContext)
  userRepo = this.inject(UserRepo)

  async currentUser() {
    const userId = this.ctx.cookies['session_id']
    if (!userId) return null

    return this.userRepo.findById(userId)
  }

  async requireAuth() {
    const user = await this.currentUser()
    if (!user) throw new Error('Authentication required')
    return user
  }
}

// Use in other services
class PostService extends Vla.Service {
  session = this.inject(SessionService)
  repo = this.inject(PostRepo)

  async createPost(data: PostData) {
    const user = await this.session.requireAuth()
    return this.repo.create({
      ...data,
      authorId: user.id
    })
  }
}
```

### Feature Flags

Use context to provide feature flag information:

```ts
const FeatureContext = Vla.createContext<{
  flags: Record<string, boolean>
}>()

class FeatureService extends Vla.Service {
  ctx = this.inject(FeatureContext)

  isEnabled(flag: string): boolean {
    return this.ctx.flags[flag] ?? false
  }
}

class PostService extends Vla.Service {
  features = this.inject(FeatureService)

  async createPost(data: PostData) {
    if (this.features.isEnabled('rich-text')) {
      // Handle rich text posts
    } else {
      // Handle plain text posts
    }
  }
}
```

### Request Tracing

Use context for request IDs and tracing:

```ts
const TraceContext = Vla.createContext<{
  requestId: string
  startTime: number
}>()

class Logger extends Vla.Service {
  ctx = this.inject(TraceContext)

  log(message: string, data?: any) {
    console.log({
      requestId: this.ctx.requestId,
      duration: Date.now() - this.ctx.startTime,
      message,
      ...data
    })
  }
}
```

## Context vs. Direct Kernel Bindings

You can also bind values directly to the kernel:

```ts
// Using context (recommended)
const scoped = kernel.scoped().context(AppContext, {
  cookies: req.cookies
})

// Using bindValue (alternative)
const scoped = kernel.scoped()
scoped.bindValue(AppContext, {
  cookies: req.cookies
})
```

Both approaches work, but `.context()` is more concise and clearer in intent.

## Testing with Context

Provide mock context in your tests:

```ts
import { test, expect } from 'vitest'
import { Kernel } from 'vla'

test('requires authentication', async () => {
  const kernel = new Kernel()
  kernel.context(AppContext, {
    cookies: { session_id: 'test-user-id' }
  })

  const service = kernel.create(PostService)
  await expect(service.createPost(data)).resolves.toBeTruthy()
})

test('throws when not authenticated', async () => {
  const kernel = new Kernel()
  kernel.context(AppContext, {
    cookies: {} // No session
  })

  const service = kernel.create(PostService)
  await expect(service.createPost(data)).rejects.toThrow()
})
```

## Best Practices

### Do Use Context For

- Request headers and cookies
- User session information
- Request-specific configuration
- Feature flags per request
- Request tracing and logging metadata

### Don't Use Context For

- Large objects (keep it lean)
- Computed values (use services instead)
- Database connections (use Resources)
- Application configuration (use Resources)

### Keep Context Types Simple

```ts
// ✅ Good: Simple, focused context
const AuthContext = Vla.createContext<{
  userId: string | null
}>()

// ❌ Bad: Too much responsibility
const AppContext = Vla.createContext<{
  userId: string
  userPermissions: string[]
  featureFlags: Record<string, boolean>
  config: AppConfig
  logger: Logger
}>()
```

Instead, split into multiple contexts or use services.

## Next Steps

- [Framework Integration](/guides/framework-integration/) - Deep dive into framework-specific patterns
- [Testing](/guides/testing/) - Mock context in tests
- [Best Practices](/guides/best-practices/) - Architecture patterns
