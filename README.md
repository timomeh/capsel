# capsel

A TypeScript data layer kernel for backend- and fullstack apps. Compatible with whatever framework or library you're using.

🚧 WIP, under development

- Dependency Injection without decorators and without reflection
- Works in any server-side framework
- Structures code into modules, layers and interfaces
- Familiar Controllers, Services, Repos, Facades
- Ensures that Facades are used for cross-module dependencies to prevent messy code dependencies
- Tree shakeable

## Usage

```ts
import { createModule, Kernel } from "capsel"

// Users
const UserModule = createModule("User")

class UserSettingsController extends UserModule.Controller {
  users = this.inject(UserService)

  async show(userId: string) {
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
    canViewProfile(userId)

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

    // repo method calls are memoized - WIP unimplemented
    const profile = await this.repo.findById(userId)
    const isTeamAdmin =
      this.ctx.currentUser.role === "admin" &&
      this.ctx.currentUser.teamId === profile.teamId

    if (!isTeamAdmin) throw new Forbidden()
  }
}

class UserRepo extends UserModule.Repo {
  async findById(id: string) {
    return db.users.find({ id })
  }
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

const kernel = new Kernel() // global instance
const settings = await kernel.create(UserSettingsController).show(userId)
// -> { timezone: 'GMT+1', hasSubscription: true }
```

### React usage

_sample, some parts are unimplemented_

```tsx
import { cache } from 'react'
import { kernel } from '@/data/kernel'

const invoke = cache(() => kernel.scope().context({ cookies: cookies() }))

async function Layout() {
  const settings = await invoke(UserSettingsController).show(userId)

  return <div><Page /></div>
}

async function Page() {
  const settings = await invoke(UserSettingsController).show(userId)

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
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
  return kernel.runWithScope(kernel, () => resolve(event))
}

import { kernel } from '$lib/server/kernel';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  return {
    settings: await kernel.invoke(UserSettingsController).show(userId)
  }
}
```

e.g. express

```ts
import { kernel, invoke } from '@/data/kernel'

const app = express()

express.use((req, res, next) => kernel.runWithScope(() => next()))

app.get("/users/:id", async (req, res) => {
  const settings = await invoke(UserSettingsController).show(req.params.id)
  res.json({ data: settings })
})
```

### Testing

```ts
test("can inject an override", async () => {
  const kernel = new Kernel()

  kernel.bind(
    UserRepo,
    vi.fn(
      class {
        findById = vi.fn().mockResolvedValue({ timezone: "faked" })
      },
    ),
  )

  kernel.bind(
    BillingFacade,
    vi.fn(
      class {
        hasSubscription = vi.fn().mockResolvedValue(true)
      },
    ),
  )

  await expect(kernel.create(UsersController).show("1")).resolves.toEqual({
    timezone: "faked",
    hasSubscription: true
  })
})
```