<script lang="ts">
	import { Palette, Sun, Moon, Monitor, Check } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { themeStore, type Theme } from '$lib/stores/themeStore.js';
	import { preferences, ACCENT_PRESETS, type AccentTone, type MailDensity, type AppearancePreferences } from '$lib/stores/preferencesStore.js';

	import { getIsTransitioning } from '$lib/stores/themeStore.js';

	const themeKeys: Record<Theme, { labelKey: string; descKey: string; icon: typeof Sun }> = {
		light: { labelKey: 'theme.light', descKey: 'theme.lightDescription', icon: Sun },
		dark: { labelKey: 'theme.dark', descKey: 'theme.darkDescription', icon: Moon },
		system: { labelKey: 'theme.system', descKey: 'theme.systemDescription', icon: Monitor }
	};

	const themes: Theme[] = ['light', 'dark', 'system'];

	let isTransitioning = $derived(getIsTransitioning());

	const accentKeys: Record<AccentTone, { nameKey: string; descKey: string }> = {
		blue: { nameKey: 'appearance.accentBlue', descKey: 'appearance.accentBlueDesc' },
		sunset: { nameKey: 'appearance.accentSunset', descKey: 'appearance.accentSunsetDesc' },
		forest: { nameKey: 'appearance.accentForest', descKey: 'appearance.accentForestDesc' },
		graphite: { nameKey: 'appearance.accentGraphite', descKey: 'appearance.accentGraphiteDesc' }
	};

	const accentOptions = Object.entries(ACCENT_PRESETS).map(([id, palette]) => ({
		id: id as AccentTone,
		...palette
	}));

	const densityKeys: Record<MailDensity, { labelKey: string; descKey: string }> = {
		compact: { labelKey: 'theme.compact', descKey: 'theme.compactDescription' },
		comfortable: { labelKey: 'theme.comfortable', descKey: 'theme.comfortableDescription' },
		airy: { labelKey: 'theme.airy', descKey: 'theme.airyDescription' }
	};

	const densityOptions: MailDensity[] = ['compact', 'comfortable', 'airy'];

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
			<p class="page-kicker">{$_('appearance.kicker')}</p>
			<h2 class="page-title">{$_('appearance.title')}</h2>
			<p class="page-subtitle">
				{$_('appearance.subtitle')}
			</p>
		</div>
	</header>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('appearance.themeTitle')}</h3>
				<p class="section-description">{$_('appearance.themeDescription')}</p>
			</div>
		</div>

		<div class="theme-grid">
			{#each themes as themeId}
				{@const meta = themeKeys[themeId]}
				<button
					class="theme-option"
					class:active={activeTheme === themeId}
					class:transitioning={isTransitioning && activeTheme === themeId}
					onclick={() => themeStore.set(themeId)}
					disabled={isTransitioning}
					aria-label={$_('appearance.switchTo', { values: { name: $_( meta.labelKey) } })}
					aria-pressed={activeTheme === themeId}
				>
					<div class="theme-preview">
						{#if themeId === 'system'}
							<div class="system-preview">
								<div class="system-preview-light"></div>
								<div class="system-preview-dark"></div>
							</div>
						{:else}
							<div class="simple-preview {themeId === 'light' ? 'bg-white border border-[var(--border-primary)]' : 'bg-[var(--bg-primary)] border border-[var(--border-primary)]'}"></div>
						{/if}
					</div>

					<div class="theme-icon">
						<meta.icon class="size-4" strokeWidth={1.7} />
					</div>

					<div class="theme-info">
						<p class="option-label">{$_(meta.labelKey)}</p>
						<p class="option-description">{$_(meta.descKey)}</p>
					</div>

					{#if activeTheme === themeId}
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
				<h3 class="section-title">{$_('appearance.accentTitle')}</h3>
				<p class="section-description">{$_('appearance.accentDescription')}</p>
			</div>
		</div>

		<div class="accent-grid">
			{#each accentOptions as accent}
				{@const keys = accentKeys[accent.id]}
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
							<p class="option-label">{$_(keys.nameKey)}</p>
							<p class="option-description">{$_(keys.descKey)}</p>
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
				<h3 class="section-title">{$_('appearance.densityTitle')}</h3>
				<p class="section-description">{$_('appearance.densityDescription')}</p>
			</div>
		</div>

		<div class="density-grid">
			{#each densityOptions as optionId}
				{@const keys = densityKeys[optionId]}
				<button
					class="density-option"
					class:active={appearance.mailDensity === optionId}
					onclick={() => updateAppearance({ mailDensity: optionId })}
				>
					<div>
						<p class="option-label">{$_(keys.labelKey)}</p>
						<p class="option-description">{$_(keys.descKey)}</p>
					</div>
				</button>
			{/each}
		</div>
	</section>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('appearance.threadDetails')}</h3>
				<p class="section-description">{$_('appearance.threadDetailsDescription')}</p>
			</div>
			<button class="reset-button" onclick={() => preferences.resetSection('appearance')}>
				{$_('appearance.resetAppearance')}
			</button>
		</div>

		<div class="toggle-stack">
			<button class="toggle-row" onclick={() => updateAppearance({ showPreviewSnippets: !appearance.showPreviewSnippets })}>
				<div>
					<p class="option-label">{$_('appearance.previewSnippets')}</p>
					<p class="option-description">{$_('appearance.previewSnippetsDescription')}</p>
				</div>
				<span class:toggle-on={appearance.showPreviewSnippets} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button class="toggle-row" onclick={() => updateAppearance({ showAccountColor: !appearance.showAccountColor })}>
				<div>
					<p class="option-label">{$_('appearance.accountColorMarkers')}</p>
					<p class="option-description">{$_('appearance.accountColorMarkersDescription')}</p>
				</div>
				<span class:toggle-on={appearance.showAccountColor} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>
		</div>
	</section>
</div>

<style>
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
	.accent-option:hover {
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
		transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
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
		position: relative;
		overflow: hidden;
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
		animation: check-pop 0.3s cubic-bezier(0.2, 0, 0, 1);
	}

	.check-icon {
		width: 0.9rem;
		height: 0.9rem;
	}

	/* Transitioning state */
	.theme-option.transitioning {
		opacity: 0.9;
		cursor: wait;
	}

	.theme-option.transitioning .theme-preview {
		position: relative;
		overflow: hidden;
		animation: pulse-subtle 1.5s ease-in-out infinite;
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

	@keyframes pulse-subtle {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	@keyframes transition-shimmer {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(100%); }
	}

	/* Active theme enhancement */
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

	/* System preview shimmer */
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

	@keyframes check-pop {
		0% { transform: scale(0); opacity: 0; }
		80% { transform: scale(1.1); }
		100% { transform: scale(1); opacity: 1; }
	}

	.theme-option:hover .theme-preview {
		transform: scale(1.02);
	}

	.theme-option.active .theme-preview {
		transform: scale(1.03);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary) 20%, transparent);
	}

	@media (max-width: 640px) {
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
</style>
