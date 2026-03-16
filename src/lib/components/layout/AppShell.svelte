<script lang="ts">
	import { untrack } from 'svelte';
	import Sidebar from './Sidebar.svelte';
	import MailList from './MailList.svelte';
	import Resizer from './Resizer.svelte';
	import ReadingPane from './ReadingPane.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Menu } from 'lucide-svelte';
	import type { Mail, Folder } from '$lib/types.js';

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

	let sidebarWidth = $derived(sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED);

	const mails: Mail[] = [
		{
			id: '1', from: 'Alice Chen', subject: 'Project update for Q1',
			preview: 'Hi team, here is the latest update on our Q1 goals...',
			body: 'Hi team,\n\nHere is the latest update on our Q1 goals. We have completed 80% of the planned features and are on track to deliver by the end of March.\n\nKey highlights:\n- Authentication module is complete\n- Dashboard redesign is in review\n- API performance improved by 40%\n\nPlease review the attached report and let me know if you have any questions.\n\nBest,\nAlice',
			time: '10:30 AM', unread: true, folder: 'inbox'
		},
		{
			id: '2', from: 'Bob Smith', subject: 'Meeting notes',
			preview: "Attached are the meeting notes from yesterday's standup...",
			body: "Hi everyone,\n\nAttached are the meeting notes from yesterday's standup. Here's a quick summary:\n\n1. Sprint progress is at 65%\n2. Two blockers identified — need design review for the new sidebar and API endpoint for mail sync\n3. Next demo is scheduled for Friday\n\nAction items:\n- Alice: Finalize Q1 report\n- Carol: Update mockups\n- David: Send invoices\n\nThanks,\nBob",
			time: '9:15 AM', unread: true, folder: 'inbox'
		},
		{
			id: '3', from: 'Carol Wang', subject: 'Design review feedback',
			preview: 'Great work on the mockups! I have a few suggestions...',
			body: 'Great work on the mockups! I have a few suggestions:\n\n1. The sidebar could use more contrast between active and inactive states\n2. Consider adding a subtle animation for the panel resize\n3. The mobile layout should stack vertically rather than hiding the mail list\n\nOverall the direction looks fantastic. Let me know when you have an updated version and I will do another pass.\n\nCheers,\nCarol',
			time: 'Yesterday', unread: false, folder: 'inbox'
		},
		{
			id: '4', from: 'David Lee', subject: 'Invoice #1234',
			preview: 'Please find the invoice for March attached...',
			body: 'Hi,\n\nPlease find the invoice for March attached. The total amount is $4,500 for the consulting services provided.\n\nPayment terms: Net 30\nDue date: April 15, 2026\n\nLet me know if you need any adjustments.\n\nRegards,\nDavid Lee',
			time: 'Yesterday', unread: false, folder: 'inbox'
		},
		{
			id: '5', from: 'Eve Johnson', subject: 'Welcome to the team!',
			preview: 'We are thrilled to have you join us. Here is what...',
			body: 'Welcome to the team!\n\nWe are thrilled to have you join us. Here is what you need to get started:\n\n1. Set up your development environment using the README\n2. Join our Slack channels: #general, #engineering, #random\n3. Schedule a 1:1 with your manager\n4. Complete the onboarding checklist in Notion\n\nIf you have any questions, do not hesitate to reach out. We are here to help!\n\nBest,\nEve',
			time: 'Mar 12', unread: false, folder: 'inbox'
		},
		{
			id: '6', from: 'Me', subject: 'Re: Project update for Q1',
			preview: 'Thanks for the update, Alice. Looks great!',
			body: 'Thanks for the update, Alice. Looks great!\n\nI reviewed the report and everything is on track. Let us schedule a quick sync on Wednesday to discuss the remaining 20%.\n\nBest regards',
			time: '11:00 AM', unread: false, folder: 'sent'
		},
		{
			id: '7', from: 'Me', subject: 'Draft: Team offsite planning',
			preview: 'Ideas for the upcoming team offsite in April...',
			body: 'Ideas for the upcoming team offsite in April:\n\n- Location: Mountain retreat or coastal venue\n- Duration: 2-3 days\n- Activities: Team building, strategy planning, hackathon\n- Budget: TBD\n\nNeed to finalize by end of month.',
			time: 'Mar 10', unread: false, folder: 'drafts'
		}
	];

	let selectedMail = $derived(mails.find((m) => m.id === selectedMailId) ?? null);

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

	function selectMail(id: string) {
		selectedMailId = id;
		if (isMobile) mobileView = 'reading';
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
