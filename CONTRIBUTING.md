# How to contribute

Contributions are encouraged.

## Contribute with PRs

First of all, thanks for contributing! To contribute code, open a pull request with your changes.

I'd like to ask you not to format existing code, like adding semicolons or changing single quotes to double quotes everywhere. When contributing code, focus on your changes and nothing else.

For a PR to be mergeable, linting, tests, and the build must all pass. Every code change or addition must include corresponding tests.

Your code doesn't need to be perfect to be shipped, it just needs to provide value and be mergeable.

## Project Structure

- `src/` contains the actual library
- `tests/` contain tests
- `docs/` for the public docs on vla.run
- `examples/` for example apps that use Vla

## Developing locally

You need to have Node.js with Corepack installed.

Install dependencies:

```
corepack enable
pnpm install
```

Run tests:

```
pnpm test
```

Run an example:

```
cd examples/nextjs
pnpm dev
```

Lint with [Biome](https://biomejs.dev/):

```
pnpm lint
pnpm format
```

## Releasing

_Note:_ This is for maintainers.

1. `pnpm bumpp`
2. `npm publish`