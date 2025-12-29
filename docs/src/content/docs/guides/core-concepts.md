---
title: Core Concepts
description: Understanding Vla's architecture - modules, classes, dependency injection, and scopes
---

Vla provides a structured approach to organizing your backend code. This guide covers the fundamental concepts you need to understand to use Vla effectively.

## The Five Base Classes

Vla provides five semantic base classes that represent different layers of your application:

### Action

**Scope:** `transient` (new instance per invocation)

Actions are entry points to your data layer. They're invoked from your framework's route handlers, server actions, or API endpoints.

```ts
class CreatePost extends Vla.Action {
  posts = this.inject(PostService)

  async handle(title: string, content: string) {
    return this.posts.create({ title, content })
  }
}

// Invoke from your framework
const post = await CreatePost.invoke('Hello', 'World')
```

**When to use:** Entry points for user requests, server actions, or API handlers.

### Service

**Scope:** `invoke` (shared within a request)

Services contain your business logic. They orchestrate between repositories, other services, and facades.

```ts
class PostService extends Vla.Service {
  repo = this.inject(PostRepo)
  session = this.inject(SessionService)

  async create(data: PostData) {
    const currentUser = await this.session.currentUser()

    if (!currentUser.canPost) {
      throw new Error('Unauthorized')
    }

    return this.repo.create({
      ...data,
      authorId: currentUser.id
    })
  }
}
```

**When to use:** Business logic, validation, authorization, orchestration.

### Repo

**Scope:** `invoke` (shared within a request)

Repositories handle data access and external adapters. They're the only layer that should communicate with databases, APIs, or other external services.

```ts
class PostRepo extends Vla.Repo {
  db = this.inject(Database)

  findById = this.memo((id: string) => {
    return this.db.posts.find({ id })
  })

  async create(data: PostData) {
    return this.db.posts.create({ data })
  }
}
```

**When to use:** Database queries, external API calls, file system access.

### Facade

**Scope:** `transient` (new instance per usage)

Facades provide a public API for cross-module access. When one module needs to use functionality from another module, it should inject a Facade, not a Service or Repo.

```ts
// In the Users module
class UserFacade extends Users.Facade {
  service = this.inject(UserService)

  async getUser(id: string) {
    return this.service.getById(id)
  }
}

// In the Posts module
class PostService extends Posts.Service {
  users = this.inject(UserFacade) // Cross-module access

  async createPost(userId: string, data: PostData) {
    const user = await this.users.getUser(userId)
    // ...
  }
}
```

**When to use:** Public interface for cross-module dependencies.

### Resource

**Scope:** `singleton` (single instance forever)

Resources are long-lived infrastructure clients like database pools, cache connections, or configuration objects.

```ts
class Database extends Vla.Resource {
  static readonly unwrap = 'db'

  db = new PrismaClient()

  async disconnect() {
    await this.db.$disconnect()
  }
}

class UserRepo extends Vla.Repo {
  // Thanks to unwrap, this injects the 'db' property
  db = this.inject(Database)

  async findAll() {
    return this.db.user.findMany()
  }
}
```

**When to use:** Database connections, cache clients, configuration singletons.

## Dependency Injection

Vla's dependency injection is simple and type-safe. Use `this.inject()` to inject dependencies:

```ts
class UserService extends Vla.Service {
  repo = this.inject(UserRepo)
  cache = this.inject(CacheService)
  logger = this.inject(Logger)

  async getUser(id: string) {
    // Use injected dependencies
    const cached = await this.cache.get(`user:${id}`)
    if (cached) return cached

    const user = await this.repo.findById(id)
    await this.cache.set(`user:${id}`, user)

    this.logger.info('User fetched', { id })
    return user
  }
}
```

### No Decorators, No Reflection

Unlike many DI frameworks, Vla doesn't require decorators or reflection. Dependencies are defined as class properties with `this.inject()`.

## Scopes

Scopes determine how long instances are cached and shared. Understanding scopes is crucial for proper state management.

### Transient

**New instance every time**

Transient dependencies are never cached. Each injection creates a fresh instance.

```ts
class Analytics extends Vla.Service {
  static scope = Analytics.ScopeTransient

  track(event: string) {
    // Each instance is independent
  }
}
```

**Default for:** Action, Facade

### Invoke

**Shared within a request**

Invoke-scoped dependencies are created once per request and reused within that request.

```ts
class UserRepo extends Vla.Repo {
  static scope = UserRepo.ScopeInvoke // default for Repo

  // This instance is shared across all services
  // in the same request
}
```

**Default for:** Service, Repo

### Singleton

**Single instance forever**

Singleton dependencies are created once and reused forever.

```ts
class Logger extends Vla.Service {
  static scope = Logger.ScopeSingleton

  log(message: string) {
    console.log(message)
  }
}
```

**Default for:** Resource

### Overriding Scopes

You can override the scope when injecting:

```ts
class MyService extends Vla.Service {
  // Use a fresh Logger instance just for this service
  logger = this.inject(Logger, 'transient')
}
```

## Modules

For smaller apps, you can use `Vla.Action`, `Vla.Service`, etc. directly. As your app grows, modules help organize code by domain.

### Creating Modules

```ts
const Users = Vla.createModule('Users')
const Posts = Vla.createModule('Posts')
const Billing = Vla.createModule('Billing')
```

### Using Module Classes

```ts
class UserService extends Users.Service {
  // Services can inject other classes from the same module
  repo = this.inject(UserRepo)
}

class UserRepo extends Users.Repo {
  // ...
}

class UserFacade extends Users.Facade {
  // Facades expose public APIs
  service = this.inject(UserService)

  async getUser(id: string) {
    return this.service.getById(id)
  }
}
```

### Cross-Module Access

Vla enforces clean boundaries between modules. You can only inject:

- Classes from the same module
- Facades from other modules
- Resources (global infrastructure)

```ts
class PostService extends Posts.Service {
  // ✅ OK: Injecting a Facade from another module
  users = this.inject(UserFacade)

  // ❌ Error: Cannot inject Service/Repo from another module
  userService = this.inject(UserService) // Throws error!
}
```

This prevents messy dependencies and keeps your architecture clean.

### When to Use Modules

**Use modules when:**
- Your app has distinct domains (Users, Posts, Billing, etc.)
- You want to enforce boundaries between domains
- Your codebase has multiple teams or areas of responsibility

**Skip modules when:**
- Building a small app with simple data access
- All your code is tightly related
- You prefer a flat structure

## The Kernel

The Kernel is Vla's dependency injection container. It manages instance creation, caching, and scoping.

### Global Kernel

For simple apps or APIs without request context:

```ts
import { Kernel, Vla } from 'vla'

const kernel = new Kernel()
Vla.setGlobalInvokeKernel(kernel)

// Now you can invoke actions
await MyAction.invoke()
```

### Scoped Kernel

For request-scoped apps (recommended):

```ts
import { Kernel, Vla } from 'vla'
import { cache } from 'react'

const kernel = new Kernel()

Vla.setInvokeKernelProvider(
  cache(() => kernel.scoped())
)
```

Each request gets its own scoped kernel, ensuring proper isolation.

## Next Steps

- [Memoization](/guides/memoization/) - Learn about automatic query caching
- [Context](/guides/context/) - Access request context in your classes
- [Testing](/guides/testing/) - Write testable code
- [Best Practices](/guides/best-practices/) - File structure and architecture tips
