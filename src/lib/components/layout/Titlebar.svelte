<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { browser } from '$app/environment';
	import { X, Minus, Square } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { i18nStore } from '$lib/stores/i18nStore.svelte.js';

	// Platform detection using navigator (works in Tauri webview)
	let platform = $state<'windows' | 'macos' | 'linux'>('linux');

	function detectPlatform() {
		if (browser) {
			const userAgent = navigator.userAgent;
			if (userAgent.includes('Windows')) {
				platform = 'windows';
			} else if (userAgent.includes('Mac')) {
				platform = 'macos';
			} else {
				platform = 'linux';
			}
		}
	}

	detectPlatform();

	async function closeWindow() {
		const window = getCurrentWindow();
		await window.close();
	}

	async function minimizeWindow() {
		const window = getCurrentWindow();
		await window.minimize();
	}

	async function maximizeWindow() {
		const window = getCurrentWindow();
		await window.toggleMaximize();
	}
</script>

{#if !i18nStore.isLoading}
	{#if platform === 'windows'}
	<!-- Windows 11 Style Titlebar -->
	<div class="titlebar titlebar-windows">
		<div class="titlebar-drag-region" data-tauri-drag-region></div>

		<!-- Left side: App icon/title area (draggable) -->
		<div class="titlebar-left" data-tauri-drag-region>
			<div class="titlebar-icon">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3ZM3 3V13H13V3H3ZM5 5H8V6H5V5ZM5 7H11V8H5V7ZM5 9H11V10H5V9Z"/>
				</svg>
			</div>
			<span class="titlebar-text">Mailx</span>
		</div>

		<!-- Right side: Window controls -->
		<div class="titlebar-controls">
			<button
				onclick={minimizeWindow}
				class="caption-button"
				aria-label={$_('titlebar.minimize')}
			>
				<Minus class="size-3" strokeWidth={1.5} />
			</button>
			<button
				onclick={maximizeWindow}
				class="caption-button"
				aria-label={$_('titlebar.maximize')}
			>
				<Square class="size-3" strokeWidth={1.5} />
			</button>
			<button
				onclick={closeWindow}
				class="caption-button caption-close"
				aria-label={$_('titlebar.close')}
			>
				<X class="size-3" strokeWidth={1.5} />
			</button>
		</div>
	</div>
{:else}
	<!-- macOS/Linux Style Titlebar with Traffic Lights -->
	<div class="titlebar titlebar-unix">
		<div class="titlebar-drag-region" data-tauri-drag-region></div>

		<!-- Traffic Lights (left side) -->
		<div class="titlebar-controls">
			<button onclick={closeWindow} class="traffic-light traffic-light-close" aria-label={$_('titlebar.close')}></button>
			<button onclick={minimizeWindow} class="traffic-light traffic-light-minimize" aria-label={$_('titlebar.minimize')}></button>
			<button onclick={maximizeWindow} class="traffic-light traffic-light-maximize" aria-label={$_('titlebar.maximize')}></button>
		</div>
	</div>
	{/if}
{/if}

<style>
	/* ============================================
	   Common Titlebar Styles
	   ============================================ */
	.titlebar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		user-select: none;
		-webkit-user-select: none;
		position: relative;
		overflow: hidden;
	}

	.titlebar-drag-region {
		position: absolute;
		inset: 0;
	}

	/* ============================================
	   Windows 11 Style
	   ============================================ */
	.titlebar-windows {
		height: 32px;
		padding: 0;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-primary);
		justify-content: space-between;
	}

	/* Left side: Icon and title */
	.titlebar-windows .titlebar-left {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-left: 12px;
		height: 100%;
		position: relative;
		z-index: 10;
		pointer-events: auto;
	}

	.titlebar-windows .titlebar-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-tertiary);
		transition: color 0.15s ease;
	}

	.titlebar-windows .titlebar-icon:hover {
		color: var(--text-primary);
	}

	.titlebar-windows .titlebar-text {
		font-size: 12px;
		font-weight: 400;
		color: var(--text-primary);
		font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
	}

	/* Right side: Window controls */
	.titlebar-windows .titlebar-controls {
		display: flex;
		height: 100%;
		position: relative;
		z-index: 10;
		pointer-events: auto;
	}

	.titlebar-windows .caption-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 46px;
		height: 100%;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: background 0.1s ease;
		pointer-events: auto;
		color: var(--text-primary);
	}

	/* Minimize and Maximize hover */
	.titlebar-windows .caption-button:hover {
		background: var(--bg-hover);
	}

	/* Close button special handling */
	.titlebar-windows .caption-close:hover {
		background: #e81123;
		color: #ffffff;
	}

	.titlebar-windows .caption-close:active {
		background: #a02619;
	}

	/* ============================================
	   macOS/Linux Style (Traffic Lights)
	   ============================================ */
	.titlebar-unix {
		height: 38px;
		padding: 0 14px;
		background: var(--bg-primary);
		border-bottom: 1px solid var(--border-primary);
	}

	.titlebar-unix .titlebar-drag-region {
		margin: 0 60px; /* Leave space for traffic lights */
	}

	.titlebar-unix .titlebar-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		position: relative;
		z-index: 10;
		pointer-events: auto;
	}

	.titlebar-unix .traffic-light {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 0.5px solid rgba(0, 0, 0, 0.06);
		cursor: pointer;
		transition: filter 0.1s ease;
		pointer-events: auto;
	}

	.titlebar-unix .traffic-light:hover {
		filter: brightness(0.92);
	}

	.titlebar-unix .traffic-light:active {
		filter: brightness(0.85);
	}

	.titlebar-unix .traffic-light-close {
		background: #ff5f57;
	}

	.titlebar-unix .traffic-light-minimize {
		background: #febc2e;
	}

	.titlebar-unix .traffic-light-maximize {
		background: #28c840;
	}
</style>
