export type SortOption =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'best-match'

interface SortSelectProps {
  value: SortOption
  hasQuery: boolean
  onChange: (value: SortOption) => void
}

export function SortSelect({ value, hasQuery, onChange }: SortSelectProps) {
  return (
    <div className="sort-select-wrap">
      <label htmlFor="sort-order">Sort by</label>
      <select
        id="sort-order"
        value={value}
        onChange={(event) => {
          const selected = event.currentTarget.value
          if (
            selected === 'newest' ||
            selected === 'oldest' ||
            selected === 'name-asc' ||
            selected === 'name-desc' ||
            selected === 'best-match'
          ) {
            onChange(selected)
          }
        }}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="name-asc">Name A to Z</option>
        <option value="name-desc">Name Z to A</option>
        <option value="best-match" disabled={!hasQuery}>
          Best match
        </option>
      </select>
    </div>
  )
}
