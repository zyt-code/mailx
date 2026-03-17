<script lang="ts">
	import { Palette, Sun, Moon, Monitor } from 'lucide-svelte';
	import { themeStore, type Theme } from '$lib/stores/themeStore.js';

	const themes: { id: Theme; label: string; icon: typeof Sun }[] = [
		{ id: 'light', label: 'Light', icon: Sun },
		{ id: 'dark', label: 'Dark', icon: Moon },
		{ id: 'system', label: 'System', icon: Monitor }
	];

	let activeTheme = $derived(themeStore.current);
</script>

<div class="settings-page">
	<!-- Header -->
	<header class="page-header">
		<div class="header-icon">
			<Palette class="size-6" strokeWidth={1.5} />
		</div>
		<div>
			<h2 class="page-title">Appearance</h2>
			<p class="page-subtitle">Customize the look and feel of Mailx</p>
		</div>
	</header>

	<!-- Theme Section -->
	<div class="section-card">
		<div class="section-header">
			<h3 class="section-title">Theme</h3>
			<p class="section-description">Select your preferred color scheme</p>
		</div>

		<div class="segmented-control">
			{#each themes as theme}
				<button
					onclick={() => themeStore.set(theme.id)}
					class="segment"
					class:active={activeTheme === theme.id}
				>
					<theme.icon class="size-4" strokeWidth={1.5} />
					<span>{theme.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Font Size Section -->
	<div class="section-card">
		<div class="section-header">
			<h3 class="section-title">Font Size</h3>
			<p class="section-description">Adjust the text size for readability</p>
		</div>

		<div class="segmented-control">
			<button class="segment" disabled>
				<span class="text-xs">A</span>
				<span>Small</span>
			</button>
			<button class="segment active" disabled>
				<span class="text-sm">A</span>
				<span>Medium</span>
			</button>
			<button class="segment" disabled>
				<span class="text-base">A</span>
				<span>Large</span>
			</button>
		</div>
		<p class="coming-soon">Font size customization coming soon</p>
	</div>
</div>

<style>
	.settings-page {
		animation: fadeIn 0.25s ease-out;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 2.5rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
		border-radius: 14px;
		color: white;
		box-shadow: 0 4px 12px -2px rgba(245, 158, 11, 0.3);
		flex-shrink: 0;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 680;
		letter-spacing: -0.03em;
		color: #1d1d1f;
		margin-bottom: 0.25rem;
	}

	.page-subtitle {
		font-size: 0.9375rem;
		color: #6b6b6b;
	}

	/* Section Cards */
	.section-card {
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1rem;
	}

	.section-header {
		margin-bottom: 1.25rem;
	}

	.section-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: #1d1d1f;
		margin-bottom: 0.25rem;
	}

	.section-description {
		font-size: 0.8125rem;
		color: #6b6b6b;
	}

	/* Segmented Control */
	.segmented-control {
		display: flex;
		gap: 2px;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 10px;
		padding: 3px;
	}

	.segment {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #6b6b6b;
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.segment:hover:not(.active):not(:disabled) {
		color: #1d1d1f;
	}

	.segment.active {
		color: #1d1d1f;
		background: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		font-weight: 540;
	}

	.segment:disabled:not(.active) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.coming-soon {
		font-size: 0.75rem;
		color: #a1a1aa;
		margin-top: 0.75rem;
		text-align: center;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
