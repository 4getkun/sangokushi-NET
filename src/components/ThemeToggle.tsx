import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** デイモード/ナイトモード切り替え。原典には存在しない、今回の移植での追加機能。 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('sangoku-theme', next);
    } catch {
      /* localStorageが使えない環境でも動作自体は継続する */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'デイモードに切り替え' : 'ナイトモードに切り替え'}
      title={theme === 'dark' ? 'デイモードに切り替え' : 'ナイトモードに切り替え'}
      className="relative inline-flex h-9 w-16 shrink-0 items-center rounded-full border border-(--color-border) bg-(--color-surface-hover) transition-colors hover:border-(--color-accent)/60 cursor-pointer"
    >
      <span
        className="absolute left-1 flex h-7 w-7 items-center justify-center rounded-full bg-(--color-accent) text-(--ui-accent-contrast) shadow-sm transition-transform duration-300 ease-out"
        style={{ transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(0)' }}
      >
        {theme === 'dark' ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <circle cx="12" cy="12" r="4.5" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
            </g>
          </svg>
        )}
      </span>
    </button>
  );
}
