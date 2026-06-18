/**
 * Engine performance benchmark — comprehensive suite.
 *
 * Built on tinybench. Groups tasks by engine subsystem (parser / compiler /
 * utils / end-to-end), reports per-task statistics, and appends each run to
 * bench/history.jsonl tagged with the git commit.
 *
 * Run:  bun bench/engine-bench.ts
 *       bun bench/engine-bench.ts --time 1000        # ms per task (default 400)
 *       bun bench/engine-bench.ts --group parser     # only one group
 *       bun bench/engine-bench.ts --no-log           # don't append history
 */

import { Bench } from "tinybench"
import { appendFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { execSync } from "node:child_process"

import {
  MarkdownParser,
  compileRule,
  validateRule,
  getBuiltinRules,
  DEFAULT_HOST,
} from "../src/engine"
import { generateRuleTokens } from "../src/engine/compiler/token-generator"
import { serializeStyleSheet } from "../src/engine/compiler/serializer"
import { toCssCustomProperty } from "../src/engine/compiler/css-variable"
import { formatByStyle } from "../src/engine/utils/number-format-utils"
import { evaluateNumericTemplateExpression } from "../src/engine/utils/template-expression-utils"

const here = dirname(fileURLToPath(import.meta.url))
const HISTORY_PATH = resolve(here, "history.jsonl")

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)
const num = (flag: string, fallback: number): number => {
  const i = args.indexOf(flag)
  return i >= 0 ? Number(args[i + 1]) : fallback
}
const str = (flag: string): string | null => {
  const i = args.indexOf(flag)
  return i >= 0 ? (args[i + 1] ?? null) : null
}
const TIME_MS = num("--time", 400)
const LOG_HISTORY = !args.includes("--no-log")
const ONLY_GROUP = str("--group")

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const rule = getBuiltinRules()[0]!
const parserConfig = {
  ...rule.parser,
  headingStyles: { h1: "", h2: "{zhHansIndex}", h3: "{zhHansIndex}", h4: "{arabicIndex}" },
}

const PARAGRAPH =
  "各部门要充分认识本次工作的重要意义，按照统一部署，扎实推进各项任务落实，确保取得实效。" +
  "要加强组织领导，明确责任分工，建立健全工作机制，形成齐抓共管的良好局面。"

// Plain markdown: headings + paragraphs, scalable by paragraph count.
function makeDocument(paragraphs: number): string {
  const blocks: string[] = ["# 关于进一步加强工作的通知"]
  for (let i = 0; i < paragraphs; i += 1) {
    if (i % 5 === 0) blocks.push(`## 第${i / 5 + 1}部分 工作要求`)
    if (i % 5 === 2) blocks.push(`### 具体措施`)
    blocks.push(PARAGRAPH)
  }
  return blocks.join("\n\n")
}

// Mixed-script content that exercises the text-font-scope plugin
// (latin runs, 中文引号 “”, 书名号 《》).
function makeMixedDocument(paragraphs: number): string {
  const blocks: string[] = ["# Annual Report 年度报告 2026"]
  for (let i = 0; i < paragraphs; i += 1) {
    blocks.push(
      `根据《中华人民共和国标准化法》要求，本系统 v2.1 在 GB/T 9704 规范下运行，` +
        `“关键指标”同比增长 12.5%，详见 Appendix A 与《技术白皮书》。`,
    )
  }
  return blocks.join("\n\n")
}

// Document with local-style containers (custom block tokenizer + alias lookup).
function makeLocalStyleDocument(blocks: number): string {
  const out: string[] = ["# 通知"]
  for (let i = 0; i < blocks; i += 1) {
    out.push(
      ["::: body.paragraph.indent: 0em; body.paragraph.align: right", PARAGRAPH, ":::"].join("\n"),
    )
    out.push(PARAGRAPH)
  }
  return out.join("\n\n")
}

const docTiny = makeDocument(5)
const docSmall = makeDocument(20)
const docLarge = makeDocument(80)
const docHuge = makeDocument(200)
const docMixed = makeMixedDocument(60)
const docLocalStyle = makeLocalStyleDocument(40)
const docLineBreak = Array.from({ length: 200 }, (_, i) => `第${i + 1}行内容 //`).join("\n")

const compiledTokens = generateRuleTokens(rule)
const compiledRule = compileRule(rule, DEFAULT_HOST)

const paginationFormat = "{currentPage} / {totalPage}  ·  {totalPage - currentPage} 页剩余"
const exprPattern = /\{([^{}]+)\}/g

// ---------------------------------------------------------------------------
// Suite definition
// ---------------------------------------------------------------------------

type Group = "parser" | "compiler" | "utils" | "end-to-end"

interface TaskDef {
  group: Group
  name: string
  fn: () => void
}

const tasks: TaskDef[] = []
const add = (group: Group, name: string, fn: () => void) => tasks.push({ group, name, fn })

// Each parse task uses its own parser whose config is set once up front, so we
// measure steady-state parse throughput (setOptions cost is benched separately).
function pinnedParser(): MarkdownParser {
  const p = new MarkdownParser()
  p.setOptions(parserConfig)
  return p
}

// --- parser ---------------------------------------------------------------
{
  const p = pinnedParser()
  add("parser", "parse: tiny doc (5p)", () => p.parse(docTiny))
  add("parser", "parse: small doc (20p)", () => p.parse(docSmall))
  add("parser", "parse: large doc (80p)", () => p.parse(docLarge))
  add("parser", "parse: huge doc (200p)", () => p.parse(docHuge))
  add("parser", "parse: mixed-script (font-scope)", () => p.parse(docMixed))
  add("parser", "parse: local-style containers", () => p.parse(docLocalStyle))
}
{
  const pBreak = new MarkdownParser()
  pBreak.setOptions({ ...parserConfig, enterStyle: "paragraph" })
  add("parser", "parse: line-break heavy", () => pBreak.parse(docLineBreak))
}
const setOptParser = pinnedParser()
const rebuildParser = pinnedParser()
add("parser", "setOptions: unchanged config", () => {
  setOptParser.setOptions(parserConfig)
})
{
  let toggle = false
  add("parser", "setOptions: changed config (rebuild)", () => {
    // flip a construction-affecting option every call to force a rebuild
    toggle = !toggle
    rebuildParser.setOptions({ ...parserConfig, linkify: toggle })
  })
}

// --- compiler --------------------------------------------------------------
add("compiler", "compileRule (full)", () => compileRule(rule, DEFAULT_HOST))
add("compiler", "generateRuleTokens", () => generateRuleTokens(rule))
add("compiler", "serializeStyleSheet", () => serializeStyleSheet(compiledRule.rules))
add("compiler", "validateRule", () => validateRule(rule))
add("compiler", "toCssCustomProperty (hot cache)", () =>
  toCssCustomProperty("content.h2.paragraph.spacing.lineHeight"),
)

// --- utils -----------------------------------------------------------------
add("utils", "formatByStyle: arabic", () => formatByStyle(1234, "arabic"))
add("utils", "formatByStyle: zhHans", () => formatByStyle(1234, "zhHans"))
add("utils", "formatByStyle: zhHant", () => formatByStyle(1234, "zhHant"))
add("utils", "formatByStyle: roman", () => formatByStyle(1234, "roman"))
add("utils", "expr eval: repeated (hot cache)", () =>
  evaluateNumericTemplateExpression("totalPage - currentPage", { currentPage: 5, totalPage: 200 }),
)
{
  // unique expression each call → never a cache hit (worst case)
  let n = 0
  add("utils", "expr eval: unique (cold compile)", () => {
    n += 1
    evaluateNumericTemplateExpression(`currentPage + ${n % 997}`, { currentPage: 5, totalPage: 200 })
  })
}

// --- end-to-end ------------------------------------------------------------
add("end-to-end", "open document (validate+compile+parse)", () => {
  validateRule(rule)
  compileRule(rule, DEFAULT_HOST)
  const p = pinnedParser()
  p.parse(docLarge)
})
add("end-to-end", "render 200 page numbers", () => {
  for (let pg = 1; pg <= 200; pg += 1) {
    const ctx = { currentPage: pg, CurrentPage: pg, totalPage: 200, TotalPage: 200 }
    paginationFormat.replace(exprPattern, (_m, expr: string) => {
      const v = evaluateNumericTemplateExpression(expr, ctx)
      return v === null ? "" : String(v)
    })
  }
})

void compiledTokens

// ---------------------------------------------------------------------------
// Run + report
// ---------------------------------------------------------------------------

function gitInfo(): { commit: string; dirty: boolean } {
  try {
    const commit = execSync("git rev-parse --short HEAD", { cwd: here }).toString().trim()
    const dirty = execSync("git status --porcelain", { cwd: here }).toString().trim().length > 0
    return { commit, dirty }
  } catch {
    return { commit: "unknown", dirty: false }
  }
}

const pad = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length))
const padStart = (s: string, n: number) => (s.length >= n ? s : " ".repeat(n - s.length) + s)
const us = (ms: number) => `${(ms * 1000).toFixed(1)}µs`

async function main(): Promise<void> {
  const selected = ONLY_GROUP ? tasks.filter((t) => t.group === ONLY_GROUP) : tasks
  if (selected.length === 0) {
    console.error(`No tasks for group "${ONLY_GROUP}". Groups: parser, compiler, utils, end-to-end`)
    process.exit(1)
  }

  const bench = new Bench({ time: TIME_MS, warmupTime: Math.min(TIME_MS, 150) })
  for (const t of selected) bench.add(`${t.group}/${t.name}`, t.fn)
  await bench.run()

  const git = gitInfo()
  const timestamp = new Date().toISOString()

  console.log()
  console.log(`  Engine benchmark — ${git.commit}${git.dirty ? " (dirty)" : ""} — ${timestamp}`)
  console.log(`  ${TIME_MS}ms/task, ${process.version} on ${process.platform}`)

  const records: Array<Record<string, unknown>> = []
  let currentGroup = ""
  for (const task of bench.tasks) {
    const r = task.result
    if (!r) continue
    const [group, ...rest] = task.name.split("/")
    const name = rest.join("/")
    if (group !== currentGroup) {
      currentGroup = group!
      console.log()
      console.log(`  [${group}]`)
      console.log(
        "  " +
          pad("task", 38) +
          padStart("mean", 10) +
          padStart("p99", 10) +
          padStart("ops/sec", 13) +
          padStart("±%", 8),
      )
      console.log("  " + "-".repeat(78))
    }
    console.log(
      "  " +
        pad(name, 38) +
        padStart(us(r.mean), 10) +
        padStart(us(r.p99), 10) +
        padStart(Math.round(r.hz).toLocaleString(), 13) +
        padStart(r.rme.toFixed(1), 8),
    )
    records.push({
      group,
      task: name,
      meanMs: r.mean,
      p75Ms: r.p75,
      p99Ms: r.p99,
      hz: r.hz,
      rme: r.rme,
      samples: r.samples.length,
    })
  }
  console.log()

  if (LOG_HISTORY) {
    appendFileSync(
      HISTORY_PATH,
      JSON.stringify({
        timestamp,
        commit: git.commit,
        dirty: git.dirty,
        node: process.version,
        platform: process.platform,
        timeMs: TIME_MS,
        group: ONLY_GROUP ?? "all",
        results: records,
      }) + "\n",
    )
    console.log(`  Logged ${records.length} tasks to ${resolve(HISTORY_PATH)}`)
    console.log()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
