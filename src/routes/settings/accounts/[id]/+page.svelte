<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ArrowLeft, Check, Loader2, Mail, Lock, Server, Trash2 } from 'lucide-svelte';
	import * as accounts from '$lib/accounts/index.js';
	import type { Account } from '$lib/types.js';

	let account = $state<Account | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let showDeleteConfirm = $state(false);

	let email = $state('');
	let name = $state('');
	let password = $state('');
	let imapServer = $state('');
	let smtpServer = $state('');

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
			smtpServer = account.smtp_server;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load account';
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
			error = 'Email and name are required';
			return;
		}

		isSubmitting = true;
		error = null;

		try {
			await accounts.updateAccount(account.id, {
				email,
				name,
				imap_server: imapServer,
				imap_port: 993,
				imap_use_ssl: true,
				smtp_server: smtpServer,
				smtp_port: 587,
				smtp_use_ssl: true
			});

			// Reload account data
			await loadAccount();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update account';
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
			error = e instanceof Error ? e.message : 'Failed to delete account';
			isDeleting = false;
			showDeleteConfirm = false;
		}
	}
</script>

{#if isLoading}
	<div class="add-account-page">
		<div class="loading-state">
			<Loader2 class="size-8 animate-spin text-violet-500" />
			<p class="loading-text">Loading account...</p>
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
				<span>Back to Accounts</span>
			</button>
			<div class="header-actions">
				<button
					onclick={() => showDeleteConfirm = true}
					class="delete-button"
				>
					<Trash2 class="size-4" />
					<span>Delete Account</span>
				</button>
			</div>
			<div>
				<h2 class="page-title">Edit Account</h2>
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
					<h3 class="delete-confirm-title">Delete Account?</h3>
					<p class="delete-confirm-text">
						This will remove {account.email} from Mailx. All locally cached emails will be deleted.
						This action cannot be undone.
					</p>
					<div class="delete-confirm-actions">
						<button
							onclick={() => showDeleteConfirm = false}
							class="cancel-delete-button"
						>
							Cancel
						</button>
						<button
							onclick={handleDelete}
							disabled={isDeleting}
							class="confirm-delete-button"
						>
							{#if isDeleting}
								<Loader2 class="size-4 animate-spin" />
							{/if}
							{isDeleting ? 'Deleting...' : 'Delete Account'}
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
							<h3 class="section-title">Email Account</h3>
							<p class="section-subtitle">Update your account information</p>
						</div>
					</div>

					<div class="form-fields">
						<!-- Email -->
						<div class="field-group">
							<label for="email" class="field-label">
								Email Address
								<span class="required">*</span>
							</label>
							<div class="input-wrapper">
								<input
									id="email"
									type="email"
									bind:value={email}
									placeholder="you@example.com"
									required
									class="field-input"
								/>
							</div>
						</div>

						<!-- Name -->
						<div class="field-group">
							<label for="name" class="field-label">
								Display Name
								<span class="required">*</span>
							</label>
							<div class="input-wrapper">
								<input
									id="name"
									type="text"
									bind:value={name}
									placeholder="Your Name"
									required
									class="field-input"
								/>
							</div>
						</div>

						<!-- Password (Optional - only update if provided) -->
						<div class="field-group">
							<label for="password" class="field-label">
								New Password
								<span class="optional">(optional)</span>
							</label>
							<div class="input-wrapper">
								<input
									id="password"
									type="password"
									bind:value={password}
									placeholder="Leave empty to keep current password"
									class="field-input"
								/>
							</div>
							<p class="field-hint">Only enter if you want to change your password</p>
						</div>
					</div>
				</div>

				<div class="form-divider">
					<div class="divider-line"></div>
					<span class="divider-text">Advanced</span>
					<div class="divider-line"></div>
				</div>

				<div class="form-section">
					<div class="section-header">
						<div class="section-icon section-icon-secondary">
							<Server class="size-5" />
						</div>
						<div>
							<h3 class="section-title">Server Settings</h3>
							<p class="section-subtitle">IMAP and SMTP configuration</p>
						</div>
					</div>

					<div class="form-fields">
						<!-- IMAP Server -->
						<div class="field-group">
							<label for="imap" class="field-label">IMAP Server</label>
							<div class="input-wrapper">
								<input
									id="imap"
									type="text"
									bind:value={imapServer}
									placeholder="imap.example.com"
									class="field-input"
								/>
							</div>
						</div>

						<!-- SMTP Server -->
						<div class="field-group">
							<label for="smtp" class="field-label">SMTP Server</label>
							<div class="input-wrapper">
								<input
									id="smtp"
									type="text"
									bind:value={smtpServer}
									placeholder="smtp.example.com"
									class="field-input"
								/>
							</div>
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
						<span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
					</button>
					<button
						type="button"
						onclick={goBack}
						disabled={isSubmitting}
						class="cancel-button"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>

		<!-- Security Note -->
		<div class="security-note">
			<div class="note-icon">🔒</div>
			<div class="note-content">
				<p class="note-title">Secure & Private</p>
				<p class="note-text">Your credentials are encrypted and stored locally on your device.</p>
			</div>
		</div>
	</div>
{:else}
	<div class="add-account-page">
		<div class="loading-state">
			<p class="error-message">Account not found</p>
			<button onclick={goBack} class="back-button">Back to Accounts</button>
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

	.field-input:focus {
		outline: none;
		border-color: #8b5cf6;
		box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
	}

	.field-hint {
		font-size: 0.75rem;
		color: #9ca3af;
		margin-top: -0.25rem;
		line-height: 1.4;
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

	/* Security Note */
	.security-note {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		padding: 1rem 1.25rem;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(124, 58, 237, 0.04) 100%);
		border: 1px solid rgba(139, 92, 246, 0.15);
		border-radius: 12px;
	}

	.note-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.note-title {
		font-size: 0.875rem;
		font-weight: 560;
		color: #5b21b6;
		margin-bottom: 0.125rem;
	}

	.note-text {
		font-size: 0.8125rem;
		color: #7c3aed;
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
