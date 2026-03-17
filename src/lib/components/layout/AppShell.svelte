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
	import { initMailStore, loadMails as storeLoadMails, switchFolder } from '$lib/stores/mailStore.js';
	import { initSyncHandlers } from '$lib/events/index.js';
	import { syncAccount } from '$lib/sync/index.js';
	import { goto } from '$app/navigation';

	const STORAGE_KEY = 'mailx-layout';
	const DEFAULTS = { sidebarCollapsed: false, mailListWidth: 360 };
	const MIN_MAIL_WIDTH = 280;
	const MIN_READING_WIDTH = 400;
	const SIDEBAR_EXPANDED = 240;
	const SIDEBAR_COLLAPSED = 56;

	// Layout state
	let sidebarCollapsed = $state(DEFAULTS.sidebarCollapsed);
	let mailListWidth = $state(DEFAULTS.mailListWidth);
	let isMobile = $state(false);

	// App state
	let activeFolder: Folder = $state('inbox');
	let selectedMailId: string | null = $state(null);
	let mobileView: 'list' | 'reading' = $state('list');

	// Data state
	let mails: Mail[] = $state([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

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
	$effect(() => {
		const unsub = activeAccount.subscribe(async (acc) => {
			if (acc && acc.id !== currentAccount) {
				currentAccount = acc.id;
				if (isAccountConfigured) {
					try {
						await syncAccount(acc.id);
					} catch (e) {
						console.error('Auto-sync failed:', e);
					}
				}
			}
		});
		return unsub;
	});

	let sidebarWidth = $derived(sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);
	let selectedMail = $derived(mails.find((m) => m.id === selectedMailId) ?? null);

	async function loadMails() {
		if (!isAccountConfigured) {
			mails = [];
			isLoading = false;
			error = null;
			return;
		}

		isLoading = true;
		error = null;
		try {
			mails = await db.getMails(activeFolder);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load mails';
			console.error('Failed to load mails:', e);
		} finally {
			isLoading = false;
		}
	}

	$effect(() => {
		loadMails();
	});

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

		const mail = mails.find(m => m.id === id);
		if (mail?.unread) {
			try {
				await db.markMailRead(id, true);
				mail.unread = false;
			} catch (e) {
				console.error('Failed to mark mail as read:', e);
			}
		}
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
			await db.markMailRead(mail.id, read);
			mail.unread = !read;
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
</script>

<div class="flex flex-col h-screen w-screen overflow-hidden bg-white">
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
		/>

		{#if isMobile}
			{#if mobileView === 'list'}
				<MailList {mails} {activeFolder} {selectedMailId} onSelectMail={selectMail} onMarkRead={handleMarkRead} onDelete={handleContextDelete} onArchive={handleContextArchive} onMoveTo={handleMoveTo} width={undefined} {isAccountConfigured} />
			{:else}
				<ReadingPane mail={selectedMail} {isMobile} onBack={goBackToList} onRefresh={loadMails} />
			{/if}
		{:else}
			{#if isAccountConfigured}
				<MailList {mails} {activeFolder} {selectedMailId} onSelectMail={selectMail} onMarkRead={handleMarkRead} onDelete={handleContextDelete} onArchive={handleContextArchive} onMoveTo={handleMoveTo} width={mailListWidth} {isAccountConfigured} />
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
