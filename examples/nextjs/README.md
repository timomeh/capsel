# Next.js + Vla Example

This example demonstrates how to use Vla with Next.js.

## Running the example

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- Type-safe data layer with Vla
- Server-side rendering with Next.js App Router
- Server Actions for post creation
- Session management with cookies

## Endpoints

- `GET /` - HTML page with posts listing and creation form
- `GET /api/posts` - Get posts as JSON

## Project Structure

- `src/app/` - Next.js App Router pages and layouts
- `src/data/` - Data layer with Vla classes
