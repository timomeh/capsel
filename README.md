<p align="center">
  <img src=".github/logo-large.png" width="400px" align="center" alt="Vla Logo" />
  <h1 align="center">Vla</h1>
  <h3 align="center"><em>Makes TypeScript Backends sooo smooth</em></h3>
  <p align="center">
    Vla is the missing backend layer for scalable TypeScript apps that integrates into any framework and existing codebases.
  </p>
</p>
<br/>

> _Vla is currently in beta._

## What is Vla?

Vla structures your backend code with clear layers and dependency injection, without decorators or reflection. It works alongside your framework (Next.js, SvelteKit, Express, etc.) to organize your data layer with familiar patterns: Actions, Services, Repos, and Resources.

```ts
class ShowUserProfile extends Vla.Action {
  service = this.inject(UserService)

  async handle(userId: string) {
    return this.service.getProfile(userId)
  }
}

class UserService extends Vla.Service {
  repo = this.inject(UserRepo)
  billing = this.inject(BillingFacade)

  async getProfile(userId: string) {
    const user = await this.repo.findById(userId)
    const hasSubscription = await this.billing.hasSubscription(userId)

    return { ...user, hasSubscription }
  }
}

class UserRepo extends Vla.Repo {
  db = this.inject(Database)

  // Built-in memoization per request
  findById = this.memo((id: string) => {
    return this.db.users.find({ id })
  })
}
```

## Features

- **Framework Agnostic** – Works with Next.js, SvelteKit, Express, Koa, and any TypeScript framework
- **Clear Architecture** – Actions, Services, Repos, Resources, and Facades for organized code
- **Clean Dependency Injection** - No decorators, no reflection, just `this.inject()`
- **Built-in Memoization** – Automatic request-scoped caching for database queries
- **Easy Testing** – Test classes, not file paths, no more brittle module mocks
- **Module System** – Scale to large apps with domain-separated modules and Facades
- **Request Context** – First-class context injection with AsyncLocalStorage
- **Tree Shakeable** – Only bundle what you use

## Why Vla?

Fullstack TypeScript frameworks excel at the frontend: routing, rendering, server actions, but leave the backend data layer unstructured. Without conventions, codebases become messy:

- Unclear separation between business logic and data access
- Testing requires module mocks that leak file paths into tests
- Code dependencies become tangled as the app grows

**Vla fills this gap.** It provides structure and conventions for your data layer without replacing your framework. It's a library, not a framework. No HTTP server, no build tools, just patterns that scale.

## Installation

```bash
npm install vla
```

## [Documentation](https://vla.run/guides/installation/)

Check out [vla.run](https://vla.run) for guides, references and framework integrations.

## License

MIT
