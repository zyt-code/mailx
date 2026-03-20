import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { writable } from 'svelte/store';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
	isTauri: vi.fn(() => true)
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(() => Promise.resolve(() => {}))
}));

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: vi.fn(() => ({
		onResized: vi.fn(() => Promise.resolve(() => {})),
		onFocusChanged: vi.fn(() => Promise.resolve(() => {})),
		isFocused: vi.fn(() => Promise.resolve(true)),
		isMaximized: vi.fn(() => Promise.resolve(false))
	}))
}));

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
	browser: true,
	dev: true,
	building: false,
	version: 'test'
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	pushState: vi.fn(),
	replaceState: vi.fn()
}));

vi.mock('$app/stores', () => {
	// Use imported writable function
	return {
		page: writable({
			url: new URL('http://localhost'),
			params: {},
			route: { id: null },
			status: 200,
			error: null,
			data: {},
			form: null
		}),
		navigating: writable(null),
		updated: writable(false)
	};
});

// Mock ResizeObserver
class ResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserver;

// Mock Svelte 5 runes for tests
if (typeof globalThis !== 'undefined') {
	function $state<T>(initial: T) {
		let value = initial;
		return {
			get current() {
				return value;
			},
			set current(newValue: T) {
				value = newValue;
			}
		};
	}
	// Add static properties to match Svelte 5 $state type
	Object.assign($state, {
		eager: $state,
		raw: $state,
		snapshot: $state
	});

	globalThis.$state = $state as any;
	// Make it accessible as a property for assignment
	Object.defineProperty(globalThis, '$state', {
		value: globalThis.$state,
		writable: false
	});
}

if (typeof window !== 'undefined') {
	Object.defineProperty(window, '$state', {
		value: globalThis.$state,
		writable: false
	});
}
