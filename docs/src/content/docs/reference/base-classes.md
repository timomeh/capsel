---
title: Base Classes
description: API reference for Action, Service, Repo, Facade, and Resource classes
---

Vla provides five base classes that represent different layers of your application. Each class has a specific purpose and default scope.

## Action

Entry points for your data layer. Actions are invoked from your framework's route handlers or API endpoints.

### Properties

```ts
static readonly scope = 'transient'
abstract handle(...args: unknown[]): unknown | Promise<unknown>
```

### Methods

#### invoke()

```ts
static async invoke<TResult>(
  ...args: Parameters<handle>
): Promise<TResult>
```

Executes the action's `handle` method with the provided arguments.

**Example:**

```ts
class GetUser extends Vla.Action {
  repo = this.inject(UserRepo)

  async handle(userId: string) {
    return this.repo.findById(userId)
  }
}

// Invoke the action
const user = await GetUser.invoke('123')
```

#### withKernel()

```ts
static withKernel(kernel: Kernel): {
  invoke<TResult>(...args: Parameters<handle>): Promise<TResult>
}
```

Creates an action invoker with a specific kernel.

**Example:**

```ts
const kernel = new Kernel()
kernel.bind(UserRepo, MockUserRepo)

const user = await GetUser.withKernel(kernel).invoke('123')
```

### Usage

```ts
class CreatePost extends Vla.Action {
  posts = this.inject(PostService)
  session = this.inject(SessionService)

  async handle(data: PostData) {
    const user = await this.session.requireAuth()
    return this.posts.create(user.id, data)
  }
}

// In your framework
const post = await CreatePost.invoke(postData)
```

### Characteristics

- **Scope:** `transient` (new instance per invocation)
- **Purpose:** Entry points, request handlers
- **Can inject:** Services, Repos, Facades, Resources, Contexts
- **Best practices:** Keep thin, delegate to services

---

## Service

Contains business logic. Services orchestrate between repositories, other services, and facades.

### Properties

```ts
static readonly scope = 'invoke'
```

### Methods

Services inherit the `inject()` method from the Injectable mixin.

### Usage

```ts
class UserService extends Vla.Service {
  repo = this.inject(UserRepo)
  billing = this.inject(BillingFacade)
  session = this.inject(SessionService)

  async getProfile(userId: string) {
    // Authorization
    const currentUser = await this.session.currentUser()
    if (currentUser.id !== userId) {
      throw new UnauthorizedError()
    }

    // Data fetching
    const user = await this.repo.findById(userId)
    const subscription = await this.billing.getSubscription(userId)

    return {
      ...user,
      hasSubscription: !!subscription
    }
  }
}
```

### Characteristics

- **Scope:** `invoke` (shared within a request)
- **Purpose:** Business logic, validation, authorization
- **Can inject:** Other services (same module), Repos, Facades, Resources, Contexts
- **Best practices:** Keep business logic here, not in repos or actions

---

## Repo

Handles data access and external adapters. The only layer that should communicate with databases or external services.

### Properties

```ts
static readonly scope = 'invoke'
```

### Methods

Repos inherit both `inject()` and `memo()` methods.

#### memo()

```ts
memo<Args extends unknown[], R>(
  fn: (...args: Args) => R
): Memoized<Args, R>
```

Creates a memoized method that caches results per request.

**Example:**

```ts
class UserRepo extends Vla.Repo {
  db = this.inject(Database)

  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })
}
```

See [Memoization API](/reference/memoization/) for details.

### Usage

```ts
class PostRepo extends Vla.Repo {
  db = this.inject(Database)

  // Memoized queries
  findById = this.memo((id: string) => {
    return this.db.posts.find({ id })
  })

  findByAuthor = this.memo((authorId: string) => {
    return this.db.posts.findMany({ authorId })
  })

  // Write operations (not memoized)
  async create(data: PostData) {
    const post = await this.db.posts.create({ data })

    // Prime the cache
    this.findById.prime(post.id).value(post)

    return post
  }

  async update(id: string, data: Partial<PostData>) {
    const post = await this.db.posts.update({ where: { id }, data })

    // Bust the cache
    this.findById.bust(id)

    return post
  }
}
```

### Characteristics

- **Scope:** `invoke` (shared within a request)
- **Purpose:** Data access, external API calls
- **Can inject:** Resources, Contexts
- **Best practices:** Memoize reads, not writes; no business logic

---

## Facade

Provides a public API for cross-module access. When one module needs functionality from another module, it should use a Facade.

### Properties

```ts
static readonly scope = 'transient'
```

### Methods

Facades inherit the `inject()` method.

### Usage

```ts
// users/users.facade.ts
const Users = Vla.createModule('Users')

class UserFacade extends Users.Facade {
  service = this.inject(UserService)

  async getUser(id: string) {
    return this.service.findById(id)
  }

  async hasPermission(userId: string, permission: string) {
    return this.service.checkPermission(userId, permission)
  }
}

// posts/posts.service.ts
const Posts = Vla.createModule('Posts')

class PostService extends Posts.Service {
  users = this.inject(UserFacade) // Cross-module access

  async createPost(userId: string, data: PostData) {
    const canPost = await this.users.hasPermission(userId, 'post:create')

    if (!canPost) {
      throw new Error('Permission denied')
    }

    // Create post...
  }
}
```

### Characteristics

- **Scope:** `transient` (new instance per usage)
- **Purpose:** Public interface for modules
- **Can inject:** Services, Repos (same module), other Facades, Resources, Contexts
- **Best practices:** Only expose what other modules need

---

## Resource

Long-lived infrastructure clients like database pools, cache connections, or configuration objects.

### Properties

```ts
static readonly scope = 'singleton'
static readonly unwrap?: PropertyKey
```

### Special Property: unwrap

The `unwrap` static property allows injectors to receive a specific property instead of the entire Resource instance.

**Example:**

```ts
class Database extends Vla.Resource {
  static readonly unwrap = 'client'

  client = new PrismaClient()

  async disconnect() {
    await this.client.$disconnect()
  }
}

class UserRepo extends Vla.Repo {
  // Injects the 'client' property directly, not the Database instance
  db = this.inject(Database)

  async findAll() {
    return this.db.user.findMany() // this.db is PrismaClient
  }
}
```

### Usage

```ts
class Redis extends Vla.Resource {
  static readonly unwrap = 'client'

  client = createClient({
    url: process.env.REDIS_URL
  })

  async connect() {
    await this.client.connect()
  }

  async disconnect() {
    await this.client.quit()
  }
}

class CacheService extends Vla.Service {
  redis = this.inject(Redis) // Gets the client, not the Resource

  async get(key: string) {
    return this.redis.get(key)
  }

  async set(key: string, value: string) {
    await this.redis.set(key, value)
  }
}
```

### Characteristics

- **Scope:** `singleton` (single instance forever)
- **Purpose:** Database connections, cache clients, configuration
- **Can inject:** Other Resources, Contexts
- **Best practices:** Use for expensive-to-create resources; implement cleanup methods

---

## Scope Constants

All base classes expose scope constants:

```ts
class MyService extends Vla.Service {
  static readonly scope = MyService.ScopeInvoke
  // or
  static readonly scope = MyService.ScopeSingleton
  // or
  static readonly scope = MyService.ScopeTransient
}
```

Available constants:
- `ScopeSingleton` - `'singleton'`
- `ScopeInvoke` - `'invoke'`
- `ScopeTransient` - `'transient'`

## Dependency Injection

All base classes have access to the `inject()` method:

```ts
class MyService extends Vla.Service {
  // Inject with default scope
  repo = this.inject(UserRepo)

  // Inject with custom scope
  logger = this.inject(Logger, 'transient')

  // Inject context
  ctx = this.inject(AppContext)
}
```

## Module vs Vla Base Classes

```ts
// Using Vla base classes (no module)
class UserService extends Vla.Service {
  // Can inject anything
}

// Using module base classes
const Users = Vla.createModule('Users')

class UserService extends Users.Service {
  // Can only inject same-module classes, facades, and resources
}
```

Modules enforce stricter boundaries but Vla base classes are simpler for small apps.

## Related APIs

- [Kernel](/reference/kernel/) - Dependency injection container
- [Vla](/reference/vla/) - Main namespace
- [Memoization](/reference/memoization/) - Repo memoization API
