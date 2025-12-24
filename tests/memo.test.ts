import { beforeEach, expect, test, vi } from "vitest"
import { createModule, Kernel } from "../src"
import { setGlobalKernel } from "../src/kernel-global"

const users: Record<string, { id: string; name: string }> = {
  "1": { id: "1", name: "John" },
  "2": { id: "2", name: "Jane" },
}

const Users = createModule("Users")

const findMock = vi.fn(async (id: string) => {
  return users[id]
})

class UserRepo extends Users.Repo {
  findById = this.memo(findMock)

  create(values: { id: string; name: string }) {
    this.findById.prime(values.id).value(Promise.resolve(values))
    return values
  }
}

class UserService extends Users.Service {
  repo = this.inject(UserRepo)

  async getProfile(id: string) {
    this.repo.findById(id)
    this.repo.findById(id)
    this.repo.findById(id)
    return this.repo.findById(id)
  }

  async getFreshProfile(id: string) {
    this.repo.findById(id)
    return this.repo.findById.fresh(id)
  }

  async create(id: string, name: string) {
    return this.repo.create({ id, name })
  }
}

const kernel = new Kernel()
setGlobalKernel(kernel)

beforeEach(() => {
  findMock.mockClear()
})

test("memoizes repo memo methods", async () => {
  const scoped = kernel.scoped()

  await expect(scoped.create(UserService).getProfile("1")).resolves.toEqual({
    id: "1",
    name: "John",
  })

  // uses cache per scope
  await expect(scoped.create(UserService).getProfile("1")).resolves.toEqual({
    id: "1",
    name: "John",
  })

  // getProfile() uses findById 4 times, but should only be called once
  expect(findMock).toHaveBeenCalledTimes(1)
})

test("only caches by scope", async () => {
  const scopeFoo = kernel.scoped()
  const scopeBar = kernel.scoped()

  await expect(scopeFoo.create(UserService).getProfile("1")).resolves.toEqual({
    id: "1",
    name: "John",
  })
  await expect(scopeBar.create(UserService).getProfile("1")).resolves.toEqual({
    id: "1",
    name: "John",
  })

  // getProfile() is called once per scope
  expect(findMock).toHaveBeenCalledTimes(2)
})

test("memoizes based on args", async () => {
  const scoped = kernel.scoped()

  await expect(scoped.create(UserService).getProfile("1")).resolves.toEqual({
    id: "1",
    name: "John",
  })
  await expect(scoped.create(UserService).getProfile("2")).resolves.toEqual({
    id: "2",
    name: "Jane",
  })

  // called once per arg
  expect(findMock).toHaveBeenCalledTimes(2)
})

test("supports fresh calls", async () => {
  const scoped = kernel.scoped()

  await expect(
    scoped.create(UserService).getFreshProfile("1"),
  ).resolves.toEqual({
    id: "1",
    name: "John",
  })

  // getFreshProfile() uses findById twice: once cached and once fresh
  expect(findMock).toHaveBeenCalledTimes(2)
})

test("allows cache priming", async () => {
  const scoped = kernel.scoped()

  await expect(scoped.create(UserService).create("9", "Fake")).resolves.toEqual(
    {
      id: "9",
      name: "Fake",
    },
  )
  await expect(scoped.create(UserService).getProfile("9")).resolves.toEqual({
    id: "9",
    name: "Fake",
  })

  // cache is preset, so find method is not called
  expect(findMock).toHaveBeenCalledTimes(0)
})
