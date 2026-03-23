<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowRight, Mail, Lock, Send, Archive, Sparkles, ShieldCheck } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';

	interface Props {
		onOpenSettings?: () => void;
	}

	let { onOpenSettings }: Props = $props();
</script>

<div class="welcome-shell">
	<div class="welcome-bg">
		<div class="orb orb-a"></div>
		<div class="orb orb-b"></div>
		<div class="orb orb-c"></div>
	</div>

	<div class="welcome-card">
		<div class="welcome-badge">
			<Sparkles class="size-3.5" strokeWidth={2} />
			<span>Mailx</span>
		</div>

		<div class="hero-icon">
			<div class="hero-ring"></div>
			<div class="hero-core">
				<Mail class="size-8 text-white" strokeWidth={1.6} />
			</div>
		</div>

		<div class="welcome-content">
			<h1 class="welcome-title">{$_('getStarted.welcome')}</h1>
			<p class="welcome-description">
				{$_('getStarted.description')}
			</p>
		</div>

		<Button
			onclick={onOpenSettings}
			class="welcome-cta"
		>
			{$_('getStarted.addFirstAccount')}
			<ArrowRight class="size-4" strokeWidth={2} />
		</Button>

		<div class="welcome-trust">
			<div class="trust-pill">
				<ShieldCheck class="size-4" strokeWidth={1.7} />
				<span>{$_('getStarted.secure')}</span>
			</div>
			<div class="trust-pill">
				<Lock class="size-4" strokeWidth={1.5} />
				<span>{$_('getStarted.secure')}</span>
			</div>
			<div class="trust-pill">
				<Send class="size-4" strokeWidth={1.5} />
				<span>{$_('getStarted.fast')}</span>
			</div>
			<div class="trust-pill">
				<Archive class="size-4" strokeWidth={1.5} />
				<span>{$_('getStarted.organized')}</span>
			</div>
		</div>
	</div>
</div>

<style>
	.welcome-shell {
		position: relative;
		display: flex;
		height: 100%;
		width: 100%;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 1.5rem;
		background:
			radial-gradient(circle at 12% 20%, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent 42%),
			radial-gradient(circle at 88% 14%, color-mix(in srgb, var(--accent-secondary) 14%, transparent), transparent 46%),
			linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 92%, white), var(--bg-primary));
		overflow: hidden;
	}

	.welcome-bg {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.orb {
		position: absolute;
		border-radius: 999px;
		filter: blur(36px);
		opacity: 0.5;
		animation: drift 8s ease-in-out infinite;
	}

	.orb-a {
		top: 16%;
		left: 8%;
		width: 180px;
		height: 180px;
		background: color-mix(in srgb, var(--accent-primary) 32%, transparent);
	}

	.orb-b {
		bottom: 10%;
		right: 12%;
		width: 220px;
		height: 220px;
		background: color-mix(in srgb, var(--accent-secondary) 34%, transparent);
		animation-delay: 0.5s;
	}

	.orb-c {
		top: 56%;
		left: 48%;
		width: 140px;
		height: 140px;
		background: color-mix(in srgb, var(--accent-primary) 24%, transparent);
		animation-delay: 1.1s;
	}

	.welcome-card {
		position: relative;
		z-index: 1;
		display: flex;
		width: min(580px, 100%);
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 2.5rem 2rem;
		text-align: center;
		background: color-mix(in srgb, var(--bg-primary) 82%, transparent);
		border: 1px solid color-mix(in srgb, var(--border-primary) 85%, transparent);
		border-radius: 28px;
		backdrop-filter: blur(12px);
		box-shadow:
			0 24px 64px -34px color-mix(in srgb, var(--text-primary) 30%, transparent),
			inset 0 1px 0 color-mix(in srgb, var(--bg-primary) 80%, transparent);
		animation: riseIn 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.welcome-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.325rem 0.6rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--accent-primary);
		background: color-mix(in srgb, var(--accent-primary) 9%, transparent);
		border: 1px solid color-mix(in srgb, var(--accent-primary) 22%, transparent);
		border-radius: 999px;
	}

	.hero-icon {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 112px;
		height: 112px;
	}

	.hero-ring {
		position: absolute;
		width: 112px;
		height: 112px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--accent-primary) 22%, transparent);
		animation: pulseRing 2.8s ease-in-out infinite;
	}

	.hero-core {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 76px;
		height: 76px;
		background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
		border-radius: 22px;
		box-shadow:
			0 12px 30px -12px color-mix(in srgb, var(--accent-primary) 55%, transparent),
			inset 0 1px 0 color-mix(in srgb, white 45%, transparent);
		animation: float 3s ease-in-out infinite;
	}

	.welcome-content {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.welcome-title {
		font-size: clamp(1.6rem, 2vw, 2rem);
		font-weight: 650;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.welcome-description {
		max-width: 32rem;
		font-size: 0.95rem;
		line-height: 1.65;
		color: var(--text-secondary);
	}

	:global(.welcome-cta) {
		gap: 0.5rem;
		padding: 0.75rem 1.2rem;
		font-weight: 560;
		color: white;
		background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
		border: 0;
		border-radius: 12px;
		box-shadow: 0 10px 26px -12px color-mix(in srgb, var(--accent-primary) 62%, transparent);
		transition: transform 180ms ease, box-shadow 180ms ease;
	}

	:global(.welcome-cta:hover) {
		transform: translateY(-1px);
		box-shadow: 0 14px 32px -14px color-mix(in srgb, var(--accent-primary) 70%, transparent);
	}

	.welcome-trust {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding-top: 0.4rem;
	}

	.trust-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.65rem;
		font-size: 0.72rem;
		color: var(--text-tertiary);
		background: color-mix(in srgb, var(--bg-primary) 85%, transparent);
		border: 1px solid var(--border-primary);
		border-radius: 999px;
	}

	@keyframes riseIn {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes float {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-7px);
		}
	}

	@keyframes pulseRing {
		0%, 100% {
			transform: scale(1);
			opacity: 0.9;
		}
		50% {
			transform: scale(1.07);
			opacity: 0.45;
		}
	}

	@keyframes drift {
		0%, 100% {
			transform: translate3d(0, 0, 0);
		}
		50% {
			transform: translate3d(0, -10px, 0);
		}
	}

	@media (max-width: 768px) {
		.welcome-card {
			padding: 2rem 1.25rem;
			border-radius: 22px;
		}

		.hero-icon {
			width: 96px;
			height: 96px;
		}

		.hero-ring {
			width: 96px;
			height: 96px;
		}
	}
</style>
