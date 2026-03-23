<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Palette, Sun, Moon, Monitor, Check, Sparkles } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import {
		preferences,
		ACCENT_PRESETS,
		type AccentTone,
		type MailDensity,
		type AppearancePreferences,
		type Theme
	} from '$lib/stores/preferencesStore.js';

	interface Ripple {
		id: number;
		x: number;
		y: number;
		size: number;
	}

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

	const densityMeta: Record<
		MailDensity,
		{ labelKey: string; descKey: string; subjectChars: number; snippetChars: number }
	> = {
		compact: { labelKey: 'theme.compact', descKey: 'theme.compactDescription', subjectChars: 24, snippetChars: 32 },
		comfortable: { labelKey: 'theme.comfortable', descKey: 'theme.comfortableDescription', subjectChars: 36, snippetChars: 56 },
		airy: { labelKey: 'theme.airy', descKey: 'theme.airyDescription', subjectChars: 48, snippetChars: 84 }
	};

	const accentOptions = Object.entries(ACCENT_PRESETS).map(([id, palette]) => ({
		id: id as AccentTone,
		...palette
	}));
	const densityOptions: MailDensity[] = ['compact', 'comfortable', 'airy'];
	const densityHeights: Record<MailDensity, number> = { compact: 58, comfortable: 74, airy: 92 };

	const sampleSubject = 'Sprint update: design review and launch readiness check';
	const sampleBody =
		'First line preview keeps only meaningful words and removes extra wrapping before clipping.';

	let appearance = $derived($preferences.appearance);
	let pulsingTheme = $state<Theme | null>(null);
	let rippleCounter = 0;
	let accentRipples = $state<Record<AccentTone, Ripple[]>>({
		blue: [],
		sunset: [],
		forest: [],
		graphite: []
	});

	let previewSubject = $derived(
		truncateText(sampleSubject, densityMeta[appearance.mailDensity].subjectChars)
	);
	let previewSnippet = $derived(
		truncateText(sampleBody, densityMeta[appearance.mailDensity].snippetChars)
	);
	let activeThemeIndex = $derived(
		Math.max(
			0,
			themes.findIndex((theme) => theme.id === appearance.theme)
		)
	);

	function updateAppearance(patch: Partial<AppearancePreferences>) {
		preferences.updateSection('appearance', patch);
	}

	function truncateText(value: string, limit: number): string {
		if (value.length <= limit) return value;
		return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
	}

	function updateInteractiveGlow(event: PointerEvent) {
		const node = event.currentTarget as HTMLElement;
		const rect = node.getBoundingClientRect();
		node.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
		node.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
	}

	function resetInteractiveGlow(event: PointerEvent) {
		const node = event.currentTarget as HTMLElement;
		node.style.setProperty('--pointer-x', '50%');
		node.style.setProperty('--pointer-y', '50%');
	}

	function triggerThemePulse(themeId: Theme) {
		pulsingTheme = themeId;
		setTimeout(() => {
			if (pulsingTheme === themeId) {
				pulsingTheme = null;
			}
		}, 420);
	}

	function selectTheme(themeId: Theme, event: MouseEvent) {
		updateInteractiveGlow(event as unknown as PointerEvent);
		triggerThemePulse(themeId);
		updateAppearance({ theme: themeId });
	}

	function triggerRipple(accentId: AccentTone, event: MouseEvent) {
		const node = event.currentTarget as HTMLElement;
		const rect = node.getBoundingClientRect();
		const ripple: Ripple = {
			id: rippleCounter++,
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
			size: Math.max(rect.width, rect.height) * 1.2
		};

		accentRipples = {
			...accentRipples,
			[accentId]: [...accentRipples[accentId], ripple]
		};

		setTimeout(() => {
			accentRipples = {
				...accentRipples,
				[accentId]: accentRipples[accentId].filter((item) => item.id !== ripple.id)
			};
		}, 520);
	}

	function selectAccent(accentId: AccentTone, event: MouseEvent) {
		updateInteractiveGlow(event as unknown as PointerEvent);
		triggerRipple(accentId, event);
		updateAppearance({ accentTone: accentId });
	}
</script>

<div class="settings-page appearance-page">
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
		<div class="theme-segmented" data-theme-surface role="radiogroup" aria-label={$_('appearance.themeTitle')}>
			<div
				class="theme-mode-indicator"
				style={`transform: translate3d(calc(${activeThemeIndex} * 100%), 0, 0);`}
			></div>
			{#each themes as theme}
				<button
					type="button"
					class="theme-segment"
					class:active={appearance.theme === theme.id}
					class:pulsing={pulsingTheme === theme.id}
					role="radio"
					aria-checked={appearance.theme === theme.id}
					aria-label={$_('appearance.switchTo', { values: { name: $_(theme.labelKey) } })}
					onclick={(event) => selectTheme(theme.id, event)}
					onpointermove={updateInteractiveGlow}
					onpointerleave={resetInteractiveGlow}
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
					aria-pressed={appearance.accentTone === accent.id}
					onclick={(event) => selectAccent(accent.id, event)}
					onpointermove={updateInteractiveGlow}
					onpointerleave={resetInteractiveGlow}
				>
					<div
						class="accent-preview"
						style={`--swatch-primary:${accent.primary}; --swatch-secondary:${accent.secondary}; --swatch-light:${accent.light};`}
					>
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
							<div class="check-badge" transition:fly={{ y: 8, duration: 220 }}>
								<Check class="size-3.5" strokeWidth={2.2} />
							</div>
						{/if}
					</div>

					<div class="accent-ripples" aria-hidden="true">
						{#each accentRipples[accent.id] as ripple (ripple.id)}
							<span
								class="accent-ripple"
								style={`left:${ripple.x}px; top:${ripple.y}px; width:${ripple.size}px; height:${ripple.size}px;`}
							></span>
						{/each}
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
						<span class="density-check" transition:fly={{ x: 8, duration: 220 }}>
							<Check class="size-4 text-[var(--accent-primary)]" strokeWidth={2.1} />
						</span>
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
			<button
				type="button"
				class="toggle-row"
				onclick={() => updateAppearance({ showPreviewSnippets: !appearance.showPreviewSnippets })}
			>
				<div>
					<p class="option-label">{$_('appearance.previewSnippets')}</p>
					<p class="option-description">{$_('appearance.previewSnippetsDescription')}</p>
				</div>
				<span class:toggle-on={appearance.showPreviewSnippets} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button
				type="button"
				class="toggle-row"
				onclick={() => updateAppearance({ showAccountColor: !appearance.showAccountColor })}
			>
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
	.appearance-page {
		position: relative;
	}

	.theme-segmented {
		position: relative;
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		padding: 0.25rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--bg-secondary) 72%, transparent);
		border: 1px solid color-mix(in srgb, var(--border-primary) 88%, transparent);
		overflow: hidden;
		isolation: isolate;
	}

	:global(.dark) .theme-segmented {
		padding: 0.32rem;
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--bg-tertiary) 86%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent));
		border-color: color-mix(in srgb, var(--border-primary) 96%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.04),
			inset 0 -1px 0 rgba(0, 0, 0, 0.22);
	}

	.theme-mode-indicator {
		position: absolute;
		top: 0.25rem;
		left: 0.25rem;
		bottom: 0.25rem;
		width: calc((100% - 0.5rem) / 3);
		border-radius: 10px;
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 92%, transparent), color-mix(in srgb, var(--accent-light) 78%, var(--bg-primary))),
			radial-gradient(circle at 18% 28%, rgba(255, 255, 255, 0.42), transparent 46%);
		box-shadow:
			var(--shadow-xs),
			0 12px 20px rgba(26, 52, 90, 0.08);
		backdrop-filter: blur(18px) saturate(126%);
		pointer-events: none;
	}

	:global(.dark) .theme-mode-indicator {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--accent-light) 84%, var(--bg-secondary)), color-mix(in srgb, var(--bg-primary) 92%, transparent)),
			radial-gradient(circle at 18% 28%, rgba(255, 255, 255, 0.12), transparent 42%);
		box-shadow:
			0 14px 24px rgba(0, 0, 0, 0.28),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.theme-segment {
		position: relative;
		z-index: 1;
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
		overflow: hidden;
		--pointer-x: 50%;
		--pointer-y: 50%;
	}

	.theme-segment::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(120px circle at var(--pointer-x) var(--pointer-y), rgba(255, 255, 255, 0.22), transparent 65%);
		opacity: 0;
		pointer-events: none;
	}

	.theme-segment.active {
		color: var(--text-primary);
		backdrop-filter: blur(16px) saturate(120%);
	}

	.theme-segment.active::after,
	.theme-segment:hover::after {
		opacity: 1;
	}

	.theme-segment.pulsing {
		animation: theme-card-pulse 400ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	:global(.dark) .theme-segment {
		color: var(--text-tertiary);
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
		position: relative;
		display: grid;
		gap: 0.7rem;
		padding: 0.9rem 1rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--bg-secondary) 62%, transparent);
		text-align: left;
		cursor: pointer;
		overflow: hidden;
		isolation: isolate;
		--pointer-x: 50%;
		--pointer-y: 50%;
	}

	.accent-option > *,
	.density-option > * {
		position: relative;
		z-index: 1;
	}

	.accent-option::before {
		content: '';
		position: absolute;
		inset: -1px;
		padding: 1px;
		border-radius: 19px;
		background: conic-gradient(
			from 0deg,
			transparent 0deg,
			color-mix(in srgb, var(--accent-primary) 55%, transparent) 50deg,
			color-mix(in srgb, white 32%, transparent) 84deg,
			transparent 124deg,
			transparent 360deg
		);
		-webkit-mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		mask:
			linear-gradient(#fff 0 0) content-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		opacity: 0;
		pointer-events: none;
		animation: accent-border-orbit 3.4s linear infinite;
	}

	.accent-option::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: radial-gradient(180px circle at var(--pointer-x) var(--pointer-y), color-mix(in srgb, white 14%, transparent), transparent 62%);
		opacity: 0;
		pointer-events: none;
	}

	:global(.dark) .accent-option,
	:global(.dark) .density-option {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--bg-tertiary) 82%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent));
		border-color: color-mix(in srgb, var(--border-primary) 96%, transparent);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
	}

	.accent-option:hover,
	.density-option:hover {
		border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
		transform: translate3d(0, -1px, 0);
		box-shadow: var(--shadow-sm);
	}

	.accent-option:hover::after,
	.accent-option.active::after {
		opacity: 1;
	}

	.accent-option.active,
	.density-option.active {
		background: color-mix(in srgb, var(--accent-light) 85%, var(--bg-primary));
		border-color: color-mix(in srgb, var(--accent-primary) 28%, var(--border-primary));
	}

	.accent-option.active::before {
		opacity: 1;
	}

	:global(.dark) .accent-option.active,
	:global(.dark) .density-option.active {
		background:
			linear-gradient(160deg, color-mix(in srgb, var(--accent-light) 78%, var(--bg-secondary)), color-mix(in srgb, var(--bg-primary) 94%, transparent));
		box-shadow:
			0 18px 30px rgba(0, 0, 0, 0.24),
			inset 0 1px 0 rgba(255, 255, 255, 0.06),
			inset 0 0 0 1px color-mix(in srgb, var(--accent-primary) 12%, transparent);
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

	.accent-preview::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(120px circle at var(--pointer-x) var(--pointer-y), rgba(255, 255, 255, 0.3), transparent 62%),
			linear-gradient(135deg, rgba(255, 255, 255, 0.32), transparent 42%);
		opacity: 0;
	}

	.accent-option:hover .accent-preview::after,
	.accent-option.active .accent-preview::after {
		opacity: 1;
	}

	:global(.dark) .accent-preview {
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.08),
			0 10px 18px rgba(0, 0, 0, 0.2);
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

	.accent-ripples {
		position: absolute;
		inset: 0;
		overflow: hidden;
		border-radius: inherit;
		pointer-events: none;
	}

	.accent-ripple {
		position: absolute;
		border-radius: 999px;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.12) 58%, transparent 72%);
		transform: translate3d(-50%, -50%, 0) scale(0.15);
		opacity: 0.7;
		animation: accent-ripple 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
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

	.density-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.density-preview {
		display: grid;
		gap: 0.65rem;
		padding: 0.95rem;
		border-radius: 16px;
		background: color-mix(in srgb, var(--bg-secondary) 72%, transparent);
		border: 1px solid color-mix(in srgb, var(--border-primary) 88%, transparent);
	}

	:global(.dark) .density-preview {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--bg-tertiary) 82%, transparent), color-mix(in srgb, var(--bg-secondary) 92%, transparent));
		border-color: color-mix(in srgb, var(--border-primary) 96%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.04),
			0 16px 28px rgba(0, 0, 0, 0.18);
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

	:global(.dark) .density-badge {
		background: color-mix(in srgb, var(--accent-primary) 16%, var(--bg-secondary));
		border: 1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent);
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

	:global(.dark) .mail-row-preview {
		background:
			linear-gradient(180deg, rgba(245, 248, 255, 0.03), rgba(255, 255, 255, 0.02)),
			linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 86%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent));
		border-color: color-mix(in srgb, var(--border-primary) 98%, transparent);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.05),
			0 10px 20px rgba(0, 0, 0, 0.16);
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

	@keyframes theme-card-pulse {
		0% {
			filter: brightness(1);
			transform: scale(1);
		}
		45% {
			filter: brightness(1.1);
			transform: scale(0.985);
		}
		100% {
			filter: brightness(1);
			transform: scale(1);
		}
	}

	@keyframes accent-ripple {
		0% {
			transform: translate3d(-50%, -50%, 0) scale(0.15);
			opacity: 0.72;
		}
		100% {
			transform: translate3d(-50%, -50%, 0) scale(1);
			opacity: 0;
		}
	}

	@keyframes accent-border-orbit {
		to {
			transform: rotate(1turn);
		}
	}

	@media (max-width: 900px) {
		.density-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.theme-segmented {
			grid-template-columns: 1fr;
			gap: 0.35rem;
		}

		.theme-mode-indicator {
			display: none;
		}
	}
</style>
