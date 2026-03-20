import { writable, get } from 'svelte/store';

export type AccentTone = 'blue' | 'sunset' | 'forest' | 'graphite';
export type MailDensity = 'compact' | 'comfortable' | 'airy';

export interface AppearancePreferences {
	accentTone: AccentTone;
	mailDensity: MailDensity;
	showPreviewSnippets: boolean;
	showAccountColor: boolean;
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

export interface UserPreferences {
	appearance: AppearancePreferences;
	notifications: NotificationPreferences;
	keyboard: KeyboardPreferences;
	privacy: PrivacyPreferences;
}

const STORAGE_KEY = 'mailx-preferences';

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

export const DEFAULT_PREFERENCES: UserPreferences = {
	appearance: {
		accentTone: 'blue',
		mailDensity: 'comfortable',
		showPreviewSnippets: true,
		showAccountColor: true
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
	}
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
		}
	};
}

function loadPreferences(): UserPreferences {
	if (typeof window === 'undefined') {
		return DEFAULT_PREFERENCES;
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? mergePreferences(JSON.parse(stored)) : DEFAULT_PREFERENCES;
	} catch {
		return DEFAULT_PREFERENCES;
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
}

function createPreferencesStore() {
	const initial = loadPreferences();
	const store = writable<UserPreferences>(initial);

	if (typeof window !== 'undefined') {
		applyAppearance(initial);
		store.subscribe((value) => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
			applyAppearance(value);
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
