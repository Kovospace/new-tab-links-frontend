---
name: angular-code-standards
description: Coding standards for this Angular frontend - the MVVM view-model pattern actually used here, SOLID, TSDoc, naming, the i18n rule, the SCSS convention that a class exists only where a rule uses it, Angular specifics (signals, standalone, OnPush, lazy routes) and testing rules. Load before writing, reviewing or refactoring any TypeScript, HTML template or SCSS in this repo.
---

# Angular code standards — NewTabLinks frontend

House rules for this repo. They are stricter than Angular defaults on purpose; follow them over
whatever a generator emits.

## MVVM — the rule that matters most

```
template (view)  →  view-model  →  service  →  HTTP client  →  backend
```

**Every page and every panel is a component plus a view-model beside it**, named
`thing-page.ts` / `thing-page.view-model.ts`. The view-model is `@Injectable()` — no
`providedIn` — and listed in the component's own `providers`, so it lives and dies with the
component and each instance gets its own.

The component is thin to the point of dullness: it injects the view-model as `protected readonly
viewModel`, and does nothing else beyond an `ngOnInit` that asks the view-model to load, or a
DOM-event narrowing too small to belong anywhere else.

**Templates contain zero data transformation.** No arithmetic, no string building, no date or
number formatting, no `a ? b : c` computing a *value*, no reaching into a form control. Whatever
a template binds is already finished text. Structural directives (`@if`, `@for`, `@switch`)
picking *which markup* to render are fine — that is view logic, not data transformation.

Worked examples already in the repo:

- `features/devices/devices-page.view-model.ts` — `presentedDevices` turns backend rows into
  `PresentedDevice`, every timestamp formatted and every state worded.
- `shared/layout/page-footer/page-footer.view-model.ts` — the copyright line is assembled from a
  translated sentence, the author's name and the current year *before* it reaches the template.
- `features/download/download-page.view-model.ts` — whether a download link can be offered at all
  is decided in the view-model; the template only picks between two blocks of markup.

Shared behaviour lives in `shared/forms/abstract-form.view-model.ts`: submission in flight,
failure wording, success wording, the backend's per-field complaints. Extend it rather than
re-declaring those four signals.

## The one sanctioned transformation in a template

`{{ 'nav.home' | translate }}`. A translation key is not data — it *is* the label — and routing
every static word through a view-model would add a member per word and gain nothing.

The line is: **static labels use the pipe; anything derived from loaded data is worded in the
view-model.** A device's state, a formatted date, a backend error, the copyright line: all
translated in the view-model and bound as finished strings.

**`TranslatePipe` is deliberately impure, and this is not negotiable.** Its input never changes
(`'nav.home'` is the same string forever), and Angular caches a *pure* pipe's result against its
arguments — so a pure pipe evaluates once, never reads the translation signal again, and the page
stays in whatever language loaded first. There is a test for this
(`core/i18n/translate.pipe.spec.ts`, "re-renders an already rendered template"); it is not
decoration. The pipe also holds an `effect` that calls `markForCheck()` when the language changes,
because under zoneless change detection impurity alone never gets the view re-checked.

## Strings live in JSON, never in code

Every user-visible word is a key in `public/i18n/en.json` and `public/i18n/sk.json`. The two files
must have **exactly the same key set** — check it before finishing:

```bash
python3 -c "
import json
def keys(d,p=''):
    out=set()
    for k,v in d.items(): out |= keys(v,p+k+'.') if isinstance(v,dict) else {p+k}
    return out
en=keys(json.load(open('public/i18n/en.json'))); sk=keys(json.load(open('public/i18n/sk.json')))
print('en-only:',sorted(en-sk)); print('sk-only:',sorted(sk-en))"
```

Adding a third language means adding a file and one entry in
`core/i18n/supported-language.ts` — nothing else enumerates languages.

An unknown key renders as the key itself, on purpose: a missing translation should be visible on
the page, not an empty element.

## Styling — hand-written, and partial

**The visual identity is the owner's and is being written by hand, page by page.** Parts of the
site are styled — the header and its mobile menu, the tables, the form controls, the admin modals,
`src/styles.scss` — and parts are not. Do not add colours, spacing, fonts or layout unless asked
to.

**A class exists when a rule uses it.** The site was built with every class shipped as an empty
placeholder rule; those were removed on 2026-09-03, along with the class attributes that named
them. What follows from that:

- A component's `.scss` holds only rules that declare something. **Never add an empty rule as a
  hook for later** — it will be deleted again.
- A template carries only classes something uses: a rule, a spec, or TypeScript. Adding a style
  means adding the rule *and* the class; removing the last declaration means removing both.
- Before deleting a class from a template, check it is not a test hook. `app.spec.ts` queries
  `.page-header__navigation-link`, `.page-footer__copyright` and others by name, and a class named
  only in a compound selector elsewhere (`td.devices-page__cell > div.devices-page__cell-content`)
  is in use too. A class kept solely as a test handle is doing a real job — but where a spec is
  really asserting that a routed component rendered, prefer its element selector
  (`app-home-page h1`) to a class, as `app.spec.ts` does for the home page.
- Many components' `.scss` now holds nothing but its header comment. That is deliberate — the
  file stays wired up through `styleUrl`, ready to write into.

Class names are BEM-ish and scoped to the component (`.devices-page__cell-content`). Only
genuinely global rules go in `src/styles.scss`.

`src/design-tokens.scss` holds every global value as a custom property on `:root` — colour,
spacing, type, layout, borders, elevation, motion, stacking. Some are decided (the dark palette,
the body font, the transition timings); the rest are still **inert**, set to a value that does
nothing (`currentColor`, `0`, `inherit`, `none`) so the name exists while the decision waits.
Never write a literal colour, size or duration in a component — add or fill a token instead.

Use `var(--space-3)` from any component's own `.scss`: custom properties inherit through Angular's
emulated encapsulation, so no import is needed and SCSS `$variables` are the wrong tool.

**Colour tokens are spelled `--color-`, American, even though the prose here is British.** They sit
against the CSS properties that consume them (`color`, `background-color`, `currentColor`), and the
penalty for typing the other spelling is silent — see below.

Three traps, all of which have already cost time once:

- A `var()` naming a token that does not exist, with no fallback, makes the **whole declaration**
  compute to `unset` — it does not fall back to the previous value, and nothing is logged. A
  mistyped token name therefore looks exactly like "my styles are being ignored".
- Custom properties are invalid in media queries, so breakpoints stay SCSS variables or literals.
- The document's colour, background and font belong on `html`, not on `*`. `reset.scss` already
  sets `color: inherit` and `font: inherit` on every element, so one declaration inherits
  everywhere, and a `background-color` on `*` gives every element an opaque backdrop that makes
  later layering impossible.

`src/reset.scss` loads ahead of both and removes **every** browser default — spacing, typography,
list markers, link colour, table spacing, and the platform chrome on form controls. So a heading,
a button and a paragraph all start out looking identical, and inputs and buttons are invisible
until the design gives them a look. That is intended: read the file's header before adding to it,
and put anything that decides how something *looks* in the owning component instead.

## SOLID, size and naming

- One reason to change per class. The account page is three panels with three view-models rather
  than one class doing four unrelated things — follow that when a page grows.
- **Short methods.** If a method needs a comment to explain its middle, extract that middle.
  Prefer a second service or a free function in `shared/` over a long class.
- **Long, descriptive names are wanted.** `loadEnvironmentsForSignedInUser()` over `load()`,
  `presentedDevices` over `items`. Do not abbreviate to save characters.
- Files follow Angular v20+ conventions: `feature-name.ts`, `.html`, `.scss`, `.spec.ts`, class
  `FeatureName`. View-models add `.view-model.ts`.

## TSDoc — everywhere

Javadoc-equivalent on **every** class, method and non-trivial field, in Javadoc-ish TSDoc with
`<p>` paragraphs, `@param` and `@returns`. Say *why*, not just *what*; a comment restating the
signature is noise. Where a decision could reasonably have gone the other way, the doc comment is
where the reason belongs — see `ExtensionConnectPanelViewModel` for the shape of that.

## Angular specifics for this repo

- **Standalone components only**, no `NgModule`. Dependencies in `imports`.
- **Signals** for all component and view-model state; `computed()` for anything derived — that is
  where derivation belongs, not in the template. RxJS only where something genuinely is a stream
  (HTTP, router events); convert at the view-model edge.
- `inject()` over constructor parameters, everywhere.
- `ChangeDetectionStrategy.OnPush` on every component. The application is **zoneless**.
- **Every route is lazy** (`loadComponent`). Route paths live in
  `core/routing/application-route-paths.ts`, never as literals — three of them are pinned by
  backend configuration.
- Backend calls go through `core/api/backend-api.client.ts`, never `HttpClient` directly, so the
  base URL, the device header and the "unauthenticated" marker stay in one place.
- **Environment-dependent values are injected, never compiled in.** Inject
  `RUNTIME_CONFIGURATION` (`core/config/runtime-configuration.ts`); it is resolved from
  `config.json` at container start so one image serves every environment. See the
  `deployment-pipeline` skill before adding a value to it.
- Backend DTOs are mirrored as interfaces in `core/api/models/`, one file per concern, each
  naming the backend record it mirrors. Field names must not drift.
- `strict` TypeScript stays on. No `any`; use `unknown` and narrow.
- Never touch the DOM directly from a component.

## Tests

`vitest` via `ng test`. Specs live in `tests/`, never in `src/`, at the path of the file they
cover — as in a Java project: `src/app/core/auth/authentication.interceptor.ts` is tested by
`tests/app/core/auth/authentication.interceptor.spec.ts`. A spec imports what it tests through the
`@app/*` alias (`tsconfig.json` → `src/app/*`), e.g. `'@app/core/auth/authentication.interceptor'`.
`angular.json` (`test.options.include`, resolved against `src/`, hence `../tests`) and
`tsconfig.spec.json` both point there.

What is worth testing here:

- **Every view-model with real mapping logic** — that is the part MVVM makes testable without a
  DOM, and the part that breaks.
- **Anything where a framework assumption is load-bearing**, such as the impure-pipe behaviour
  above. Those tests are why the assumption is known to hold.
- **The interceptor's refresh-and-replay**, with `HttpTestingController`.
- Component specs assert rendered output through class hooks, never internals.

Run `npx ng build` and `npx ng test --watch=false` before reporting anything as done, and report
what they actually said.

## Before you add a dependency

Say why the platform or Angular itself cannot do it, and what it costs in bundle size. Production
builds enforce the budgets in `angular.json`.
