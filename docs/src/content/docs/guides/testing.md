---
title: Testing
description: Write testable code without module mocks
---

One of Vla's core benefits is making your code easy to test. With dependency injection, you can mock dependencies without complex module mocking systems.

## The Vla Testing Advantage

Traditional testing often requires mocking entire modules:

```ts
// ❌ Without Vla: Complex module mocking
import { vi } from 'vitest'

vi.mock('./database', () => ({
  db: {
    users: {
      find: vi.fn()
    }
  }
}))

// Mock has to be defined before imports
import { getUserById } from './users'
```

With Vla, you inject mocks directly:

```ts
// ✅ With Vla: Direct dependency mocking
const kernel = new Kernel()
kernel.bind(UserRepo, MockUserRepo)

const service = kernel.create(UserService)
```

## Basic Testing

### Testing Services

```ts
import { test, expect, vi } from 'vitest'
import { Kernel } from 'vla'

class UserService extends Vla.Service {
  repo = this.inject(UserRepo)

  async getUser(id: string) {
    return this.repo.findById(id)
  }
}

test('getUser returns user from repo', async () => {
  const kernel = new Kernel()

  // Mock the repository
  kernel.bind(
    UserRepo,
    class MockUserRepo {
      findById = vi.fn().mockResolvedValue({
        id: '1',
        name: 'Test User'
      })
    }
  )

  const service = kernel.create(UserService)
  const user = await service.getUser('1')

  expect(user).toEqual({
    id: '1',
    name: 'Test User'
  })
})
```

### Testing Actions

```ts
class GetUser extends Vla.Action {
  service = this.inject(UserService)

  async handle(id: string) {
    return this.service.getUser(id)
  }
}

test('GetUser action calls service', async () => {
  const kernel = new Kernel()

  // Mock the service
  kernel.bind(
    UserService,
    class MockUserService {
      getUser = vi.fn().mockResolvedValue({ id: '1', name: 'Test' })
    }
  )

  const result = await GetUser.withKernel(kernel).invoke('1')

  expect(result).toEqual({ id: '1', name: 'Test' })
})
```

## Mocking Strategies

### Mock with Class

Create a mock class that implements the same interface:

```ts
class MockUserRepo {
  findById = vi.fn().mockResolvedValue({ id: '1', name: 'Test' })
  findAll = vi.fn().mockResolvedValue([])
  create = vi.fn()
}

test('example', async () => {
  const kernel = new Kernel()
  kernel.bind(UserRepo, MockUserRepo)

  const service = kernel.create(UserService)
  // ...
})
```

### Mock with Object

For simpler cases, use plain objects:

```ts
test('example', async () => {
  const kernel = new Kernel()

  const mockRepo = {
    findById: vi.fn().mockResolvedValue({ id: '1', name: 'Test' })
  }

  kernel.bindValue(UserRepo, mockRepo)

  const service = kernel.create(UserService)
  // ...
})
```

### Partial Mocks

Only mock what you need:

```ts
class PartialMockUserRepo extends UserRepo {
  // Override just one method
  findById = vi.fn().mockResolvedValue({ id: '1', name: 'Test' })

  // Other methods use real implementation
}

test('example', async () => {
  const kernel = new Kernel()
  kernel.bind(UserRepo, PartialMockUserRepo)
  // ...
})
```

## Testing with Context

Mock context values in tests:

```ts
const AppContext = Vla.createContext<{
  userId: string | null
}>()

class SessionService extends Vla.Service {
  ctx = this.inject(AppContext)

  async currentUser() {
    return this.ctx.userId
  }
}

test('returns current user from context', async () => {
  const kernel = new Kernel()
  kernel.context(AppContext, { userId: 'test-user' })

  const service = kernel.create(SessionService)
  const userId = await service.currentUser()

  expect(userId).toBe('test-user')
})

test('handles unauthenticated users', async () => {
  const kernel = new Kernel()
  kernel.context(AppContext, { userId: null })

  const service = kernel.create(SessionService)
  const userId = await service.currentUser()

  expect(userId).toBeNull()
})
```

## Testing Memoization

### Verify Memoization Works

```ts
test('memoizes database calls', async () => {
  const findByIdMock = vi.fn().mockResolvedValue({ id: '1', name: 'Test' })

  class TestUserRepo extends Vla.Repo {
    findById = this.memo(findByIdMock)
  }

  const kernel = new Kernel().scoped()
  kernel.bind(UserRepo, TestUserRepo)

  const service = kernel.create(UserService)

  // Call multiple times
  await service.getUser('1')
  await service.getUser('1')
  await service.getUser('1')

  // Mock should only be called once
  expect(findByIdMock).toHaveBeenCalledTimes(1)
})
```

### Test Fresh Calls

```ts
test('fresh bypasses cache', async () => {
  const findByIdMock = vi.fn().mockResolvedValue({ id: '1', name: 'Test' })

  class TestUserRepo extends Vla.Repo {
    findById = this.memo(findByIdMock)
  }

  const kernel = new Kernel().scoped()
  kernel.bind(UserRepo, TestUserRepo)

  const repo = kernel.create(TestUserRepo)

  await repo.findById('1') // Cached
  await repo.findById.fresh('1') // Bypasses cache

  expect(findByIdMock).toHaveBeenCalledTimes(2)
})
```

## Testing Cross-Module Dependencies

Test that facades provide proper isolation:

```ts
const Users = Vla.createModule('Users')
const Posts = Vla.createModule('Posts')

class UserFacade extends Users.Facade {
  async getUser(id: string) {
    return { id, name: 'Test User' }
  }
}

class PostService extends Posts.Service {
  users = this.inject(UserFacade)

  async createPost(authorId: string, content: string) {
    const author = await this.users.getUser(authorId)
    return { content, author }
  }
}

test('creates post with author', async () => {
  const kernel = new Kernel()

  // Mock the facade
  kernel.bind(
    UserFacade,
    class MockUserFacade {
      getUser = vi.fn().mockResolvedValue({ id: '1', name: 'Mock User' })
    }
  )

  const service = kernel.create(PostService)
  const post = await service.createPost('1', 'Hello')

  expect(post.author.name).toBe('Mock User')
})
```

## Integration Testing

Test multiple layers together:

```ts
test('full integration test', async () => {
  const kernel = new Kernel().scoped()

  // Only mock external dependencies
  kernel.bind(
    Database,
    class MockDatabase {
      users = {
        find: vi.fn().mockResolvedValue({ id: '1', name: 'Real User' })
      }
    }
  )

  // Real service and repo implementations
  const action = GetUser.withKernel(kernel)
  const result = await action.invoke('1')

  expect(result.name).toBe('Real User')
})
```

## Test Fixtures

Create reusable test fixtures:

```ts
// test/fixtures.ts
export function createTestKernel() {
  const kernel = new Kernel().scoped()

  kernel.bind(
    Database,
    class MockDatabase {
      users = {
        find: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      }
    }
  )

  kernel.context(AppContext, {
    userId: 'test-user',
    headers: new Headers()
  })

  return kernel
}

// In your tests
test('example', async () => {
  const kernel = createTestKernel()
  const service = kernel.create(UserService)
  // ...
})
```

## Spying on Dependencies

Verify that dependencies are called correctly:

```ts
test('calls repo with correct arguments', async () => {
  const kernel = new Kernel()

  const mockRepo = {
    findById: vi.fn().mockResolvedValue({ id: '1', name: 'Test' })
  }

  kernel.bindValue(UserRepo, mockRepo)

  const service = kernel.create(UserService)
  await service.getUser('123')

  expect(mockRepo.findById).toHaveBeenCalledWith('123')
  expect(mockRepo.findById).toHaveBeenCalledTimes(1)
})
```

## Testing Error Handling

```ts
test('handles repo errors', async () => {
  const kernel = new Kernel()

  kernel.bind(
    UserRepo,
    class ErrorRepo {
      findById = vi.fn().mockRejectedValue(new Error('Database error'))
    }
  )

  const service = kernel.create(UserService)

  await expect(service.getUser('1')).rejects.toThrow('Database error')
})
```

## Testing Best Practices

### 1. Test at the Right Level

```ts
// ✅ Good: Test services with mocked repos
test('service logic', async () => {
  const kernel = new Kernel()
  kernel.bind(UserRepo, MockRepo)

  const service = kernel.create(UserService)
  // Test business logic
})

// ❌ Bad: Testing implementation details
test('repo calls database', async () => {
  // Don't test that the repo calls the database
  // That's an implementation detail
})
```

### 2. Use Scoped Kernels

```ts
// ✅ Good: Fresh kernel per test
test('example', async () => {
  const kernel = new Kernel().scoped()
  // ...
})

// ❌ Bad: Shared kernel across tests
const globalKernel = new Kernel()

test('test 1', () => {
  // State might leak between tests
})
```

### 3. Mock External Dependencies

```ts
// ✅ Good: Mock external services
kernel.bind(Database, MockDatabase)
kernel.bind(EmailService, MockEmailService)

// ✅ Good: Use real business logic
const service = kernel.create(UserService) // Real implementation
```

### 4. Test Business Logic, Not Framework

```ts
// ✅ Good: Test what the service does
test('creates user with validated email', async () => {
  const service = kernel.create(UserService)
  const user = await service.create({ email: 'test@example.com' })
  expect(user.email).toBe('test@example.com')
})

// ❌ Bad: Testing Vla's DI system
test('injects UserRepo', () => {
  const service = kernel.create(UserService)
  expect(service.repo).toBeInstanceOf(UserRepo)
})
```

## Example: Complete Test Suite

```ts
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { Kernel } from 'vla'

describe('UserService', () => {
  let kernel: Kernel
  let mockRepo: any

  beforeEach(() => {
    kernel = new Kernel().scoped()

    mockRepo = {
      findById: vi.fn(),
      create: vi.fn()
    }

    kernel.bindValue(UserRepo, mockRepo)
  })

  describe('getUser', () => {
    test('returns user from repo', async () => {
      mockRepo.findById.mockResolvedValue({ id: '1', name: 'Test' })

      const service = kernel.create(UserService)
      const user = await service.getUser('1')

      expect(user).toEqual({ id: '1', name: 'Test' })
      expect(mockRepo.findById).toHaveBeenCalledWith('1')
    })

    test('throws when user not found', async () => {
      mockRepo.findById.mockResolvedValue(null)

      const service = kernel.create(UserService)

      await expect(service.getUser('1')).rejects.toThrow('User not found')
    })
  })

  describe('createUser', () => {
    test('creates user with validated data', async () => {
      const userData = { name: 'New User', email: 'new@example.com' }
      mockRepo.create.mockResolvedValue({ id: '2', ...userData })

      const service = kernel.create(UserService)
      const user = await service.createUser(userData)

      expect(user.id).toBe('2')
      expect(mockRepo.create).toHaveBeenCalledWith(userData)
    })

    test('throws on invalid email', async () => {
      const service = kernel.create(UserService)

      await expect(
        service.createUser({ name: 'Test', email: 'invalid' })
      ).rejects.toThrow('Invalid email')
    })
  })
})
```

## Next Steps

- [Best Practices](/guides/best-practices/) - Testing strategies and patterns
- [Framework Integration](/guides/framework-integration/) - Framework-specific testing
- [API Reference](/reference/kernel/) - Kernel API details
