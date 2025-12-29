// @ts-check

import starlight from "@astrojs/starlight"
import { defineConfig } from "astro/config"

// https://astro.build/config
export default defineConfig({
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
      ],
      customCss: ["./src/styles/custom.css"],
      sidebar: [
        {
          label: "Guides",
          items: [
            { label: "Getting Started", slug: "guides/getting-started" },
            { label: "Core Concepts", slug: "guides/core-concepts" },
            { label: "Memoization", slug: "guides/memoization" },
            { label: "Context", slug: "guides/context" },
            { label: "Testing", slug: "guides/testing" },
            {
              label: "Framework Integration",
              slug: "guides/framework-integration",
            },
            { label: "Best Practices", slug: "guides/best-practices" },
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
          label: "Reference",
          items: [
            { label: "Vla Namespace", slug: "reference/vla" },
            { label: "Kernel", slug: "reference/kernel" },
            { label: "Base Classes", slug: "reference/base-classes" },
            { label: "Memoization API", slug: "reference/memoization" },
          ],
        },
      ],
    }),
  ],
})
