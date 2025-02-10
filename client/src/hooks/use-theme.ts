import { useCallback, useEffect, useState } from "react";

type Theme = 'light' | 'dark';

interface ThemeConfig {
  variant: 'professional' | 'tint' | 'vibrant';
  primary: string;
  appearance: Theme;
  radius: number;
}

async function loadThemeConfig(): Promise<ThemeConfig> {
  const response = await fetch('/theme.json');
  return response.json();
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSavedTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem('theme') as Theme) || getSystemTheme();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getSavedTheme);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);

  useEffect(() => {
    loadThemeConfig().then(setThemeConfig).catch(console.error);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);

    if (themeConfig) {
      root.style.setProperty('--primary', themeConfig.primary);
      root.style.setProperty('--radius', `${themeConfig.radius}rem`);
    }
  }, [theme, themeConfig]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, toggleTheme, themeConfig };
}