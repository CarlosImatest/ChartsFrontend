import { Injectable, signal, effect } from '@angular/core';

type Theme = 'light' | 'dark';

const THEME_KEY = 'app_theme';

/**
 * Owns the light/dark toggle. Persists the choice in localStorage so
 * it survives refresh/relogin, and applies it via a data-theme
 * attribute on <html> — every CSS variable defined under
 * [data-theme='dark'] in styles.scss picks this up automatically,
 * no per-component logic needed.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<Theme>(this.getInitialTheme());

  constructor() {
    // Runs whenever `theme` changes, including on initial load —
    // keeps the DOM attribute and localStorage in sync with the signal.
    effect(() => {
      const value = this.theme();
      document.documentElement.setAttribute('data-theme', value);
      localStorage.setItem(THEME_KEY, value);
    });
  }

  toggle(): void {
    this.theme.update(t => (t === 'light' ? 'dark' : 'light'));
  }

  private getInitialTheme(): Theme {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;

    // No saved preference yet — default to the user's OS-level
    // preference rather than always forcing light mode.
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
}