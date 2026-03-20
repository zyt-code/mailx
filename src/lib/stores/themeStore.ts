import { writable, get } from 'svelte/store';

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

// Create stores using traditional Svelte stores instead of $state runes
const currentTheme = writable<Theme>(getStoredTheme());
const isTransitioning = writable(false);

// Apply on init
if (typeof window !== 'undefined') {
	// Prevent transition flash on initial load
	document.documentElement.classList.add('no-transition');
	applyTheme(get(currentTheme));

	// Remove no-transition class after a tick
	setTimeout(() => {
		document.documentElement.classList.remove('no-transition');
	}, 0);

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (get(currentTheme) === 'system') {
			applyTheme('system');
		}
	});
}

export function getTheme(): Theme {
	return get(currentTheme);
}

export function setTheme(theme: Theme) {
	if (get(isTransitioning) || theme === get(currentTheme)) return;

	isTransitioning.set(true);
	const previousTheme = get(currentTheme);
	currentTheme.set(theme);
	localStorage.setItem(STORAGE_KEY, theme);

	// Add transitioning class for potential CSS hooks
	if (typeof document !== 'undefined') {
		document.documentElement.classList.add('theme-transitioning');
	}

	applyTheme(theme);

	// Clear transitioning state after transition duration
	setTimeout(() => {
		if (typeof document !== 'undefined') {
			document.documentElement.classList.remove('theme-transitioning');
		}
		isTransitioning.set(false);
	}, 400); // Match CSS transition duration
}

export const themeStore = {
	get current() {
		return get(currentTheme);
	},
	set: setTheme
};

export function getIsTransitioning() {
	return get(isTransitioning);
}

// Export the store for reactive usage
export { isTransitioning };
