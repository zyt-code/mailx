<script lang="ts">
	import { Shield, Image, Ban, Mail, Eye, EyeOff, Globe, Lock, Trash2, Download, Wrench } from 'lucide-svelte';
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
			error = e instanceof Error ? e.message : 'Failed to get database size';
		}
	}

	async function compactDatabase() {
		isCompacting = true;
		error = null;
		try {
			await invoke('compact_database');
			await getDatabaseSize();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to compact database';
		} finally {
			isCompacting = false;
		}
	}

	async function clearLocalData() {
		if (!confirm('Are you sure you want to clear all local email data? This will delete all cached emails and attachments. Your account settings will be preserved.')) {
			return;
		}
		isClearing = true;
		error = null;
		try {
			await db.clearDatabase();
			alert('Local data cleared successfully.');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to clear local data';
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
			<p class="page-kicker">Privacy & Security</p>
			<h2 class="page-title">Control your digital footprint.</h2>
			<p class="page-subtitle">
				Manage how Mailx handles external content, read receipts, and your local data.
			</p>
		</div>
	</header>

	<!-- Remote Content -->
	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">Remote Content</h3>
				<p class="section-description">Control how external resources are loaded in emails.</p>
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
									Always ask
								{:else if action === 'never_load'}
									Never load
								{:else}
									Always load
								{/if}
							</p>
							<p class="option-description">
								{#if action === 'always_ask'}
									Prompt before loading remote content
								{:else if action === 'never_load'}
									Block all external content by default
								{:else}
									Load remote content automatically
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
					<p class="option-label">Block external images</p>
					<p class="option-description">Prevents tracking pixels and saves bandwidth.</p>
				</div>
				<span class:toggle-on={privacy.blockExternalImages} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button class="toggle-row" onclick={() => updatePrivacy({ blockRemoteFonts: !privacy.blockRemoteFonts })}>
				<div class="row-copy">
					<p class="option-label">Block remote fonts & styles</p>
					<p class="option-description">Prevents fingerprinting techniques.</p>
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
				<h3 class="section-title">Read Receipts</h3>
				<p class="section-description">Control when your email reading is confirmed to senders.</p>
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
																Never send
															{:else if policy === 'ask_me'}
																Ask me
															{:else}
																Always send
															{/if}
														</p>
														<p class="option-description">
															{#if policy === 'never_send'}
																	Maximum privacy
															{:else if policy === 'ask_me'}
																	Prompt for each message
															{:else}
																	Always confirm
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
				<h3 class="section-title">HTML Email Security</h3>
				<p class="section-description">Configure how HTML emails are rendered.</p>
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
															Plain text
														{:else if mode === 'sanitized'}
															Sanitized HTML
														{:else}
															Full HTML
														{/if}
													</p>
													<p class="option-description">
														{#if mode === 'plain_text'}
															Maximum security
														{:else if mode === 'sanitized'}
															Balance safety & formatting
														{:else}
															Show all content
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
											<p class="option-label">Block forms in emails</p>
											<p class="option-description">Prevents interactive forms (phishing risk).</p>
										</div>
										<span class:toggle-on={privacy.blockFormsInEmails} class="toggle-pill">
											<span class="toggle-thumb"></span>
										</span>
									</button>

									<button class="toggle-row" onclick={() => updatePrivacy({ showSecurityWarnings: !privacy.showSecurityWarnings })}>
										<div class="row-copy">
											<p class="option-label">Show security warnings</p>
											<p class="option-description">Display alerts for suspicious content.</p>
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
										<h3 class="section-title">Link Safety</h3>
										<p class="section-description">Protection against malicious links.</p>
									</div>
								</div>

								<div class="toggle-stack">
									<button class="toggle-row" onclick={() => updatePrivacy({ warnBeforeSuspiciousLinks: !privacy.warnBeforeSuspiciousLinks })}>
										<div class="row-copy">
											<p class="option-label">Warn before suspicious links</p>
											<p class="option-description">Show alert for potentially dangerous URLs.</p>
										</div>
										<span class:toggle-on={privacy.warnBeforeSuspiciousLinks} class="toggle-pill">
											<span class="toggle-thumb"></span>
										</span>
									</button>

									<button class="toggle-row" onclick={() => updatePrivacy({ showFullUrlOnHover: !privacy.showFullUrlOnHover })}>
										<div class="row-copy">
											<p class="option-label">Show full URL on hover</p>
											<p class="option-description">Display complete address, not shortened links.</p>
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
										<h3 class="section-title">Local Data Storage</h3>
										<p class="section-description">Manage your locally cached email data.</p>
									</div>
								</div>

								<div class="data-info">
									<div class="data-stat">
										<p class="stat-label">Database size</p>
										<p class="stat-value">{dbSize ? `${dbSize.size} ${dbSize.unit}` : 'Loading...'}</p>
									</div>
								</div>

								<div class="action-grid">
									<button class="action-button" onclick={compactDatabase} disabled={isCompacting}>
										<Wrench class="size-4" strokeWidth={1.7} />
										<span>{isCompacting ? 'Compacting...' : 'Compact database'}</span>
									</button>

									<button class="action-button destructive" onclick={clearLocalData} disabled={isClearing}>
										<Trash2 class="size-4" strokeWidth={1.7} />
										<span>{isClearing ? 'Clearing...' : 'Clear local data'}</span>
									</button>
								</div>
							</section>

							<!-- Error Display -->
							{#if error}
								<div class="error-banner">
									<div class="error-icon">⚠️</div>
									<div>
										<p class="error-title">Error</p>
										<p class="error-message">{error}</p>
									</div>
								</div>
							{/if}
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

							.section-copy {
								display: flex;
								align-items: flex-start;
								justify-content: space-between;
								gap: 0.75rem;
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

							.toggle-stack,
							.select-grid {
								display: grid;
								gap: 0.75rem;
							}

							.select-grid {
								grid-template-columns: repeat(3, minmax(0, 1fr));
							}

							.toggle-row,
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

							.toggle-row,
							.action-button {
								cursor: pointer;
							}

							.toggle-row:hover,
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

							.row-copy {
								min-width: 0;
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

							@media (max-width: 720px) {
								.page-header,
								.section-copy,
								.action-grid {
									flex-direction: column;
								}

								.select-grid {
									grid-template-columns: minmax(0, 1fr);
								}
							}
						</style>
