<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { onMount } from 'svelte';
	import { X, Minus, Maximize2 } from 'lucide-svelte';

	let currentTime = $state(new Date());

	// Update time every minute
	$effect(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 60000);
		return () => clearInterval(interval);
	});

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

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}
</script>

<div class="titlebar">
	<!-- Drag Region -->
	<div class="titlebar-drag-region" data-tauri-drag-region></div>

	<!-- Traffic Lights (macOS-style window controls) -->
	<div class="titlebar-controls">
		<button
			onclick={closeWindow}
			class="traffic-light traffic-light-close"
			aria-label="Close"
		>
			<X class="size-2.5" />
		</button>
		<button
			onclick={minimizeWindow}
			class="traffic-light traffic-light-minimize"
			aria-label="Minimize"
		>
			<Minus class="size-2.5" />
		</button>
		<button
			onclick={maximizeWindow}
			class="traffic-light traffic-light-maximize"
			aria-label="Maximize"
		>
			<Maximize2 class="size-2.5" />
		</button>
	</div>

	<!-- App Title (visible when dragging) -->
	<div class="titlebar-title" data-tauri-drag-region>
		<span class="text-xs font-medium tracking-wide text-zinc-700">Mailx</span>
	</div>

	<!-- Optional: Time display -->
	<div class="titlebar-time">
		<span class="text-xs text-zinc-500 font-medium">{formatTime(currentTime)}</span>
	</div>
</div>

<style>
	.titlebar {
		flex-shrink: 0;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 16px;
		background: rgb(250 250 250 / 0.8);
		backdrop-filter: blur(20px) saturate(180%);
		border-bottom: 1px solid rgb(228 228 231 / 0.6);
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
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 0.5px solid rgba(0, 0, 0, 0.08);
		transition: all 0.15s ease;
		cursor: pointer;
		background: white;
	}

	.traffic-light:hover {
		filter: brightness(0.95);
	}

	.traffic-light:active {
		filter: brightness(0.9);
	}

	.traffic-light-close {
		background: #ff5f57;
	}

	.traffic-light-close:hover {
		background: #ff4136;
	}

	.traffic-light-minimize {
		background: #febc2e;
	}

	.traffic-light-minimize:hover {
		background: #f9a825;
	}

	.traffic-light-maximize {
		background: #28c840;
	}

	.traffic-light-maximize:hover {
		background: #1db954;
	}

	.traffic-light svg {
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.titlebar-controls:hover .traffic-light svg {
		opacity: 0.6;
	}

	.titlebar-controls:hover .traffic-light:hover svg {
		opacity: 1;
	}

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

	.titlebar-time {
		z-index: 1;
	}
</style>
