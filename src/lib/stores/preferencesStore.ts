import { writable, get } from 'svelte/store';
import type { SupportedLocale } from './i18nStore.svelte';

export type AccentTone = 'blue' | 'sunset' | 'forest' | 'graphite';
export type Theme = 'light' | 'dark' | 'system';
export type MailDensity = 'compact' | 'comfortable' | 'airy';

export interface AppearancePreferences {
	accentTone: AccentTone;
	mailDensity: MailDensity;
	showPreviewSnippets: boolean;
	showAccountColor: boolean;
	theme: Theme;
}

export interface NotificationPreferences {
	desktopNotifications: boolean;
	syncSuccessToasts: boolean;
	syncFailureToasts: boolean;
	quietHoursEnabled: boolean;
	quietHoursStart: string;
	quietHoursEnd: string;
}

export interface KeyboardPreferences {
	singleKeyShortcuts: boolean;
	showShortcutHints: boolean;
	sendWithModEnter: boolean;
}

export interface PrivacyPreferences {
	blockExternalImages: boolean;
	blockRemoteFonts: boolean;
	remoteContentAction: 'always_ask' | 'never_load' | 'always_load';
	readReceiptPolicy: 'never_send' | 'always_send' | 'ask_me';
	htmlRenderingMode: 'plain_text' | 'sanitized' | 'full';
	blockFormsInEmails: boolean;
	showSecurityWarnings: boolean;
	warnBeforeSuspiciousLinks: boolean;
	showFullUrlOnHover: boolean;
}

export interface LanguagePreferences {
	locale: SupportedLocale;
	autoDetect: boolean;
}

export interface UserPreferences {
	appearance: AppearancePreferences;
	notifications: NotificationPreferences;
	keyboard: KeyboardPreferences;
	privacy: PrivacyPreferences;
	language: LanguagePreferences;
}

const STORAGE_KEY = 'mailx-preferences';
const LEGACY_THEME_KEY = 'mailx-theme';

export const ACCENT_PRESETS: Record<
	AccentTone,
	{
		name: string;
		description: string;
		primary: string;
		secondary: string;
		light: string;
		muted: string;
	}
> = {
	blue: {
		name: 'Mail Blue',
		description: 'Crisp, native, focused',
		primary: '#007aff',
		secondary: '#0051d5',
		light: '#e5f1ff',
		muted: '#d1e3ff'
	},
	sunset: {
		name: 'Sunset',
		description: 'Warm, editorial, vivid',
		primary: '#ff6b57',
		secondary: '#e04834',
		light: '#ffe7df',
		muted: '#ffd3c7'
	},
	forest: {
		name: 'Forest',
		description: 'Calm, steady, grounded',
		primary: '#2f8f63',
		secondary: '#206b48',
		light: '#e4f4eb',
		muted: '#cdebd8'
	},
	graphite: {
		name: 'Graphite',
		description: 'Quiet, monochrome, pro',
		primary: '#56606f',
		secondary: '#39414d',
		light: '#eaedf2',
		muted: '#d7dde6'
	}
};

export const DEFAULT_LANGUAGE_PREFERENCES: LanguagePreferences = {
	locale: 'en',
	autoDetect: true
};

export const DEFAULT_PREFERENCES: UserPreferences = {
	appearance: {
		accentTone: 'blue',
		mailDensity: 'comfortable',
		showPreviewSnippets: true,
		showAccountColor: true,
		theme: 'system'
	},
	notifications: {
		desktopNotifications: true,
		syncSuccessToasts: true,
		syncFailureToasts: true,
		quietHoursEnabled: false,
		quietHoursStart: '22:00',
		quietHoursEnd: '07:00'
	},
	keyboard: {
		singleKeyShortcuts: true,
		showShortcutHints: true,
		sendWithModEnter: true
	},
	privacy: {
		blockExternalImages: true,
		blockRemoteFonts: true,
		remoteContentAction: 'always_ask',
		readReceiptPolicy: 'never_send',
		htmlRenderingMode: 'sanitized',
		blockFormsInEmails: true,
		showSecurityWarnings: true,
		warnBeforeSuspiciousLinks: true,
		showFullUrlOnHover: true
	},
	language: DEFAULT_LANGUAGE_PREFERENCES
};

function mergePreferences(raw: unknown): UserPreferences {
	const source = typeof raw === 'object' && raw !== null ? (raw as Partial<UserPreferences>) : {};
	const appearance = typeof source.appearance === 'object' && source.appearance !== null
		? source.appearance
		: {};
	const notifications = typeof source.notifications === 'object' && source.notifications !== null
		? source.notifications
		: {};
	const keyboard = typeof source.keyboard === 'object' && source.keyboard !== null
		? source.keyboard
		: {};
	const privacy = typeof source.privacy === 'object' && source.privacy !== null
		? source.privacy
		: {};
	const language = typeof source.language === 'object' && source.language !== null
		? source.language
		: {};

	return {
		appearance: {
			...DEFAULT_PREFERENCES.appearance,
			...appearance
		},
		notifications: {
			...DEFAULT_PREFERENCES.notifications,
			...notifications
		},
		keyboard: {
			...DEFAULT_PREFERENCES.keyboard,
			...keyboard
		},
		privacy: {
			...DEFAULT_PREFERENCES.privacy,
			...privacy
		},
		language: {
			...DEFAULT_PREFERENCES.language,
			...language
		}
	};
}

function migrateLegacyTheme(): Theme | null {
	if (typeof window === 'undefined') return null;

	try {
		const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
		if (legacyTheme === 'light' || legacyTheme === 'dark' || legacyTheme === 'system') {
			localStorage.removeItem(LEGACY_THEME_KEY);
			return legacyTheme;
		}
	} catch {
		// Ignore localStorage errors
	}
	return null;
}

function loadPreferences(): UserPreferences {
	if (typeof window === 'undefined') {
		return DEFAULT_PREFERENCES;
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		const prefs = stored ? mergePreferences(JSON.parse(stored)) : DEFAULT_PREFERENCES;

		// Migrate legacy theme from old themeStore
		const legacyTheme = migrateLegacyTheme();
		if (legacyTheme !== null) {
			prefs.appearance.theme = legacyTheme;
		}

		return prefs;
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

function getSystemPrefersDark(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeToDOM(theme: Theme): void {
	if (typeof document === 'undefined') return;

	const root = document.documentElement;
	const isDark = theme === 'dark' || (theme === 'system' && getSystemPrefersDark());

	if (isDark) {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}
}

function applyAppearance(preferences: UserPreferences): void {
	if (typeof document === 'undefined') {
		return;
	}

	const accent = ACCENT_PRESETS[preferences.appearance.accentTone] ?? ACCENT_PRESETS.blue;
	const root = document.documentElement;

	root.style.setProperty('--accent-primary', accent.primary);
	root.style.setProperty('--accent-secondary', accent.secondary);
	root.style.setProperty('--accent-light', accent.light);
	root.style.setProperty('--accent-muted', accent.muted);
	root.dataset.mailDensity = preferences.appearance.mailDensity;

	applyThemeToDOM(preferences.appearance.theme);
}

function createPreferencesStore() {
	const initial = loadPreferences();
	const store = writable<UserPreferences>(initial);

	if (typeof window !== 'undefined') {
		// Prevent transition flash on initial load
		document.documentElement.classList.add('no-transition');
		applyAppearance(initial);

		// Remove no-transition class after a tick
		setTimeout(() => {
			document.documentElement.classList.remove('no-transition');
		}, 0);

		store.subscribe((value) => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
			applyAppearance(value);
		});

		// Listen for system theme changes
		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
			const current = get(store);
			if (current.appearance.theme === 'system') {
				applyThemeToDOM('system');
			}
		});
	}

	return {
		subscribe: store.subscribe,
		set(value: UserPreferences) {
			store.set(mergePreferences(value));
		},
		update(updater: (value: UserPreferences) => UserPreferences) {
			store.update((current) => mergePreferences(updater(current)));
		},
		updateSection<K extends keyof UserPreferences>(section: K, patch: Partial<UserPreferences[K]>) {
			store.update((current) =>
				mergePreferences({
					...current,
					[section]: {
						...current[section],
						...patch
					}
				})
			);
		},
		resetSection<K extends keyof UserPreferences>(section: K) {
			store.update((current) =>
				mergePreferences({
					...current,
					[section]: DEFAULT_PREFERENCES[section]
				})
			);
		},
		resetAll() {
			store.set(DEFAULT_PREFERENCES);
		}
	};
}

export const preferences = createPreferencesStore();

function parseMinutes(value: string): number {
	const [hours, minutes] = value.split(':').map((part) => Number.parseInt(part, 10));
	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
		return 0;
	}
	return hours * 60 + minutes;
}

export function isQuietHoursActive(settings = get(preferences).notifications, now = new Date()): boolean {
	if (!settings.quietHoursEnabled) {
		return false;
	}

	const start = parseMinutes(settings.quietHoursStart);
	const end = parseMinutes(settings.quietHoursEnd);
	const current = now.getHours() * 60 + now.getMinutes();

	if (start === end) {
		return false;
	}

	if (start < end) {
		return current >= start && current < end;
	}

	return current >= start || current < end;
}
