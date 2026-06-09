import { describe, it, expect } from "vitest"
import { getPaginationInlineStyle } from "../use-pagination-display"
import type { PageRenderMeta } from "../use-paginator"
import type { PaginationConfig } from "@/engine/schema"

function makeMeta(
  vertical: { anchor: "top" | "bottom"; offset: string },
): PageRenderMeta {
  const pagination: PaginationConfig = {
    enabled: true,
    format: "{currentPage}",
    style: {
      fonts: { latinFamily: "serif", cjkFamily: "serif" },
      size: "14pt",
      weight: 400,
      colors: { text: "#000000" },
    },
    position: {
      vertical,
      horizontal: { anchor: "center", offset: "0mm" },
    },
  }
  return { globalPage: 1, globalTotal: 1, pagination }
}

describe("getPaginationInlineStyle vertical offset is relative to the content area", () => {
  it("bottom anchor measures upward from the content bottom edge (margin - offset)", () => {
    const style = getPaginationInlineStyle(makeMeta({ anchor: "bottom", offset: "7mm" }), 0)
    expect(style.bottom).toBe("calc(var(--page-margins-bottom) - 7mm)")
    expect(style.top).toBeUndefined()
  })

  it("top anchor measures downward from the content top edge (margin + offset)", () => {
    const style = getPaginationInlineStyle(makeMeta({ anchor: "top", offset: "7mm" }), 0)
    expect(style.top).toBe("calc(var(--page-margins-top) + 7mm)")
    expect(style.bottom).toBeUndefined()
  })

  it("zero offset sits exactly on the content edge", () => {
    const bottom = getPaginationInlineStyle(makeMeta({ anchor: "bottom", offset: "0mm" }), 0)
    expect(bottom.bottom).toBe("calc(var(--page-margins-bottom) - 0mm)")
  })
})
