<script lang="ts">
	import type { Account, AccountFormData } from '$lib/types';
	import * as accounts from '$lib/accounts/index.js';
	import { cn } from '$lib/utils.js';
	import { _ } from 'svelte-i18n';

	interface Props {
		account?: Account;
		onSave: () => void;
		onCancel: () => void;
	}

	let { account, onSave, onCancel }: Props = $props();

	function createFormData(currentAccount?: Account): AccountFormData {
		return {
			email: currentAccount?.email || '',
			name: currentAccount?.name || '',
			password: '',
			imap_server: currentAccount?.imap_server || '',
			imap_port: currentAccount?.imap_port || 993,
			imap_use_ssl: currentAccount?.imap_use_ssl ?? true,
			smtp_server: currentAccount?.smtp_server || '',
			smtp_port: currentAccount?.smtp_port || 587,
			smtp_use_ssl: currentAccount?.smtp_use_ssl ?? true
		};
	}

	let formData = $state<AccountFormData>({
		email: '',
		name: '',
		password: '',
		imap_server: '',
		imap_port: 993,
		imap_use_ssl: true,
		smtp_server: '',
		smtp_port: 587,
		smtp_use_ssl: true
	});
	let initializedAccountId = $state<string | null>(null);

	$effect(() => {
		const nextAccountId = account?.id ?? null;
		if (nextAccountId !== initializedAccountId) {
			formData = createFormData(account);
			initializedAccountId = nextAccountId;
		}
	});

	let errors = $state<Record<string, string>>({});
	let testing = $state(false);
	let testResult = $state<{ imap: boolean; smtp: boolean; error?: string } | null>(null);
	let saving = $state(false);

	// Allow paste on all inputs
	function handlePaste(event: ClipboardEvent) {
		// Let the default paste behavior happen
	}

	function handleKeyDown(event: KeyboardEvent) {
		// Allow all keyboard shortcuts including Cmd+V / Ctrl+V
	}

	async function handleEmailChange() {
		if (accounts.validateEmail(formData.email)) {
			const imapDefaults = accounts.getDefaultImapSettings(formData.email);
			const smtpDefaults = accounts.getDefaultSmtpSettings(formData.email);

			formData.imap_server = imapDefaults.server;
			formData.imap_port = imapDefaults.port;
			formData.imap_use_ssl = imapDefaults.use_ssl;
			formData.smtp_server = smtpDefaults.server;
			formData.smtp_port = smtpDefaults.port;
			formData.smtp_use_ssl = smtpDefaults.use_ssl;
		}
	}

	async function testConnection() {
		testing = true;
		testResult = null;
		errors = {};

		// Validate form
		const validationErrors = validateForm();
		if (Object.keys(validationErrors).length > 0) {
			errors = validationErrors;
			testing = false;
			return;
		}

		try {
			if (account) {
				// Update existing account temporarily for testing
				await accounts.updateAccount(account.id, formData);
				await accounts.testConnection(account.id);
				// Restore original settings
				await accounts.updateAccount(account.id, {
					...formData,
					email: account.email,
					name: account.name,
				});
			} else {
				// For new accounts, we can't test without creating
				// This is a limitation - user must save first
				testResult = {
					imap: false,
					smtp: false,
					error: $_('accountForm.saveFirst'),
				};
				testing = false;
				return;
			}

			testResult = { imap: true, smtp: true };
		} catch (error) {
			testResult = {
				imap: false,
				smtp: false,
				error: error instanceof Error ? error.message : $_('account.connectionFailed'),
			};
		} finally {
			testing = false;
		}
	}

	async function handleSave() {
		errors = {};
		saving = true;

		// Validate form
		const validationErrors = validateForm();
		if (Object.keys(validationErrors).length > 0) {
			errors = validationErrors;
			saving = false;
			return;
		}

		try {
			if (account) {
				await accounts.updateAccount(account.id, formData);
			} else {
				await accounts.createAccount(formData);
			}
			onSave();
		} catch (error) {
			errors.general = error instanceof Error ? error.message : $_('account.failedToAdd');
		} finally {
			saving = false;
		}
	}

	function validateForm(): Record<string, string> {
		const newErrors: Record<string, string> = {};

		if (!accounts.validateEmail(formData.email)) {
			newErrors.email = $_('accountForm.invalidEmailFormat');
		}

		if (!formData.name.trim()) {
			newErrors.name = $_('accountForm.nameRequired');
		}

		if (!account && !formData.password) {
			newErrors.password = $_('accountForm.passwordRequired');
		}

		if (!accounts.validateServerSettings(formData.imap_server, formData.imap_port)) {
			newErrors.imap_server = $_('accountForm.invalidImapSettings');
		}

		if (!accounts.validateServerSettings(formData.smtp_server, formData.smtp_port)) {
			newErrors.smtp_server = $_('accountForm.invalidSmtpSettings');
		}

		return newErrors;
	}

	function getFieldClass(fieldName: string): string {
		return cn(
			'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
			errors[fieldName] ? 'border-red-500' : 'border-gray-300'
		);
	}
</script>

<div class="p-6 bg-white rounded-lg border">
	<h2 class="text-xl font-semibold mb-4">
		{account ? $_('account.edit') : $_('account.add')}
	</h2>

	{#if errors.general}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
			{errors.general}
		</div>
	{/if}

	{#if testResult?.error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
			{testResult.error}
		</div>
	{/if}

	{#if testResult && !testResult.error}
		<div class="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
			{$_('account.connectionSuccess')}
		</div>
	{/if}

	<form onsubmit={(e) => e.preventDefault()} class="space-y-4">
		<!-- Basic Info -->
		<div class="space-y-2">
			<label for="account-email" class="block text-sm font-medium text-gray-700">{$_('form.email')}</label>
			<input
				id="account-email"
				type="email"
				bind:value={formData.email}
				onblur={handleEmailChange}
				class={getFieldClass('email')}
				placeholder={$_('accountForm.emailPlaceholder')}
				onpaste={handlePaste}
				onkeydown={handleKeyDown}
			/>
			{#if errors.email}
				<span class="text-sm text-red-600">{errors.email}</span>
			{/if}
		</div>

		<div class="space-y-2">
			<label for="account-name" class="block text-sm font-medium text-gray-700">{$_('form.name')}</label>
			<input
				id="account-name"
				type="text"
				bind:value={formData.name}
				class={getFieldClass('name')}
				placeholder={$_('accountForm.displayNamePlaceholder')}
				onpaste={handlePaste}
				onkeydown={handleKeyDown}
			/>
			{#if errors.name}
				<span class="text-sm text-red-600">{errors.name}</span>
			{/if}
		</div>

		{#if !account}
			<div class="space-y-2" data-allow-context-menu>
				<label for="account-password" class="block text-sm font-medium text-gray-700">{$_('form.password')}</label>
				<input
					id="account-password"
					type="password"
					bind:value={formData.password}
					class={getFieldClass('password')}
					placeholder="••••••••"
					onpaste={handlePaste}
					onkeydown={handleKeyDown}
				/>
				{#if errors.password}
					<span class="text-sm text-red-600">{errors.password}</span>
				{/if}
			</div>
		{/if}

		<!-- IMAP Settings -->
		<div class="border-t pt-4">
			<h3 class="text-sm font-medium text-gray-700 mb-2">{$_('accountForm.imapSettings')}</h3>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<label for="imap-server" class="block text-sm font-medium text-gray-700">{$_('form.server')}</label>
					<input
						id="imap-server"
						type="text"
						bind:value={formData.imap_server}
						class={getFieldClass('imap_server')}
						placeholder={$_('accountForm.imapPlaceholder')}
						onpaste={handlePaste}
						onkeydown={handleKeyDown}
					/>
				</div>
				<div class="space-y-2">
					<label for="imap-port" class="block text-sm font-medium text-gray-700">{$_('form.port')}</label>
					<input
						id="imap-port"
						type="number"
						bind:value={formData.imap_port}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						min="1"
						max="65535"
						onpaste={handlePaste}
						onkeydown={handleKeyDown}
					/>
				</div>
			</div>
			<div class="mt-2">
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={formData.imap_use_ssl} class="rounded" />
					<span class="text-sm text-gray-700">{$_('accountForm.useSslTls')}</span>
				</label>
			</div>
			{#if errors.imap_server}
				<span class="text-sm text-red-600">{errors.imap_server}</span>
			{/if}
		</div>

		<!-- SMTP Settings -->
		<div class="border-t pt-4">
			<h3 class="text-sm font-medium text-gray-700 mb-2">{$_('accountForm.smtpSettings')}</h3>
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<label for="smtp-server" class="block text-sm font-medium text-gray-700">{$_('form.server')}</label>
					<input
						id="smtp-server"
						type="text"
						bind:value={formData.smtp_server}
						class={getFieldClass('smtp_server')}
						placeholder={$_('accountForm.smtpPlaceholder')}
						onpaste={handlePaste}
						onkeydown={handleKeyDown}
					/>
				</div>
				<div class="space-y-2">
					<label for="smtp-port" class="block text-sm font-medium text-gray-700">{$_('form.port')}</label>
					<input
						id="smtp-port"
						type="number"
						bind:value={formData.smtp_port}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						min="1"
						max="65535"
						onpaste={handlePaste}
						onkeydown={handleKeyDown}
					/>
				</div>
			</div>
			<div class="mt-2">
				<label class="flex items-center gap-2">
					<input type="checkbox" bind:checked={formData.smtp_use_ssl} class="rounded" />
					<span class="text-sm text-gray-700">{$_('accountForm.useSslTls')}</span>
				</label>
			</div>
			{#if errors.smtp_server}
				<span class="text-sm text-red-600">{errors.smtp_server}</span>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex justify-between items-center pt-4 border-t">
			<div class="flex gap-2">
				<button
					type="button"
					onclick={testConnection}
					disabled={testing || saving}
					class="px-4 py-2 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{testing ? $_('account.testing') : $_('account.testConnection')}
				</button>
			</div>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={onCancel}
					disabled={saving}
					class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{$_('common.cancel')}
				</button>
				<button
					type="button"
					onclick={handleSave}
					disabled={saving}
					class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{saving ? $_('account.saving') : $_('common.save')}
				</button>
			</div>
		</div>
	</form>
</div>
