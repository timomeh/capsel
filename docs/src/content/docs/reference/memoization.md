---
title: Memoization API
description: Complete API reference for the memo method and memoized functions
---

The memoization API provides automatic request-scoped caching for repository methods.

## memo()

```ts
memo<Args extends unknown[], R>(
  fn: (...args: Args) => R
): Memoized<Args, R>
```

Creates a memoized version of a function. Available in Repo classes.

**Parameters:**
- `fn` - The function to memoize

**Returns:** A memoized function with additional utility methods

**Example:**

```ts
class UserRepo extends Vla.Repo {
  db = this.inject(Database)

  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })
}
```

## Memoized Function

A memoized function behaves like the original function but with caching and additional methods.

### Calling the Function

```ts
// Call normally - uses cache if available
const user = await repo.findById('123')

// Subsequent calls with same args return cached value
const sameUser = await repo.findById('123') // Cache hit
```

### Type Signature

```ts
type Memoized<Args extends unknown[], R> = {
  (...args: Args): R
  memoized: (...args: Args) => R
  fresh: (...args: Args) => R
  prime: (...args: Args) => { value: (value: R) => void }
  preload: (...args: Args) => R
  bust: (...args: Args) => void
  bustAll: () => void
}
```

## Methods

### memoized()

```ts
memoized(...args: Args): R
```

An alias for calling the function directly. Identical behavior to calling the function.

**Example:**

```ts
// These are equivalent
const user1 = await repo.findById('123')
const user2 = await repo.findById.memoized('123')
```

---

### fresh()

```ts
fresh(...args: Args): R
```

Executes the function bypassing the cache. Always executes the original function.

**Returns:** The result of the function execution

**Example:**

```ts
// First call: cached
const user = await repo.findById('123')

// Update in database...
await updateUserInDatabase('123', { name: 'New Name' })

// Bypass cache to get fresh data
const freshUser = await repo.findById.fresh('123')
```

**Use cases:**
- Forcing a refresh after external data changes
- Debugging cache issues
- Getting the latest data when cache might be stale

---

### prime()

```ts
prime(...args: Args): { value: (value: R) => void }
```

Sets a value in the cache without executing the function.

**Parameters:**
- `args` - The arguments to use as cache key

**Returns:** An object with a `value` method to set the cached value

**Example:**

```ts
class UserRepo extends Vla.Repo {
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })

  async create(data: UserData) {
    const user = await this.db.users.create({ data })

    // Prime cache with the new user
    this.findById.prime(user.id).value(user)

    return user
  }
}
```

**Use cases:**
- Caching data after write operations
- Pre-populating cache with known values
- Optimistic updates

**Promise handling:**
If you prime with a promise that rejects, the cache entry is automatically removed.

```ts
// If the promise rejects, cache is cleared
this.findById.prime('123').value(
  Promise.reject(new Error('Failed'))
)
```

---

### preload()

```ts
preload(...args: Args): R
```

Starts loading data in the background to warm the cache. Identical to calling the memoized function.

**Parameters:**
- `args` - The arguments for the function

**Returns:** The result (or Promise) of the function

**Example:**

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
    const tags = await this.repo.findTags(postId)

    // Author is likely cached now
    const author = await this.userRepo.findById(post.authorId)

    return { post, author, comments, tags }
  }
}
```

**Use cases:**
- Warming cache for anticipated queries
- Parallel data loading
- Optimizing sequential operations

---

### bust()

```ts
bust(...args: Args): void
```

Removes a specific entry from the cache.

**Parameters:**
- `args` - The arguments identifying the cache entry to remove

**Example:**

```ts
class UserRepo extends Vla.Repo {
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })

  async update(id: string, data: Partial<UserData>) {
    const user = await this.db.users.update({ where: { id }, data })

    // Invalidate cache for this user
    this.findById.bust(id)

    return user
  }
}
```

**Use cases:**
- Invalidating cache after updates
- Removing stale data
- Forcing fresh queries for specific entries

---

### bustAll()

```ts
bustAll(): void
```

Clears the entire cache for this memoized method.

**Example:**

```ts
class UserRepo extends Vla.Repo {
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })

  findByEmail = this.memo((email: string) => {
    return this.db.users.find({ email })
  })

  async bulkUpdate(updates: UserUpdate[]) {
    await this.db.users.updateMany(updates)

    // Clear all caches since many users might be affected
    this.findById.bustAll()
    this.findByEmail.bustAll()
  }
}
```

**Use cases:**
- Bulk operations that affect many entries
- Complete cache refresh
- Clearing cache at end of request (usually not needed)

## Cache Behavior

### Argument-Based Keys

Cache keys are generated from function arguments using object hashing:

```ts
// Different arguments = different cache entries
await repo.findById('1') // Cache miss
await repo.findById('2') // Cache miss
await repo.findById('1') // Cache hit

// Complex arguments work too
await repo.findByFilters({ role: 'admin', active: true }) // Cache miss
await repo.findByFilters({ role: 'admin', active: true }) // Cache hit
await repo.findByFilters({ active: true, role: 'admin' }) // Cache hit (order doesn't matter)
```

### Request Scoping

Cache is scoped to the request (invoke scope):

```ts
// Request 1
const scoped1 = kernel.scoped()
const repo1 = scoped1.create(UserRepo)
await repo1.findById('1') // Query executes
await repo1.findById('1') // Cache hit

// Request 2 (new scope)
const scoped2 = kernel.scoped()
const repo2 = scoped2.create(UserRepo)
await repo2.findById('1') // Query executes (new cache)
```

### Shared Instances

Because Repos use `invoke` scope, the same instance is shared across all injections within a request:

```ts
class UserService extends Vla.Service {
  repo = this.inject(UserRepo)

  async getUser(id: string) {
    return this.repo.findById(id) // Cache miss
  }
}

class PostService extends Vla.Service {
  userRepo = this.inject(UserRepo) // Same instance!

  async enrichPost(post: Post) {
    // Cache hit if UserService already called it
    const author = await this.userRepo.findById(post.authorId)
    return { ...post, author }
  }
}
```

### Promise Handling

Memoization works with async functions:

```ts
class UserRepo extends Vla.Repo {
  findById = this.memo(async (id: string) => {
    // Async function is cached
    const user = await this.db.users.find({ id })
    return user
  })
}

// Multiple concurrent calls resolve to the same promise
Promise.all([
  repo.findById('1'),
  repo.findById('1'),
  repo.findById('1')
])
// Only one database query executes
```

If a promise rejects, the cache entry is automatically removed:

```ts
// First call fails
try {
  await repo.findById('1') // DB error, cache entry removed
} catch (error) {
  // Handle error
}

// Second call tries again
await repo.findById('1') // Executes query again
```

## Complete Example

```ts
class UserRepo extends Vla.Repo {
  db = this.inject(Database)

  // Memoized query
  findById = this.memo((id: string) => {
    console.log('Executing query for:', id)
    return this.db.users.find({ id })
  })

  findByEmail = this.memo((email: string) => {
    console.log('Executing query for:', email)
    return this.db.users.find({ email })
  })

  async create(data: UserData) {
    const user = await this.db.users.create({ data })

    // Prime both caches
    this.findById.prime(user.id).value(user)
    this.findByEmail.prime(user.email).value(user)

    return user
  }

  async update(id: string, data: Partial<UserData>) {
    const user = await this.db.users.update({ where: { id }, data })

    // Bust cache since data changed
    this.findById.bust(id)

    // If email changed, bust that too
    if (data.email) {
      const oldUser = await this.findById.fresh(id)
      this.findByEmail.bust(oldUser.email)
    }

    return user
  }

  async delete(id: string) {
    await this.db.users.delete({ where: { id } })

    // Bust cache for deleted user
    this.findById.bust(id)
  }
}

// Usage in a service
class UserService extends Vla.Service {
  repo = this.inject(UserRepo)

  async getUser(id: string) {
    // First call: "Executing query for: 123"
    const user1 = await this.repo.findById('123')

    // Second call: cache hit, no log
    const user2 = await this.repo.findById('123')

    // Fresh call: "Executing query for: 123"
    const user3 = await this.repo.findById.fresh('123')

    return user1
  }
}
```

## Best Practices

### Do Memoize

- Database queries
- External API calls
- Expensive computations
- File system reads

### Don't Memoize

- Write operations (create, update, delete)
- Non-deterministic functions (Math.random(), Date.now())
- Functions with side effects

### Cache Management

```ts
class UserRepo extends Vla.Repo {
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })

  // ✅ Good: Prime cache after create
  async create(data: UserData) {
    const user = await this.db.users.create({ data })
    this.findById.prime(user.id).value(user)
    return user
  }

  // ✅ Good: Bust cache after update
  async update(id: string, data: Partial<UserData>) {
    const user = await this.db.users.update({ where: { id }, data })
    this.findById.bust(id)
    return user
  }

  // ✅ Good: Bust cache after delete
  async delete(id: string) {
    await this.db.users.delete({ where: { id } })
    this.findById.bust(id)
  }
}
```

## Related APIs

- [Repo Class](/reference/base-classes/#repo) - Repository base class
- [Memoization Guide](/guides/memoization/) - Usage guide and patterns
