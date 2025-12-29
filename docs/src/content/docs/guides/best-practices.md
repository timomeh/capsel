---
title: Best Practices
description: File structure, architecture patterns, and production tips
---

This guide covers best practices for structuring your Vla application, organizing code, and building production-ready systems.

## File Structure

### Organizing by Module

For larger apps using modules, organize by domain:

```
src/
├── data/
│   ├── kernel.ts
│   ├── context.ts
│   ├── users/
│   │   ├── users.actions.ts
│   │   ├── users.service.ts
│   │   ├── users.repo.ts
│   │   └── users.facade.ts
│   ├── posts/
│   │   ├── posts.actions.ts
│   │   ├── posts.service.ts
│   │   ├── posts.repo.ts
│   │   └── posts.facade.ts
│   └── billing/
│       ├── billing.actions.ts
│       ├── billing.service.ts
│       └── billing.facade.ts
```

### Organizing by Layer

For smaller apps without modules, organize by layer:

```
src/
├── data/
│   ├── kernel.ts
│   ├── actions/
│   │   ├── users.actions.ts
│   │   └── posts.actions.ts
│   ├── services/
│   │   ├── users.service.ts
│   │   └── posts.service.ts
│   └── repos/
│       ├── users.repo.ts
│       └── posts.repo.ts
```

### Flat Structure

For very small apps, keep it flat:

```
src/
├── data/
│   ├── kernel.ts
│   ├── users.ts
│   ├── posts.ts
│   └── database.ts
```

### Common Files

Regardless of structure, these files are common:

```
src/
├── data/
│   ├── kernel.ts        # Kernel setup
│   ├── context.ts       # Context definitions
│   ├── resources.ts     # Database, cache, etc.
│   └── ...              # Your modules/layers
```

## When to Use Modules

### Use Modules When

- Your app has distinct domains (Users, Posts, Billing, Analytics)
- You want to enforce boundaries between domains
- Multiple teams work on different areas
- You need to prevent deep dependencies

```ts
// With modules: enforced boundaries
const Users = Vla.createModule('Users')
const Posts = Vla.createModule('Posts')

class PostService extends Posts.Service {
  // ✅ OK: Use facade from another module
  users = this.inject(UserFacade)

  // ❌ Error: Cannot inject service from another module
  userService = this.inject(UserService)
}
```

### Skip Modules When

- Building a small app
- All code is tightly related
- You prefer a simpler, flat structure
- You're just getting started

```ts
// Without modules: simpler for small apps
class PostService extends Vla.Service {
  users = this.inject(UserService) // OK in single-module apps
}
```

## Architecture Patterns

### The Action Layer

Actions are entry points. Keep them thin:

```ts
// ✅ Good: Thin action, delegates to service
class CreatePost extends Vla.Action {
  posts = this.inject(PostService)

  async handle(data: PostData) {
    return this.posts.create(data)
  }
}

// ❌ Bad: Business logic in action
class CreatePost extends Vla.Action {
  repo = this.inject(PostRepo)

  async handle(data: PostData) {
    // Too much logic here!
    if (!data.title) throw new Error('Title required')
    if (data.title.length > 200) throw new Error('Title too long')

    const post = await this.repo.create(data)
    await this.sendNotification(post)
    return post
  }
}
```

### The Service Layer

Services contain business logic:

```ts
// ✅ Good: Business logic in service
class PostService extends Vla.Service {
  repo = this.inject(PostRepo)
  notifications = this.inject(NotificationService)
  session = this.inject(SessionService)

  async create(data: PostData) {
    // Validation
    if (!data.title) throw new Error('Title required')
    if (data.title.length > 200) throw new Error('Title too long')

    // Authorization
    const user = await this.session.requireAuth()

    // Business logic
    const post = await this.repo.create({
      ...data,
      authorId: user.id,
      createdAt: new Date()
    })

    // Side effects
    await this.notifications.notifyFollowers(user.id, post)

    return post
  }
}
```

### The Repository Layer

Repositories handle data access only:

```ts
// ✅ Good: Pure data access
class PostRepo extends Vla.Repo {
  db = this.inject(Database)

  findById = this.memo((id: string) => {
    return this.db.posts.find({ id })
  })

  async create(data: PostData) {
    return this.db.posts.create({ data })
  }
}

// ❌ Bad: Business logic in repo
class PostRepo extends Vla.Repo {
  db = this.inject(Database)
  notifications = this.inject(NotificationService)

  async create(data: PostData) {
    const post = await this.db.posts.create({ data })

    // Business logic doesn't belong here!
    await this.notifications.send(post.authorId)

    return post
  }
}
```

### Using Facades

Facades are the public API for modules:

```ts
// users/users.facade.ts
class UserFacade extends Users.Facade {
  service = this.inject(UserService)

  // Only expose what other modules need
  async getUser(id: string) {
    return this.service.findById(id)
  }

  async validatePermission(userId: string, permission: string) {
    return this.service.hasPermission(userId, permission)
  }
}

// posts/posts.service.ts
class PostService extends Posts.Service {
  users = this.inject(UserFacade)

  async createPost(userId: string, data: PostData) {
    // Use facade for cross-module access
    const canPost = await this.users.validatePermission(userId, 'post:create')

    if (!canPost) {
      throw new Error('Permission denied')
    }

    // ...
  }
}
```

## Dependency Injection Patterns

### Constructor vs Property Injection

Vla uses property injection. Don't use constructors for DI:

```ts
// ✅ Good: Property injection
class UserService extends Vla.Service {
  repo = this.inject(UserRepo)
  cache = this.inject(CacheService)
}

// ❌ Bad: Constructor injection (not supported)
class UserService extends Vla.Service {
  constructor(
    private repo: UserRepo,
    private cache: CacheService
  ) {
    super()
  }
}
```

### Optional Dependencies

Some dependencies might not always be available:

```ts
class AnalyticsService extends Vla.Service {
  private analytics = this.inject(AnalyticsProvider, 'transient')

  track(event: string) {
    try {
      this.analytics.track(event)
    } catch (error) {
      // Analytics is optional, don't fail
      console.warn('Analytics unavailable')
    }
  }
}
```

### Circular Dependencies

Avoid circular dependencies:

```ts
// ❌ Bad: Circular dependency
class UserService extends Vla.Service {
  posts = this.inject(PostService)
}

class PostService extends Vla.Service {
  users = this.inject(UserService) // Circular!
}

// ✅ Good: Use facades or extract shared logic
class PostService extends Vla.Service {
  users = this.inject(UserFacade) // Facade breaks the cycle
}
```

## Performance Patterns

### Memoization Strategy

Memoize read operations, not writes:

```ts
class UserRepo extends Vla.Repo {
  db = this.inject(Database)

  // ✅ Memoize reads
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })

  findByEmail = this.memo((email: string) => {
    return this.db.users.find({ email })
  })

  // ❌ Don't memoize writes
  async create(data: UserData) {
    return this.db.users.create({ data })
  }
}
```

### Cache Priming

Prime the cache after writes:

```ts
class UserRepo extends Vla.Repo {
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })

  async create(data: UserData) {
    const user = await this.db.users.create({ data })

    // Prime cache for future reads
    this.findById.prime(user.id).value(user)

    return user
  }

  async update(id: string, data: Partial<UserData>) {
    const user = await this.db.users.update({ where: { id }, data })

    // Bust old cache
    this.findById.bust(id)
    // Or prime with new value
    this.findById.prime(id).value(user)

    return user
  }
}
```

### Preloading

Preload related data:

```ts
class PostService extends Vla.Service {
  repo = this.inject(PostRepo)
  userRepo = this.inject(UserRepo)

  async getPostWithAuthor(postId: string) {
    const post = await this.repo.findById(postId)

    // Start loading author in background
    this.userRepo.findById.preload(post.authorId)

    // Do other work
    const comments = await this.repo.findComments(postId)

    // Author is likely cached now
    const author = await this.userRepo.findById(post.authorId)

    return { post, author, comments }
  }
}
```

## Error Handling

### Custom Error Classes

Define domain-specific errors:

```ts
// errors.ts
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

// users.service.ts
class UserService extends Vla.Service {
  async getUser(id: string) {
    const user = await this.repo.findById(id)

    if (!user) {
      throw new NotFoundError('User', id)
    }

    return user
  }
}
```

### Error Handling in Actions

Handle errors at the action layer:

```ts
class GetUser extends Vla.Action {
  service = this.inject(UserService)

  async handle(id: string) {
    try {
      return await this.service.getUser(id)
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new Response('User not found', { status: 404 })
      }

      if (error instanceof UnauthorizedError) {
        throw new Response('Unauthorized', { status: 401 })
      }

      // Log unexpected errors
      console.error('Unexpected error:', error)
      throw new Response('Internal server error', { status: 500 })
    }
  }
}
```

## Resource Management

### Database Connections

Use Resources for database pools:

```ts
class Database extends Vla.Resource {
  static readonly unwrap = 'db'

  db = new PrismaClient()

  async disconnect() {
    await this.db.$disconnect()
  }
}

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  const db = kernel.resolve(Database)
  await db.disconnect()
})
```

### Caching

Use Resources for cache connections:

```ts
class Redis extends Vla.Resource {
  static readonly unwrap = 'client'

  client = new RedisClient()

  async disconnect() {
    await this.client.quit()
  }
}
```

## Testing Patterns

### Test Fixtures

Create reusable test fixtures:

```ts
// test/fixtures/kernel.ts
export function createTestKernel() {
  const kernel = new Kernel().scoped()

  // Mock external dependencies
  kernel.bind(Database, MockDatabase)
  kernel.bind(EmailService, MockEmailService)

  // Provide test context
  kernel.context(AppContext, {
    userId: 'test-user',
    cookies: {}
  })

  return kernel
}

// In tests
test('example', async () => {
  const kernel = createTestKernel()
  const service = kernel.create(UserService)
  // ...
})
```

### Test at the Right Level

```ts
// ✅ Good: Test services with mocked repos
test('user service creates user', async () => {
  const kernel = new Kernel()
  kernel.bind(UserRepo, MockUserRepo)

  const service = kernel.create(UserService)
  const user = await service.create(data)

  expect(user.email).toBe(data.email)
})

// ❌ Bad: Testing implementation details
test('service injects repo', () => {
  const service = kernel.create(UserService)
  expect(service.repo).toBeInstanceOf(UserRepo)
})
```

## Production Considerations

### Environment Configuration

Use Resources for configuration:

```ts
class Config extends Vla.Resource {
  static readonly unwrap = 'config'

  config = {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    apiKey: process.env.API_KEY
  }
}
```

### Logging

Create a logging service:

```ts
class Logger extends Vla.Service {
  static scope = Logger.ScopeSingleton

  ctx = this.inject(TraceContext)

  info(message: string, data?: any) {
    console.log({
      level: 'info',
      requestId: this.ctx.requestId,
      message,
      ...data
    })
  }

  error(message: string, error: Error, data?: any) {
    console.error({
      level: 'error',
      requestId: this.ctx.requestId,
      message,
      error: error.message,
      stack: error.stack,
      ...data
    })
  }
}
```

### Monitoring

Track performance:

```ts
class MetricsService extends Vla.Service {
  static scope = MetricsService.ScopeSingleton

  track(metric: string, value: number) {
    // Send to your metrics service
  }
}

class PostService extends Vla.Service {
  metrics = this.inject(MetricsService)

  async create(data: PostData) {
    const start = Date.now()

    try {
      const post = await this.repo.create(data)
      this.metrics.track('post.create.success', Date.now() - start)
      return post
    } catch (error) {
      this.metrics.track('post.create.error', Date.now() - start)
      throw error
    }
  }
}
```

## Dos and Don'ts

### Do

- Keep actions thin
- Put business logic in services
- Use facades for cross-module access
- Memoize read operations in repos
- Test with mocked dependencies
- Use scoped kernels per request
- Handle errors at the action layer

### Don't

- Put business logic in repos or actions
- Inject services/repos across module boundaries
- Memoize write operations
- Use constructors for dependency injection
- Share kernels across requests
- Test Vla's DI system (test your logic)
- Create circular dependencies

## Next Steps

- [API Reference](/reference/kernel/) - Complete API documentation
- [Examples](https://github.com/timomeh/vla/tree/main/examples) - Real-world examples
