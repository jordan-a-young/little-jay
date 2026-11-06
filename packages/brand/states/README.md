# Pebble · App state illustrations

Four transparent PNG illustrations using the approved Little Jay mascot. These are static images, not animated assets or SVGs. Native image dimensions are listed in manifest.json. No generated words are embedded in the illustrations, so interface copy can be localized independently.

| File               | Intended use                  | Example copy                                |
| ------------------ | ----------------------------- | ------------------------------------------- |
| pebble-loading.png | Loading or background work    | Loading your projects…                      |
| pebble-success.png | A completed action            | Your project is ready.                      |
| pebble-error.png   | Recoverable error             | We could not load your projects. Try again. |
| pebble-empty.png   | Empty list or first-use state | No projects yet. Create your first project. |

## Integrate into the monorepo

Put these PNGs in your canonical branding package, then expose or synchronize them into the app's public directory using the existing branding asset workflow. For example, with files served from `/branding/states/`:

```tsx
<section aria-busy={loading}>
  <img
    src="/branding/states/pebble-loading.png"
    alt=""
    width={200}
    height={200}
    style={{ objectFit: "contain" }}
  />
  <p role="status">Loading your projects…</p>
</section>
```

Choose the state explicitly from application state. Pair every illustration with clear visible text and an appropriate action where useful. Empty alt text is appropriate when adjacent text already communicates the state. If the image conveys information not provided elsewhere, give it concise descriptive alt text instead. Use a polite live status region for asynchronous updates; reserve alerts for errors requiring immediate attention. Use `aria-busy` on the affected content region.

The loading image itself does not animate. Pair it with a progress indicator or optional subtle motion; respect `prefers-reduced-motion`. Do not imply measurable progress with an arbitrary percentage. Use `object-fit: contain` and a consistent image box to preserve proportions and reduce layout shifts. Prefer these illustrations at roughly 120–240 CSS pixels; use ordinary icons for tiny inline states.

Original PNG files are preserved without resizing or recoloring. They have real alpha transparency and can sit on light or dark surfaces. Export optimized web sizes through your asset pipeline if needed. Inspect actual production layouts on both themes.

## Generation notes and prompt set

Created with the built-in image-generation tool, referencing `pebble-original.png` from the approved brand kit. Common prompt: preserve Pebble's oversized round head, compact seated body, swept crest, ivory face and belly, blue wings with ivory scallops, striped tail, tiny feet, navy outlines; use Jay Blue #3276C3, Ink #25344A, Ivory #FAF7F0, Honey #F2BF64, and Cloud #E8F1FB for the empty-state box; transparent background, no wordmark, no UI panel. Individual directions:

- Loading: patient thinking pose, wing by cheek, three honey dots above head.
- Success: both small wings raised, smiling curved eyes, cheerful beak, honey sparkles.
- Error: mild puzzlement, head tilt, soft asymmetrical brows, wing shrug, honey question mark; reassuring rather than distressed.
- Empty: curious head angled toward a small empty open cloud-blue box, wing resting on its edge, honey sparkle.
