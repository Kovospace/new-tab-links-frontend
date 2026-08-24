---
name: angular-code-standards
description: Coding standards for this Angular frontend - MVVM layering, SOLID, TSDoc, naming, component/service structure, templates, styling and testing rules. Load before writing, reviewing or refactoring any TypeScript, HTML template or SCSS in this repo.
---

# Angular code standards — NewTabLinks frontend

House rules for this repo. They are stricter than Angular defaults on purpose; follow them over
whatever a generator emits.

## MVVM — the rule that matters most

```
template (view)  →  view-model  →  service  →  HTTP / storage
```

- **Templates contain zero data transformation.** No `slice`, no arithmetic, no string building,
  no date/number formatting, no `a ? b : c` that computes a *value* rather than picking a branch
  of markup. Everything a template binds is already presentation-ready.
- Anything the template needs in a shape different from what the service returns is mapped in
  the **view-model**, exposed as a signal or a plain readonly field.
- **Components are thin.** A component wires a view-model to a template and handles user events
  by delegating. It does not fetch, does not map, does not decide business rules.
- **Services own data access and domain logic.** They return domain models, never view models.
- Mapping lives in a dedicated mapper/util, not inline, once it is more than a couple of lines.

Structural directives (`@if`, `@for`, `@switch`) choosing *which markup* to render are fine —
that is view logic, not data transformation.

## SOLID, size and naming

- One reason to change per class. A component that grew a second responsibility gets split.
- **Short methods.** If a method needs a comment to explain its middle, extract that middle into
  a named method. Prefer a second service or a util class over a long class.
- **Long, descriptive names are wanted.** A reader must guess what something does from the name
  alone: `loadEnvironmentsForSignedInUser()` over `load()`,
  `formattedInstallCountLabel` over `count`. Do not abbreviate to save characters.
- Files follow Angular v20+ conventions: `feature-name.ts`, `feature-name.html`,
  `feature-name.scss`, `feature-name.spec.ts`, class `FeatureName`.

## TSDoc — everywhere

Javadoc-equivalent on **every** class, method and non-trivial field, in Javadoc-ish TSDoc:

```ts
/**
 * Loads the link groups shown on the public showcase page.
 *
 * <p>Groups arrive from the backend already ordered; this view-model only maps them into the
 * presentation shape the template binds, so the template stays transformation-free.</p>
 *
 * @param environmentIdentifier id of the environment whose groups are shown
 * @returns presentation-ready groups, empty when the environment has none
 */
```

Say *why*, not just *what*. A comment restating the signature is noise.

## Angular specifics for this repo

- **Standalone components only** — no `NgModule`. Declare deps in `imports`.
- **Signals** for component/view-model state; `computed()` for derived state (that is where
  derivation belongs, not the template). RxJS only where a stream is genuinely a stream (HTTP,
  router events, websockets) — convert to signals at the view-model edge.
- `inject()` over constructor parameter injection.
- `ChangeDetectionStrategy.OnPush` on every component.
- Routes are lazy (`loadComponent` / `loadChildren`) unless the route is on the initial page.
- `strict` TypeScript stays on. No `any` — if a type is genuinely unknown, use `unknown` and
  narrow it.
- Never touch the DOM directly; no `document.querySelector` inside components.

## Styling

- SCSS. Component styles stay in the component's own `.scss`; only true globals go in
  `src/styles.scss`.
- Watch the `anyComponentStyle` budget in `angular.json` (4 kB warn / 8 kB error).

## Tests

- `vitest` via `ng test`. Every view-model with real mapping logic gets a spec — mapping is the
  part worth testing, and MVVM makes it testable without the DOM.
- Component specs assert rendered output, not internals.
- Do not report a change as done without running `ng build` and `ng test --watch=false`.

## Before you add a dependency

Say out loud why the platform or Angular itself cannot do it, and what the bundle cost is.
Bundle budgets are enforced by the production build.
