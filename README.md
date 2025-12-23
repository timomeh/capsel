# capsel

A TypeScript data layer kernel for backend- and fullstack apps. Compatible with whatever framework or library you're using.

🚧 WIP, under development

- Dependency Injection without decorators and without reflection
- Works in any server-side framework
- Write code that's easy to test without module mocks all over the place
- Structures code into modules, layers and interfaces
- Familiar patterns: Actions, Services, Repos, Facades
- Ensures that Facades are used for cross-module dependencies to prevent messy code dependencies
- Tree shakeable
- 🏗️ request-based invoke helpers with AsyncLocalStorage
- 🏗️ first-class context injection
- ...

## Usage

```ts
import { createModule, Kernel, setRootKernel } from "capsel"

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
kernel.setGlobal()

const settings = await ShowUserSettingsAction.invoke(userId)
// -> { timezone: 'GMT+1', hasSubscription: true }
```

### React usage

_sample, some parts are unimplemented_

```tsx
import { kernel } from '@/data/kernel'

async function Layout() {
  const settings = await ShowUserSettingsAction.invoke(userId)

  return <div><Page /></div>
}

async function Page() {
  const settings = await ShowUserSettingsAction.invoke(userId)

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
    settings: await ShowUserSettingsAction.invoke(userId)
  }
}
```

e.g. express

```ts
import { kernel, invoke } from '@/data/kernel'

const app = express()

express.use((req, res, next) => kernel.runWithScope(() => next()))

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