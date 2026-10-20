import type { RangeTuple } from 'fuse.js'

interface TextSnippetProps {
  text: string
  ranges: ReadonlyArray<RangeTuple>
  snippet?: boolean
}

export function TextSnippet({
  text,
  ranges,
  snippet = false,
}: TextSnippetProps) {
  if (!text) {
    return <>No text found in this image.</>
  }

  // Show a small window around the first OCR match in search results.
  const firstRange = ranges[0]
  const start = snippet
    ? Math.max(0, (firstRange?.[0] ?? 0) - 55)
    : 0
  const end = snippet
    ? Math.min(text.length, (firstRange?.[1] ?? 0) + 96)
    : text.length
  const excerpt = text.slice(start, end)
  const clippedRanges = ranges
    .map(([rangeStart, rangeEnd]) => [
      Math.max(rangeStart, start) - start,
      Math.min(rangeEnd + 1, end) - start,
    ] as const)
    .filter(([rangeStart, rangeEnd]) => rangeStart < rangeEnd)
    .sort(([firstStart], [secondStart]) => firstStart - secondStart)

  // Render OCR text as text nodes, marking only the ranges Fuse matched.
  const parts: React.ReactNode[] = []
  let cursor = 0

  for (const [rangeStart, rangeEnd] of clippedRanges) {
    if (rangeStart < cursor) {
      if (rangeEnd > cursor) {
        parts.push(
          <mark key={`${cursor}-${rangeEnd}`}>
            {excerpt.slice(cursor, rangeEnd)}
          </mark>,
        )
        cursor = rangeEnd
      }
      continue
    }

    if (rangeStart > cursor) {
      parts.push(excerpt.slice(cursor, rangeStart))
    }
    parts.push(
      <mark key={`${rangeStart}-${rangeEnd}`}>
        {excerpt.slice(rangeStart, rangeEnd)}
      </mark>,
    )
    cursor = rangeEnd
  }

  if (cursor < excerpt.length) {
    parts.push(excerpt.slice(cursor))
  }

  return (
    <>
      {start > 0 && '…'}
      {parts}
      {end < text.length && '…'}
    </>
  )
}
