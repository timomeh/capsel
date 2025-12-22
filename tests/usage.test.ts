import { describe, expect, test, vi } from "vitest"
import { createModule, Kernel } from "../src"

const users: Record<string, { id: string; name: string }> = {
  "1": { id: "1", name: "John" },
  "2": { id: "2", name: "Jane" },
}

const Users = createModule("Users")

class UserRepo extends Users.Repo {
  async findById(id: string) {
    return users[id]
  }
}

class UserService extends Users.Service {
  repo = this.inject(UserRepo)

  async getProfile(id: string) {
    return this.repo.findById(id)
  }
}

class UsersController extends Users.Controller {
  service = this.inject(UserService)

  async show(id: string) {
    return this.service.getProfile(id)
  }
}

describe("dependency injection", () => {
  test("uses default implementations", async () => {
    const kernel = new Kernel()
    await expect(kernel.create(UsersController).show("1")).resolves.toEqual({
      id: "1",
      name: "John",
    })
  })

  test("can inject an override", async () => {
    const kernel = new Kernel()
    kernel.bind(
      UserRepo,
      vi.fn(
        class {
          findById = vi.fn().mockResolvedValue({ id: "9", name: "Fake" })
        },
      ),
    )

    await expect(kernel.create(UsersController).show("1")).resolves.toEqual({
      id: "9",
      name: "Fake",
    })
  })

  test("can inject singletons", async () => {
    const kernel = new Kernel()
    kernel.bind(
      UserRepo,
      class TestRepo {
        count = 0
        async findById(id: string) {
          return { id, name: `John ${++this.count}` }
        }
      },
      "singleton",
    )

    await expect(kernel.create(UsersController).show("1")).resolves.toEqual({
      id: "1",
      name: "John 1",
    })
    await expect(kernel.create(UsersController).show("1")).resolves.toEqual({
      id: "1",
      name: "John 2",
    })
    await expect(kernel.create(UsersController).show("1")).resolves.toEqual({
      id: "1",
      name: "John 3",
    })
  })
})

describe("cross-module injections", () => {
  test("forbids deep injections", async () => {
    const Posts = createModule("Posts")

    class UserFooRepo extends Users.Repo {
      foo() {
        return 1
      }
    }

    class PostService extends Posts.Service {
      // @ts-expect-error
      user = this.inject(UserFooRepo)

      doSomething() {
        return this.user.foo()
      }
    }

    const kernel = new Kernel()
    expect(() => kernel.create(PostService)).toThrow(/not allowed/)
  })

  test("allows facades", async () => {
    const Posts = createModule("Posts")

    class UsersFacade extends Users.Facade {
      foo() {
        return 1
      }
    }

    class PostService extends Posts.Service {
      user = this.inject(UsersFacade)

      doSomething() {
        return this.user.foo()
      }
    }

    const kernel = new Kernel()
    expect(kernel.create(PostService).doSomething()).toBe(1)
  })
})

describe("dependency scopes", () => {
  test("defaults to transient", async () => {
    const TestModule = createModule("Test")

    class Ticks extends TestModule.Class {
      ticks = 0
      tick() {
        return ++this.ticks
      }
    }

    class Sample extends TestModule.Class {
      ticks = this.inject(Ticks)

      doTick() {
        return this.ticks.tick()
      }
    }

    class Sample2 extends TestModule.Class {
      ticks = this.inject(Ticks)

      doTick() {
        return this.ticks.tick()
      }
    }

    const kernel = new Kernel()
    expect(kernel.resolve(Sample).doTick()).toBe(1)
    expect(kernel.resolve(Sample2).doTick()).toBe(1)
    expect(kernel.resolve(Sample).doTick()).toBe(1)
    expect(kernel.resolve(Sample2).doTick()).toBe(1)
  })

  test("supports singleton", async () => {
    const TestModule = createModule("Test")

    class Ticks extends TestModule.Class {
      static scope = Ticks.SingletonScope

      #ticks = 0
      tick() {
        return ++this.#ticks
      }
    }

    class SampleTransient extends TestModule.Class {
      ticks = this.inject(Ticks, "transient")

      doTick() {
        return this.ticks.tick()
      }
    }

    class SampleSingleton extends TestModule.Class {
      ticks = this.inject(Ticks)

      doTick() {
        return this.ticks.tick()
      }
    }

    const kernel = new Kernel()

    // Transient should always return 1
    // Singleton should count up from 1
    expect(kernel.create(SampleTransient).doTick()).toBe(1)
    expect(kernel.create(SampleSingleton).doTick()).toBe(1)
    expect(kernel.create(SampleTransient).doTick()).toBe(1)
    expect(kernel.create(SampleSingleton).doTick()).toBe(2)
    expect(kernel.create(SampleSingleton).doTick()).toBe(3)
  })

  test("supports invoke", async () => {
    const TestModule = createModule("Test")

    class Ticks extends TestModule.Class {
      static scope = Ticks.InvokeScope

      #ticks = 0
      tick() {
        return ++this.#ticks
      }
    }

    class Sample extends TestModule.Class {
      ticks = this.inject(Ticks)

      doTick() {
        return this.ticks.tick()
      }
    }

    class Sample2 extends TestModule.Class {
      ticks = this.inject(Ticks)

      doTick() {
        return this.ticks.tick()
      }
    }

    class SampleTransient extends TestModule.Class {
      ticks = this.inject(Ticks, "transient")

      doTick() {
        return this.ticks.tick()
      }
    }

    const kernel = new Kernel().scoped()

    const sample = kernel.create(Sample)
    const sample2 = kernel.create(Sample2)

    // All doTicks() should count up, except SampleTransient

    expect(kernel.create(Sample).doTick()).toBe(1)
    expect(sample.doTick()).toBe(2)
    expect(sample.doTick()).toBe(3)
    expect(sample2.doTick()).toBe(4)
    expect(sample.doTick()).toBe(5)
    expect(sample2.doTick()).toBe(6)

    expect(kernel.create(SampleTransient).doTick()).toBe(1)

    expect(kernel.create(Sample2).doTick()).toBe(7)
    expect(kernel.create(Sample).doTick()).toBe(8)
  })
})
