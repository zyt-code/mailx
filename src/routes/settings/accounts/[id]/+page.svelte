<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { invoke } from '@tauri-apps/api/core';
	import { ArrowLeft, Check, Loader2, Mail, Lock, Server, Trash2, Eye, EyeOff, ShieldCheck, RefreshCw } from 'lucide-svelte';
	import * as accounts from '$lib/accounts/index.js';
	import { syncAccount } from '$lib/sync/index.js';
	import type { Account } from '$lib/types.js';
	import { _ } from 'svelte-i18n';

	let account = $state<Account | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let isTesting = $state(false);
	let isSyncing = $state(false);
	let showDeleteConfirm = $state(false);
	let showPassword = $state(false);
	let testResult = $state<string | null>(null);

	let email = $state('');
	let name = $state('');
	let password = $state('');
	let imapServer = $state('');
	let imapPort = $state(993);
	let imapUseSsl = $state(true);
	let smtpServer = $state('');
	let smtpPort = $state(587);
	let smtpUseSsl = $state(true);
	let syncInterval = $state(15); // minutes

	// Get account ID from URL
	let accountId = $derived($page.url.pathname.split('/').pop());

	$effect(() => {
		loadAccount();
	});

	async function loadAccount() {
		if (!accountId || typeof accountId !== 'string') return;

		isLoading = true;
		error = null;

		try {
			account = await accounts.getAccount(accountId);
			// Populate form fields
			email = account.email;
			name = account.name;
			imapServer = account.imap_server;
			imapPort = account.imap_port || 993;
			imapUseSsl = account.imap_use_ssl !== false;
			smtpServer = account.smtp_server;
			smtpPort = account.smtp_port || 587;
			smtpUseSsl = account.smtp_use_ssl !== false;
		} catch (e) {
			error = e instanceof Error ? e.message : $_('account.failedToLoad');
			console.error('Failed to load account:', e);
		} finally {
			isLoading = false;
		}
	}

	function goBack() {
		goto('/settings');
	}

	async function handleSave() {
		if (!account) return;

		if (!email || !name) {
			error = $_('accountForm.emailAndNameRequired');
			return;
		}

		isSubmitting = true;
		error = null;

		try {
			await accounts.updateAccount(account.id, {
				email,
				name,
				imap_server: imapServer,
				imap_port: imapPort,
				imap_use_ssl: imapUseSsl,
				smtp_server: smtpServer,
				smtp_port: smtpPort,
				smtp_use_ssl: smtpUseSsl
			});

			// Reload account data
			await loadAccount();
		} catch (e) {
			error = e instanceof Error ? e.message : $_('account.failedToUpdate');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!account) return;

		isDeleting = true;
		error = null;

		try {
			await accounts.deleteAccount(account.id);
			goto('/settings');
		} catch (e) {
			error = e instanceof Error ? e.message : $_('account.failedToDelete');
			isDeleting = false;
			showDeleteConfirm = false;
		}
	}

	async function testConnection() {
		if (!account) return;

		isTesting = true;
		error = null;
		testResult = null;

		try {
			const result = await invoke('test_account_connection', {
				id: account.id
			});
			testResult = $_('account.connectionSuccess');
		} catch (e) {
			error = e instanceof Error ? e.message : $_('account.connectionFailed');
		} finally {
			isTesting = false;
		}
	}

	async function handleSync() {
		if (!account) return;

		isSyncing = true;
		error = null;

		try {
			await syncAccount(account.id);
			testResult = $_('account.syncSuccess');
		} catch (e) {
			error = e instanceof Error ? e.message : $_('account.failedToSync');
		} finally {
			isSyncing = false;
		}
	}
</script>

{#if isLoading}
	<div class="add-account-page">
		<div class="loading-state">
			<Loader2 class="size-8 animate-spin text-violet-500" />
			<p class="loading-text">{$_('account.loadingAccount')}</p>
		</div>
	</div>
{:else if account}
	<div class="add-account-page">
		<!-- Header -->
		<div class="page-header">
			<button
				onclick={goBack}
				class="back-button"
			>
				<ArrowLeft class="size-4" />
				<span>{$_('account.backToAccounts')}</span>
			</button>
			<div class="header-actions">
				<button
					onclick={() => showDeleteConfirm = true}
					class="delete-button"
				>
					<Trash2 class="size-4" />
					<span>{$_('account.delete')}</span>
				</button>
			</div>
			<div>
				<h2 class="page-title">{$_('account.edit')}</h2>
				<p class="page-subtitle">{account.email}</p>
			</div>
		</div>

		<!-- Error Banner -->
		{#if error}
			<div class="error-banner">
				<div class="error-icon">⚠️</div>
				<p class="error-message">{error}</p>
			</div>
		{/if}

		<!-- Delete Confirmation -->
		{#if showDeleteConfirm}
			<div class="delete-confirm">
				<div class="delete-confirm-content">
					<h3 class="delete-confirm-title">{$_('accountForm.deleteTitle')}</h3>
					<p class="delete-confirm-text">
						{$_('accountForm.deleteConfirmDetail', { values: { email: account.email } })}
					</p>
					<div class="delete-confirm-actions">
						<button
							onclick={() => showDeleteConfirm = false}
							class="cancel-delete-button"
						>
							{$_('common.cancel')}
						</button>
						<button
							onclick={handleDelete}
							disabled={isDeleting}
							class="confirm-delete-button"
						>
							{#if isDeleting}
								<Loader2 class="size-4 animate-spin" />
							{/if}
							{isDeleting ? $_('account.deleting') : $_('account.delete')}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Form Card -->
		<div class="form-card">
			<form onsubmit={(e) => { e.preventDefault(); handleSave(); }}>
				<div class="form-section">
					<div class="section-header">
						<div class="section-icon">
							<Mail class="size-5" />
						</div>
						<div>
							<h3 class="section-title">{$_('accountForm.emailAccountSection')}</h3>
							<p class="section-subtitle">{$_('accountForm.updateInfo')}</p>
						</div>
					</div>

					<div class="form-fields">
						<!-- Email -->
						<div class="field-group">
							<label for="email" class="field-label">
								{$_('accountForm.emailAddress')}
								<span class="required">*</span>
							</label>
							<div class="input-wrapper">
								<input
									id="email"
									type="email"
									bind:value={email}
									placeholder={$_('accountForm.emailPlaceholder')}
									required
									class="field-input"
								/>
							</div>
						</div>

						<!-- Name -->
						<div class="field-group">
							<label for="name" class="field-label">
								{$_('accountForm.displayName')}
								<span class="required">*</span>
							</label>
							<div class="input-wrapper">
								<input
									id="name"
									type="text"
									bind:value={name}
									placeholder={$_('accountForm.displayNamePlaceholder')}
									required
									class="field-input"
								/>
							</div>
						</div>

						<!-- Password (Optional - only update if provided) -->
						<div class="field-group">
							<label for="password" class="field-label">
								{$_('accountForm.newPassword')}
								<span class="optional">{$_('accountForm.optional')}</span>
							</label>
							<div class="input-wrapper input-with-action">
								<input
									id="password"
									type={showPassword ? 'text' : 'password'}
									bind:value={password}
									placeholder={$_('accountForm.keepCurrentPassword')}
									class="field-input field-input-padded"
								/>
								<button
									type="button"
									onclick={() => showPassword = !showPassword}
									class="toggle-password-button"
									title={showPassword ? $_('accountForm.hidePassword') : $_('accountForm.showPassword')}
								>
									{#if showPassword}
										<EyeOff class="size-4" strokeWidth={1.5} />
									{:else}
										<Eye class="size-4" strokeWidth={1.5} />
									{/if}
								</button>
							</div>
							<p class="field-hint">{$_('accountForm.passwordChangeHint')}</p>
						</div>
					</div>
				</div>

				<div class="form-divider">
					<div class="divider-line"></div>
					<span class="divider-text">{$_('accountForm.advanced')}</span>
					<div class="divider-line"></div>
				</div>

				<div class="form-section">
					<div class="section-header">
						<div class="section-icon section-icon-secondary">
							<Server class="size-5" />
						</div>
						<div>
							<h3 class="section-title">{$_('accountForm.serverSettings')}</h3>
							<p class="section-subtitle">{$_('accountForm.imapSmtpConfig')}</p>
						</div>
					</div>

					<div class="form-fields">
						<!-- IMAP Server -->
						<div class="field-group">
							<label for="imap" class="field-label">{$_('accountForm.imapServer')}</label>
							<div class="input-wrapper">
								<input
									id="imap"
									type="text"
									bind:value={imapServer}
									placeholder={$_('accountForm.imapPlaceholder')}
									class="field-input"
								/>
							</div>
						</div>

						<!-- IMAP Port & SSL -->
						<div class="field-row">
							<div class="field-group">
								<label for="imap-port" class="field-label">{$_('accountForm.imapPort')}</label>
								<div class="input-wrapper">
									<input
										id="imap-port"
										type="number"
										bind:value={imapPort}
										placeholder="993"
										class="field-input"
									/>
								</div>
							</div>
							<div class="field-group">
								<label class="field-label">
									<input
										type="checkbox"
										bind:checked={imapUseSsl}
										class="checkbox-input"
									/>
									<span>{$_('accountForm.useSslTls')}</span>
								</label>
							</div>
						</div>

						<!-- SMTP Server -->
						<div class="field-group">
							<label for="smtp" class="field-label">{$_('accountForm.smtpServer')}</label>
							<div class="input-wrapper">
								<input
									id="smtp"
									type="text"
									bind:value={smtpServer}
									placeholder={$_('accountForm.smtpPlaceholder')}
									class="field-input"
								/>
							</div>
						</div>

						<!-- SMTP Port & SSL -->
						<div class="field-row">
							<div class="field-group">
								<label for="smtp-port" class="field-label">{$_('accountForm.smtpPort')}</label>
								<div class="input-wrapper">
									<input
										id="smtp-port"
										type="number"
										bind:value={smtpPort}
										placeholder="587"
										class="field-input"
									/>
								</div>
							</div>
							<div class="field-group">
								<label class="field-label">
									<input
										type="checkbox"
										bind:checked={smtpUseSsl}
										class="checkbox-input"
									/>
									<span>{$_('accountForm.useSslTls')}</span>
								</label>
							</div>
						</div>

						<!-- Test Connection & Sync Buttons -->
						<div class="field-row">
							<button
								type="button"
								onclick={testConnection}
								disabled={isTesting || isSubmitting}
								class="action-link-button"
							>
								{#if isTesting}
									<Loader2 class="size-4 animate-spin" />
								{:else}
									<ShieldCheck class="size-4" />
								{/if}
								<span>{isTesting ? $_('account.testing') : $_('account.testConnection')}</span>
							</button>
							<button
								type="button"
								onclick={handleSync}
								disabled={isSyncing || isSubmitting}
								class="action-link-button"
							>
								{#if isSyncing}
									<Loader2 class="size-4 animate-spin" />
								{:else}
									<RefreshCw class="size-4" />
								{/if}
								<span>{isSyncing ? $_('account.syncing') : $_('account.syncAccount')}</span>
							</button>
						</div>

						{#if testResult}
							<p class="test-success">{testResult}</p>
						{/if}
					</div>
				</div>

				<div class="form-divider">
					<div class="divider-line"></div>
					<span class="divider-text">{$_('accountForm.syncSettings')}</span>
					<div class="divider-line"></div>
				</div>

				<div class="form-section">
					<div class="section-header">
						<div class="section-icon section-icon-accent">
							<RefreshCw class="size-5" />
						</div>
						<div>
							<h3 class="section-title">{$_('accountForm.automaticSync')}</h3>
							<p class="section-subtitle">{$_('accountForm.syncConfigDesc')}</p>
						</div>
					</div>

					<div class="form-fields">
						<div class="field-group">
							<label for="sync-interval" class="field-label">{$_('accountForm.syncInterval')}</label>
							<div class="input-wrapper">
								<select
									id="sync-interval"
									bind:value={syncInterval}
									class="field-input"
								>
									<option value={5}>{$_('accountForm.every5Min')}</option>
									<option value={15}>{$_('accountForm.every15Min')}</option>
									<option value={30}>{$_('accountForm.every30Min')}</option>
									<option value={60}>{$_('accountForm.everyHour')}</option>
									<option value={0}>{$_('accountForm.manualOnly')}</option>
								</select>
							</div>
							<p class="field-hint">
								{syncInterval === 0
									? $_('accountForm.autoSyncDisabled')
									: $_('accountForm.autoSyncInterval', { values: { n: syncInterval } })}
							</p>
						</div>
					</div>
				</div>

				<!-- Actions -->
				<div class="form-actions">
					<button
						type="submit"
						disabled={isSubmitting}
						class="submit-button"
					>
						{#if isSubmitting}
							<Loader2 class="size-5 animate-spin" />
						{:else}
							<Check class="size-5" />
						{/if}
						<span>{isSubmitting ? $_('account.saving') : $_('account.saveChanges')}</span>
					</button>
					<button
						type="button"
						onclick={goBack}
						disabled={isSubmitting}
						class="cancel-button"
					>
						{$_('common.cancel')}
					</button>
				</div>
			</form>
		</div>

		<!-- Security Note -->
		<p class="security-hint">{$_('accountForm.credentialsEncrypted')}</p>
	</div>
{:else}
	<div class="add-account-page">
		<div class="loading-state">
			<p class="error-message">{$_('account.accountNotFound')}</p>
			<button onclick={goBack} class="back-button">{$_('account.backToAccounts')}</button>
		</div>
	</div>
{/if}

<style>
	.add-account-page {
		animation: fadeIn 0.4s ease-out;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
	}

	.loading-text {
		margin-top: 1rem;
		font-size: 0.9375rem;
		color: #6b6b6b;
		font-weight: 500;
	}

	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 2rem;
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #6b6b6b;
		background: transparent;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.back-button:hover {
		color: #1d1d1f;
		background: rgba(0, 0, 0, 0.04);
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.delete-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.delete-button:hover {
		color: #dc2626;
		background: rgba(239, 68, 68, 0.12);
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

	/* Error Banner */
	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.125rem;
		background: linear-gradient(135deg, #fef2f2 0%, #fef0f0 100%);
		border: 1px solid #fecaca;
		border-radius: 12px;
		margin-bottom: 1.5rem;
		animation: slideIn 0.3s ease-out;
	}

	.error-icon {
		font-size: 1.125rem;
		flex-shrink: 0;
	}

	.error-message {
		font-size: 0.875rem;
		font-weight: 500;
		color: #991b1b;
	}

	/* Delete Confirmation */
	.delete-confirm {
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 20px;
		margin-bottom: 1.5rem;
		animation: slideIn 0.3s ease-out;
	}

	.delete-confirm-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.delete-confirm-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1d1d1f;
	}

	.delete-confirm-text {
		font-size: 0.875rem;
		color: #6b6b6b;
		line-height: 1.5;
	}

	.delete-confirm-actions {
		display: flex;
		gap: 0.75rem;
	}

	.cancel-delete-button {
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: #6b6b6b;
		background: rgba(0, 0, 0, 0.04);
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-delete-button:hover {
		background: rgba(0, 0, 0, 0.08);
	}

	.confirm-delete-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: #ef4444;
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.confirm-delete-button:hover:not(:disabled) {
		background: #dc2626;
	}

	.confirm-delete-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Form Card */
	.form-card {
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(0, 0, 0, 0.06);
		border-radius: 20px;
		padding: 2rem;
		box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.06);
		margin-bottom: 1.5rem;
	}

	.form-section {
		margin-bottom: 1.5rem;
	}

	.form-section:last-of-type {
		margin-bottom: 2rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		margin-bottom: 1.5rem;
	}

	.section-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
		border-radius: 11px;
		color: white;
		box-shadow: 0 3px 10px -2px rgba(139, 92, 246, 0.25);
	}

	.section-icon-secondary {
		background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
		box-shadow: 0 3px 10px -2px rgba(107, 114, 128, 0.25);
	}

	.section-icon-accent {
		background: linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%);
		box-shadow: 0 3px 10px -2px rgba(14, 165, 233, 0.25);
	}

	.section-title {
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: #1d1d1f;
		margin-bottom: 0.125rem;
	}

	.section-subtitle {
		font-size: 0.8125rem;
		color: #6b6b6b;
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-size: 0.8125rem;
		font-weight: 540;
		color: #37352f;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.required {
		color: #ef4444;
	}

	.optional {
		color: #9ca3af;
	}

	.input-wrapper {
		position: relative;
	}

	.field-input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.9375rem;
		color: #1d1d1f;
		background: rgba(255, 255, 255, 0.8);
		border: 1.5px solid rgba(0, 0, 0, 0.1);
		border-radius: 11px;
		transition: all 0.2s ease;
	}

	.field-input::placeholder {
		color: #9ca3af;
	}

	.field-input:focus-visible {
		outline: none;
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 20%, transparent);
	}

	/* Input with action button */
	.input-with-action {
		display: flex;
		align-items: center;
	}

	.field-input-padded {
		padding-right: 3rem;
	}

	.toggle-password-button {
		position: absolute;
		right: 0.625rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		background: transparent;
		border: none;
		border-radius: 7px;
		cursor: pointer;
		color: #a1a1aa;
		transition: all 0.15s ease;
	}

	.toggle-password-button:hover {
		color: #52525b;
	}

	.field-hint {
		font-size: 0.75rem;
		color: #9ca3af;
		margin-top: -0.25rem;
		line-height: 1.4;
	}

	/* Field row for side-by-side inputs */
	.field-row {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
	}

	.field-row .field-group {
		flex: 1;
	}

	.field-row .field-group:last-child {
		flex: 0 0 auto;
	}

	/* Checkbox input */
	.checkbox-input {
		margin-right: 0.5rem;
		width: 16px;
		height: 16px;
		accent-color: #8b5cf6;
	}

	/* Action link buttons */
	.action-link-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: #8b5cf6;
		background: rgba(139, 92, 246, 0.08);
		border: 1px solid rgba(139, 92, 246, 0.2);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-link-button:hover:not(:disabled) {
		background: rgba(139, 92, 246, 0.12);
		border-color: rgba(139, 92, 246, 0.3);
	}

	.action-link-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.test-success {
		font-size: 0.8125rem;
		color: #16a34a;
		margin-top: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.test-success::before {
		content: '✓';
		font-weight: 600;
	}

	/* Form Divider */
	.form-divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 2rem 0;
	}

	.divider-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.08), transparent);
	}

	.divider-text {
		font-size: 0.75rem;
		font-weight: 540;
		color: #9ca3af;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0 0.5rem;
	}

	/* Form Actions */
	.form-actions {
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}

	.submit-button {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.875rem 1.75rem;
		font-size: 0.9375rem;
		font-weight: 540;
		color: white;
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
		border: none;
		border-radius: 12px;
		cursor: pointer;
		box-shadow: 0 4px 14px -2px rgba(139, 92, 246, 0.35);
		transition: all 0.25s ease;
	}

	.submit-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 6px 20px -2px rgba(139, 92, 246, 0.45);
	}

	.submit-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.cancel-button {
		padding: 0.875rem 1.5rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: #6b6b6b;
		background: transparent;
		border: none;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-button:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.04);
		color: #1d1d1f;
	}

	/* Security Hint */
	.security-hint {
		font-size: 11px;
		color: #a1a1aa;
		text-align: center;
		margin-top: 0.25rem;
	}

	/* Animations */
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
</style>
