<script lang="ts">
	import { tick } from 'svelte';
	import { Spring } from 'svelte/motion';
	import { _ } from 'svelte-i18n';
	import { cn } from '$lib/utils.js';
	import type { Folder } from '$lib/types.js';

	interface Props {
		navItems: ReadonlyArray<{ readonly icon: any; readonly labelKey: string; readonly folder: Folder }>;
		activeFolder: Folder;
		isAccountConfigured: boolean;
		unreadCounts: Record<Folder, number>;
		collapsed: boolean;
		isMobile: boolean;
		onSelectFolder: (folder: Folder) => void;
	}

	const FOLDERS: Folder[] = ['inbox', 'sent', 'drafts', 'archive', 'trash'];

	let {
		navItems,
		activeFolder,
		isAccountConfigured,
		unreadCounts,
		collapsed,
		isMobile,
		onSelectFolder
	}: Props = $props();

	const indicatorY = new Spring(0, { stiffness: 0.18, damping: 0.68 });
	const indicatorHeight = new Spring(0, { stiffness: 0.18, damping: 0.68 });
	const buttonScale = Object.fromEntries(
		FOLDERS.map((folder) => [folder, new Spring(1, { stiffness: 0.24, damping: 0.58 })])
	) as Record<Folder, Spring<number>>;

	let navContainer = $state<HTMLElement | null>(null);
	let indicatorReady = $state(false);
	let navButtons = $state<Record<Folder, HTMLButtonElement | null>>({
		inbox: null,
		sent: null,
		drafts: null,
		archive: null,
		trash: null
	});

	function handleFolderClick(folder: Folder) {
		if (!isAccountConfigured) {
			return;
		}
		onSelectFolder(folder);
	}

	function pressButton(folder: Folder) {
		buttonScale[folder].set(0.965);
	}

	function releaseButton(folder: Folder) {
		buttonScale[folder].set(1);
	}

	function syncIndicator(instant = false) {
		if (!navContainer || collapsed) {
			indicatorReady = false;
			return;
		}

		const activeButton = navButtons[activeFolder];
		if (!activeButton) return;

		indicatorY.set(activeButton.offsetTop, { instant });
		indicatorHeight.set(activeButton.offsetHeight, { instant });
		indicatorReady = true;
	}

	function registerButton(node: HTMLButtonElement, folder: Folder) {
		navButtons[folder] = node;
		queueMicrotask(() => syncIndicator(true));

		return {
			destroy() {
				if (navButtons[folder] === node) {
					navButtons[folder] = null;
				}
			}
		};
	}

	$effect(() => {
		activeFolder;
		collapsed;
		void tick().then(() => syncIndicator());
	});
</script>

{#if !collapsed || isMobile}
	<nav class="folder-nav folder-nav-expanded" bind:this={navContainer}>
		<div
			class="folder-nav-indicator"
			class:ready={indicatorReady}
			style={`transform: translate3d(0, ${indicatorY.current}px, 0); height:${indicatorHeight.current}px;`}
		></div>

		<div class="folder-nav-stack">
			{#each navItems as item}
				<button
					type="button"
					use:registerButton={item.folder}
					class={cn(
						'folder-nav-button group relative flex h-10 w-full items-center gap-2.5 rounded-xl pl-2.5 pr-3 text-[13px]',
						isAccountConfigured && item.folder === activeFolder
							? 'is-active text-[var(--text-primary)] font-semibold'
							: '',
						isAccountConfigured
							? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer'
							: 'text-[var(--text-quaternary)] cursor-not-allowed'
					)}
					style={`--nav-scale:${buttonScale[item.folder].current};`}
					onclick={() => handleFolderClick(item.folder)}
					onpointerdown={() => pressButton(item.folder)}
					onpointerup={() => releaseButton(item.folder)}
					onpointerleave={() => releaseButton(item.folder)}
					onpointercancel={() => releaseButton(item.folder)}
					onblur={() => releaseButton(item.folder)}
					disabled={!isAccountConfigured}
					>
						<item.icon
							class={cn(
								'folder-nav-icon size-[17px] shrink-0',
								isAccountConfigured && item.folder === activeFolder && 'text-[var(--accent-primary)]'
							)}
							strokeWidth={1.8}
						/>
					<span
						class={cn(
							'flex-1 text-left truncate',
							unreadCounts[item.folder] > 0 && 'pr-8'
						)}
					>
						{$_(item.labelKey)}
					</span>
					{#if unreadCounts[item.folder] > 0}
						<span class="folder-nav-badge">
							{unreadCounts[item.folder]}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</nav>
{:else}
	<nav class="folder-nav folder-nav-collapsed">
		<div class="folder-nav-collapsed-stack">
			{#each navItems as item}
				<button
					type="button"
					class={cn(
						'folder-nav-icon-button group flex size-9 items-center justify-center rounded-xl relative z-10',
						isAccountConfigured && item.folder === activeFolder
							? 'is-active text-[var(--text-primary)]'
							: '',
						isAccountConfigured
							? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer'
							: 'text-[var(--text-quaternary)] cursor-not-allowed'
					)}
					style={`--nav-scale:${buttonScale[item.folder].current};`}
					onclick={() => handleFolderClick(item.folder)}
					onpointerdown={() => pressButton(item.folder)}
					onpointerup={() => releaseButton(item.folder)}
					onpointerleave={() => releaseButton(item.folder)}
					onpointercancel={() => releaseButton(item.folder)}
					onblur={() => releaseButton(item.folder)}
					disabled={!isAccountConfigured}
					aria-label={$_(item.labelKey)}
				>
					<div class="relative">
						<item.icon class="size-[17px]" strokeWidth={1.8} />
						{#if unreadCounts[item.folder] > 0}
							<span class="absolute -top-0.5 -right-0.5 size-2 bg-[var(--accent-primary)] rounded-full border-2 border-[var(--bg-secondary)]"></span>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</nav>
{/if}

<style>
	.folder-nav {
		position: relative;
		flex: 1;
		margin-top: 0.25rem;
		overflow-y: auto;
	}

	.folder-nav-expanded {
		padding: 0 0.5rem 0.5rem;
	}

	.folder-nav-stack {
		position: relative;
		display: grid;
		gap: 0.25rem;
	}

	.folder-nav-indicator {
		position: absolute;
		left: 0.5rem;
		right: 0.5rem;
		border-radius: 14px;
		opacity: 0;
		pointer-events: none;
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--accent-light) 84%, var(--bg-primary)), color-mix(in srgb, var(--bg-primary) 82%, transparent)),
			radial-gradient(circle at 12% 50%, color-mix(in srgb, var(--accent-primary) 18%, transparent), transparent 58%);
		border: 1px solid color-mix(in srgb, var(--accent-primary) 15%, var(--border-primary));
		box-shadow:
			0 16px 26px rgba(17, 33, 61, 0.08),
			inset 0 1px 0 rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(16px);
	}

	.folder-nav-indicator.ready {
		opacity: 1;
	}

	:global(.dark) .folder-nav-indicator {
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--accent-light) 82%, var(--bg-secondary)), color-mix(in srgb, var(--bg-secondary) 94%, transparent)),
			radial-gradient(circle at 12% 50%, color-mix(in srgb, var(--accent-primary) 26%, transparent), transparent 58%);
		border-color: color-mix(in srgb, var(--accent-primary) 24%, var(--border-primary));
		box-shadow:
			0 18px 30px rgba(0, 0, 0, 0.24),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
	}

	.folder-nav-button,
	.folder-nav-icon-button {
		background: transparent;
		border: 1px solid transparent;
		transform: translate3d(0, 0, 0) scale(var(--nav-scale, 1));
		transform-origin: center left;
		will-change: transform;
	}

	.folder-nav-button:hover {
		background: color-mix(in srgb, var(--bg-hover) 68%, transparent);
		border-color: color-mix(in srgb, var(--border-primary) 72%, transparent);
		box-shadow: var(--shadow-xs);
	}

	.folder-nav-button.is-active {
		background: transparent;
		border-color: transparent;
	}

	.folder-nav-icon {
		transition: color 180ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.folder-nav-badge {
		position: absolute;
		top: 50%;
		right: 0.75rem;
		transform: translate3d(0, -50%, 0);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 20px;
		font-size: 11px;
		font-weight: 700;
		line-height: 1;
		color: var(--accent-primary);
		background: color-mix(in srgb, var(--accent-light) 88%, transparent);
		border-radius: 999px;
		padding: 0 0.42rem;
		min-width: 20px;
		text-align: center;
		font-variant-numeric: tabular-nums;
		pointer-events: none;
	}

	.folder-nav-collapsed {
		padding: 0 0.5rem 0.5rem;
	}

	.folder-nav-collapsed-stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}

	.folder-nav-icon-button {
		border-radius: 12px;
	}

	.folder-nav-icon-button:hover {
		background: color-mix(in srgb, var(--bg-hover) 76%, transparent);
		border-color: color-mix(in srgb, var(--border-primary) 78%, transparent);
	}

	.folder-nav-icon-button.is-active {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--accent-light) 86%, var(--bg-primary)), color-mix(in srgb, var(--bg-primary) 82%, transparent));
		border-color: color-mix(in srgb, var(--accent-primary) 16%, var(--border-primary));
		box-shadow:
			var(--shadow-xs),
			0 8px 18px rgba(16, 35, 67, 0.1);
	}

	:global(.dark) .folder-nav-icon-button.is-active {
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--accent-light) 84%, var(--bg-secondary)), color-mix(in srgb, var(--bg-secondary) 94%, transparent));
		border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
		box-shadow:
			0 12px 20px rgba(0, 0, 0, 0.24),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}
</style>
