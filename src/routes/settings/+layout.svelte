<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, User, Palette, Bell, Shield, Key } from 'lucide-svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	const menuItems = [
		{ id: 'accounts', label: 'Accounts', icon: User, href: '/settings', color: 'from-violet-500 to-purple-600' },
		{ id: 'appearance', label: 'Appearance', icon: Palette, href: '/settings/appearance', color: 'from-amber-500 to-orange-600' },
		{ id: 'notifications', label: 'Notifications', icon: Bell, href: '/settings/notifications', color: 'from-rose-500 to-pink-600' },
		{ id: 'privacy', label: 'Privacy', icon: Shield, href: '/settings/privacy', color: 'from-emerald-500 to-teal-600' },
		{ id: 'keyboard', label: 'Keyboard', icon: Key, href: '/settings/keyboard', color: 'from-blue-500 to-indigo-600' }
	];

	let activeSection = $derived($page.url.pathname.split('/').pop() || 'accounts');

	function goBack() {
		goto('/');
	}
</script>

<div class="settings-container">
	<!-- Settings Sidebar -->
	<aside class="settings-sidebar">
		<!-- Back button -->
		<button
			onclick={goBack}
			class="back-button"
		>
			<ArrowLeft class="size-4" />
			<span>Back</span>
		</button>

		<!-- Title -->
		<h1 class="settings-title">Settings</h1>

		<!-- Navigation -->
		<nav class="settings-nav">
			{#each menuItems as item, index}
				<button
					onclick={() => goto(item.href)}
					class="nav-item"
					class:active={activeSection === item.id}
					style="--item-index: {index}"
				>
					<div class="icon-container bg-gradient-to-br {item.color}">
						<item.icon class="size-4" />
					</div>
					<span class="nav-label">{item.label}</span>
					{#if activeSection === item.id}
						<div class="active-indicator"></div>
					{/if}
				</button>
			{/each}
		</nav>

		<!-- Bottom decoration -->
		<div class="sidebar-decoration">
			<div class="decoration-line"></div>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="settings-main">
		<div class="content-wrapper">
			{@render children()}
		</div>
	</main>
</div>

<style>
	.settings-container {
		display: flex;
		height: 100vh;
		width: 100vw;
		background: linear-gradient(135deg, #faf9f7 0%, #f5f3f0 100%);
		font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
	}

	/* Sidebar */
	.settings-sidebar {
		width: 280px;
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(20px);
		border-right: 1px solid rgba(0, 0, 0, 0.06);
		padding: 2rem 1.5rem;
		display: flex;
		flex-direction: column;
		position: relative;
	}

	.back-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.875rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #6b6b6b;
		background: transparent;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		margin-bottom: 1.5rem;
		width: fit-content;
	}

	.back-button:hover {
		color: #1d1d1f;
		background: rgba(0, 0, 0, 0.04);
	}

	.settings-title {
		font-size: 1.875rem;
		font-weight: 680;
		letter-spacing: -0.03em;
		color: #1d1d1f;
		margin-bottom: 2rem;
	}

	.settings-nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 0.875rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b6b6b;
		background: transparent;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		text-align: left;
		animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) backwards;
		animation-delay: calc(var(--item-index) * 0.05s);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-12px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.nav-item:hover {
		color: #1d1d1f;
		background: rgba(0, 0, 0, 0.04);
		transform: translateX(2px);
	}

	.nav-item.active {
		color: #1d1d1f;
		background: rgba(0, 0, 0, 0.06);
		font-weight: 560;
	}

	.icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 9px;
		color: white;
		flex-shrink: 0;
		box-shadow: 0 2px 8px -2px rgba(0, 0, 0, 0.15);
	}

	.nav-label {
		flex: 1;
		letter-spacing: -0.01em;
	}

	.active-indicator {
		position: absolute;
		left: 0.5rem;
		width: 3px;
		height: 20px;
		background: #1d1d1f;
		border-radius: 2px;
	}

	.sidebar-decoration {
		padding-top: 2rem;
	}

	.decoration-line {
		height: 1px;
		background: linear-gradient(
			to right,
			rgba(0, 0, 0, 0.08),
			transparent
		);
	}

	/* Main Content */
	.settings-main {
		flex: 1;
		overflow: auto;
		position: relative;
	}

	.settings-main::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			rgba(0, 0, 0, 0.04),
			transparent
		);
	}

	.content-wrapper {
		max-width: 800px;
		margin: 0 auto;
		padding: 3rem 3rem 4rem;
	}

	/* Scrollbar */
	.settings-main::-webkit-scrollbar {
		width: 8px;
	}

	.settings-main::-webkit-scrollbar-track {
		background: transparent;
	}

	.settings-main::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.1);
		border-radius: 4px;
	}

	.settings-main::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 0, 0, 0.15);
	}
</style>
