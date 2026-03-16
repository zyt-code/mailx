<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';

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

<div class="titlebar">
	<div class="titlebar-drag-region" data-tauri-drag-region></div>

	<!-- Traffic Lights -->
	<div class="titlebar-controls">
		<button onclick={closeWindow} class="traffic-light traffic-light-close" aria-label="Close"></button>
		<button onclick={minimizeWindow} class="traffic-light traffic-light-minimize" aria-label="Minimize"></button>
		<button onclick={maximizeWindow} class="traffic-light traffic-light-maximize" aria-label="Maximize"></button>
	</div>

	<!-- App Title (shows on hover) -->
	<div class="titlebar-title" data-tauri-drag-region>
		<span class="text-[11px] font-medium text-zinc-400 tracking-wide">Mailx</span>
	</div>
</div>

<style>
	.titlebar {
		flex-shrink: 0;
		height: 38px;
		display: flex;
		align-items: center;
		padding: 0 14px;
		background: #ffffff;
		border-bottom: 1px solid rgb(244 244 245);
		user-select: none;
		-webkit-user-select: none;
	}

	.titlebar-drag-region {
		position: absolute;
		inset: 0;
		margin: 0 60px;
	}

	.titlebar-controls {
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

	.titlebar-title {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.titlebar:hover .titlebar-title {
		opacity: 1;
	}
</style>
