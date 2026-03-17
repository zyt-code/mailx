export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'mailx-theme';

function getStoredTheme(): Theme {
	if (typeof window === 'undefined') return 'light';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'light';
}

function getSystemPrefersDark(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	const isDark = theme === 'dark' || (theme === 'system' && getSystemPrefersDark());

	if (isDark) {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}
}

let currentTheme = $state<Theme>(getStoredTheme());

// Apply on init
if (typeof window !== 'undefined') {
	applyTheme(currentTheme);

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (currentTheme === 'system') {
			applyTheme('system');
		}
	});
}

export function getTheme(): Theme {
	return currentTheme;
}

export function setTheme(theme: Theme) {
	currentTheme = theme;
	localStorage.setItem(STORAGE_KEY, theme);
	applyTheme(theme);
}

export const themeStore = {
	get current() {
		return currentTheme;
	},
	set: setTheme
};
