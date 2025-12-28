# SvelteKit + Vla Example

This example demonstrates how to use Vla with SvelteKit.

## Running the example

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Features

- Type-safe data layer with Vla
- Server-side rendering with SvelteKit
- Form actions for post creation and progressive enhancement
- API endpoints
- Session management with cookies

## Endpoints

- `GET /` - HTML page with posts listing and creation form
- `GET /api/posts` - Get posts as JSON

## Project Structure

- `src/hooks.server.ts` - SvelteKit hooks for Vla middleware setup
- `src/routes/` - SvelteKit routes and pages
- `src/data/` - Data layer with Vla classes
