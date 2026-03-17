<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { ArrowLeft, Check, Loader2, Mail, Lock, Server, Eye, EyeOff } from 'lucide-svelte';
	import * as accounts from '$lib/accounts/index.js';
	import { syncAccount } from '$lib/sync/index.js';

	let email = $state('');
	let password = $state('');
	let imapServer = $state('');
	let smtpServer = $state('');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);
	let showPassword = $state(false);

	// Pre-fill email domain from quick connect
	$effect(() => {
		const provider = $page.url.searchParams.get('provider');
		if (provider && !email) {
			email = `@${provider}`;
		}
	});

	function goBack() {
		goto('/settings');
	}

	async function handleSubmit() {
		if (!email || !password) {
			error = 'Please fill in all required fields';
			return;
		}

		// Validate email format
		if (!accounts.validateEmail(email)) {
			error = 'Please enter a valid email address';
			return;
		}

		isSubmitting = true;
		error = null;

		try {
			// Use the API helper which handles ID generation and proper structure
			const result = await accounts.createAccount({
				email,
				name: email.split('@')[0],
				password,
				imap_server: imapServer || '',
				imap_port: 993,
				imap_use_ssl: true,
				smtp_server: smtpServer || '',
				smtp_port: 587,
				smtp_use_ssl: true
			});

			// Trigger sync for the new account
			if (result && typeof result === 'object' && 'id' in result) {
				syncAccount((result as { id: string }).id).catch(e => {
					console.error('Auto-sync after account creation failed:', e);
				});
			}

			goto('/');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add account';
		} finally {
			isSubmitting = false;
		}
	}
</script>

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
		<div>
			<h2 class="page-title">Add Account</h2>
			<p class="page-subtitle">Connect your email to get started</p>
		</div>
	</div>

	<!-- Error Banner -->
	{#if error}
		<div class="error-banner">
			<div class="error-icon">⚠️</div>
			<p class="error-message">{error}</p>
		</div>
	{/if}

	<!-- Form Card -->
	<div class="form-card">
		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
			<div class="form-section">
				<div class="section-header">
					<div class="section-icon">
						<Mail class="size-5" />
					</div>
					<div>
						<h3 class="section-title">Email Account</h3>
						<p class="section-subtitle">Enter your email credentials</p>
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

					<!-- Password -->
					<div class="field-group">
						<label for="password" class="field-label">
							Password / App Password
							<span class="required">*</span>
						</label>
						<div class="input-wrapper input-with-action">
							<input
								id="password"
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								placeholder="Enter your password or app password"
								required
								class="field-input field-input-padded"
							/>
							<button
								type="button"
								onclick={() => showPassword = !showPassword}
								class="toggle-password-button"
								title={showPassword ? 'Hide password' : 'Show password'}
							>
								{#if showPassword}
									<EyeOff class="size-4" strokeWidth={1.5} />
								{:else}
									<Eye class="size-4" strokeWidth={1.5} />
								{/if}
							</button>
						</div>
						<p class="field-hint">
							For Gmail, use an <a href="https://support.google.com/accounts/answer/185833" target="_blank" class="text-violet-600 hover:underline">App Password</a>.
							For QQ/163/126, use the 16-character Authorization Code.
						</p>
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
						<p class="section-subtitle">Auto-configured for popular providers</p>
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
								placeholder="Auto-detected from email"
								class="field-input"
							/>
						</div>
						<p class="field-hint">Leave empty to auto-detect (supports Gmail, Outlook, QQ, 163, 126, etc.)</p>
					</div>

					<!-- SMTP Server -->
					<div class="field-group">
						<label for="smtp" class="field-label">SMTP Server</label>
						<div class="input-wrapper">
							<input
								id="smtp"
								type="text"
								bind:value={smtpServer}
								placeholder="Auto-detected from email"
								class="field-input"
							/>
						</div>
						<p class="field-hint">Leave empty to auto-detect (supports Gmail, Outlook, QQ, 163, 126, etc.)</p>
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
					<span>{isSubmitting ? 'Adding Account...' : 'Add Account'}</span>
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
	<p class="security-hint">Your credentials are encrypted and stored locally on your device</p>
</div>

<style>
	.add-account-page {
		animation: fadeIn 0.4s ease-out;
	}

	.page-header {
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
		margin-bottom: 1.5rem;
	}

	.back-button:hover {
		color: #1d1d1f;
		background: rgba(0, 0, 0, 0.04);
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
