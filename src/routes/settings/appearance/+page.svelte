<script lang="ts">
	import { Palette, Sun, Moon, Monitor, Check } from 'lucide-svelte';
	import { themeStore, type Theme } from '$lib/stores/themeStore.js';
	import { preferences, ACCENT_PRESETS, type AccentTone, type MailDensity, type AppearancePreferences } from '$lib/stores/preferencesStore.js';

	import { getIsTransitioning } from '$lib/stores/themeStore.js';

	const themes: { id: Theme; label: string; description: string; icon: typeof Sun; previewClass: string }[] = [
		{ id: 'light', label: 'Light', description: 'Bright canvas, sharp contrast', icon: Sun, previewClass: 'bg-white border border-[var(--border-primary)]' },
		{ id: 'dark', label: 'Dark', description: 'Low-glare reading environment', icon: Moon, previewClass: 'bg-[var(--bg-primary)] border border-[var(--border-primary)]' },
		{ id: 'system', label: 'System', description: 'Automatically match your system light/dark mode', icon: Monitor, previewClass: 'system-preview' }
	];

	let isTransitioning = $derived(getIsTransitioning());

	const accentOptions = Object.entries(ACCENT_PRESETS).map(([id, palette]) => ({
		id: id as AccentTone,
		...palette
	}));

	const densityOptions: { id: MailDensity; label: string; description: string }[] = [
		{ id: 'compact', label: 'Compact', description: 'More threads in view, tighter rhythm' },
		{ id: 'comfortable', label: 'Comfortable', description: 'Balanced spacing for daily use' },
		{ id: 'airy', label: 'Airy', description: 'More whitespace for scanning and focus' }
	];

	let activeTheme = $derived(themeStore.current);
	let appearance = $derived($preferences.appearance);

	function updateAppearance(patch: Partial<AppearancePreferences>) {
		preferences.updateSection('appearance', patch);
	}
</script>

<div class="settings-page">
	<header class="page-header">
		<div class="header-icon">
			<Palette class="size-6" strokeWidth={1.55} />
		</div>
		<div>
			<p class="page-kicker">Appearance</p>
			<h2 class="page-title">Shape the reading environment.</h2>
			<p class="page-subtitle">
				Theme, accent tone, and message density apply across Mailx immediately.
			</p>
		</div>
	</header>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">Theme</h3>
				<p class="section-description">Choose how Mailx responds to ambient light.</p>
			</div>
		</div>

		<div class="theme-grid">
			{#each themes as theme}
				<button
					class="theme-option"
					class:active={activeTheme === theme.id}
					class:transitioning={isTransitioning && activeTheme === theme.id}
					onclick={() => themeStore.set(theme.id)}
					disabled={isTransitioning}
					aria-label={`Switch to ${theme.label} theme`}
					aria-pressed={activeTheme === theme.id}
				>
					<div class="theme-preview">
						{#if theme.id === 'system'}
							<div class="system-preview">
								<div class="system-preview-light"></div>
								<div class="system-preview-dark"></div>
							</div>
						{:else}
							<div class={`simple-preview ${theme.previewClass}`}></div>
						{/if}
					</div>

					<div class="theme-icon">
						<theme.icon class="size-4" strokeWidth={1.7} />
					</div>

					<div class="theme-info">
						<p class="option-label">{theme.label}</p>
						<p class="option-description">{theme.description}</p>
					</div>

					{#if activeTheme === theme.id}
						<div class="selection-indicator">
							<Check class="check-icon" strokeWidth={2.2} />
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</section>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">Accent Tone</h3>
				<p class="section-description">Drive focus with a stronger or quieter signal color.</p>
			</div>
		</div>

		<div class="accent-grid">
			{#each accentOptions as accent}
				<button
					class="accent-option"
					class:active={appearance.accentTone === accent.id}
					onclick={() => updateAppearance({ accentTone: accent.id })}
				>
					<div class="accent-preview" style={`--swatch-primary:${accent.primary}; --swatch-secondary:${accent.secondary}; --swatch-light:${accent.light};`}>
						<div class="accent-strip"></div>
						<div class="accent-pill"></div>
						<div class="accent-dot"></div>
					</div>
					<div class="accent-copy">
						<div>
							<p class="option-label">{accent.name}</p>
							<p class="option-description">{accent.description}</p>
						</div>
						{#if appearance.accentTone === accent.id}
							<div class="check-badge">
								<Check class="size-3.5" strokeWidth={2.2} />
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</section>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">Mail Density</h3>
				<p class="section-description">Control how much information each thread row carries.</p>
			</div>
		</div>

		<div class="density-grid">
			{#each densityOptions as option}
				<button
					class="density-option"
					class:active={appearance.mailDensity === option.id}
					onclick={() => updateAppearance({ mailDensity: option.id })}
				>
					<div>
						<p class="option-label">{option.label}</p>
						<p class="option-description">{option.description}</p>
					</div>
				</button>
			{/each}
		</div>
	</section>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">Thread Details</h3>
				<p class="section-description">Decide how much context the list reveals at a glance.</p>
			</div>
			<button class="reset-button" onclick={() => preferences.resetSection('appearance')}>
				Reset appearance
			</button>
		</div>

		<div class="toggle-stack">
			<button class="toggle-row" onclick={() => updateAppearance({ showPreviewSnippets: !appearance.showPreviewSnippets })}>
				<div>
					<p class="option-label">Preview snippets</p>
					<p class="option-description">Show the first line of the message body in the thread list.</p>
				</div>
				<span class:toggle-on={appearance.showPreviewSnippets} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button class="toggle-row" onclick={() => updateAppearance({ showAccountColor: !appearance.showAccountColor })}>
				<div>
					<p class="option-label">Account color markers</p>
					<p class="option-description">Keep per-account dots visible when multiple inboxes are mixed together.</p>
				</div>
				<span class:toggle-on={appearance.showAccountColor} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>
		</div>
	</section>
</div>

<style>
	.settings-page {
		display: grid;
		gap: 1rem;
		animation: fadeIn 180ms ease-out;
	}

	.page-header {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 0.35rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3.2rem;
		height: 3.2rem;
		border-radius: 20px;
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 18%, white), color-mix(in srgb, var(--accent-light) 92%, white));
		color: var(--accent-primary);
		box-shadow: var(--shadow-sm);
		flex-shrink: 0;
	}

	.page-kicker {
		margin: 0 0 0.25rem;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--accent-primary);
	}

	.page-title {
		margin: 0;
		font-size: clamp(1.8rem, 2.2vw, 2.45rem);
		font-weight: 720;
		letter-spacing: -0.05em;
	}

	.page-subtitle {
		margin: 0.45rem 0 0;
		max-width: 42rem;
		color: var(--text-secondary);
		font-size: 0.96rem;
		line-height: 1.6;
	}

	.section-card {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 88%, transparent);
		border-radius: 24px;
		background: color-mix(in srgb, var(--bg-primary) 84%, transparent);
		box-shadow: var(--shadow-xs);
		backdrop-filter: blur(16px);
	}

	.section-title {
		margin: 0;
		font-size: 1.05rem;
		letter-spacing: -0.03em;
	}

	.section-description {
		margin: 0.3rem 0 0;
		color: var(--text-secondary);
		font-size: 0.84rem;
		line-height: 1.5;
	}

	.theme-grid,
	.density-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.8rem;
	}

	.theme-option,
	.density-option,
	.accent-option {
		display: grid;
		gap: 0.7rem;
		padding: 0.9rem 1rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--bg-secondary) 62%, transparent);
		text-align: left;
		cursor: pointer;
	}

	.theme-option:hover,
	.density-option:hover,
	.accent-option:hover,
	.toggle-row:hover {
		border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	.theme-option.active,
	.density-option.active,
	.accent-option.active {
		background: color-mix(in srgb, var(--accent-light) 85%, var(--bg-primary));
		border-color: color-mix(in srgb, var(--accent-primary) 28%, var(--border-primary));
	}

	.theme-option {
		/* Grid will be set by enhanced styles, default for fallback */
		align-items: center;
	}

	.theme-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.35rem;
		height: 2.35rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--bg-primary) 88%, transparent);
		color: var(--accent-primary);
	}

	.accent-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 0.8rem;
	}

	.accent-preview {
		position: relative;
		height: 4.6rem;
		border-radius: 16px;
		background:
			linear-gradient(140deg, var(--swatch-light) 0%, white 65%),
			linear-gradient(140deg, var(--swatch-primary), var(--swatch-secondary));
		overflow: hidden;
	}

	.accent-strip {
		position: absolute;
		top: 0.8rem;
		left: 0.9rem;
		width: 3.2rem;
		height: 0.48rem;
		border-radius: 999px;
		background: var(--swatch-primary);
	}

	.accent-pill {
		position: absolute;
		left: 0.9rem;
		bottom: 0.95rem;
		width: 5.4rem;
		height: 1rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--swatch-primary) 16%, white);
	}

	.accent-dot {
		position: absolute;
		right: 1rem;
		bottom: 0.9rem;
		width: 1.05rem;
		height: 1.05rem;
		border-radius: 999px;
		background: var(--swatch-secondary);
		box-shadow: 0 0 0 6px color-mix(in srgb, var(--swatch-primary) 12%, transparent);
	}

	.accent-copy {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.6rem;
	}

	.option-label {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.option-description {
		margin: 0.18rem 0 0;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.check-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 999px;
		background: var(--accent-primary);
		color: white;
		flex-shrink: 0;
	}

	.toggle-stack {
		display: grid;
		gap: 0.75rem;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--bg-secondary) 65%, transparent);
		cursor: pointer;
		text-align: left;
	}

	.toggle-pill {
		position: relative;
		width: 3rem;
		height: 1.75rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg-active) 90%, transparent);
		flex-shrink: 0;
	}

	.toggle-pill.toggle-on {
		background: color-mix(in srgb, var(--accent-primary) 28%, var(--accent-light));
	}

	.toggle-thumb {
		position: absolute;
		top: 0.16rem;
		left: 0.18rem;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 999px;
		background: white;
		box-shadow: var(--shadow-sm);
		transition: transform 140ms ease;
	}

	.toggle-pill.toggle-on .toggle-thumb {
		transform: translateX(1.2rem);
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

	/* Enhanced theme option styles */
	.theme-option {
		position: relative;
		grid-template-columns: auto 1fr auto;
		align-items: start;
	}

	.theme-preview {
		grid-column: 1 / -1;
		height: 4.5rem;
		border-radius: 12px;
		margin-bottom: 0.75rem;
		overflow: hidden;
		background: var(--bg-secondary);
	}

	.simple-preview {
		width: 100%;
		height: 100%;
		border-radius: 10px;
	}

	.system-preview {
		display: flex;
		width: 100%;
		height: 100%;
	}

	.system-preview-light {
		flex: 1;
		background: white;
		border-right: 1px solid var(--border-primary);
	}

	.system-preview-dark {
		flex: 1;
		background: #1c1c1e;
	}

	.theme-icon {
		grid-column: 1;
		grid-row: 2;
	}

	.theme-info {
		grid-column: 2;
		grid-row: 2;
	}

	.selection-indicator {
		grid-column: 3;
		grid-row: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 999px;
		background: var(--accent-primary);
		color: white;
		margin-left: 0.5rem;
	}

	.check-icon {
		width: 0.9rem;
		height: 0.9rem;
	}

	/* Transitioning state */
	.theme-option.transitioning {
		opacity: 0.8;
		cursor: wait;
	}

	.theme-option.transitioning .theme-preview {
		animation: pulse-subtle 1.5s ease-in-out infinite;
	}

	@keyframes pulse-subtle {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
		}

		.toggle-row {
			align-items: flex-start;
		}

		.theme-option {
			grid-template-columns: auto 1fr;
		}

		.theme-preview {
			grid-column: 1 / -1;
		}

		.selection-indicator {
			grid-column: 2;
			justify-self: end;
		}
	}

	/* Enhanced theme switching animations and UI refinements */
	.theme-option.active {
		position: relative;
		z-index: 1;
		border-color: var(--accent-primary);
		background: color-mix(in srgb, var(--accent-light) 92%, var(--bg-primary));
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--accent-primary) 30%, transparent),
			0 4px 12px color-mix(in srgb, var(--accent-light) 40%, transparent);
		animation: theme-select-pulse 0.4s cubic-bezier(0.2, 0, 0, 1);
	}

	@keyframes theme-select-pulse {
		0% {
			transform: translateY(0);
			box-shadow:
				0 0 0 1px color-mix(in srgb, var(--accent-primary) 30%, transparent),
				0 0 0 0 color-mix(in srgb, var(--accent-light) 0%, transparent);
		}
		50% {
			transform: translateY(-2px);
			box-shadow:
				0 0 0 1px color-mix(in srgb, var(--accent-primary) 40%, transparent),
				0 8px 20px color-mix(in srgb, var(--accent-light) 60%, transparent);
		}
		100% {
			transform: translateY(0);
			box-shadow:
				0 0 0 1px color-mix(in srgb, var(--accent-primary) 30%, transparent),
				0 4px 12px color-mix(in srgb, var(--accent-light) 40%, transparent);
		}
	}

	.theme-option:hover:not(.active) {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--accent-primary) 35%, var(--border-primary));
		box-shadow: 0 4px 12px color-mix(in srgb, var(--border-primary) 20%, transparent);
	}

	/* System preview animation */
	.system-preview {
		position: relative;
		overflow: hidden;
	}

	.system-preview::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(90deg,
			transparent 0%,
			color-mix(in srgb, white 15%, transparent) 50%,
			transparent 100%
		);
		opacity: 0;
		animation: system-shimmer 3s ease-in-out infinite;
	}

	@keyframes system-shimmer {
		0%, 100% {
			opacity: 0;
			transform: translateX(-100%);
		}
		10%, 90% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.4;
			transform: translateX(100%);
		}
	}

	/* Enhanced transitioning state */
	.theme-option.transitioning {
		opacity: 0.9;
		cursor: wait;
	}

	.theme-option.transitioning .theme-preview {
		position: relative;
		overflow: hidden;
	}

	.theme-option.transitioning .theme-preview::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(90deg,
			transparent 0%,
			color-mix(in srgb, var(--accent-primary) 15%, transparent) 50%,
			transparent 100%
		);
		z-index: 1;
		animation: transition-shimmer 1.5s ease-in-out infinite;
	}

	@keyframes transition-shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	/* Theme selection indicator refinement */
	.selection-indicator {
		animation: check-pop 0.3s cubic-bezier(0.2, 0, 0, 1);
	}

	@keyframes check-pop {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		80% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* Theme preview subtle scale animation on hover */
	.theme-preview {
		transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
	}

	.theme-option:hover .theme-preview {
		transform: scale(1.02);
	}

	/* Active theme preview enhancement */
	.theme-option.active .theme-preview {
		transform: scale(1.03);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary) 20%, transparent);
	}
</style>
