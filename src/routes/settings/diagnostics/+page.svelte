<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { Activity, RefreshCw, Trash2, Loader2, Monitor, HardDrive, Cpu, Database } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	interface WindowsDiagnostics {
		os_info: {
			version: string;
			build_number: number;
			architecture: string;
			locale: string;
		};
		hardware_info: {
			total_memory: number;
			available_memory: number;
			cpu_cores: number;
		};
		disk_info: {
			total_space: number;
			available_space: number;
		};
		app_info: {
			version: string;
			tauri_version: string;
		};
	}

	interface CrashDump {
		filename: string;
		path: string;
		size_bytes: number;
		timestamp: number;
	}

	let diagnostics = $state<WindowsDiagnostics | null>(null);
	let crashDumps = $state<CrashDump[]>([]);
	let isLoading = $state(true);
	let isRefreshing = $state(false);
	let isClearing = $state(false);
	let error = $state<string | null>(null);

	async function loadDiagnostics() {
		error = null;
		try {
			const result = await invoke('get_windows_diagnostics');
			diagnostics = result as WindowsDiagnostics;
		} catch (e) {
			error = $_('diagnostics.failedToLoad');
			console.error('Failed to load diagnostics:', e);
		}
	}

	async function loadCrashDumps() {
		try {
			const result = await invoke('get_crash_dumps');
			crashDumps = result as CrashDump[];
		} catch (e) {
			console.error('Failed to load crash dumps:', e);
		}
	}

	async function handleRefresh() {
		isRefreshing = true;
		error = null;
		try {
			await loadDiagnostics();
			await loadCrashDumps();
		} catch (e) {
			error = $_('diagnostics.failedToRefresh');
		} finally {
			isRefreshing = false;
		}
	}

	async function handleClearCrashes() {
		if (!confirm($_('diagnostics.clearCrashesConfirm'))) {
			return;
		}
		isClearing = true;
		try {
			await invoke('clear_crash_dumps');
			crashDumps = [];
		} catch (e) {
			console.error('Failed to clear crashes:', e);
		} finally {
			isClearing = false;
		}
	}

	function formatBytes(bytes: number): string {
		const gb = bytes / (1024 * 1024 * 1024);
		return gb.toFixed(2) + ' GB';
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	}

	function formatSize(bytes: number): string {
		const mb = bytes / (1024 * 1024);
		return mb.toFixed(2) + ' MB';
	}

	$effect(() => {
		loadDiagnostics();
		loadCrashDumps();
		isLoading = false;
	});
</script>

<div class="diagnostics-page">
	<!-- Header -->
	<header class="page-header">
		<div class="header-content">
			<div class="header-icon">
				<Activity class="size-6" />
			</div>
			<div>
				<h2 class="page-title">{$_('diagnostics.title')}</h2>
				<p class="page-subtitle">{$_('diagnostics.description')}</p>
			</div>
		</div>
		<button
			onclick={handleRefresh}
			disabled={isRefreshing}
			class="refresh-button"
		>
			{#if isRefreshing}
				<Loader2 class="size-4 animate-spin" />
			{:else}
				<RefreshCw class="size-4" />
			{/if}
			<span>{isRefreshing ? $_('diagnostics.refreshing') : $_('diagnostics.refresh')}</span>
		</button>
	</header>

	<!-- Error State -->
	{#if error}
		<div class="error-banner">
			<div class="error-icon">⚠️</div>
			<p class="error-message">{error}</p>
		</div>
	{/if}

	<!-- Loading State -->
	{#if isLoading}
		<div class="loading-state">
			<Loader2 class="size-8 animate-spin text-violet-500" />
			<p class="loading-text">{$_('common.loading')}</p>
		</div>
	{:else}
		<!-- System Information -->
		{#if diagnostics}
			<section class="info-section">
				<h3 class="section-title">
					<Monitor class="size-5" />
					{$_('diagnostics.systemInfo')}
				</h3>
				<div class="info-grid">
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.osVersion')}</div>
						<div class="info-value">{diagnostics.os_info.version}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.buildNumber')}</div>
						<div class="info-value">{diagnostics.os_info.build_number}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.architecture')}</div>
						<div class="info-value">{diagnostics.os_info.architecture}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.locale')}</div>
						<div class="info-value">{diagnostics.os_info.locale}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.totalMemory')}</div>
						<div class="info-value">{formatBytes(diagnostics.hardware_info.total_memory)}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.availableMemory')}</div>
						<div class="info-value">{formatBytes(diagnostics.hardware_info.available_memory)}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.cpuCores')}</div>
						<div class="info-value">{diagnostics.hardware_info.cpu_cores}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.totalDisk')}</div>
						<div class="info-value">{formatBytes(diagnostics.disk_info.total_space)}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.availableDisk')}</div>
						<div class="info-value">{formatBytes(diagnostics.disk_info.available_space)}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.appVersion')}</div>
						<div class="info-value">{diagnostics.app_info.version}</div>
					</div>
					<div class="info-card">
						<div class="info-label">{$_('diagnostics.tauriVersion')}</div>
						<div class="info-value">{diagnostics.app_info.tauri_version}</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- Crash Dumps -->
		<section class="crashes-section">
			<div class="section-header">
				<h3 class="section-title">
					<Database class="size-5" />
					{$_('diagnostics.crashDumps')}
				</h3>
				{#if crashDumps.length > 0}
					<button
						onclick={handleClearCrashes}
						disabled={isClearing}
						class="clear-button"
					>
						{#if isClearing}
							<Loader2 class="size-4 animate-spin" />
						{:else}
							<Trash2 class="size-4" />
						{/if}
						<span>{isClearing ? $_('diagnostics.clearingCrashes') : $_('diagnostics.clearCrashes')}</span>
					</button>
				{/if}
			</div>
			{#if crashDumps.length === 0}
				<div class="empty-state">
					<p>{$_('diagnostics.noCrashes')}</p>
				</div>
			{:else}
				<div class="crashes-list">
					{#each crashDumps as crash (crash.filename)}
						<div class="crash-item">
							<div class="crash-info">
								<div class="crash-filename">{crash.filename}</div>
								<div class="crash-meta">
									<span>{formatSize(crash.size_bytes)}</span>
									<span>•</span>
									<span>{formatDate(crash.timestamp)}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.diagnostics-page {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	/* Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2.5rem;
	}

	.header-content {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
		border-radius: 14px;
		color: white;
		box-shadow: 0 4px 12px -2px color-mix(in srgb, var(--accent-primary) 30%, transparent);
	}

	.page-title {
		font-size: 2rem;
		font-weight: 680;
		letter-spacing: -0.03em;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.page-subtitle {
		font-size: 0.9375rem;
		color: var(--text-secondary);
		font-weight: 400;
	}

	.refresh-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		font-weight: 540;
		color: white;
		background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
		border: none;
		border-radius: 12px;
		cursor: pointer;
		box-shadow: 0 4px 14px -2px color-mix(in srgb, var(--accent-primary) 35%, transparent);
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.refresh-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 6px 20px -2px color-mix(in srgb, var(--accent-primary) 45%, transparent);
	}

	.refresh-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Error Banner */
	.error-banner {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: color-mix(in srgb, var(--error) 8%, var(--bg-primary));
		border: 1px solid color-mix(in srgb, var(--error) 20%, transparent);
		border-radius: 14px;
		margin-bottom: 1.5rem;
	}

	.error-icon {
		font-size: 1.25rem;
	}

	.error-message {
		font-size: 0.875rem;
		color: var(--error);
	}

	/* Loading State */
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
		color: var(--text-secondary);
	}

	/* Info Section */
	.info-section {
		margin-bottom: 2rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 560;
		letter-spacing: -0.01em;
		color: var(--text-primary);
		margin-bottom: 1rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.info-card {
		padding: 1rem 1.25rem;
		background: color-mix(in srgb, var(--bg-primary) 70%, transparent);
		backdrop-filter: blur(10px);
		border: 1px solid var(--border-primary);
		border-radius: 14px;
		transition: all 0.2s ease;
	}

	.info-card:hover {
		border-color: color-mix(in srgb, var(--accent-primary) 20%, transparent);
	}

	.info-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.375rem;
	}

	.info-value {
		font-size: 0.9375rem;
		font-weight: 540;
		color: var(--text-primary);
	}

	/* Crashes Section */
	.crashes-section {
		margin-bottom: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.clear-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--error);
		background: color-mix(in srgb, var(--error) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--error) 20%, transparent);
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.clear-button:hover:not(:disabled) {
		background: color-mix(in srgb, var(--error) 12%, transparent);
		border-color: color-mix(in srgb, var(--error) 30%, transparent);
	}

	.clear-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.empty-state {
		padding: 2rem;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.9375rem;
	}

	.crashes-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.crash-item {
		padding: 1rem 1.25rem;
		background: color-mix(in srgb, var(--bg-primary) 70%, transparent);
		backdrop-filter: blur(10px);
		border: 1px solid var(--border-primary);
		border-radius: 12px;
		transition: all 0.2s ease;
	}

	.crash-item:hover {
		border-color: color-mix(in srgb, var(--accent-primary) 20%, transparent);
	}

	.crash-filename {
		font-size: 0.9375rem;
		font-weight: 540;
		color: var(--text-primary);
		margin-bottom: 0.375rem;
	}

	.crash-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}
</style>
