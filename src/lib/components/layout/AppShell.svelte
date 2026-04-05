<script lang="ts">
	import Sidebar from './Sidebar.svelte';
	import MailList from './MailList.svelte';
	import Resizer from './Resizer.svelte';
	import ReadingPane from './ReadingPane.svelte';
	import { GetStarted } from '$lib/components/get-started/index.js';
	import type { Mail, Folder } from '$lib/types.js';
	import * as db from '$lib/db/index.js';
	import { hasAccounts, activeAccount } from '$lib/stores/accountStore.js';
	import { isSyncing } from '$lib/stores/syncStore.js';
	import { switchFolder, setSelectedAccount, markMailReadLocally, markMailUnreadLocally, displayedEmails, loadMails } from '$lib/stores/mailStore.js';
	import { eventBus } from '$lib/events/index.js';
	import { createMailboxContextActions } from '$lib/mailbox/mailboxContextActions.js';
	import { bindAutoSyncLifecycle } from '$lib/sync/autoSyncLifecycle.js';
	import { createAppShellLayoutController } from './appShellLayout.js';
	import { createAppShellMailSelection } from './appShellMailSelection.js';
	import { createAppShellMailboxNavigation } from './appShellMailboxNavigation.js';
	import { createAppShellReadState } from './appShellReadState.js';
	import { createAppShellSelectedMailLifecycle } from './appShellSelectedMailLifecycle.js';
	import { resolveSelectedMail } from './appShellSelectedMail.js';
	import { bindAppShellShortcuts } from './appShellShortcuts.js';
	import { initAppShellRuntime } from './appShellRuntime.js';
	import { bindAppShellStoreMirrors } from './appShellStoreMirrors.js';
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

	// Account state - subscribe to store
	let isAccountConfigured = $state(false);

	// Initialize event-driven runtime
	initAppShellRuntime();

	// Sync state
	let syncing = $state(false);
	$effect(() => {
		return bindAppShellStoreMirrors({
			displayedEmailsStore: displayedEmails,
			hasAccountsStore: hasAccounts,
			isSyncingStore: isSyncing,
			setStoreMails: (value) => {
				storeMails = value;
			},
			setIsAccountConfigured: (value) => {
				isAccountConfigured = value;
			},
			setSyncing: (value) => {
				syncing = value;
			}
		});
	});

	$effect(() => {
		return bindAutoSyncLifecycle({
			activeAccountStore: activeAccount,
			hasAccountsStore: hasAccounts,
			isSyncingStore: isSyncing,
			triggerSync: (payload) => eventBus.emitAsync('sync:trigger', payload)
		});
	});

	let sidebarWidth = $derived(sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);
	let selectedMail = $derived(resolveSelectedMail(storeMails, selectedMailId));

	const layoutStorage = {
		getItem: (key: string) => (browser ? localStorage.getItem(key) : null),
		setItem: (key: string, value: string) => {
			if (browser) {
				localStorage.setItem(key, value);
			}
		}
	};

	const createMediaQueryList = (query: string) =>
		browser
			? window.matchMedia(query)
			: {
					matches: false,
					addEventListener: () => {},
					removeEventListener: () => {}
				};

	const layoutController = createAppShellLayoutController({
		storageKey: STORAGE_KEY,
		storage: layoutStorage,
		matchMedia: createMediaQueryList,
		getWindowWidth: () => (browser ? window.innerWidth : 0),
		getSidebarWidth: () => sidebarWidth,
		getSidebarCollapsed: () => sidebarCollapsed,
		getMailListWidth: () => mailListWidth,
		getIsMobile: () => isMobile,
		setSidebarCollapsed: (value) => {
			sidebarCollapsed = value;
		},
		setMailListWidth: (value) => {
			mailListWidth = value;
		},
		setIsMobile: (value) => {
			isMobile = value;
		},
		minMailWidth: MIN_MAIL_WIDTH,
		minReadingWidth: MIN_READING_WIDTH
	});

	$effect(() => {
		return layoutController.initialize();
	});

	const mailboxNavigation = createAppShellMailboxNavigation({
		isMobile: () => isMobile,
		setSelectedMailId: (mailId) => {
			selectedMailId = mailId;
		},
		setMobileView: (view) => {
			mobileView = view;
		},
		setActiveFolder: (folder) => {
			activeFolder = folder;
		},
		switchFolder,
		setSelectedAccount
	});

	const mailSelection = createAppShellMailSelection({
		getVisibleMails: () => get(displayedEmails),
		getSelectedMailId: () => selectedMailId,
		selectMail: mailboxNavigation.selectMail
	});

	const selectedMailLifecycle = createAppShellSelectedMailLifecycle({
		getVisibleMails: () => storeMails,
		getSelectedMailId: () => selectedMailId,
		getMobileView: () => mobileView,
		clearSelectedMail: () => {
			selectedMailId = null;
		},
		setMobileView: (view) => {
			mobileView = view;
		}
	});

	function openSettings() {
		// If no accounts configured, go directly to add account page
		if (!isAccountConfigured) {
			goto('/settings/accounts/new');
		} else {
			goto('/settings');
		}
	}

	const mailboxContextActions = createMailboxContextActions({
		db,
		reload: loadMails,
		clearSelectedMail: (mailId) => {
			if (selectedMailId === mailId) {
				selectedMailId = null;
			}
		}
	});

	const readState = createAppShellReadState({
		markMailReadLocally,
		markMailUnreadLocally
	});

	$effect(() => {
		storeMails;
		selectedMailId;
		mobileView;
		selectedMailLifecycle.reconcile();
	});

	async function handleContextDelete(mail: Mail) {
		await mailboxContextActions.deleteMail(mail);
	}

	async function handleContextArchive(mail: Mail) {
		await mailboxContextActions.archiveMail(mail);
	}

	async function handleMoveTo(mail: Mail, folder: Folder) {
		await mailboxContextActions.moveToFolder(mail, folder);
	}

	onMount(() => {
		return bindAppShellShortcuts({
			getKeyboardPreferences: () => get(preferences).keyboard,
			isModalOpen: () => Boolean(document.querySelector('[aria-modal="true"]')),
			stepMailSelection: (delta) => {
				void mailSelection.stepSelection(delta);
			},
			openCompose: () => eventBus.emit('compose:open'),
			triggerSync: () => eventBus.emitAsync('sync:trigger')
		});
	});
</script>

<div class="flex flex-1 overflow-hidden bg-[var(--bg-primary)] w-full h-full">
	<Sidebar
		collapsed={sidebarCollapsed}
		{isMobile}
		{activeFolder}
		onToggle={layoutController.toggleSidebar}
		onSelectFolder={mailboxNavigation.selectFolder}
		onRefresh={loadMails}
		onSelectAccount={mailboxNavigation.selectAccount}
		onOpenSettings={openSettings}
	/>

	{#if isMobile}
		{#if mobileView === 'list'}
			<MailList {selectedMailId} onSelectMail={mailboxNavigation.selectMail} onMarkRead={readState.setReadState} onDelete={handleContextDelete} onArchive={handleContextArchive} onMoveTo={handleMoveTo} width={undefined} {isAccountConfigured} isSyncing={syncing} />
		{:else}
			<ReadingPane mail={selectedMail} {isMobile} onBack={mailboxNavigation.goBackToList} onRefresh={loadMails} />
		{/if}
	{:else}
		{#if isAccountConfigured}
			<MailList {selectedMailId} onSelectMail={mailboxNavigation.selectMail} onMarkRead={readState.setReadState} onDelete={handleContextDelete} onArchive={handleContextArchive} onMoveTo={handleMoveTo} width={mailListWidth} {isAccountConfigured} isSyncing={syncing} />
			<Resizer onResize={layoutController.resizeMailList} onResizeEnd={layoutController.finishResize} />
			<ReadingPane mail={selectedMail} {isMobile} onBack={mailboxNavigation.goBackToList} onRefresh={loadMails} />
		{:else}
			<!-- Get Started View -->
			<div class="flex-1 pointer-events-auto relative z-10">
				<GetStarted onOpenSettings={openSettings} />
			</div>
		{/if}
	{/if}
</div>
