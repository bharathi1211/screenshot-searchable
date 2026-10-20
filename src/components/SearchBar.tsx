interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
}

export function SearchBar({ query, onQueryChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <span className="search-icon" aria-hidden="true">
        ⌕
      </span>
      <input
        type="search"
        value={query}
        placeholder="Search screenshots by name or text..."
        aria-label="Search screenshots by file name or extracted text"
        onChange={(event) => onQueryChange(event.currentTarget.value)}
      />
      {query && (
        <button
          className="clear-search"
          type="button"
          aria-label="Clear search"
          onClick={() => onQueryChange('')}
        >
          Clear
        </button>
      )}
    </div>
  )
}
