<script lang="ts">
	import { Palette, Sun, Moon, Monitor, Check, Sparkles } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { preferences, ACCENT_PRESETS, type AccentTone, type MailDensity, type AppearancePreferences, type Theme } from '$lib/stores/preferencesStore.js';

	const themes: Array<{ id: Theme; labelKey: string; descKey: string; icon: typeof Sun }> = [
		{ id: 'light', labelKey: 'theme.light', descKey: 'theme.lightDescription', icon: Sun },
		{ id: 'dark', labelKey: 'theme.dark', descKey: 'theme.darkDescription', icon: Moon },
		{ id: 'system', labelKey: 'theme.system', descKey: 'theme.systemDescription', icon: Monitor }
	];

	const accentKeys: Record<AccentTone, { nameKey: string; descKey: string }> = {
		blue: { nameKey: 'appearance.accentBlue', descKey: 'appearance.accentBlueDesc' },
		sunset: { nameKey: 'appearance.accentSunset', descKey: 'appearance.accentSunsetDesc' },
		forest: { nameKey: 'appearance.accentForest', descKey: 'appearance.accentForestDesc' },
		graphite: { nameKey: 'appearance.accentGraphite', descKey: 'appearance.accentGraphiteDesc' }
	};

	const densityMeta: Record<MailDensity, { labelKey: string; descKey: string; subjectChars: number; snippetChars: number }> = {
		compact: { labelKey: 'theme.compact', descKey: 'theme.compactDescription', subjectChars: 24, snippetChars: 32 },
		comfortable: { labelKey: 'theme.comfortable', descKey: 'theme.comfortableDescription', subjectChars: 36, snippetChars: 56 },
		airy: { labelKey: 'theme.airy', descKey: 'theme.airyDescription', subjectChars: 48, snippetChars: 84 }
	};

	const accentOptions = Object.entries(ACCENT_PRESETS).map(([id, palette]) => ({ id: id as AccentTone, ...palette }));
	const densityOptions: MailDensity[] = ['compact', 'comfortable', 'airy'];
	const densityHeights: Record<MailDensity, number> = { compact: 58, comfortable: 74, airy: 92 };

	const sampleSubject = 'Sprint update: design review and launch readiness check';
	const sampleBody = 'First line preview keeps only meaningful words and removes extra wrapping before clipping.';

	let appearance = $derived($preferences.appearance);

	function updateAppearance(patch: Partial<AppearancePreferences>) {
		preferences.updateSection('appearance', patch);
	}

	function truncateText(value: string, limit: number): string {
		if (value.length <= limit) return value;
		return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
	}

	let previewSubject = $derived(truncateText(sampleSubject, densityMeta[appearance.mailDensity].subjectChars));
	let previewSnippet = $derived(truncateText(sampleBody, densityMeta[appearance.mailDensity].snippetChars));
</script>

<div class="settings-page">
	<header class="page-header">
		<div class="header-icon">
			<Palette class="size-6" strokeWidth={1.55} />
		</div>
		<div>
			<p class="page-kicker">{$_('appearance.kicker')}</p>
			<h2 class="page-title">{$_('appearance.title')}</h2>
			<p class="page-subtitle">{$_('appearance.subtitle')}</p>
		</div>
	</header>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('appearance.themeTitle')}</h3>
				<p class="section-description">{$_('appearance.themeDescription')}</p>
			</div>
		</div>
		<div class="theme-segmented" role="radiogroup" aria-label={$_('appearance.themeTitle')}>
			{#each themes as theme}
				<button
					type="button"
					class="theme-segment"
					class:active={appearance.theme === theme.id}
					role="radio"
					aria-checked={appearance.theme === theme.id}
					aria-label={$_('appearance.switchTo', { values: { name: $_(theme.labelKey) } })}
					onclick={() => updateAppearance({ theme: theme.id })}
				>
					<theme.icon class="size-4" strokeWidth={1.7} />
					<span>{$_(theme.labelKey)}</span>
				</button>
			{/each}
		</div>
		<div class="theme-summary">
			<p class="option-description">
				{$_(themes.find((t) => t.id === appearance.theme)?.descKey ?? 'theme.systemDescription')}
			</p>
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
					type="button"
					class="accent-option"
					class:active={appearance.accentTone === accent.id}
					onclick={() => updateAppearance({ accentTone: accent.id })}
				>
					<div class="accent-preview" style={`--swatch-primary:${accent.primary}; --swatch-secondary:${accent.secondary}; --swatch-light:${accent.light};`}>
						<div class="accent-chip"></div>
						<div class="accent-line"></div>
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
			{#each densityOptions as density}
				{@const meta = densityMeta[density]}
				<button
					type="button"
					class="density-option"
					class:active={appearance.mailDensity === density}
					onclick={() => updateAppearance({ mailDensity: density })}
					aria-pressed={appearance.mailDensity === density}
				>
					<div>
						<p class="option-label">{$_(meta.labelKey)}</p>
						<p class="option-description">{$_(meta.descKey)}</p>
					</div>
					{#if appearance.mailDensity === density}
						<Check class="size-4 text-[var(--accent-primary)]" strokeWidth={2.1} />
					{/if}
				</button>
			{/each}
		</div>

		<div class="density-preview">
			<div class="density-preview-header">
				<div class="density-preview-title">
					<Sparkles class="size-4" strokeWidth={1.8} />
					<span>{$_('theme.mailDensity')}</span>
				</div>
				<span class="density-badge">{$_(densityMeta[appearance.mailDensity].labelKey)}</span>
			</div>
			<div class="mail-row-preview" style={`height:${densityHeights[appearance.mailDensity]}px`}>
				<div class="preview-subject">{previewSubject}</div>
				{#if appearance.showPreviewSnippets}
					<div class="preview-snippet">{previewSnippet}</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('appearance.threadDetails')}</h3>
				<p class="section-description">{$_('appearance.threadDetailsDescription')}</p>
			</div>
			<button class="reset-button" type="button" onclick={() => preferences.resetSection('appearance')}>
				{$_('appearance.resetAppearance')}
			</button>
		</div>

		<div class="toggle-stack">
			<button type="button" class="toggle-row" onclick={() => updateAppearance({ showPreviewSnippets: !appearance.showPreviewSnippets })}>
				<div>
					<p class="option-label">{$_('appearance.previewSnippets')}</p>
					<p class="option-description">{$_('appearance.previewSnippetsDescription')}</p>
				</div>
				<span class:toggle-on={appearance.showPreviewSnippets} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button type="button" class="toggle-row" onclick={() => updateAppearance({ showAccountColor: !appearance.showAccountColor })}>
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
	.theme-segmented {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		padding: 0.25rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--bg-secondary) 72%, transparent);
		border: 1px solid color-mix(in srgb, var(--border-primary) 88%, transparent);
	}

	.theme-segment {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.45rem;
		height: 2.35rem;
		border-radius: 10px;
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.84rem;
		font-weight: 620;
		cursor: pointer;
	}

	.theme-segment.active {
		background: var(--bg-primary);
		color: var(--text-primary);
		box-shadow: var(--shadow-xs);
	}

	.theme-summary {
		padding: 0.15rem 0.1rem 0;
	}

	.accent-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 0.8rem;
	}

	.accent-option,
	.density-option {
		display: grid;
		gap: 0.7rem;
		padding: 0.9rem 1rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--bg-secondary) 62%, transparent);
		text-align: left;
		cursor: pointer;
	}

	.accent-option:hover,
	.density-option:hover {
		border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	.accent-option.active,
	.density-option.active {
		background: color-mix(in srgb, var(--accent-light) 85%, var(--bg-primary));
		border-color: color-mix(in srgb, var(--accent-primary) 28%, var(--border-primary));
	}

	.accent-preview {
		position: relative;
		height: 4.2rem;
		border-radius: 14px;
		background:
			linear-gradient(150deg, var(--swatch-light), white 65%),
			linear-gradient(140deg, var(--swatch-primary), var(--swatch-secondary));
		overflow: hidden;
	}

	.accent-chip {
		position: absolute;
		top: 0.75rem;
		left: 0.75rem;
		width: 2.8rem;
		height: 0.9rem;
		border-radius: 999px;
		background: var(--swatch-primary);
	}

	.accent-line {
		position: absolute;
		bottom: 0.9rem;
		left: 0.75rem;
		width: 5.2rem;
		height: 0.42rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--swatch-secondary) 30%, white);
	}

	.accent-dot {
		position: absolute;
		right: 0.9rem;
		bottom: 0.75rem;
		width: 0.95rem;
		height: 0.95rem;
		border-radius: 999px;
		background: var(--swatch-secondary);
	}

	.accent-copy {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.6rem;
	}

	.check-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 999px;
		background: var(--accent-primary);
		color: white;
		flex-shrink: 0;
	}

	.density-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.density-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.density-preview {
		display: grid;
		gap: 0.65rem;
		padding: 0.95rem;
		border-radius: 16px;
		background: color-mix(in srgb, var(--bg-secondary) 72%, transparent);
		border: 1px solid color-mix(in srgb, var(--border-primary) 88%, transparent);
	}

	.density-preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.density-preview-title {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.8rem;
		font-weight: 650;
		color: var(--text-secondary);
	}

	.density-badge {
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 650;
		color: var(--accent-primary);
		background: color-mix(in srgb, var(--accent-primary) 10%, transparent);
	}

	.mail-row-preview {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.35rem;
		padding: 0.65rem 0.8rem;
		border-radius: 12px;
		background: var(--bg-primary);
		border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
	}

	.preview-subject {
		font-size: 0.9rem;
		font-weight: 620;
		color: var(--text-primary);
		line-height: 1.4;
	}

	.preview-snippet {
		font-size: 0.8rem;
		color: var(--text-tertiary);
		line-height: 1.4;
	}

	@media (max-width: 900px) {
		.density-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.theme-segmented {
			grid-template-columns: 1fr;
		}
	}
</style>
