<script lang="ts">
	import { Shield, Ban, Mail, Eye, EyeOff, Globe, Lock, Trash2, Wrench } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { invoke } from '@tauri-apps/api/core';
	import { preferences, type PrivacyPreferences } from '$lib/stores/preferencesStore.js';
	import * as db from '$lib/db/index.js';

	let privacy = $derived($preferences.privacy);
	let dbSize = $state<{ size: number; unit: string } | null>(null);
	let isCompacting = $state(false);
	let isClearing = $state(false);
	let error = $state<string | null>(null);

	function updatePrivacy(patch: Partial<PrivacyPreferences>) {
		preferences.updateSection('privacy', patch);
	}

	async function getDatabaseSize() {
		try {
			const sizeBytes = await invoke<number>('get_database_size');
			if (sizeBytes < 1024) {
				dbSize = { size: sizeBytes, unit: 'B' };
			} else if (sizeBytes < 1024 * 1024) {
				dbSize = { size: Math.round(sizeBytes / 1024), unit: 'KB' };
			} else {
				dbSize = { size: Math.round(sizeBytes / (1024 * 1024)), unit: 'MB' };
			}
		} catch (e) {
			error = e instanceof Error ? e.message : $_('accountForm.failedToGetDbSize');
		}
	}

	async function compactDatabase() {
		isCompacting = true;
		error = null;
		try {
			await invoke('compact_database');
			await getDatabaseSize();
		} catch (e) {
			error = e instanceof Error ? e.message : $_('accountForm.failedToCompactDb');
		} finally {
			isCompacting = false;
		}
	}

	async function clearLocalData() {
		if (!confirm($_('privacy.clearConfirm'))) {
			return;
		}
		isClearing = true;
		error = null;
		try {
			await db.clearDatabase();
			alert($_('privacy.clearSuccess'));
		} catch (e) {
			error = e instanceof Error ? e.message : $_('accountForm.failedToClearData');
		} finally {
			isClearing = false;
		}
	}

	// Load database size on mount
	$effect(() => {
		getDatabaseSize();
	});
</script>

<div class="settings-page">
	<header class="page-header">
		<div class="header-icon">
			<Shield class="size-6" strokeWidth={1.55} />
		</div>
		<div>
			<p class="page-kicker">{$_('privacy.kicker')}</p>
			<h2 class="page-title">{$_('privacy.title')}</h2>
			<p class="page-subtitle">
				{$_('privacy.subtitle')}
			</p>
		</div>
	</header>

	<!-- Remote Content -->
	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('privacy.remoteContent')}</h3>
				<p class="section-description">{$_('privacy.remoteContentDescription')}</p>
			</div>
		</div>

		<div class="select-grid">
			{#each ['always_ask', 'never_load', 'always_load'] as action}
				{@const actionValue = action as 'always_ask' | 'never_load' | 'always_load'}
				<button
					class="select-option"
					class:active={privacy.remoteContentAction === actionValue}
					onclick={() => updatePrivacy({ remoteContentAction: actionValue })}
				>
					<div class="select-content">
						<div class="select-icon">
							{#if action === 'always_ask'}
								<Eye class="size-4" strokeWidth={1.7} />
							{:else if action === 'never_load'}
								<Ban class="size-4" strokeWidth={1.7} />
							{:else}
								<Globe class="size-4" strokeWidth={1.7} />
							{/if}
						</div>
						<div>
							<p class="option-label">
								{#if action === 'always_ask'}
									{$_('privacy.alwaysAsk')}
								{:else if action === 'never_load'}
									{$_('privacy.neverLoad')}
								{:else}
									{$_('privacy.alwaysLoad')}
								{/if}
							</p>
							<p class="option-description">
								{#if action === 'always_ask'}
									{$_('privacy.alwaysAskDescription')}
								{:else if action === 'never_load'}
									{$_('privacy.neverLoadDescription')}
								{:else}
									{$_('privacy.alwaysLoadDescription')}
								{/if}
							</p>
						</div>
					</div>
				</button>
			{/each}
		</div>

		<div class="toggle-stack">
			<button class="toggle-row" onclick={() => updatePrivacy({ blockExternalImages: !privacy.blockExternalImages })}>
				<div class="row-copy">
					<p class="option-label">{$_('privacy.blockExternalImages')}</p>
					<p class="option-description">{$_('privacy.blockExternalImagesDescription')}</p>
				</div>
				<span class:toggle-on={privacy.blockExternalImages} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button class="toggle-row" onclick={() => updatePrivacy({ blockRemoteFonts: !privacy.blockRemoteFonts })}>
				<div class="row-copy">
					<p class="option-label">{$_('privacy.blockRemoteFonts')}</p>
					<p class="option-description">{$_('privacy.blockRemoteFontsDescription')}</p>
				</div>
				<span class:toggle-on={privacy.blockRemoteFonts} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>
		</div>
	</section>

	<!-- Read Receipts -->
	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('privacy.readReceipts')}</h3>
				<p class="section-description">{$_('privacy.readReceiptsDescription')}</p>
			</div>
		</div>

		<div class="select-grid">
			{#each ['never_send', 'ask_me', 'always_send'] as policy}
				<button
					class="select-option"
					class:active={privacy.readReceiptPolicy === policy}
					onclick={() => updatePrivacy({ readReceiptPolicy: policy as 'never_send' | 'ask_me' | 'always_send' })}
				>
					<div class="select-content">
						<div class="select-icon">
							{#if policy === 'never_send'}
								<Ban class="size-4" strokeWidth={1.7} />
							{:else if policy === 'ask_me'}
								<Eye class="size-4" strokeWidth={1.7} />
							{:else}
								<Mail class="size-4" strokeWidth={1.7} />
							{/if}
						</div>
						<div>
							<p class="option-label">
								{#if policy === 'never_send'}
									{$_('privacy.neverSend')}
								{:else if policy === 'ask_me'}
									{$_('privacy.askMe')}
								{:else}
									{$_('privacy.alwaysSend')}
								{/if}
							</p>
							<p class="option-description">
								{#if policy === 'never_send'}
									{$_('privacy.neverSendDescription')}
								{:else if policy === 'ask_me'}
									{$_('privacy.askMeDescription')}
								{:else}
									{$_('privacy.alwaysSendDescription')}
								{/if}
							</p>
						</div>
					</div>
				</button>
			{/each}
		</div>
	</section>

	<!-- HTML Security -->
	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('privacy.htmlSecurity')}</h3>
				<p class="section-description">{$_('privacy.htmlSecurityDescription')}</p>
			</div>
		</div>

		<div class="select-grid">
			{#each ['sanitized', 'plain_text', 'full'] as mode}
				<button
					class="select-option"
					class:active={privacy.htmlRenderingMode === mode}
					onclick={() => updatePrivacy({ htmlRenderingMode: mode as 'plain_text' | 'sanitized' | 'full' })}
				>
					<div class="select-content">
						<div class="select-icon">
							{#if mode === 'plain_text'}
								<EyeOff class="size-4" strokeWidth={1.7} />
							{:else if mode === 'sanitized'}
								<Lock class="size-4" strokeWidth={1.7} />
							{:else}
								<Globe class="size-4" strokeWidth={1.7} />
							{/if}
						</div>
						<div>
							<p class="option-label">
								{#if mode === 'plain_text'}
									{$_('privacy.plainText')}
								{:else if mode === 'sanitized'}
									{$_('privacy.sanitizedHtml')}
								{:else}
									{$_('privacy.fullHtml')}
								{/if}
							</p>
							<p class="option-description">
								{#if mode === 'plain_text'}
									{$_('privacy.plainTextDescription')}
								{:else if mode === 'sanitized'}
									{$_('privacy.sanitizedHtmlDescription')}
								{:else}
									{$_('privacy.fullHtmlDescription')}
								{/if}
							</p>
						</div>
					</div>
				</button>
			{/each}
		</div>

		<div class="toggle-stack">
			<button class="toggle-row" onclick={() => updatePrivacy({ blockFormsInEmails: !privacy.blockFormsInEmails })}>
				<div class="row-copy">
					<p class="option-label">{$_('privacy.blockForms')}</p>
					<p class="option-description">{$_('privacy.blockFormsDescription')}</p>
				</div>
				<span class:toggle-on={privacy.blockFormsInEmails} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button class="toggle-row" onclick={() => updatePrivacy({ showSecurityWarnings: !privacy.showSecurityWarnings })}>
				<div class="row-copy">
					<p class="option-label">{$_('privacy.showSecurityWarnings')}</p>
					<p class="option-description">{$_('privacy.showSecurityWarningsDescription')}</p>
				</div>
				<span class:toggle-on={privacy.showSecurityWarnings} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>
		</div>
	</section>

	<!-- Link Safety -->
	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('privacy.linkSafety')}</h3>
				<p class="section-description">{$_('privacy.linkSafetyDescription')}</p>
			</div>
		</div>

		<div class="toggle-stack">
			<button class="toggle-row" onclick={() => updatePrivacy({ warnBeforeSuspiciousLinks: !privacy.warnBeforeSuspiciousLinks })}>
				<div class="row-copy">
					<p class="option-label">{$_('privacy.warnSuspiciousLinks')}</p>
					<p class="option-description">{$_('privacy.warnSuspiciousLinksDescription')}</p>
				</div>
				<span class:toggle-on={privacy.warnBeforeSuspiciousLinks} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button class="toggle-row" onclick={() => updatePrivacy({ showFullUrlOnHover: !privacy.showFullUrlOnHover })}>
				<div class="row-copy">
					<p class="option-label">{$_('privacy.showFullUrl')}</p>
					<p class="option-description">{$_('privacy.showFullUrlDescription')}</p>
				</div>
				<span class:toggle-on={privacy.showFullUrlOnHover} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>
		</div>
	</section>

	<!-- Local Data -->
	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('privacy.localData')}</h3>
				<p class="section-description">{$_('privacy.localDataDescription')}</p>
			</div>
		</div>

		<div class="data-info">
			<div class="data-stat">
				<p class="stat-label">{$_('privacy.databaseSize')}</p>
				<p class="stat-value">{dbSize ? `${dbSize.size} ${dbSize.unit}` : $_('common.loading')}</p>
			</div>
		</div>

		<div class="action-grid">
			<button class="action-button" onclick={compactDatabase} disabled={isCompacting}>
				<Wrench class="size-4" strokeWidth={1.7} />
				<span>{isCompacting ? $_('privacy.compacting') : $_('privacy.compactDatabase')}</span>
			</button>

			<button class="action-button destructive" onclick={clearLocalData} disabled={isClearing}>
				<Trash2 class="size-4" strokeWidth={1.7} />
				<span>{isClearing ? $_('privacy.clearing') : $_('privacy.clearLocalData')}</span>
			</button>
		</div>
	</section>

	<!-- Error Display -->
	{#if error}
		<div class="error-banner">
			<div class="error-icon">⚠️</div>
			<div>
				<p class="error-title">{$_('common.error')}</p>
				<p class="error-message">{error}</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.select-grid {
		display: grid;
		gap: 0.75rem;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.select-option,
	.action-button {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--bg-secondary) 65%, transparent);
		text-align: left;
	}

	.action-button {
		cursor: pointer;
	}

	.select-option:hover,
	.action-button:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-button.destructive {
		color: var(--error);
	}

	.select-option {
		cursor: pointer;
		padding: 0.9rem 1rem;
		justify-content: flex-start;
	}

	.select-option.active {
		background: color-mix(in srgb, var(--accent-light) 85%, var(--bg-primary));
		border-color: color-mix(in srgb, var(--accent-primary) 28%, var(--border-primary));
	}

	.select-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.select-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--accent-light) 90%, white);
		color: var(--accent-primary);
		flex-shrink: 0;
	}

	.data-info {
		display: flex;
		gap: 1.5rem;
		padding: 1rem;
		background: color-mix(in srgb, var(--bg-secondary) 50%, transparent);
		border-radius: 16px;
		margin-top: 0.5rem;
	}

	.data-stat {
		flex: 1;
	}

	.stat-label {
		margin: 0 0 0.25rem;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.stat-value {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.action-grid {
		display: flex;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.action-button {
		flex: 1;
		height: 2.5rem;
		padding: 0 1rem;
		font-size: 0.82rem;
		font-weight: 650;
		border-radius: 14px;
		background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
		color: var(--text-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.action-button.destructive:hover:not(:disabled) {
		background: color-mix(in srgb, var(--error) 8%, transparent);
		border-color: color-mix(in srgb, var(--error) 30%, transparent);
	}

	.error-banner {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: color-mix(in srgb, var(--error) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--error) 20%, transparent);
		border-radius: 16px;
		margin-top: 1rem;
	}

	.error-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.error-title {
		margin: 0 0 0.125rem;
		font-size: 0.875rem;
		font-weight: 560;
		color: var(--error);
	}

	.error-message {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	@media (max-width: 720px) {
		.action-grid {
			flex-direction: column;
		}

		.select-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
