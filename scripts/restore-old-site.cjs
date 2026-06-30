const fs = require("node:fs");
const path = require("node:path");
const cheerio = require("cheerio");

const oldRoot = process.argv[2] || "/tmp/skymecode.github.io-old";
const srcRoot = path.resolve("src");
const publicRoot = path.join(srcRoot, ".vuepress", "public");

const blockTags = new Set([
  "article",
  "blockquote",
  "div",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "ul",
]);

function walk(dir, matcher, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, matcher, acc);
    else if (matcher(full)) acc.push(full);
  }
  return acc;
}

function escapeYaml(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function dateOnly(value) {
  if (!value) return undefined;
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : String(value);
}

function decodeEntityText(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parsePageData() {
  const map = new Map();
  for (const file of walk(path.join(oldRoot, "assets"), (item) => item.endsWith(".js"))) {
    const text = fs.readFileSync(file, "utf8");
    if (!text.includes("filePathRelative")) continue;
    const match = text.match(/JSON\.parse\((['`])([\s\S]*)\1\);export\{/);
    if (!match) continue;
    const jsonText = Function(`return ${match[1]}${match[2]}${match[1]}`)();
    const data = JSON.parse(jsonText);
    const pagePath = decodeURIComponent(data.path || "").replace(/^\//, "");
    if (pagePath) map.set(pagePath, data);
  }
  return map;
}

function cleanText(text) {
  return decodeEntityText(text)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

function trimBlankLines(text) {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fenceFor(code) {
  const ticks = code.match(/`{3,}/g) || [];
  const max = ticks.reduce((len, item) => Math.max(len, item.length), 2);
  return "`".repeat(max + 1);
}

function inline($, node) {
  if (node.type === "text") return cleanText(node.data);
  if (node.type !== "tag") return "";

  const el = $(node);
  const tag = node.name.toLowerCase();

  if (tag === "br") return "\n";
  if (tag === "code") return `\`${el.text().replace(/`/g, "\\`")}\``;
  if (tag === "strong" || tag === "b") return `**${inlineChildren($, el)}**`;
  if (tag === "em" || tag === "i") return `*${inlineChildren($, el)}*`;
  if (tag === "s" || tag === "del") return `~~${inlineChildren($, el)}~~`;
  if (tag === "img") {
    const src = el.attr("src") || "";
    return src ? `![](${src})` : "";
  }
  if (tag === "a") {
    const href = el.attr("href") || "";
    const text = inlineChildren($, el) || href;
    return href ? `[${text}](${href})` : text;
  }
  if (tag === "input" && el.attr("type") === "checkbox") {
    return el.attr("checked") == null ? "[ ]" : "[x]";
  }
  if (blockTags.has(tag)) return block($, el);

  return inlineChildren($, el);
}

function inlineChildren($, el) {
  return el
    .contents()
    .toArray()
    .map((node) => inline($, node))
    .join("")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function listItem($, el, marker, depth) {
  const children = el.contents().toArray();
  const parts = [];
  for (const child of children) {
    if (child.type === "text") {
      const text = cleanText(child.data);
      if (text) parts.push(text);
      continue;
    }
    if (child.type !== "tag") continue;
    const tag = child.name.toLowerCase();
    const childEl = $(child);
    if (tag === "ul" || tag === "ol") {
      const nested = block($, childEl, depth + 1);
      if (nested) parts.push(`\n${nested}`);
    } else if (blockTags.has(tag) && tag !== "p") {
      const value = block($, childEl, depth);
      if (value) parts.push(`\n${value}`);
    } else {
      const value = inline($, child);
      if (value) parts.push(value);
    }
  }

  const text = trimBlankLines(parts.join(" ").replace(/ \n/g, "\n"));
  const indent = "  ".repeat(depth);
  if (!text.includes("\n")) return `${indent}${marker} ${text}`;
  const [first, ...rest] = text.split("\n");
  return `${indent}${marker} ${first}\n${rest.map((line) => `${indent}  ${line}`).join("\n")}`;
}

function table($, el) {
  const rows = [];
  el.find("tr").each((_, tr) => {
    const cells = [];
    $(tr)
      .children("th,td")
      .each((__, cell) => cells.push(inlineChildren($, $(cell)).replace(/\|/g, "\\|")));
    if (cells.length) rows.push(cells);
  });
  if (!rows.length) return "";
  const width = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => [...row, ...Array(width - row.length).fill("")]);
  const header = normalized[0];
  const sep = Array(width).fill("---");
  const body = normalized.slice(1);
  return [header, sep, ...body].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

function block($, el, depth = 0) {
  const tag = el[0]?.name?.toLowerCase();
  if (!tag) return "";

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag.slice(1));
    return `${"#".repeat(level)} ${inlineChildren($, el)}`;
  }

  if (tag === "p") return inlineChildren($, el);
  if (tag === "hr") return "---";

  if (tag === "pre") {
    const code = el.find("code").first().text() || el.text();
    const className = el.attr("class") || el.find("code").first().attr("class") || "";
    const lang = (className.match(/language-([^\s]+)/) || [])[1] || "";
    const fence = fenceFor(code);
    return `${fence}${lang}\n${code.replace(/\n+$/, "")}\n${fence}`;
  }

  if (tag === "div" && /\blanguage-/.test(el.attr("class") || "")) {
    const code = el.find("pre code").first().text() || el.find("pre").first().text();
    const lang =
      el.attr("data-ext") ||
      ((el.attr("class") || "").match(/language-([^\s]+)/) || [])[1] ||
      "";
    const fence = fenceFor(code);
    return `${fence}${lang}\n${code.replace(/\n+$/, "")}\n${fence}`;
  }

  if (tag === "blockquote") {
    return blockChildren($, el, depth)
      .split("\n")
      .map((line) => (line ? `> ${line}` : ">"))
      .join("\n");
  }

  if (tag === "ul" || tag === "ol") {
    let index = 1;
    return el
      .children("li")
      .toArray()
      .map((li) => listItem($, $(li), tag === "ol" ? `${index++}.` : "-", depth))
      .join("\n");
  }

  if (tag === "figure") {
    const img = el.children("img").first();
    if (img.length) {
      const src = img.attr("src") || "";
      return src ? `![](${src})` : "";
    }
  }

  if (tag === "table") return table($, el);

  return blockChildren($, el, depth);
}

function blockChildren($, el, depth = 0) {
  return trimBlankLines(
    el
      .contents()
      .toArray()
      .map((node) => {
        if (node.type === "text") return cleanText(node.data);
        if (node.type !== "tag") return "";
        return block($, $(node), depth);
      })
      .filter(Boolean)
      .join("\n\n"),
  );
}

function frontmatter(data, htmlTitle) {
  const fm = data.frontmatter || {};
  const lines = ["---"];
  const title = fm.title || data.title || htmlTitle;
  if (title) lines.push(`title: "${escapeYaml(title)}"`);
  if (fm.icon) lines.push(`icon: "${escapeYaml(fm.icon)}"`);
  const date = dateOnly(fm.date);
  if (date) lines.push(`date: ${date}`);
  if (Array.isArray(fm.category) && fm.category.length) {
    lines.push("category:");
    for (const item of fm.category) lines.push(`  - "${escapeYaml(item)}"`);
  }
  if (Array.isArray(fm.tag) && fm.tag.length) {
    lines.push("tag:");
    for (const item of fm.tag) lines.push(`  - "${escapeYaml(item)}"`);
  }
  if (fm.star) lines.push(`star: ${fm.star === true ? "true" : JSON.stringify(fm.star)}`);
  if (fm.article === false) lines.push("article: false");
  if (fm.timeline === false) lines.push("timeline: false");
  if (fm.description) lines.push(`description: "${escapeYaml(fm.description)}"`);
  lines.push("---", "");
  return lines.join("\n");
}

function convertHtmlPage(file, data) {
  const html = fs.readFileSync(file, "utf8");
  const $ = cheerio.load(html, { decodeEntities: true });
  const content = $(".theme-hope-content").first();
  if (!content.length) return "";

  content.find(".header-anchor,.line-numbers,.external-link-icon,.external-link-icon-sr-only").remove();
  content.find("span.token").each((_, span) => {
    const item = $(span);
    item.replaceWith(item.text());
  });

  const htmlTitle = ($("title").text() || "").replace(/\s*\|.*$/, "").trim();
  return `${frontmatter(data, htmlTitle)}${blockChildren($, content)}\n`;
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function copyPublicAssets() {
  fs.mkdirSync(publicRoot, { recursive: true });
  for (const name of ["favicon.ico", "logo.svg", "logo1.png", "logo2.jpg", "tx.jpg", "tp.jpg", "bz.png"]) {
    const source = path.join(oldRoot, name);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(publicRoot, name));
  }
}

function removeSamples() {
  for (const name of ["demo", "posts"]) {
    const target = path.join(srcRoot, name);
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  }
}

function main() {
  const pageData = parsePageData();
  const written = [];
  for (const [pagePath, data] of pageData) {
    const rel = data.filePathRelative;
    if (!rel || !rel.endsWith(".md")) continue;
    if (rel.includes("/README.md") || rel === "README.md") continue;
    const htmlFile = path.join(oldRoot, pagePath);
    if (!fs.existsSync(htmlFile)) continue;
    const markdown = convertHtmlPage(htmlFile, data);
    if (!markdown.trim()) continue;
    const target = path.join(srcRoot, rel);
    writeFile(target, markdown);
    written.push(path.relative(process.cwd(), target));
  }

  removeSamples();
  copyPublicAssets();

  console.log(`Restored ${written.length} markdown files.`);
  for (const file of written.sort()) console.log(file);
}

main();
