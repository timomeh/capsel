// @ts-check

import node from "@astrojs/node"
import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"
import starlightLlmsTxt from "starlight-llms-txt"

// https://astro.build/config
export default defineConfig({
  site: "https://vla.run/",
  integrations: [
    starlight({
      title: "Vla",
      logo: {
        src: "./src/assets/logo-large.png",
        replacesTitle: true,
        alt: "Vla",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/timomeh/vla",
        },
        {
          icon: "npm",
          label: "npm",
          href: "https://www.npmjs.com/package/vla",
        },
      ],
      plugins: [
        starlightLlmsTxt({
          promote: [
            "guides/installation*",
            "guides/actions*",
            "guides/services*",
            "guides/repos*",
            "guides/resources*",
            "guides/putting-together*",
            "guides/modules*",
            "guides/scopes*",
            "reference/classes/*",
            "guides/context*",
            "guides/memoization*",
            "guides/testing*",
            "guides/why-vla*",
          ],
          customSets: [
            {
              label: "Reference",
              description:
                "Full reference documentation for Vla's classes and Kernel",
              paths: ["reference/**"],
            },
            {
              label: "Guides",
              description: "Guides how to use Vla",
              paths: ["guides/**"],
            },
            {
              label: "Tutorial",
              description: "Step by step usage instructions",
              paths: [
                "guides/installation*",
                "guides/actions*",
                "guides/services*",
                "guides/repos*",
                "guides/resources*",
                "guides/putting-together*",
                "guides/modules*",
              ],
            },
            {
              label: "Framework Integrations",
              description:
                "Integration Guides for different popular frameworks like Next.js, Express, SvelteKit, Tanstack Start and more",
              paths: ["frameworks/**"],
            },
          ],
        }),
      ],
      customCss: ["./src/styles/custom.css"],
      favicon: "/favicon.svg",
      head: [
        {
          tag: "link",
          attrs: {
            rel: "shortcut icon",
            href: "/favicon.ico",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/favicon-96x96.png",
            type: "image/png",
            sizes: "96x96",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "icon",
            href: "/favicon.svg",
            type: "image/svg+xml",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "apple-touch-icon",
            href: "/apple-touch-icon.png",
            sizes: "180x180",
          },
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Installation", slug: "guides/installation" },
            { label: "Adding Actions", slug: "guides/actions" },
            { label: "Using Services", slug: "guides/services" },
            { label: "Using Repos", slug: "guides/repos" },
            { label: "Using Resources", slug: "guides/resources" },
            {
              label: "Putting Everything Together",
              slug: "guides/putting-together",
            },
            { label: "Modules and Facades", slug: "guides/modules" },
            { label: "Why Vla?", slug: "guides/why-vla" },
          ],
        },
        {
          label: "Guides",
          items: [
            {
              label: "Application Structure",
              slug: "guides/application-structure",
            },
            { label: "File Structure", slug: "guides/file-structure" },
            { label: "Context", slug: "guides/context" },
            { label: "Scopes", slug: "guides/scopes" },
            { label: "Memoization", slug: "guides/memoization" },
            { label: "Testing", slug: "guides/testing" },
          ],
        },
        {
          label: "Classes",
          items: [
            { label: "Action", slug: "reference/classes/action" },
            { label: "Service", slug: "reference/classes/service" },
            { label: "Repo", slug: "reference/classes/repo" },
            { label: "Resource", slug: "reference/classes/resource" },
            { label: "Facade", slug: "reference/classes/facade" },
          ],
        },
        {
          label: "Framework Integration",
          items: [
            { label: "Next.js", slug: "frameworks/nextjs" },
            { label: "SvelteKit", slug: "frameworks/sveltekit" },
            { label: "React Router", slug: "frameworks/react-router" },
            {
              label: "Tanstack Start",
              slug: "frameworks/tanstack-start",
            },
            { label: "Express", slug: "frameworks/express" },
            { label: "Koa", slug: "frameworks/koa" },
            {
              label: "Other Frameworks",
              slug: "frameworks/other",
            },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "Vla Namespace", slug: "reference/vla" },
            { label: "Kernel", slug: "reference/kernel" },
            { label: "Memoization API", slug: "reference/memoization" },
          ],
        },
      ],
    }),
  ],

  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  server: {
    host: "0.0.0.0",
  },
})
