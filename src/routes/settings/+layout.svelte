<script lang="ts">
	import type { ActionReturn } from 'svelte/action';
	import type { Snippet } from 'svelte';
	import { tick } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Spring } from 'svelte/motion';
	import { ArrowLeft, User, Palette, Bell, Shield, Keyboard, Globe } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { i18nStore } from '$lib/stores/i18nStore.svelte.js';

	interface Props {
		children: Snippet;
	}

	type NavItemId = 'accounts' | 'appearance' | 'notifications' | 'language' | 'privacy' | 'keyboard';

	const NAV_IDS: NavItemId[] = ['accounts', 'appearance', 'notifications', 'language', 'privacy', 'keyboard'];

	let { children }: Props = $props();

	const menuItems = $derived([
		{ id: 'accounts' as const, label: $_('settings.accounts'), icon: User, href: '/settings', note: $_('settings.accountsNote') },
		{ id: 'appearance' as const, label: $_('settings.appearance'), icon: Palette, href: '/settings/appearance', note: $_('settings.appearanceNote') },
		{ id: 'notifications' as const, label: $_('settings.notifications'), icon: Bell, href: '/settings/notifications', note: $_('settings.notificationsNote') },
		{ id: 'language' as const, label: $_('settings.language'), icon: Globe, href: '/settings/language', note: $_('settings.languageNote') },
		{ id: 'privacy' as const, label: $_('settings.privacy'), icon: Shield, href: '/settings/privacy', note: $_('settings.privacyNote') },
		{ id: 'keyboard' as const, label: $_('settings.keyboard'), icon: Keyboard, href: '/settings/keyboard', note: $_('settings.keyboardNote') }
	]);

	const navIndicatorY = new Spring(0, { stiffness: 0.16, damping: 0.72 });
	const navIndicatorHeight = new Spring(0, { stiffness: 0.16, damping: 0.72 });
	const navScale = Object.fromEntries(
		NAV_IDS.map((id) => [id, new Spring(1, { stiffness: 0.22, damping: 0.56 })])
	) as Record<NavItemId, Spring<number>>;

	let navContainer: HTMLElement | null = null;
	let mainPanel: HTMLElement | null = null;
	let indicatorReady = $state(false);
	let parallaxOffset = $state(0);
	let navElements = $state<Record<NavItemId, HTMLButtonElement | null>>({
		accounts: null,
		appearance: null,
		notifications: null,
		language: null,
		privacy: null,
		keyboard: null
	});

	function resolveActiveSection(pathname: string): NavItemId {
		const parts = pathname.split('/').filter(Boolean);
		const candidate = parts[parts.length - 1];
		return candidate && candidate !== 'settings' && NAV_IDS.includes(candidate as NavItemId)
			? (candidate as NavItemId)
			: 'accounts';
	}

	let activeSection = $derived(resolveActiveSection($page.url.pathname));

	function goBack() {
		goto('/');
	}

	function syncNavIndicator(instant = false) {
		if (!browser || !navContainer) return;

		const activeNode = navElements[activeSection];
		if (!activeNode) return;

		navIndicatorY.set(activeNode.offsetTop, { instant });
		navIndicatorHeight.set(activeNode.offsetHeight, { instant });
		indicatorReady = true;
	}

	function pressNavItem(id: NavItemId) {
		navScale[id].set(0.96);
	}

	function releaseNavItem(id: NavItemId) {
		navScale[id].set(1);
	}

	function handleMainScroll(event: Event) {
		const target = event.currentTarget as HTMLElement;
		parallaxOffset = Math.min(target.scrollTop, 180);
	}

	function registerNavButton(node: HTMLButtonElement, id: NavItemId): ActionReturn<NavItemId> {
		navElements[id] = node;
		queueMicrotask(() => syncNavIndicator(true));

		return {
			destroy() {
				if (navElements[id] === node) {
					navElements[id] = null;
				}
			}
		};
	}

	$effect(() => {
		activeSection;
		void tick().then(() => syncNavIndicator());
	});

	$effect(() => {
		menuItems.length;
		void tick().then(() => syncNavIndicator(true));
	});

	$effect(() => {
		if (!browser) return;

		const handleResize = () => syncNavIndicator();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

<div class="settings-shell" style={`--settings-parallax:${parallaxOffset}px;`}>
	<div class="settings-ambient" aria-hidden="true">
		<div class="ambient-orb ambient-orb-primary"></div>
		<div class="ambient-orb ambient-orb-secondary"></div>
		<div class="ambient-grid"></div>
	</div>

	<aside class="settings-sidebar">
		<button onclick={goBack} class="back-button">
			<ArrowLeft class="size-[15px]" strokeWidth={1.6} />
			<span>{$_('settings.backToInbox')}</span>
		</button>

		<div class="sidebar-header">
			<p class="eyebrow">{$_('settings.workspacePreferences')}</p>
			<h1 class="settings-title">{$_('settings.title')}</h1>
			<p class="settings-subtitle">
				{$_('settings.subtitle')}
			</p>
		</div>

		<nav class="settings-nav" bind:this={navContainer} aria-label={$_('settings.title')}>
			<div
				class="nav-indicator"
				class:ready={indicatorReady}
				style={`transform: translate3d(0, ${navIndicatorY.current}px, 0); height:${navIndicatorHeight.current}px;`}
			></div>

			{#each menuItems as item}
				<button
					type="button"
					use:registerNavButton={item.id}
					onclick={() => goto(item.href)}
					onpointerdown={() => pressNavItem(item.id)}
					onpointerup={() => releaseNavItem(item.id)}
					onpointerleave={() => releaseNavItem(item.id)}
					onpointercancel={() => releaseNavItem(item.id)}
					onblur={() => releaseNavItem(item.id)}
					class="nav-item"
					class:active={activeSection === item.id}
					style={`--nav-scale:${navScale[item.id].current};`}
				>
					<div class="nav-icon">
						<item.icon class="size-4" strokeWidth={1.55} />
					</div>
					<div class="nav-copy">
						<span class="nav-label">{item.label}</span>
						<span class="nav-note">{item.note}</span>
					</div>
				</button>
			{/each}
		</nav>
	</aside>

	<main class="settings-main" bind:this={mainPanel} onscroll={handleMainScroll}>
		<div class="main-grid">
			<div class="content-wrapper">
				{@render children()}
			</div>
		</div>
	</main>
</div>

<style>
	.settings-shell {
		position: relative;
		isolation: isolate;
		display: grid;
		grid-template-columns: 300px minmax(0, 1fr);
		height: 100%;
		width: 100%;
		background:
			radial-gradient(circle at top left, color-mix(in srgb, var(--accent-light) 72%, transparent) 0, transparent 38%),
			linear-gradient(160deg, color-mix(in srgb, var(--bg-secondary) 82%, white) 0%, var(--bg-primary) 56%);
		color: var(--text-primary);
	}

	.settings-shell::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -2;
		pointer-events: none;
		background:
			radial-gradient(circle at 78% 8%, color-mix(in srgb, var(--accent-primary) 9%, transparent), transparent 24%),
			radial-gradient(circle at 16% 18%, color-mix(in srgb, var(--accent-primary) 7%, transparent), transparent 26%);
		opacity: 0.85;
	}

	.settings-ambient {
		position: absolute;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		overflow: hidden;
	}

	.ambient-orb {
		position: absolute;
		border-radius: 999px;
		filter: blur(18px);
		opacity: 0.75;
		will-change: transform, opacity;
	}

	.ambient-orb-primary {
		top: -6rem;
		right: 8%;
		width: 24rem;
		height: 24rem;
		background: radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 22%, transparent), transparent 68%);
		transform: translate3d(0, calc(var(--settings-parallax) * 0.18), 0);
	}

	.ambient-orb-secondary {
		bottom: 8%;
		left: 34%;
		width: 18rem;
		height: 18rem;
		background: radial-gradient(circle, color-mix(in srgb, var(--accent-light) 52%, transparent), transparent 70%);
		transform: translate3d(0, calc(var(--settings-parallax) * -0.12), 0);
	}

	.ambient-grid {
		position: absolute;
		inset: 0;
		opacity: 0.18;
		background-image:
			linear-gradient(to right, transparent 0, transparent calc(100% - 1px), rgba(255, 255, 255, 0.08) calc(100% - 1px)),
			linear-gradient(to bottom, transparent 0, transparent calc(100% - 1px), rgba(255, 255, 255, 0.06) calc(100% - 1px));
		background-size: 120px 120px;
		transform: translate3d(0, calc(var(--settings-parallax) * 0.08), 0);
		mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.42), transparent 92%);
	}

	:global(.dark) .settings-shell {
		background:
			linear-gradient(180deg, #0a0e14 0%, #0f141d 42%, #0d1117 100%),
			radial-gradient(circle at top right, rgba(90, 155, 255, 0.12), transparent 28%);
	}

	:global(.dark) .settings-shell::before {
		background:
			radial-gradient(circle at 78% 6%, rgba(90, 155, 255, 0.16), transparent 22%),
			radial-gradient(circle at 10% 16%, rgba(90, 155, 255, 0.08), transparent 24%);
		opacity: 1;
	}

	.settings-sidebar {
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		height: 100vh;
		padding: 2rem 1.25rem 1.4rem;
		background: color-mix(in srgb, var(--bg-primary) 78%, transparent);
		backdrop-filter: blur(20px);
		border-right: 1px solid color-mix(in srgb, var(--border-primary) 78%, transparent);
	}

	:global(.dark) .settings-sidebar {
		background:
			linear-gradient(180deg, rgba(17, 23, 32, 0.92), rgba(13, 17, 24, 0.88)),
			radial-gradient(circle at top left, rgba(90, 155, 255, 0.12), transparent 34%);
		border-right-color: color-mix(in srgb, var(--border-primary) 96%, transparent);
		box-shadow:
			inset -1px 0 0 rgba(255, 255, 255, 0.02),
			18px 0 32px rgba(0, 0, 0, 0.14);
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		width: fit-content;
		padding: 0.625rem 0.9rem;
		border: 1px solid transparent;
		border-radius: 999px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
	}

	.back-button:hover {
		background: color-mix(in srgb, var(--bg-hover) 80%, transparent);
		color: var(--text-primary);
		border-color: color-mix(in srgb, var(--border-primary) 80%, transparent);
	}

	:global(.dark) .back-button {
		background: rgba(255, 255, 255, 0.02);
		border-color: color-mix(in srgb, var(--border-primary) 82%, transparent);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
	}

	:global(.dark) .back-button:hover {
		background: color-mix(in srgb, var(--bg-hover) 88%, transparent);
		box-shadow:
			var(--shadow-sm),
			inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	.sidebar-header {
		display: grid;
		gap: 0.55rem;
	}

	.eyebrow {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--accent-primary);
	}

	.settings-title {
		margin: 0;
		font-size: clamp(2rem, 2.4vw, 2.55rem);
		font-weight: 700;
		letter-spacing: -0.05em;
	}

	.settings-subtitle {
		margin: 0;
		max-width: 22rem;
		font-size: 0.95rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.settings-nav {
		position: relative;
		display: grid;
		gap: 0.55rem;
		padding: 0.1rem 0;
	}

	.nav-indicator {
		position: absolute;
		left: 0;
		right: 0;
		border-radius: 20px;
		opacity: 0;
		pointer-events: none;
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--accent-light) 86%, var(--bg-primary)), color-mix(in srgb, var(--bg-primary) 84%, transparent)),
			radial-gradient(circle at 12% 50%, color-mix(in srgb, var(--accent-primary) 22%, transparent), transparent 58%);
		border: 1px solid color-mix(in srgb, var(--accent-primary) 16%, var(--border-primary));
		box-shadow:
			0 18px 26px rgba(28, 54, 94, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(18px);
	}

	.nav-indicator.ready {
		opacity: 1;
	}

	:global(.dark) .nav-indicator {
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--accent-light) 88%, var(--bg-secondary)), color-mix(in srgb, var(--bg-secondary) 94%, transparent)),
			radial-gradient(circle at 12% 50%, color-mix(in srgb, var(--accent-primary) 32%, transparent), transparent 58%);
		border-color: color-mix(in srgb, var(--accent-primary) 26%, var(--border-primary));
		box-shadow:
			0 20px 34px rgba(0, 0, 0, 0.26),
			inset 0 1px 0 rgba(255, 255, 255, 0.06),
			0 0 0 1px color-mix(in srgb, var(--accent-primary) 10%, transparent);
	}

	.nav-item {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 0.95rem;
		padding: 0.92rem 1rem;
		border: 1px solid transparent;
		border-radius: 18px;
		background: transparent;
		color: var(--text-secondary);
		text-align: left;
		cursor: pointer;
		transform: translate3d(var(--nav-slide-x, 0), 0, 0) scale(var(--nav-scale, 1));
		transform-origin: center left;
		will-change: transform;
	}

	:global(.dark) .nav-item {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.01), transparent);
		border-color: color-mix(in srgb, var(--border-primary) 18%, transparent);
	}

	.nav-item:hover {
		--nav-slide-x: 2px;
		background: color-mix(in srgb, var(--bg-hover) 62%, transparent);
		border-color: color-mix(in srgb, var(--border-primary) 85%, transparent);
	}

	:global(.dark) .nav-item:hover {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--bg-hover) 86%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent));
		border-color: color-mix(in srgb, var(--border-primary) 96%, transparent);
		box-shadow:
			var(--shadow-sm),
			inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	.nav-item.active {
		background: transparent;
		border-color: transparent;
		color: var(--text-primary);
		box-shadow: none;
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.35rem;
		height: 2.35rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--accent-light) 90%, white);
		color: var(--accent-primary);
		flex-shrink: 0;
	}

	:global(.dark) .nav-icon {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--accent-light) 90%, var(--bg-secondary)), color-mix(in srgb, var(--bg-primary) 82%, transparent));
		border: 1px solid color-mix(in srgb, var(--accent-primary) 14%, var(--border-primary));
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.06),
			0 8px 16px rgba(0, 0, 0, 0.18);
	}

	.nav-copy {
		display: grid;
		gap: 0.15rem;
	}

	.nav-label {
		font-size: 0.93rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.nav-note {
		font-size: 0.77rem;
		color: var(--text-tertiary);
	}

	.settings-main {
		min-width: 0;
		overflow: auto;
	}

	.main-grid {
		max-width: 980px;
		margin: 0 auto;
		padding: 2rem clamp(1.1rem, 3vw, 3rem) 4rem;
	}

	.content-wrapper {
		min-width: 0;
	}

	@media (max-width: 900px) {
		.settings-shell {
			grid-template-columns: minmax(0, 1fr);
		}

		.settings-sidebar {
			position: static;
			height: auto;
			padding-bottom: 1.1rem;
			border-right: none;
			border-bottom: 1px solid color-mix(in srgb, var(--border-primary) 78%, transparent);
		}

		.settings-nav {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.nav-indicator {
			display: none;
		}

	}

	@media (max-width: 640px) {
		.settings-sidebar {
			padding: 1.2rem 1rem 1rem;
		}

		.settings-nav {
			grid-template-columns: minmax(0, 1fr);
		}

		.main-grid {
			padding: 1rem 1rem 2.5rem;
		}
	}
</style>
