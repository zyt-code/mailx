<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import MailList from './MailList.svelte';
	import Resizer from './Resizer.svelte';
	import ReadingPane from './ReadingPane.svelte';
	import Titlebar from './Titlebar.svelte';
	import { GetStarted } from '$lib/components/get-started/index.js';
	import { Notification } from '$lib/components/ui/notification/index.js';
	import type { Mail, Folder } from '$lib/types.js';
	import * as db from '$lib/db/index.js';
	import { hasAccounts, activeAccount } from '$lib/stores/accountStore.js';
	import { initSyncStore, isSyncing } from '$lib/stores/syncStore.js';
	import { initMailStore, switchFolder, setSelectedAccount, markMailReadLocally, markMailUnreadLocally, displayedEmails, loadMails } from '$lib/stores/mailStore.js';
	import { initSyncHandlers, eventBus } from '$lib/events/index.js';
	import { initUnreadStore } from '$lib/stores/unreadStore.js';
	import { syncAccount, syncAllAccounts } from '$lib/sync/index.js';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';
	import { preferences } from '$lib/stores/preferencesStore.js';

	const STORAGE_KEY = 'mailx-layout';
	const MIN_MAIL_WIDTH = 280;
	const MIN_READING_WIDTH = 400;
	const SIDEBAR_COLLAPSED = 56;
	let SIDEBAR_EXPANDED = 240;
	let DEFAULT_MAIL_LIST_WIDTH = 320;

	function getSpacingValue(variable: string, fallback: number): number {
		if (!browser) return fallback;
		const raw = getComputedStyle(document.documentElement).getPropertyValue(variable);
		const numeric = Number.parseFloat(raw);
		return Number.isFinite(numeric) ? numeric : fallback;
	}

	if (browser) {
		SIDEBAR_EXPANDED = getSpacingValue('--spacing-sidebar', SIDEBAR_EXPANDED);
		DEFAULT_MAIL_LIST_WIDTH = getSpacingValue('--spacing-mail-list', DEFAULT_MAIL_LIST_WIDTH);
	}

const DEFAULTS = { sidebarCollapsed: false, mailListWidth: DEFAULT_MAIL_LIST_WIDTH };

	// Layout state
	let sidebarCollapsed = $state(DEFAULTS.sidebarCollapsed);
	let mailListWidth = $state(DEFAULTS.mailListWidth);
	let isMobile = $state(false);

	// App state
	let activeFolder: Folder = $state('inbox');
	let selectedMailId: string | null = $state(null);
	let mobileView: 'list' | 'reading' = $state('list');

	// Data state - subscribe to mailStore's displayedEmails for selectedMail lookup
	let storeMails: Mail[] = $state([]);
	$effect(() => {
		const unsub = displayedEmails.subscribe((emails) => {
			storeMails = emails;
		});
		return unsub;
	});

	// Account state - subscribe to store
	let isAccountConfigured = $state(false);

	// Subscribe to hasAccounts store
	$effect(() => {
		const unsub = hasAccounts.subscribe((value) => {
			isAccountConfigured = value;
		});
		return unsub;
	});

	// Initialize event-driven stores
	initSyncStore();
	initMailStore();
	initSyncHandlers();
	initUnreadStore();

	// Sync state
	let syncing = $state(false);
	$effect(() => {
		const unsub = isSyncing.subscribe((value) => {
			syncing = value;
		});
		return unsub;
	});

	// Auto-sync when active account changes
	let currentAccount = $state<string | null>(null);
	let syncIntervalId: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		const unsub = activeAccount.subscribe(async (acc) => {
			if (acc && acc.id !== currentAccount) {
				currentAccount = acc.id;
				if (isAccountConfigured && !get(isSyncing)) {
					try {
						// Initial sync when account changes
						await syncAccount(acc.id);

						// Start auto-sync interval (15 minutes)
						if (syncIntervalId) clearInterval(syncIntervalId);
						syncIntervalId = setInterval(() => {
							// Only sync if not already syncing
							if (!get(isSyncing)) {
								syncAllAccounts().catch((e) => {
									console.error('[AppShell] Auto-sync failed:', e);
								});
							}
						}, 15 * 60 * 1000); // 15 minutes
					} catch (e) {
						console.error('Auto-sync failed:', e);
					}
				}
			}
		});

		// Cleanup interval when effect is disposed
		return () => {
			unsub();
			if (syncIntervalId) {
				clearInterval(syncIntervalId);
				syncIntervalId = null;
			}
		};
	});

	let sidebarWidth = $derived(sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);
	let selectedMail = $derived(storeMails.find((m) => m.id === selectedMailId) ?? null);

	$effect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (typeof parsed.sidebarCollapsed === 'boolean') sidebarCollapsed = parsed.sidebarCollapsed;
				if (typeof parsed.mailListWidth === 'number') mailListWidth = parsed.mailListWidth;
			}
		} catch {
			// Ignore
		}

		const mq = window.matchMedia('(max-width: 768px)');
		isMobile = mq.matches;

		function onMediaChange(e: MediaQueryListEvent) {
			isMobile = e.matches;
		}
		mq.addEventListener('change', onMediaChange);
		return () => mq.removeEventListener('change', onMediaChange);
	});

	function persistLayout() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarCollapsed, mailListWidth }));
		} catch {
			// Ignore
		}
	}

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		persistLayout();
	}

	function onResize(deltaX: number) {
		const maxWidth = window.innerWidth - (isMobile ? 0 : sidebarWidth) - MIN_READING_WIDTH;
		mailListWidth = Math.max(MIN_MAIL_WIDTH, Math.min(maxWidth, mailListWidth + deltaX));
	}

	function onResizeEnd() {
		persistLayout();
	}

	async function selectMail(id: string) {
		selectedMailId = id;
		if (isMobile) mobileView = 'reading';
	}

	function selectFolder(folder: Folder) {
		activeFolder = folder;
		selectedMailId = null;
		mobileView = 'list';
		switchFolder(folder);
	}

	function goBackToList() {
		mobileView = 'list';
	}

	function isTypingTarget(target: EventTarget | null): boolean {
		const element = target as HTMLElement | null;
		if (!element) return false;
		const tagName = element.tagName;
		return (
			element.isContentEditable ||
			tagName === 'INPUT' ||
			tagName === 'TEXTAREA' ||
			tagName === 'SELECT' ||
			Boolean(element.closest('[contenteditable="true"]'))
		);
	}

	function stepMailSelection(delta: number) {
		const visibleMails = get(displayedEmails);
		if (visibleMails.length === 0) return;

		const currentIndex = visibleMails.findIndex((mail) => mail.id === selectedMailId);
		const nextIndex =
			currentIndex === -1
				? delta > 0
					? 0
					: visibleMails.length - 1
				: Math.max(0, Math.min(visibleMails.length - 1, currentIndex + delta));

		void selectMail(visibleMails[nextIndex].id);
	}

	function openSettings() {
		// If no accounts configured, go directly to add account page
		if (!isAccountConfigured) {
			goto('/settings/accounts/new');
		} else {
			goto('/settings');
		}
	}

	async function handleMarkRead(mail: Mail, read: boolean) {
		try {
			// First update local state for immediate UI feedback
			if (read) {
				markMailReadLocally(mail.id);
			} else {
				markMailUnreadLocally(mail.id);
			}
			// markMailReadLocally/UnreadLocally now handles DB persistence in background
		} catch (e) {
			console.error('Failed to mark mail:', e);
		}
	}

	async function handleContextDelete(mail: Mail) {
		try {
			await db.moveToTrash(mail.id, mail.folder);
			if (selectedMailId === mail.id) selectedMailId = null;
			await loadMails();
		} catch (e) {
			console.error('Failed to delete mail:', e);
		}
	}

	async function handleContextArchive(mail: Mail) {
		try {
			if (mail.folder === 'archive') {
				await db.updateMail({ ...mail, folder: 'inbox' });
			} else {
				await db.moveToArchive(mail.id);
			}
			if (selectedMailId === mail.id) selectedMailId = null;
			await loadMails();
		} catch (e) {
			console.error('Failed to archive mail:', e);
		}
	}

	async function handleMoveTo(mail: Mail, folder: Folder) {
		try {
			await db.updateMail({ ...mail, folder });
			if (selectedMailId === mail.id) selectedMailId = null;
			await loadMails();
		} catch (e) {
			console.error('Failed to move mail:', e);
		}
	}

	// Handle account selection from sidebar
	function handleSelectAccount(accountId: string | null) {
		setSelectedAccount(accountId);
		// Reset to inbox when switching accounts
		activeFolder = 'inbox';
		selectedMailId = null;
		switchFolder('inbox');
		// Trigger reload for the new account
		loadMails();
	}

	onMount(() => {
		const handleSingleKeyShortcuts = (event: KeyboardEvent) => {
			const keyboardPreferences = get(preferences).keyboard;

			if (!keyboardPreferences.singleKeyShortcuts) return;
			if (event.defaultPrevented) return;
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			if (isTypingTarget(event.target)) return;
			if (document.querySelector('[aria-modal="true"]')) return;

			switch (event.key.toLowerCase()) {
				case 'j':
					event.preventDefault();
					stepMailSelection(1);
					break;
				case 'k':
					event.preventDefault();
					stepMailSelection(-1);
					break;
				case 'c':
					event.preventDefault();
					eventBus.emit('compose:open');
					break;
				case 'r':
					event.preventDefault();
					void syncAllAccounts().catch((error) => {
						console.error('[AppShell] Shortcut sync failed:', error);
					});
					break;
			}
		};

		window.addEventListener('keydown', handleSingleKeyShortcuts);
		return () => {
			window.removeEventListener('keydown', handleSingleKeyShortcuts);
		};
	});
</script>

<div class="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
	<!-- Custom Titlebar -->
	<Titlebar />

	<div class="flex flex-1 overflow-hidden">
		<Sidebar
			collapsed={sidebarCollapsed}
			{isMobile}
			{activeFolder}
			onToggle={toggleSidebar}
			onSelectFolder={selectFolder}
			onRefresh={loadMails}
			onOpenSettings={openSettings}
			onSelectAccount={handleSelectAccount}
		/>

		{#if isMobile}
			{#if mobileView === 'list'}
				<MailList {selectedMailId} onSelectMail={selectMail} onMarkRead={handleMarkRead} onDelete={handleContextDelete} onArchive={handleContextArchive} onMoveTo={handleMoveTo} width={undefined} {isAccountConfigured} isSyncing={syncing} />
			{:else}
				<ReadingPane mail={selectedMail} {isMobile} onBack={goBackToList} onRefresh={loadMails} />
			{/if}
		{:else}
			{#if isAccountConfigured}
				<MailList {selectedMailId} onSelectMail={selectMail} onMarkRead={handleMarkRead} onDelete={handleContextDelete} onArchive={handleContextArchive} onMoveTo={handleMoveTo} width={mailListWidth} {isAccountConfigured} isSyncing={syncing} />
				<Resizer {onResize} {onResizeEnd} />
				<ReadingPane mail={selectedMail} {isMobile} onBack={goBackToList} onRefresh={loadMails} />
			{:else}
				<!-- Get Started View -->
				<div class="flex-1 pointer-events-auto relative z-10">
					<GetStarted onOpenSettings={openSettings} />
				</div>
			{/if}
		{/if}
	</div>

	<!-- Notifications -->
	<Notification />
</div>
