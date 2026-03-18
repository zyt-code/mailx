<script lang="ts">
	import { version } from '$app/environment';
	import { Mail, Github, Heart } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let appVersion = $state('0.1.0');

	onMount(() => {
		if (version) {
			appVersion = version;
		}
	});

	function openGitHub() {
		window.open('https://github.com/yourusername/mailx', '_blank');
	}
</script>

<svelte:head>
	<title>About Mailx</title>
</svelte:head>

<div class="about-page">
	<div class="about-content">
		<!-- App Icon -->
		<div class="app-icon">
			<Mail class="size-16" strokeWidth={1.5} />
		</div>

		<!-- App Name -->
		<h1 class="app-name">Mailx</h1>

		<!-- Version -->
		<p class="app-version">Version {appVersion}</p>

		<!-- Description -->
		<p class="app-description">
			A modern email client with a clean, minimal design inspired by Notion.
		</p>

		<!-- Credits -->
		<div class="credits">
			<p class="credits-text">
				Made with <Heart class="inline size-4 text-red-500 fill-red-500" /> using Tauri + Svelte 5
			</p>
		</div>

		<!-- Actions -->
		<div class="actions">
			<button onclick={openGitHub} class="action-button">
				<Github class="size-5" strokeWidth={1.5} />
				<span>View on GitHub</span>
			</button>
		</div>

		<!-- Copyright -->
		<p class="copyright">
			© {new Date().getFullYear()} Mailx. All rights reserved.
		</p>
	</div>
</div>

<style>
	.about-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #f5f5f7 0%, #ffffff 100%);
		padding: 2rem;
		animation: fadeIn 0.4s ease-out;
	}

	.about-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		text-align: center;
		max-width: 480px;
	}

	.app-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 80px;
		height: 80px;
		background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
		border-radius: 20px;
		color: white;
		box-shadow: 0 8px 24px -4px rgba(139, 92, 246, 0.3);
	}

	.app-name {
		font-size: 2.5rem;
		font-weight: 700;
		letter-spacing: -0.05em;
		color: #1d1d1f;
	}

	.app-version {
		font-size: 0.9375rem;
		color: #86868b;
		font-weight: 500;
	}

	.app-description {
		font-size: 1rem;
		color: #6b6b6b;
		line-height: 1.6;
		max-width: 360px;
	}

	.credits {
		margin-top: 0.5rem;
	}

	.credits-text {
		font-size: 0.875rem;
		color: #86868b;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		font-size: 0.9375rem;
		font-weight: 500;
		color: #1d1d1f;
		background: white;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.action-button:hover {
		background: #f5f5f7;
		border-color: rgba(0, 0, 0, 0.12);
		transform: translateY(-1px);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
	}

	.action-button:active {
		transform: translateY(0);
	}

	.copyright {
		font-size: 0.75rem;
		color: #a1a1a6;
		margin-top: 1rem;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
