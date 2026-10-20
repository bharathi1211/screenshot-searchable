import { useState } from 'react'

function getInitialTheme(): 'light' | 'dark' {
  const theme = document.documentElement.dataset.theme
  return theme === 'dark' ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)
  const isDark = theme === 'dark'

  // Apply the selected theme immediately and keep the preference when possible.
  function toggleTheme() {
    const nextTheme = isDark ? 'light' : 'dark'
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)

    try {
      localStorage.setItem('theme', nextTheme)
    } catch (error) {
      console.warn(
        'Could not save the theme preference in browser storage.',
        error,
      )
    }
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={toggleTheme}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <svg className="theme-switch-icon theme-switch-sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
        <svg className="theme-switch-icon theme-switch-moon" viewBox="0 0 24 24">
          <path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" />
        </svg>
        <span className="theme-switch-knob" />
      </span>
    </button>
  )
}
