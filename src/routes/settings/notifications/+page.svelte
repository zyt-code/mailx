<script lang="ts">
	import { onMount } from 'svelte';
	import { Bell, BellRing, Moon, Send } from 'lucide-svelte';
	import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
	import { preferences, type NotificationPreferences } from '$lib/stores/preferencesStore.js';

	type PermissionState = 'checking' | 'granted' | 'denied' | 'unknown';

	let notifications = $derived($preferences.notifications);
	let permissionState = $state<PermissionState>('checking');
	let permissionMessage = $state('Checking desktop notification access...');

	function updateNotifications(patch: Partial<NotificationPreferences>) {
		preferences.updateSection('notifications', patch);
	}

	async function refreshPermissionState() {
		try {
			const granted = await isPermissionGranted();
			permissionState = granted ? 'granted' : 'unknown';
			permissionMessage = granted
				? 'Desktop alerts are ready to use.'
				: 'Desktop alerts are available but not yet allowed by the system.';
		} catch {
			permissionState = 'unknown';
			permissionMessage = 'Desktop notification status is unavailable in this environment.';
		}
	}

	async function allowDesktopNotifications() {
		try {
			const result = await requestPermission();
			permissionState = result === 'granted' ? 'granted' : 'denied';
			permissionMessage =
				result === 'granted'
					? 'Desktop alerts are enabled.'
					: 'The OS rejected the request. You can still change it in system settings.';
		} catch {
			permissionState = 'denied';
			permissionMessage = 'Permission request failed.';
		}
	}

	async function sendTestAlert() {
		try {
			await sendNotification({
				title: 'Mailx test alert',
				body: 'Notification settings are wired correctly.'
			});
			permissionMessage = 'Test alert sent.';
		} catch {
			permissionMessage = 'Unable to send a test alert in the current runtime.';
		}
	}

	onMount(() => {
		void refreshPermissionState();
	});
</script>

<div class="settings-page">
	<header class="page-header">
		<div class="header-icon">
			<Bell class="size-6" strokeWidth={1.55} />
		</div>
		<div>
			<p class="page-kicker">Notifications</p>
			<h2 class="page-title">Decide what deserves your attention.</h2>
			<p class="page-subtitle">
				Mailx can show in-app sync feedback, desktop alerts, and quiet-hour suppression.
			</p>
		</div>
	</header>

	<section class="section-card">
		<div class="section-head">
			<div>
				<h3 class="section-title">Desktop Alerts</h3>
				<p class="section-description">
					System notifications only fire for new mail when the Mailx window is not focused.
				</p>
			</div>
			<div class="permission-pill" data-state={permissionState}>{permissionState}</div>
		</div>

		<div class="toggle-stack">
			<button class="toggle-row" onclick={() => updateNotifications({ desktopNotifications: !notifications.desktopNotifications })}>
				<div class="row-copy">
					<p class="option-label">Allow desktop notifications</p>
					<p class="option-description">Gate all OS-level new-mail alerts from one switch.</p>
				</div>
				<span class:toggle-on={notifications.desktopNotifications} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>
		</div>

		<div class="permission-panel">
			<div>
				<p class="option-label">System permission</p>
				<p class="option-description">{permissionMessage}</p>
			</div>
			<div class="button-row">
				<button class="subtle-button" onclick={allowDesktopNotifications}>
					<BellRing class="size-4" strokeWidth={1.7} />
					Request access
				</button>
				<button class="subtle-button" onclick={sendTestAlert} disabled={!notifications.desktopNotifications}>
					<Send class="size-4" strokeWidth={1.7} />
					Send test
				</button>
			</div>
		</div>
	</section>

	<section class="section-card">
		<div class="section-head">
			<div>
				<h3 class="section-title">In-App Sync Feedback</h3>
				<p class="section-description">Tune how loudly Mailx reports background sync work.</p>
			</div>
		</div>

		<div class="toggle-stack">
			<button class="toggle-row" onclick={() => updateNotifications({ syncSuccessToasts: !notifications.syncSuccessToasts })}>
				<div class="row-copy">
					<p class="option-label">Success toasts</p>
					<p class="option-description">Show a brief confirmation when an account finishes syncing.</p>
				</div>
				<span class:toggle-on={notifications.syncSuccessToasts} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button class="toggle-row" onclick={() => updateNotifications({ syncFailureToasts: !notifications.syncFailureToasts })}>
				<div class="row-copy">
					<p class="option-label">Failure alerts</p>
					<p class="option-description">Keep actionable errors visible when authentication or connectivity breaks.</p>
				</div>
				<span class:toggle-on={notifications.syncFailureToasts} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>
		</div>
	</section>

	<section class="section-card">
		<div class="section-head">
			<div>
				<h3 class="section-title">Quiet Hours</h3>
				<p class="section-description">Suppress desktop alerts during a time window, including ranges that cross midnight.</p>
			</div>
		</div>

		<div class="toggle-stack">
			<button class="toggle-row" onclick={() => updateNotifications({ quietHoursEnabled: !notifications.quietHoursEnabled })}>
				<div class="row-copy">
					<p class="option-label">Use quiet hours</p>
					<p class="option-description">Pause desktop notifications between the times below.</p>
				</div>
				<span class:toggle-on={notifications.quietHoursEnabled} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>
		</div>

		<div class="time-grid" class:muted={!notifications.quietHoursEnabled}>
			<label class="time-card">
				<span class="time-label">
					<Moon class="size-3.5" strokeWidth={1.7} />
					Start
				</span>
				<input
					type="time"
					value={notifications.quietHoursStart}
					onchange={(event) =>
						updateNotifications({ quietHoursStart: (event.currentTarget as HTMLInputElement).value })}
					disabled={!notifications.quietHoursEnabled}
				/>
			</label>

			<label class="time-card">
				<span class="time-label">
					<Bell class="size-3.5" strokeWidth={1.7} />
					End
				</span>
				<input
					type="time"
					value={notifications.quietHoursEnd}
					onchange={(event) =>
						updateNotifications({ quietHoursEnd: (event.currentTarget as HTMLInputElement).value })}
					disabled={!notifications.quietHoursEnabled}
				/>
			</label>
		</div>
	</section>
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

	.section-head {
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

	.permission-pill {
		padding: 0.42rem 0.7rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg-secondary) 90%, transparent);
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}

	.permission-pill[data-state='granted'] {
		background: color-mix(in srgb, var(--success) 16%, var(--success-light));
		color: var(--success);
	}

	.permission-pill[data-state='denied'] {
		background: color-mix(in srgb, var(--error) 12%, var(--error-light));
		color: var(--error);
	}

	.toggle-stack {
		display: grid;
		gap: 0.75rem;
	}

	.toggle-row,
	.permission-panel,
	.time-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--bg-secondary) 65%, transparent);
		text-align: left;
	}

	.toggle-row {
		cursor: pointer;
	}

	.toggle-row:hover,
	.subtle-button:hover:not(:disabled),
	.time-card:hover {
		border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
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

	.permission-panel {
		align-items: flex-end;
	}

	.button-row {
		display: flex;
		gap: 0.6rem;
	}

	.subtle-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		height: 2.5rem;
		padding: 0 0.95rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 92%, transparent);
		border-radius: 14px;
		background: color-mix(in srgb, var(--bg-primary) 90%, transparent);
		color: var(--text-primary);
		font-size: 0.82rem;
		font-weight: 650;
		cursor: pointer;
	}

	.subtle-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.time-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.8rem;
	}

	.time-grid.muted {
		opacity: 0.55;
	}

	.time-card {
		align-items: flex-start;
		flex-direction: column;
	}

	.time-label {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text-secondary);
	}

	.time-card input {
		width: 100%;
		margin-top: 0.3rem;
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
		.section-head,
		.permission-panel,
		.button-row,
		.time-grid,
		.page-header {
			flex-direction: column;
		}

		.time-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
