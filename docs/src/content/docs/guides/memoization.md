---
title: Memoization
description: Optimize database queries with automatic request-scoped caching
---

Memoization is one of Vla's most powerful features. It automatically prevents duplicate database queries within a request, making your application faster without manual cache management.

## The Problem

In a typical request, the same data is often fetched multiple times:

```ts
async function renderPage(userId: string) {
  const user = await db.users.find({ id: userId })
  const posts = await db.posts.findMany({ authorId: userId })

  // Later in the same request...
  const userAgain = await db.users.find({ id: userId }) // Duplicate query!
  const profile = await buildProfile(userAgain)

  return { user, posts, profile }
}
```

This results in unnecessary database round trips.

## The Solution

Vla's memoization automatically caches method results per request:

```ts
class UserRepo extends Vla.Repo {
  db = this.inject(Database)

  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })
}

// In your service
class UserService extends Vla.Service {
  repo = this.inject(UserRepo)

  async getUser(id: string) {
    // First call: executes the query
    const user = await this.repo.findById(id)

    // Second call: returns cached result
    const userAgain = await this.repo.findById(id)

    // No duplicate query!
    return user
  }
}
```

## Creating Memoized Methods

Use `this.memo()` in your Repo classes:

```ts
class PostRepo extends Vla.Repo {
  db = this.inject(Database)

  // Memoized by post ID
  findById = this.memo((id: string) => {
    return this.db.posts.find({ id })
  })

  // Memoized by author ID
  findByAuthor = this.memo((authorId: string) => {
    return this.db.posts.findMany({ authorId })
  })

  // Multiple parameters work too
  findByTag = this.memo((tag: string, limit: number) => {
    return this.db.posts.findMany({ tag, limit })
  })
}
```

## How It Works

### Request Scoping

Memoization is scoped to the request (invoke scope). When a new request starts:

1. A new scoped kernel is created
2. A fresh memo cache is initialized
3. All memoized methods start with an empty cache

```ts
// Request 1
await GetUser.invoke('1') // Query executes
await GetUser.invoke('1') // Cache hit

// Request 2 (new scope)
await GetUser.invoke('1') // Query executes again (new cache)
```

### Argument-Based Caching

Results are cached based on method arguments:

```ts
class UserRepo extends Vla.Repo {
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })
}

// Different arguments = different cache entries
await repo.findById('1') // Query executes
await repo.findById('2') // Query executes
await repo.findById('1') // Cache hit!
```

### Shared Across Instances

Because Repos use the `invoke` scope, the same instance is shared across your entire request. This means memoization works even when the repo is injected in multiple places:

```ts
class UserService extends Vla.Service {
  repo = this.inject(UserRepo)

  async getProfile(id: string) {
    return this.repo.findById(id) // Query executes
  }
}

class PostService extends Vla.Service {
  userRepo = this.inject(UserRepo) // Same instance!

  async enrichPost(post: Post) {
    // Cache hit! No duplicate query
    const author = await this.userRepo.findById(post.authorId)
    return { ...post, author }
  }
}
```

## Advanced Usage

### Fresh Calls

Sometimes you need to bypass the cache and fetch fresh data:

```ts
class UserService extends Vla.Service {
  repo = this.inject(UserRepo)

  async refreshUser(id: string) {
    // Skip cache and execute query
    return this.repo.findById.fresh(id)
  }
}
```

### Cache Priming

Set cache values without executing the method:

```ts
class UserRepo extends Vla.Repo {
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })

  async create(data: UserData) {
    const user = await this.db.users.create({ data })

    // Prime the cache with the new user
    this.findById.prime(user.id).value(user)

    return user
  }
}

// Later in the request
const user = await repo.findById('new-id') // Cache hit!
```

### Preloading

Start a query in the background to warm the cache:

```ts
class UserService extends Vla.Service {
  repo = this.inject(UserRepo)

  async getUserWithRelations(id: string) {
    // Start loading posts in the background
    this.repo.findPosts.preload(id)

    // Do other work
    const user = await this.repo.findById(id)
    const settings = await this.repo.findSettings(id)

    // Posts are likely cached now
    const posts = await this.repo.findPosts(id)

    return { user, settings, posts }
  }
}
```

### Busting Cache

Invalidate cache entries when data changes:

```ts
class UserRepo extends Vla.Repo {
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })

  async update(id: string, data: UserData) {
    const user = await this.db.users.update({ where: { id }, data })

    // Bust the cache for this user
    this.findById.bust(id)

    // Or bust all cached entries
    // this.findById.bustAll()

    return user
  }
}
```

## Memo API Reference

Each memoized method has these utilities:

```ts
const repo = new UserRepo()

// Call normally (cached)
const user = await repo.findById('1')

// Skip cache and execute fresh
const fresh = await repo.findById.fresh('1')

// Prime the cache
repo.findById.prime('1').value(someUser)

// Preload in background
repo.findById.preload('1')

// Bust cache for specific args
repo.findById.bust('1')

// Bust all cached entries
repo.findById.bustAll()
```

## Best Practices

### Do Memoize

- Database queries
- External API calls
- Expensive computations
- File system reads

### Don't Memoize

- Write operations (create, update, delete)
- Methods with side effects
- Non-deterministic functions

### Example: Good vs Bad

```ts
class UserRepo extends Vla.Repo {
  // ✅ Good: Pure read operation
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })

  // ✅ Good: Expensive computation
  calculateStats = this.memo((userId: string) => {
    return this.db.posts.aggregate({ where: { userId } })
  })

  // ❌ Bad: Write operation (never memoize writes!)
  create = this.memo(async (data: UserData) => {
    return this.db.users.create({ data })
  })

  // ❌ Bad: Non-deterministic
  getRandom = this.memo(() => {
    return Math.random()
  })
}
```

## Performance Impact

Memoization can dramatically reduce database load:

```ts
// Without memoization: 100 queries
for (let i = 0; i < 100; i++) {
  const user = await db.users.find({ id: '1' })
}

// With memoization: 1 query
for (let i = 0; i < 100; i++) {
  const user = await repo.findById('1') // Only first call queries DB
}
```

In real applications, this translates to:

- Faster response times
- Lower database load
- Reduced API costs (for external services)
- Better scalability

## Next Steps

- [Context](/guides/context/) - Access request data in your classes
- [Testing](/guides/testing/) - Mock memoized methods in tests
- [Best Practices](/guides/best-practices/) - When to use memoization
