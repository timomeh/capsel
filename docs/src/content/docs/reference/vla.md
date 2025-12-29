---
title: Vla Namespace
description: API reference for the Vla namespace and its methods
---

The `Vla` namespace provides the main API for creating modules, contexts, and managing kernels.

## Base Classes

The Vla namespace includes base classes for building your application:

```ts
Vla.Action   // Entry points
Vla.Service  // Business logic
Vla.Repo     // Data access
Vla.Facade   // Cross-module interface
Vla.Resource // Infrastructure
```

See [Base Classes](/reference/base-classes/) for detailed documentation.

## Methods

### createModule()

```ts
Vla.createModule<ModuleName extends string>(
  moduleName: ModuleName
): Module
```

Creates a new module with its own set of base classes.

**Parameters:**
- `moduleName` - A unique name for the module

**Returns:** An object with module-specific base classes

**Example:**

```ts
const Users = Vla.createModule('Users')
const Posts = Vla.createModule('Posts')

class UserService extends Users.Service {
  // ...
}

class PostService extends Posts.Service {
  users = this.inject(UserFacade) // Cross-module via Facade
}
```

**Module object contains:**
- `Action` - Module-specific action base class
- `Service` - Module-specific service base class
- `Repo` - Module-specific repo base class
- `Facade` - Module-specific facade base class
- `Resource` - Module-specific resource base class
- `Memoizable` - Memoization mixin
- `DevStable` - Development stability mixin

**See also:** [Core Concepts - Modules](/guides/core-concepts/#modules)

---

### createContext()

```ts
Vla.createContext<T>(): Token<T>
```

Creates a context token for dependency injection.

**Type Parameters:**
- `T` - The type of the context value

**Returns:** A context token that can be injected

**Example:**

```ts
const AppContext = Vla.createContext<{
  userId: string | null
  cookies: Record<string, string>
}>()

class SessionService extends Vla.Service {
  ctx = this.inject(AppContext)

  async currentUser() {
    return this.ctx.userId
  }
}

// Provide context
kernel.context(AppContext, {
  userId: '123',
  cookies: req.cookies
})
```

**See also:** [Context Guide](/guides/context/)

---

### setGlobalInvokeKernel()

```ts
Vla.setGlobalInvokeKernel(kernel: Kernel): void
```

Sets a global kernel that will be used by all `.invoke()` calls.

**Parameters:**
- `kernel` - The kernel instance to use globally

**Example:**

```ts
import { Kernel, Vla } from 'vla'

const kernel = new Kernel()
Vla.setGlobalInvokeKernel(kernel)

// Now actions can be invoked without passing a kernel
await MyAction.invoke(args)
```

**Use cases:**
- Simple applications without request scoping
- CLI applications
- Background jobs

**Warning:** This sets a global kernel that's shared across all invocations. For web applications, use `setInvokeKernelProvider()` instead.

---

### setInvokeKernelProvider()

```ts
Vla.setInvokeKernelProvider(
  provider: () => Kernel | Promise<Kernel>
): void
```

Sets a provider function that returns a kernel for each `.invoke()` call.

**Parameters:**
- `provider` - A function that returns a Kernel (or Promise of Kernel)

**Example:**

```ts
import { Kernel, Vla } from 'vla'
import { cache } from 'react'

const rootKernel = new Kernel()

Vla.setInvokeKernelProvider(
  cache(() => {
    return rootKernel.scoped().context(AppContext, {
      cookies: getCookies()
    })
  })
)
```

**Use cases:**
- Request-scoped kernels in web applications
- Dynamic kernel configuration
- Context-aware kernel creation

**See also:** [Framework Integration](/guides/framework-integration/)

---

### withKernel()

```ts
Vla.withKernel<T>(
  kernel: Kernel,
  fn: () => T | Promise<T>
): Promise<T>
```

Executes a function with a specific kernel context using AsyncLocalStorage.

**Parameters:**
- `kernel` - The kernel to use for the execution
- `fn` - The function to execute

**Returns:** The result of the function

**Example:**

```ts
import { Vla } from 'vla'

app.use((req, res, next) => {
  const scoped = kernel.scoped().context(AppContext, {
    cookies: req.cookies
  })

  Vla.withKernel(scoped, () => next())
})
```

**Use cases:**
- Framework middleware
- Wrapping request handlers
- Setting kernel for a specific execution context

**See also:**
- [SvelteKit Integration](/guides/framework-integration/#sveltekit)
- [Express Integration](/guides/framework-integration/#express)

## Type Exports

The Vla namespace also exports useful types:

```ts
import type { Kernel, Scope, Token } from 'vla'

type Scope = 'singleton' | 'invoke' | 'transient'
type Token<T = unknown> = InstantiableClass<T> & {
  readonly scope?: Scope
  readonly unwrap?: PropertyKey
}
```

## Complete Example

```ts
import { Kernel, Vla } from 'vla'
import { cache } from 'react'

// Create modules
const Users = Vla.createModule('Users')
const Posts = Vla.createModule('Posts')

// Create context
const AppContext = Vla.createContext<{
  userId: string | null
}>()

// Define classes
class UserService extends Users.Service {
  ctx = this.inject(AppContext)

  async currentUser() {
    return this.ctx.userId
  }
}

class GetPosts extends Posts.Action {
  users = this.inject(UserService)
  posts = this.inject(PostService)

  async handle() {
    const userId = await this.users.currentUser()
    return this.posts.getByUser(userId)
  }
}

// Setup kernel
const kernel = new Kernel()

Vla.setInvokeKernelProvider(
  cache(() => {
    return kernel.scoped().context(AppContext, {
      userId: getCurrentUserId()
    })
  })
)

// Invoke actions
const posts = await GetPosts.invoke()
```

## Related APIs

- [Kernel](/reference/kernel/) - Kernel class API
- [Base Classes](/reference/base-classes/) - Action, Service, Repo, etc.
- [Memoization](/reference/memoization/) - Memo API reference
