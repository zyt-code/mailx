<script lang="ts">
	import { untrack } from 'svelte';
	import Sidebar from './Sidebar.svelte';
	import MailList from './MailList.svelte';
	import Resizer from './Resizer.svelte';
	import ReadingPane from './ReadingPane.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Menu } from 'lucide-svelte';
	import type { Mail, Folder } from '$lib/types.js';
	import * as db from '$lib/db/index.js';

	const STORAGE_KEY = 'mailx-layout';
	const DEFAULTS = { sidebarCollapsed: false, mailListWidth: 350 };
	const MIN_MAIL_WIDTH = 280;
	const MIN_READING_WIDTH = 400;
	const SIDEBAR_EXPANDED = 250;
	const SIDEBAR_COLLAPSED = 64;

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

	let sidebarWidth = $derived(sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);
	let selectedMail = $derived(mails.find((m) => m.id === selectedMailId) ?? null);

	async function loadMails() {
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

	// Reload mails when folder changes
	$effect(() => {
		loadMails();
	});

	// Load persisted state on mount
	$effect(() => {
		untrack(() => {
			try {
				const stored = localStorage.getItem(STORAGE_KEY);
				if (stored) {
					const parsed = JSON.parse(stored);
					if (typeof parsed.sidebarCollapsed === 'boolean') sidebarCollapsed = parsed.sidebarCollapsed;
					if (typeof parsed.mailListWidth === 'number') mailListWidth = parsed.mailListWidth;
				}
			} catch {
				// Ignore invalid localStorage data
			}
		});

		// Mobile detection
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
			localStorage.setItem(STORAGE_KEY, JSON.stringify({
				sidebarCollapsed,
				mailListWidth
			}));
		} catch {
			// Ignore storage errors
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

		// Mark as read when selected
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
	}

	function goBackToList() {
		mobileView = 'list';
	}
</script>

<div class="flex h-screen w-screen overflow-hidden bg-bg-primary text-text">
	{#if isMobile && mobileView === 'list'}
		<!-- Mobile: hamburger menu -->
		<div class="fixed top-0 left-0 z-20 flex h-12 items-center px-3">
			<Button variant="ghost" size="icon-sm" onclick={toggleSidebar} aria-label="Open sidebar">
				<Menu class="size-4" />
			</Button>
		</div>
	{/if}

	<Sidebar
		collapsed={sidebarCollapsed}
		{isMobile}
		{activeFolder}
		onToggle={toggleSidebar}
		onSelectFolder={selectFolder}
		onRefresh={loadMails}
	/>

	{#if isMobile}
		{#if mobileView === 'list'}
			<MailList
				{mails}
				{activeFolder}
				{selectedMailId}
				onSelectMail={selectMail}
				width={undefined}
			/>
		{:else}
			<ReadingPane mail={selectedMail} {isMobile} onBack={goBackToList} />
		{/if}
	{:else}
		<MailList
			{mails}
			{activeFolder}
			{selectedMailId}
			onSelectMail={selectMail}
			width={mailListWidth}
		/>
		<Resizer {onResize} {onResizeEnd} />
		<ReadingPane mail={selectedMail} {isMobile} onBack={goBackToList} />
	{/if}
</div>
