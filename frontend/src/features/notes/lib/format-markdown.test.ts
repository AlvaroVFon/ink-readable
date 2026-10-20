import { describe, expect, it } from "vitest";

import { formatMarkdown } from "./format-markdown";

describe("formatMarkdown", () => {
  it("normalizes markdown with prettier", async () => {
    const formatted = await formatMarkdown(
      "#  Title\n\n\n\n*   item\n\n\nsome    text\n",
    );

    expect(formatted).toBe("# Title\n\n- item\n\nsome text\n");
  });

  it("preserves frontmatter", async () => {
    const formatted = await formatMarkdown(
      "---\ntitle: Hello\ntags: [a, b]\n---\n\n#  Body\n",
    );

    expect(formatted).toBe("---\ntitle: Hello\ntags: [a, b]\n---\n\n# Body\n");
  });

  it("returns the same content when there is nothing to format", async () => {
    const content = "# Title\n\nBody\n";

    await expect(formatMarkdown(content)).resolves.toBe(content);
  });

  it("formats json code blocks", async () => {
    const formatted = await formatMarkdown(
      '```json\n{"level":"error","ctx":{"id":1,"tags":["a","b"]}}\n```\n',
    );

    expect(formatted).toBe(
      '```json\n{ "level": "error", "ctx": { "id": 1, "tags": ["a", "b"] } }\n```\n',
    );
  });

  it("formats code blocks in other languages", async () => {
    const formatted = await formatMarkdown(
      "```ts\nconst   a={b:1}\n```\n\n```css\na{color:red}\n```\n",
    );

    expect(formatted).toBe(
      "```ts\nconst a = { b: 1 };\n```\n\n```css\na {\n  color: red;\n}\n```\n",
    );
  });

  it("leaves code blocks that cannot be parsed untouched", async () => {
    const content = '```json\n{"level":\n```\n\n```\nplain   text\n```\n';

    await expect(formatMarkdown(content)).resolves.toBe(content);
  });
});
