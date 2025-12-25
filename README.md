# Vla

_A smooth dutch dessert that goes with everything._

A TypeScript data layer kernel for backend- and fullstack apps. Compatible with whatever framework or library you're using.

🚧 WIP, under development. Exports and names will very likely change often.

- Dependency Injection without decorators and without reflection
- Works in any server-side framework
- Write code that's easy to test without module mocks all over the place
- Structures code into modules, layers and interfaces
- Familiar patterns: Actions, Services, Repos, Facades
- Ensures that Facades are used for cross-module dependencies to prevent messy code dependencies
- Tree shakeable
- Memoziation for Repos
- request-based context with AsyncLocalStorage
- 🏗️ first-class context injection
- ...

## Why?

Many fullstack frameworks lack structure and conventions on the backend side (data layer), but they have lots of good structure and conventions on the frontend side (presentation layer). They are still great frameworks and they all have their own strengths. This is where Vla comes in. It aims to fill in the missing gap in the data layer, allowing you to write well-structured maintainable, scalable and testable code.

## Usage

```ts
import { createModule, Kernel } from "vla"

// Users
const UserModule = createModule("User")

class ShowUserSettingsAction extends UserModule.Action {
  users = this.inject(UserService)

  async handle(userId: string) {
    const settings = await this.users.getSettings(userId)
    return {
      timezone: settings.timezone,
      hasSubscription: settings.hasSubscription
    }
  }
}

class UserService extends UserModule.Service {
  repo = this.inject(UserRepo)
  billing = this.inject(BillingFacade)
  ctx = this.inject(Context) // WIP unimplemented

  async getSettings(userId: string) {
    await canViewProfile(userId)

    const profile = await this.repo.findById(userId)
    const hasSubscription = await this.billing.hasSubscription(userId)

    return {
      ...profile,
      hasSubscription
    }
  }

  private canViewProfile(userId: string) {
    const isSameUser = this.ctx.currentUser.id !== userId
    if (!isSameUser) throw new Forbidden()

    // repo method calls are memoized
    const profile = await this.repo.findById(userId)
    const isTeamAdmin =
      this.ctx.currentUser.role === "admin" &&
      this.ctx.currentUser.teamId === profile.teamId

    if (!isTeamAdmin) throw new Forbidden()
  }
}

class UserRepo extends UserModule.Repo {
  db = this.inject(DbPool)

  findById = this.memo((id: string) => {
    // this method is memoized per request.
    // memoized methods can be called like any normal method, but
    // if it's called multiple times with the same args, it's only
    // executed once and the result is cached
    return this.db.users.find({ id })
  })

  async create(data: UserValues) {
    const createdUser = await this.db.users.create({ data })

    this.findById.prime(createUser.id).value(createdUser)
    // memoized methods support multiple utilities:
    // - .fresh(args) to skip memoized cache and execute the function again
    // - .prime(args).value({ ... }) to set a cached value
    // - .preload(args) to run the method in the background and preload the cache
    // - .bust(args) to bust the cache for the provided args
    // - .bustAll() to bust the cache for all args

    return createdUser
  }
}

class DbPool extends UserModule.Resource {
  // Unwrap a property when injecting the resource.
  // When another class injects the DbPool with `this.inject(DbPool)`,
  // this will cause that it doesn't return the instance of the DbPool class,
  // but directly the `db` key in it.
  // This prevents that you have to write stuff like `this.db.db.find()`
  static override unwrap = "db"

  // `Resource` classes are singletons,
  // so the client will only be initialized once
  db = new DbClient()
}

// Billing
const BillingModule = createModule("Billing")

class BillingFacade extends Billing.Facade {
  repo = this.inject(BillingRepo)

  async hasSubscription(userId: string) {
    const subscription = await this.repo.findSubscriptionByUser(userId)
    return Boolean(subscription)
  }
}

class BillingRepo extends BillingModule.Repo {
  async findSubscriptionByUser(userId: string) {
    return db.subscriptions.find({ userId })
  }
}

const kernel = new Kernel()
kernel.setGlobal() // global instance

const settings = await ShowUserSettingsAction.invoke(userId)
// -> { timezone: 'GMT+1', hasSubscription: true }
```

### React usage

```tsx
import { cache } from 'react'
import { setCurrentKernelFn } from 'vla'
import { kernel } from '@/data/kernel'

const kernel = new Kernel()

// React's cache() will return a new scoped kernel for each request, giving
// us a new scoped kernel per request without a middleware
setCurrentKernelFn(cache(() => kernel.scoped()))

async function Layout() {
  const settings = await ShowUserSettingsAction.invoke(userId)

  return <div><Page /></div>
}

async function Page() {
  const settings = await ShowUserSettingsAction.invoke(userId)
  // it will not query the db twice. it will use the memoized db query

  return (
    <ul>
      <li>Timezone: {settings.timezone}</li>
      <li>Subscriber: {settings.hasSubscription ? "yes" : "no"}</li>
    </ul>
  )
}
```

### In any middleware-based app

e.g. sveltekit

```ts
import { runWithScope } from "vla"
import type { Handle } from "@sveltejs/kit"
import { kernel } from '@/data/kernel'

export const handle: Handle = async ({ event, resolve }) => {
  return runWithScope(kernel.scoped(), () => resolve(event))
}

import { kernel } from '@/data/kernel';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  return {
    settings: await ShowUserSettingsAction.invoke(userId)
  }
}
```

e.g. express

```ts
import { runWithScope } from "vla"
import { kernel } from '@/data/kernel'

const app = express()

express.use((req, res, next) => runWithScope(kernel.scoped(), () => next()))

app.get("/users/:id", async (req, res) => {
  const settings = await ShowUserSettingsAction.invoke(req.params.id)
  res.json({ data: settings })
})
```

### Testing

```ts
test("returns some user settings", async () => {
  const kernel = new Kernel()

  // mocks for database calls
  kernel.bind(
    UserRepo,
    vi.fn(
      class {
        findById = vi.fn().mockResolvedValue({ timezone: "faked" })
      },
    ),
  )

  // mocks for cross-module dependencies
  kernel.bind(
    BillingFacade,
    vi.fn(
      class {
        hasSubscription = vi.fn().mockResolvedValue(true)
      },
    ),
  )

  await expect(ShowUserSettingsAction.withKernel(kernel).invoke("1")).resolves.toEqual({
    timezone: "faked",
    hasSubscription: true
  })
})
```

## Docs

There aren't any docs yet. This section is just jotting down some notes for myself.

### When to use modules?

You don't need to create a module for each separate resource. Modules are meant for domain separation, not necessarily for resources. Smaller apps may just need a single `AppModule`. Start with a single AppModule and grow.

A module can have multiple services, repositories and even multiple facades to separate resources from each other.

### What's a facade, when to use it?

Facades are meant as the internal public API to a module, for other modules. When one module wants to call something from another module, it should do so through a facade, and not by deeply calling a service or repository of a module. Even though this adds a layer of indirection, it lets you better differentiate between internal and external concerns of a module, and prevents code dependencies from becoming messy. If you use facades excessively often, your domain modelling could be improved.

### How should I structure files and folders?

Roughly follow how Vla structures your code:

- Use separate folders for separate modules
- Create a separate file for each Service, Repo, Facade, Action
- You could also have all actions of a resource in a single file
- If you further want to group files inside a module, do it either by resource (`user`, `post`, etc) or by type (`services`, `repos`, `actions`, etc). Start by having a flat hierarchy with all files of a module in a single folder, and separate into multiple folders once you feel it grew too much.

If you use multiple modules, it's good to separate them into different folders. This allows you to see: if you're importing unproportionally many files from other folders, you have lots of cross-module dependencies, and your data modelling into modules could be improved. 

"How to structure code into files and folders" is often a question of how to manage code dependencies in a way that scales well. Vla's structure already manages your code dependencies, so it makes sense to align your files and folders on Vla's structure.

### Class scopes

Vla uses dependency injection to load and use classes in other classes. This means that Vla creates class instances for you and caches them in different caches for different lifetimes. Whenever you call `inject()`, Vla checks the scope of the class and whether an instance is already cached.

There are 3 different scopes:

- `transient` creates a new instance every time, it does not use a cached instance
- `invoke` creates a new instance per request handler and reuses this cached instance within the request. 
- `singleton` creates a new instance only once and caches it forever

Example:

```ts
class DatabasePool extends MyModule.Singleton {
  // singletons are cached globally
  private dbPool: DbPool | null = null

  get dbPool() {
    return this.dbPool || new DbPool()
  }
}

class Repo extends MyModule.Repo {
  // repos are cached per request (`invoke`)

  // it will only create the db pool once and reuse it
  // through the application's whole lifetime
  dbPool = this.inject(DatabasePool)

  private cache = Map<string, User>()

  async findById(id: string) {
    const cached = this.cache.get(id)
    if (cached) return cached

    const user = await dbPool.user.find({ id })
    this.cache.set(id, user)
    return user
  }
}

class ServiceA extends MyModule.Service {
  // it will use the same instance that ServiceB is also using
  repo = this.inject(Repo)

  async doSomething() {
    await this.repo.findById("1")
  }
}

class ServiceB extends MyModule.Service {
  // it will use the same instance that ServiceA is also using
  repo = this.inject(Repo)

  async doOtherThing() {
    await this.repo.findById("1")
  }
}
```

In this example:
- The Database Pool will only be created once and will be reused forever
- The Repo is stateful for each request. The Repo cache can be shared across all usages
- The Services can both call the Repo and use the same instance

### Overriding class scopes

```ts
class FooClass extends MyModule.Class {
  static scope = FooClass.SingletonScope
}
```

You _can_ override the default scope of a Repo, Service, etc. But it's better to create a new BaseClass to not confuse things.

### Defining scope when injecting a class

Example:

```ts
class FooRepo extends MyModule.Repo {
  async foo() {}
}

class FooService extends MyModule.Service {
  repo = this.inject(FooRepo, "transient")
}
```

This will use a transient version of the FooRepo only for the `FooService`. Meaning this service won't share the same cached version that other services might be using.

It's not something you'll likely need to use at all. But this shows how the scope defines how long the instance should be cached and shared.

### Base classes

Vla gives you multiple base classes with semantic names. You can use them as they are, or extend them for your own custom base classes.

- `Service` for services, for reusable units of code (scope: `invoke`)
- `Repo` for respositories, for data access and external adapters (scope: `invoke`)
- `Action` for actions, for server-side entry points (scope: `transient`)
- `Resource` for long-lived infrastructure clients such as database pools (scope: `singleton`)
- `Facade` for the interface of a module for cross-module access (scope: `transient`)

Additionally there are 2 generic classes without a semantic meaning:

- `Class` as a base class which can be extended and modified (default scope: `transient`)
- `Singleton` as a class for singletons without a semantic name (scope: `singleton`)