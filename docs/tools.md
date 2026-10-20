# Tools

The **Tools** section of the app (`/tools`) holds small, offline generators. Everything runs in the webview: nothing is sent to the API or the network. Settings are remembered in `localStorage`, and the code editors follow the global editor config (theme, Vim motions, relative line numbers) from the header settings popover.

| Tool                | Route                 | Input                       | Output                           |
| :------------------ | :-------------------- | :-------------------------- | :------------------------------- |
| JSON → Types        | `/tools/json-types`   | A JSON sample               | TypeScript or Go type definitions |
| Interfaces → Docs   | `/tools/interface-docs` | TypeScript or Go declarations | A Markdown API contract (preview, `.md`, PDF) |

Code lives in `frontend/src/features/json-types/` and `frontend/src/features/interface-docs/`. Both share the `CodePane` CodeMirror editor.

## JSON → Types

Paste a JSON document on the left; the generated types appear on the right and can be copied.

### How types are inferred

`lib/infer.ts` merges everything observed at each position of the JSON into a single shape:

- **Optional fields**: a key missing from some of the objects merged at that position is emitted as optional.
- **Unions**: different primitives at the same position become a union (`string | number`). An integer field that is sometimes fractional is just a `number`.
- **Nullable**: `null` is added to the union of the field.
- **Arrays**: all elements are merged into one item type, so `[{"a":1},{"a":1,"b":2}]` yields `{ a: number; b?: number }`.
- **Names**: nested objects are named after the key that holds them (singularized for array items). Identical structures share one type. The root name is configurable.

### Options

| Language   | Option                          | Default     |
| :--------- | :------------------------------ | :---------- |
| TypeScript | Declare as `interface` / `type` | `interface` |
| Go         | `omitempty` on optional fields  | on          |
| Go         | Pointers for optional fields    | on          |

Type mapping: TypeScript uses `string`, `number`, `boolean`, `unknown`; Go uses `string`, `int64`, `float64`, `bool`, `any` with `json:"key"` tags. Go fields are exported identifiers; nullable values become pointers (except slices and `any`).

### Adding a language

Implement `TargetLanguage` (`lib/languages/types.ts`) in its own file and list it in `lib/languages/index.ts`. Declared `options` get a control in the page automatically.

## Interfaces → Docs

Paste TypeScript or Go declarations and get a readable API contract in Markdown, with a live preview, in the language of your choice (English or Spanish).

Pipeline: `lib/sources/{typescript,go}.ts` parse the source into a language-agnostic `Contract` (`lib/model.ts`), and `lib/render-markdown.ts` renders it. A new source language only needs a parser.

### Supported input

- **TypeScript**: `interface`, `type` aliases and `enum`; everything else (imports, functions, classes) is skipped. `Date` is a date-time string, `Record`/`Map` are maps, `Set`/`Array` are arrays; `?` and `| undefined` make a field optional, `| null` makes it nullable. Inheritance (`extends`) shows the inherited fields in the child table.
- **Go**: `type` declarations as `encoding/json` sees them. Fields are named after their `json` tag, `omitempty` makes them optional, pointers make them nullable, and typed constants of a named string/integer type become enum values. Common types are recognized (`time.Time`, `uuid.UUID`, `decimal.Decimal`, `json.RawMessage`, sized integers).

### Documenting fields

Doc comments (`/** */` in TypeScript, `//` in Go) become descriptions. Three tags are read, and any other `@word` stays in the text:

| Tag                         | Effect                                               |
| :-------------------------- | :--------------------------------------------------- |
| `@deprecated [reason]`      | Marks the field or type as deprecated (Go also accepts `Deprecated:`) |
| `@default` / `@defaultValue` | Shown in the field table and used in the JSON example |
| `@example`                  | Value used in the generated JSON example             |

```ts
interface Order {
  /** Lifecycle state. @example "open" @example "closed" */
  status: string
  /** Units ordered. @default 1 */
  qty: number
}
```

Values are parsed as JSON; if that fails they are used as a plain string (`@example Ada` and `@example "Ada"` are equivalent).

### JSON examples

With **JSON examples** on, each object declaration gets a sample payload:

1. Field value: documented `@example`, then `@default`, then a default for the type (`"string"`, `0`, `true`, ISO date, UUID, first enum value…).
2. **Several `@example` tags** on fields produce one block per sample: sample *n* uses the *n*-th `@example` of each field (falling back to the first one when a field has fewer). Nested and referenced objects count too. Blocks are labelled `Example: 1`, `Example: 2`…; a single sample is just `Example`.
3. Recursive types stop at the first repetition.

`@example` values are not repeated in the field table; `@default` is.

### Document settings

The settings popover controls: title, version, document language, table of contents, JSON examples, typography (fonts, sizes, line height, heading scale) and an optional header image (fit and height).

### Export

- **Markdown**: downloads the generated `.md`, named after the title.
- **PDF / print**: paginated A4 layout with page numbers and working in-document links. Typography and header image are applied.

## Tests

```bash
cd frontend
pnpm vitest run src/features/json-types src/features/interface-docs
```
