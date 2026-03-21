<script lang="ts">
	import { onMount } from 'svelte';
	import { Globe, Check, ChevronDown, Info } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { i18nStore, SUPPORTED_LOCALES, type SupportedLocale } from '$lib/stores/i18nStore.svelte.js';
	import { preferences } from '$lib/stores/preferencesStore.js';

	let currentLocale = $state<SupportedLocale>('en');
	let autoDetect = $state(true);
	let showAllLanguages = $state(false);
	let isChanging = $state(false);

	// Get system language info
	let systemLocale = $state<string>('');
	let systemLocaleName = $state<string>('');

	// Initialize from preferences
	$effect(() => {
		const unsubscribe = preferences.subscribe((prefs) => {
			autoDetect = prefs.language?.autoDetect ?? true;
		});
		return unsubscribe;
	});

	// Update current locale reactively when i18nStore changes
	$effect(() => {
		currentLocale = i18nStore.current;
	});

	onMount(() => {
		// Get system language
		systemLocale = navigator.language;
		systemLocaleName = getSystemLocaleName(systemLocale);
	});

	function getSystemLocaleName(locale: string): string {
		try {
			const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
			return displayNames.of(locale.split('-')[0]) ?? locale;
		} catch {
			return locale;
		}
	}

	async function handleLanguageSelect(localeCode: SupportedLocale) {
		if (localeCode === currentLocale) return;

		isChanging = true;

		try {
			await i18nStore.setLocale(localeCode);

			// Update preferences
			preferences.updateSection('language', {
				locale: localeCode,
				autoDetect: false
			});
		} catch (error) {
			console.error('Failed to change language:', error);
		} finally {
			isChanging = false;
		}
	}

	async function handleAutoDetectChange() {
		const newValue = !autoDetect;

		if (newValue) {
			// Enable auto-detect
			const detectedLocale = detectSystemLocale();
			await i18nStore.setLocale(detectedLocale);
			preferences.updateSection('language', {
				autoDetect: true
			});
		} else {
			// Disable auto-detect, keep current locale
			preferences.updateSection('language', {
				locale: currentLocale,
				autoDetect: false
			});
		}

		autoDetect = newValue;
	}

	function detectSystemLocale(): SupportedLocale {
		const browserLang = navigator.language;
		const exactMatch = SUPPORTED_LOCALES.find(l => l.code === browserLang);
		if (exactMatch) return exactMatch.code;

		const langPrefix = browserLang.split('-')[0];
		const prefixMatch = SUPPORTED_LOCALES.find(l => l.code.startsWith(langPrefix));
		return prefixMatch?.code ?? 'en';
	}

	function toggleShowAllLanguages() {
		showAllLanguages = !showAllLanguages;
	}

	// Common languages (priority display)
	const commonLocales: SupportedLocale[] = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko'];

	// Other languages
	const otherLocales = SUPPORTED_LOCALES
		.filter(l => !commonLocales.includes(l.code))
		.map(l => l.code);
</script>

<div class="language-settings-page">
	<!-- Page Header -->
	<header class="page-header">
		<div class="header-icon">
			<Globe class="size-6" strokeWidth={1.55} />
		</div>
		<div>
			<p class="page-kicker">{$_('language.kicker')}</p>
			<h1 class="page-title">{$_('language.pageTitle')}</h1>
			<p class="page-subtitle">
				{$_('language.pageSubtitle')}
			</p>
		</div>
	</header>

	<!-- Language Options List -->
	<section class="language-section">
		<!-- Auto-detect option -->
		<button
			class="language-option auto-detect-option"
			class:active={autoDetect}
			onclick={handleAutoDetectChange}
			disabled={isChanging}
		>
			<div class="language-content">
				<div class="language-info">
					<p class="language-name">{$_('language.autoDetect')}</p>
					<p class="language-details">
						{#if autoDetect}
							<span class="status-indicator success">✓</span>
							{$_('language.currentlyUsing', { values: { name: SUPPORTED_LOCALES.find(l => l.code === currentLocale)?.nativeName ?? '' } })}
						{:else}
							{$_('language.clickToEnable')}
						{/if}
					</p>
					<p class="system-info">
						📝 {$_('language.systemLanguage', { values: { name: systemLocaleName } })}
					</p>
				</div>
				{#if autoDetect}
					<div class="check-badge">
						<Check class="size-4" strokeWidth={2.2} />
					</div>
				{/if}
			</div>
		</button>

		<div class="section-divider"></div>

		<!-- Common languages list -->
		{#each commonLocales as localeCode}
			{@const locale = SUPPORTED_LOCALES.find(l => l.code === localeCode)}
			{#if locale}
				<button
					class="language-option"
					class:active={currentLocale === locale.code && !autoDetect}
					onclick={() => handleLanguageSelect(locale.code)}
					disabled={isChanging}
				>
					<div class="language-content">
						<div class="language-info">
							<p class="language-name">{locale.nativeName}</p>
							<p class="language-details">{locale.name}</p>
						</div>
						{#if currentLocale === locale.code && !autoDetect}
							<div class="check-badge">
								<Check class="size-4" strokeWidth={2.2} />
							</div>
						{/if}
					</div>
				</button>
			{/if}
		{/each}

		<!-- Show more languages -->
		{#if showAllLanguages}
			<div class="section-divider"></div>
			{#each otherLocales as localeCode}
				{@const locale = SUPPORTED_LOCALES.find(l => l.code === localeCode)}
				{#if locale}
					<button
						class="language-option"
						class:active={currentLocale === locale.code && !autoDetect}
						onclick={() => handleLanguageSelect(locale.code)}
						disabled={isChanging}
					>
						<div class="language-content">
							<div class="language-info">
								<p class="language-name">{locale.nativeName}</p>
								<p class="language-details">{locale.name}</p>
							</div>
							{#if currentLocale === locale.code && !autoDetect}
								<div class="check-badge">
									<Check class="size-4" strokeWidth={2.2} />
								</div>
							{/if}
						</div>
					</button>
				{/if}
			{/each}
		{/if}

		<!-- Expand/Collapse button -->
		<button
			class="show-more-button"
			onclick={toggleShowAllLanguages}
		>
			<span>{showAllLanguages ? $_('language.showLess') : $_('language.showAll', { values: { count: SUPPORTED_LOCALES.length } })}</span>
			<span class:rotate-180={showAllLanguages}>
				<ChevronDown class="size-4" />
			</span>
		</button>
	</section>

	<!-- Info banner -->
	<div class="info-banner">
		<Info class="size-4" />
		<p>
			{$_('language.infoBanner')}
		</p>
	</div>
</div>

<style>
	.language-settings-page {
		display: grid;
		gap: 1.5rem;
		padding: 2rem;
		max-width: 800px;
		margin: 0 auto;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.page-header {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 0.5rem;
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
		color: var(--text-secondary);
		font-size: 0.96rem;
		line-height: 1.6;
	}

	.language-section {
		display: grid;
		gap: 0.75rem;
	}

	.language-option {
		display: block;
		width: 100%;
		padding: 1rem 1.25rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
		border-radius: 16px;
		background: color-mix(in srgb, var(--bg-secondary) 62%, transparent);
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.language-option:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	.language-option.active {
		background: color-mix(in srgb, var(--accent-light) 85%, var(--bg-primary));
		border-color: color-mix(in srgb, var(--accent-primary) 28%, var(--border-primary));
	}

	.language-option:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.auto-detect-option {
		background: linear-gradient(135deg,
			color-mix(in srgb, var(--accent-light) 15%, var(--bg-secondary)),
			color-mix(in srgb, var(--accent-primary) 8%, var(--bg-secondary))
		);
	}

	.language-content {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.language-info {
		flex: 1;
		min-width: 0;
	}

	.language-name {
		margin: 0 0 0.25rem;
		font-size: 0.95rem;
		font-weight: 620;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.language-details {
		margin: 0 0 0.25rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-indicator {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 540;
	}

	.status-indicator.success {
		background: color-mix(in srgb, #22c55e 12%, transparent);
		color: #16a34a;
	}

	.system-info {
		margin: 0;
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	.check-badge {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 999px;
		background: var(--accent-primary);
		color: white;
		flex-shrink: 0;
		animation: checkPop 0.3s cubic-bezier(0.2, 0, 0, 1);
	}

	@keyframes checkPop {
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

	.section-divider {
		height: 1px;
		background: color-mix(in srgb, var(--border-primary) 50%, transparent);
		margin: 0.5rem 0;
	}

	.show-more-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem;
		border: none;
		border-radius: 12px;
		background: transparent;
		color: var(--accent-primary);
		font-size: 0.875rem;
		font-weight: 540;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.show-more-button:hover {
		background: color-mix(in srgb, var(--accent-light) 25%, transparent);
	}

	.show-more-button .rotate-180 {
		transform: rotate(180deg);
	}

	.info-banner {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		background: color-mix(in srgb, var(--accent-light) 15%, var(--bg-secondary));
		border: 1px solid color-mix(in srgb, var(--accent-primary) 15%, transparent);
		border-radius: 12px;
		color: var(--text-secondary);
		font-size: 0.875rem;
		line-height: 1.6;
	}

	.info-banner svg {
		flex-shrink: 0;
		color: var(--accent-primary);
		margin-top: 0.125rem;
	}
</style>
