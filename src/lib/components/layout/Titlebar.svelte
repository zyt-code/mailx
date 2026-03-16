<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { browser } from '$app/environment';

	// Platform detection using navigator (works in Tauri webview)
	let isWindows = $state(true);
	let isMacos = $state(false);

	function detectPlatform() {
		if (browser) {
			const userAgent = navigator.userAgent;
			isWindows = userAgent.includes('Windows');
			isMacos = userAgent.includes('Mac');
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

{#if isWindows}
	<!-- Windows 11 WinUI 3 Style Titlebar -->
	<div class="titlebar titlebar-windows">
		<div class="titlebar-drag-region" data-tauri-drag-region></div>

		<!-- Left side: App icon/title area -->
		<div class="titlebar-left" data-tauri-drag-region>
			<div class="titlebar-icon">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
					<path d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3ZM3 3V13H13V3H3ZM5 5H8V6H5V5ZM5 7H11V8H5V7ZM5 9H11V10H5V9Z"/>
				</svg>
			</div>
			<span class="titlebar-text">Mailx</span>
		</div>

		<!-- Right side: Windows caption buttons -->
		<div class="titlebar-controls">
			<button
				onclick={minimizeWindow}
				class="caption-button caption-minimize"
				aria-label="Minimize"
				title="Minimize"
			>
				<svg width="10" height="10" viewBox="0 0 10 1" fill="currentColor">
					<rect width="10" height="1"/>
				</svg>
			</button>
			<button
				onclick={maximizeWindow}
				class="caption-button caption-maximize"
				aria-label="Maximize"
				title="Maximize"
			>
				<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
					<path d="M0 0V10H10V0H0ZM9 9H1V1H9V9Z"/>
				</svg>
			</button>
			<button
				onclick={closeWindow}
				class="caption-button caption-close"
				aria-label="Close"
				title="Close"
			>
				<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
					<path d="M5.5 5L10 0.5L9.5 0L5 4.5L0.5 0L0 0.5L4.5 5L0 9.5L0.5 10L5 5.5L9.5 10L10 9.5L5.5 5Z"/>
				</svg>
			</button>
		</div>
	</div>
{:else}
	<!-- macOS/Linux Style Titlebar -->
	<div class="titlebar titlebar-macos">
		<div class="titlebar-drag-region" data-tauri-drag-region></div>

		<!-- Traffic Lights (left side) -->
		<div class="titlebar-controls">
			<button onclick={closeWindow} class="traffic-light traffic-light-close" aria-label="Close"></button>
			<button onclick={minimizeWindow} class="traffic-light traffic-light-minimize" aria-label="Minimize"></button>
			<button onclick={maximizeWindow} class="traffic-light traffic-light-maximize" aria-label="Maximize"></button>
		</div>

		<!-- App Title (centered, shows on hover) -->
		<div class="titlebar-title" data-tauri-drag-region>
			<span class="text-[11px] font-medium text-zinc-400 tracking-wide">Mailx</span>
		</div>
	</div>
{/if}

<style>
	/* Common titlebar styles */
	.titlebar {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		user-select: none;
		-webkit-user-select: none;
	}

	.titlebar-drag-region {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* ============================================
	   Windows 11 WinUI 3 Style
	   ============================================ */
	.titlebar-windows {
		height: 32px;
		padding: 0;
		background: #f3f3f3;
		border-bottom: 1px solid #e5e5e5;
		justify-content: space-between;
	}

	/* Left side: Icon and title */
	.titlebar-left {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-left: 12px;
		height: 100%;
		z-index: 1;
	}

	.titlebar-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #737373;
	}

	.titlebar-text {
		font-size: 12px;
		font-weight: 400;
		color: #1a1a1a;
		font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
	}

	/* Right side: Caption buttons */
	.titlebar-windows .titlebar-controls {
		display: flex;
		height: 100%;
	}

	.caption-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 46px;
		height: 100%;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: background 0.1s ease;
	}

	.caption-button svg {
		color: #1a1a1a;
	}

	/* Minimize and Maximize hover */
	.caption-minimize:hover,
	.caption-maximize:hover {
		background: #e5e5e5;
	}

	/* Close button special handling */
	.caption-close:hover {
		background: #c42b1c;
	}

	.caption-close:hover svg {
		color: #ffffff;
	}

	.caption-close:active {
		background: #a02619;
	}

	/* Icon hover effect */
	.titlebar-icon:hover {
		color: #1a1a1a;
	}

	/* ============================================
	   macOS Style (original traffic lights)
	   ============================================ */
	.titlebar-macos {
		height: 38px;
		padding: 0 14px;
		background: #ffffff;
		border-bottom: 1px solid rgb(244 244 245);
	}

	.titlebar-macos .titlebar-drag-region {
		margin: 0 60px;
	}

	.titlebar-macos .titlebar-controls {
		display: flex;
		align-items: center;
		gap: 8px;
		z-index: 1;
	}

	.traffic-light {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 0.5px solid rgba(0, 0, 0, 0.06);
		cursor: pointer;
		transition: filter 0.1s ease;
	}

	.traffic-light:hover { filter: brightness(0.92); }
	.traffic-light:active { filter: brightness(0.85); }

	.traffic-light-close { background: #ff5f57; }
	.traffic-light-minimize { background: #febc2e; }
	.traffic-light-maximize { background: #28c840; }

	.titlebar-macos .titlebar-title {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.titlebar-macos:hover .titlebar-title {
		opacity: 1;
	}
</style>
