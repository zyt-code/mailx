<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, User, Palette, Bell, Shield, Keyboard } from 'lucide-svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const menuItems = [
		{ id: 'accounts', label: 'Accounts', icon: User, href: '/settings', note: 'Identity, servers, sync' },
		{ id: 'appearance', label: 'Appearance', icon: Palette, href: '/settings/appearance', note: 'Theme, density, accents' },
		{ id: 'notifications', label: 'Notifications', icon: Bell, href: '/settings/notifications', note: 'Alerts, toasts, quiet hours' },
		{ id: 'privacy', label: 'Privacy', icon: Shield, href: '/settings/privacy', note: 'Security controls' },
		{ id: 'keyboard', label: 'Keyboard', icon: Keyboard, href: '/settings/keyboard', note: 'Shortcuts, hints, send keys' }
	];

	let activeSection = $derived($page.url.pathname.split('/').pop() || 'accounts');

	function goBack() {
		goto('/');
	}
</script>

<div class="settings-shell">
	<aside class="settings-sidebar">
		<button onclick={goBack} class="back-button">
			<ArrowLeft class="size-[15px]" strokeWidth={1.6} />
			<span>Back to inbox</span>
		</button>

		<div class="sidebar-header">
			<p class="eyebrow">Workspace Preferences</p>
			<h1 class="settings-title">Settings</h1>
			<p class="settings-subtitle">
				Tune Mailx for focus, noise level, and input speed.
			</p>
		</div>

		<nav class="settings-nav" aria-label="Settings sections">
			{#each menuItems as item}
				<button
					onclick={() => goto(item.href)}
					class="nav-item"
					class:active={activeSection === item.id}
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

	<main class="settings-main">
		<div class="main-grid">
			<div class="settings-hero">
				<div>
					<p class="hero-kicker">Mailx Control Center</p>
					<h2>Less friction, fewer interruptions.</h2>
				</div>
				<div class="hero-chip">
					<span class="hero-dot"></span>
					Persisted locally
				</div>
			</div>

			<div class="content-wrapper">
				{@render children()}
			</div>
		</div>
	</main>
</div>

<style>
	.settings-shell {
		display: grid;
		grid-template-columns: 300px minmax(0, 1fr);
		min-height: 100vh;
		width: 100vw;
		background:
			radial-gradient(circle at top left, color-mix(in srgb, var(--accent-light) 72%, transparent) 0, transparent 38%),
			linear-gradient(160deg, color-mix(in srgb, var(--bg-secondary) 82%, white) 0%, var(--bg-primary) 56%);
		color: var(--text-primary);
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

	.sidebar-header {
		display: grid;
		gap: 0.55rem;
	}

	.eyebrow,
	.hero-kicker {
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
		display: grid;
		gap: 0.55rem;
	}

	.nav-item {
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
	}

	.nav-item:hover {
		background: color-mix(in srgb, var(--bg-hover) 80%, transparent);
		border-color: color-mix(in srgb, var(--border-primary) 85%, transparent);
		transform: translateX(2px);
	}

	.nav-item.active {
		background: color-mix(in srgb, var(--accent-light) 86%, var(--bg-primary));
		border-color: color-mix(in srgb, var(--accent-primary) 18%, var(--border-primary));
		color: var(--text-primary);
		box-shadow: var(--shadow-sm);
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

	.settings-hero {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.4rem;
		padding: 1rem 1.1rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 88%, transparent);
		border-radius: 22px;
		background: color-mix(in srgb, var(--bg-primary) 80%, transparent);
		backdrop-filter: blur(18px);
		box-shadow: var(--shadow-xs);
	}

	.settings-hero h2 {
		margin: 0.3rem 0 0;
		font-size: clamp(1.25rem, 2vw, 1.75rem);
		letter-spacing: -0.04em;
	}

	.hero-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.8rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg-secondary) 88%, transparent);
		font-size: 0.8rem;
		font-weight: 650;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.hero-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: var(--accent-primary);
		box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-light) 75%, transparent);
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

		.settings-hero {
			flex-direction: column;
			align-items: flex-start;
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
