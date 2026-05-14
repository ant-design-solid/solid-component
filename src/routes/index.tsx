import { A } from "@solidjs/router";
import { For } from "solid-js";

import DocsLayout from "../components/docs/DocsLayout";
import { componentPages } from "../docs";

const highlights = [
  {
    title: "Composable primitives",
    description:
      "Packages expose low-level building blocks instead of opinionated widgets, so you can fit them into an existing design system.",
  },
  {
    title: "Solid-first ergonomics",
    description:
      "APIs follow Solid patterns such as fine-grained reactivity, context-driven composition and light runtime abstractions.",
  },
  {
    title: "Package-by-package docs",
    description:
      "Each package gets its own landing page with usage guidance, examples and implementation notes.",
  },
];

export default function HomeRoute() {
  return (
    <DocsLayout sidebar={false}>
      <div class="home-hero">
        <div class="hero-copy">
          <span class="hero-kicker">Solid UI primitives</span>
          <h1>Build composable interactions without pulling in a full component framework.</h1>
          <p>
            Solid Components is a growing set of focused packages for motion, floating layers,
            overflow handling and polymorphic rendering.
          </p>

          <div class="hero-actions">
            <A class="hero-primary" href="/guide/getting-started">
              Get started
            </A>
            <A class="hero-secondary" href="/components">
              Browse packages
            </A>
          </div>
        </div>

        <div class="hero-panel">
          <div class="hero-panel-chip">Current packages</div>
          <For each={componentPages}>
            {(page) => (
              <A class="hero-package" href={page.href}>
                <strong>{page.title}</strong>
                <span>{page.summary ?? page.description}</span>
              </A>
            )}
          </For>
        </div>
      </div>

      <section class="home-section">
        <div class="section-heading">
          <span>Why this docs site</span>
          <h2>VueUse-like navigation, but tuned for component primitives.</h2>
        </div>
        <div class="highlight-grid">
          <For each={highlights}>
            {(item) => (
              <article class="highlight-card">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            )}
          </For>
        </div>
      </section>

      <section class="home-section">
        <div class="section-heading">
          <span>Component catalog</span>
          <h2>Start from the interaction pattern you need.</h2>
        </div>
        <div class="package-grid">
          <For each={componentPages}>
            {(page) => (
              <A class="package-card" href={page.href}>
                <div class="package-card-top">
                  <strong>{page.title}</strong>
                  <span>{page.packageName}</span>
                </div>
                <p>{page.description}</p>
              </A>
            )}
          </For>
        </div>
      </section>
    </DocsLayout>
  );
}
