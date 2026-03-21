<script lang="ts">
	import { Keyboard, SendHorizontal, Sparkles, CornerDownLeft } from 'lucide-svelte';
	import { _ } from 'svelte-i18n';
	import { preferences, type KeyboardPreferences } from '$lib/stores/preferencesStore.js';

	const liveShortcuts = [
		{
			actionKey: 'keyboard.nextMessage',
			descriptionKey: 'keyboard.nextMessageDescription',
			combo: ['J']
		},
		{
			actionKey: 'keyboard.previousMessage',
			descriptionKey: 'keyboard.previousMessageDescription',
			combo: ['K']
		},
		{
			actionKey: 'keyboard.compose',
			descriptionKey: 'keyboard.composeDescription',
			combo: ['C']
		},
		{
			actionKey: 'keyboard.syncNow',
			descriptionKey: 'keyboard.syncNowDescription',
			combo: ['R']
		},
		{
			actionKey: 'keyboard.sendDraft',
			descriptionKey: 'keyboard.sendDraftDescription',
			combo: ['Cmd/Ctrl', 'Enter']
		}
	];

	let keyboard = $derived($preferences.keyboard);

	function updateKeyboard(patch: Partial<KeyboardPreferences>) {
		preferences.updateSection('keyboard', patch);
	}
</script>

<div class="settings-page">
	<header class="page-header">
		<div class="header-icon">
			<Keyboard class="size-6" strokeWidth={1.55} />
		</div>
		<div>
			<p class="page-kicker">{$_('keyboard.kicker')}</p>
			<h2 class="page-title">{$_('keyboard.title')}</h2>
			<p class="page-subtitle">
				{$_('keyboard.subtitle')}
			</p>
		</div>
	</header>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('keyboard.behavior')}</h3>
				<p class="section-description">{$_('keyboard.behaviorDescription')}</p>
			</div>
		</div>

		<div class="toggle-stack">
			<button class="toggle-row" onclick={() => updateKeyboard({ singleKeyShortcuts: !keyboard.singleKeyShortcuts })}>
				<div class="row-copy">
					<p class="option-label">{$_('keyboard.singleKeyShortcuts')}</p>
					<p class="option-description">{$_('keyboard.singleKeyShortcutsDescription')}</p>
				</div>
				<span class:toggle-on={keyboard.singleKeyShortcuts} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button class="toggle-row" onclick={() => updateKeyboard({ showShortcutHints: !keyboard.showShortcutHints })}>
				<div class="row-copy">
					<p class="option-label">{$_('keyboard.showShortcutHints')}</p>
					<p class="option-description">{$_('keyboard.showShortcutHintsDescription')}</p>
				</div>
				<span class:toggle-on={keyboard.showShortcutHints} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>

			<button class="toggle-row" onclick={() => updateKeyboard({ sendWithModEnter: !keyboard.sendWithModEnter })}>
				<div class="row-copy">
					<p class="option-label">{$_('keyboard.sendWithModEnter')}</p>
					<p class="option-description">{$_('keyboard.sendWithModEnterDescription')}</p>
				</div>
				<span class:toggle-on={keyboard.sendWithModEnter} class="toggle-pill">
					<span class="toggle-thumb"></span>
				</span>
			</button>
		</div>
	</section>

	<section class="section-card">
		<div class="section-copy">
			<div>
				<h3 class="section-title">{$_('keyboard.liveShortcutMap')}</h3>
				<p class="section-description">{$_('keyboard.liveShortcutMapDescription')}</p>
			</div>
			<button class="reset-button" onclick={() => preferences.resetSection('keyboard')}>
				{$_('keyboard.resetKeyboard')}
			</button>
		</div>

		<div class="shortcut-grid">
			{#each liveShortcuts as item}
				<div
					class="shortcut-card"
					class:muted={!keyboard.singleKeyShortcuts && item.combo.length === 1}
					class:highlight={item.combo.includes('Cmd/Ctrl')}
				>
					<div class="shortcut-head">
						<p class="option-label">{$_(item.actionKey)}</p>
						<div class="keycaps">
							{#each item.combo as key}
								<span class="keycap">{key}</span>
							{/each}
						</div>
					</div>
					<p class="option-description">{$_(item.descriptionKey)}</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="insight-grid">
		<div class="insight-card">
			<div class="insight-icon">
				<Sparkles class="size-4" strokeWidth={1.8} />
			</div>
			<div>
				<p class="option-label">{$_('keyboard.hintSystem')}</p>
				<p class="option-description">
					{$_('keyboard.hintSystemDescription')}
				</p>
			</div>
		</div>

		<div class="insight-card">
			<div class="insight-icon">
				<SendHorizontal class="size-4" strokeWidth={1.8} />
			</div>
			<div>
				<p class="option-label">{$_('keyboard.composeAcceleration')}</p>
				<p class="option-description">
					{$_('keyboard.composeAccelerationDescription')}
				</p>
			</div>
		</div>

		<div class="insight-card">
			<div class="insight-icon">
				<CornerDownLeft class="size-4" strokeWidth={1.8} />
			</div>
			<div>
				<p class="option-label">{$_('keyboard.scopeGuard')}</p>
				<p class="option-description">
					{$_('keyboard.scopeGuardDescription')}
				</p>
			</div>
		</div>
	</section>
</div>

<style>
	.settings-page {
		display: grid;
		gap: 1rem;
		animation: fadeIn 180ms ease-out;
	}

	.page-header {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 0.35rem;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3.2rem;
		height: 3.2rem;
		border-radius: 20px;
		background: linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 18%, white), color-mix(in srgb, var(--accent-light) 92%, white));
		color: var(--accent-primary);
		box-shadow: var(--shadow-sm);
		flex-shrink: 0;
	}

	.page-kicker {
		margin: 0 0 0.25rem;
		font-size: 0.74rem;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--accent-primary);
	}

	.page-title {
		margin: 0;
		font-size: clamp(1.8rem, 2.2vw, 2.45rem);
		font-weight: 720;
		letter-spacing: -0.05em;
	}

	.page-subtitle {
		margin: 0.45rem 0 0;
		max-width: 42rem;
		color: var(--text-secondary);
		font-size: 0.96rem;
		line-height: 1.6;
	}

	.section-card {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 88%, transparent);
		border-radius: 24px;
		background: color-mix(in srgb, var(--bg-primary) 84%, transparent);
		box-shadow: var(--shadow-xs);
		backdrop-filter: blur(16px);
	}

	.section-copy {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.section-title {
		margin: 0;
		font-size: 1.05rem;
		letter-spacing: -0.03em;
	}

	.section-description {
		margin: 0.3rem 0 0;
		color: var(--text-secondary);
		font-size: 0.84rem;
		line-height: 1.5;
	}

	.toggle-stack,
	.shortcut-grid,
	.insight-grid {
		display: grid;
		gap: 0.75rem;
	}

	.toggle-row,
	.shortcut-card,
	.insight-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 90%, transparent);
		border-radius: 18px;
		background: color-mix(in srgb, var(--bg-secondary) 65%, transparent);
		text-align: left;
	}

	.toggle-row {
		cursor: pointer;
	}

	.toggle-row:hover,
	.shortcut-card:hover,
	.insight-card:hover,
	.reset-button:hover {
		border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	.row-copy {
		min-width: 0;
	}

	.option-label {
		margin: 0;
		font-size: 0.92rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	.option-description {
		margin: 0.18rem 0 0;
		font-size: 0.8rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.toggle-pill {
		position: relative;
		width: 3rem;
		height: 1.75rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--bg-active) 90%, transparent);
		flex-shrink: 0;
	}

	.toggle-pill.toggle-on {
		background: color-mix(in srgb, var(--accent-primary) 28%, var(--accent-light));
	}

	.toggle-thumb {
		position: absolute;
		top: 0.16rem;
		left: 0.18rem;
		width: 1.4rem;
		height: 1.4rem;
		border-radius: 999px;
		background: white;
		box-shadow: var(--shadow-sm);
		transition: transform 140ms ease;
	}

	.toggle-pill.toggle-on .toggle-thumb {
		transform: translateX(1.2rem);
	}

	.reset-button {
		height: 2.45rem;
		padding: 0 0.95rem;
		border: 1px solid color-mix(in srgb, var(--border-primary) 92%, transparent);
		border-radius: 14px;
		background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
		color: var(--text-primary);
		font-size: 0.82rem;
		font-weight: 650;
		cursor: pointer;
		white-space: nowrap;
	}

	.shortcut-grid {
		grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
	}

	.shortcut-card,
	.insight-card {
		flex-direction: column;
		align-items: flex-start;
	}

	.shortcut-card.muted {
		opacity: 0.58;
	}

	.shortcut-card.highlight {
		background: color-mix(in srgb, var(--accent-light) 64%, var(--bg-primary));
	}

	.shortcut-head {
		width: 100%;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.keycaps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		justify-content: flex-end;
	}

	.keycap {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2rem;
		height: 1.8rem;
		padding: 0 0.6rem;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--border-primary) 92%, transparent);
		background: color-mix(in srgb, var(--bg-primary) 95%, transparent);
		box-shadow: var(--shadow-xs);
		font-size: 0.74rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.insight-grid {
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	}

	.insight-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 14px;
		background: color-mix(in srgb, var(--accent-light) 90%, white);
		color: var(--accent-primary);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 720px) {
		.page-header,
		.section-copy,
		.shortcut-head,
		.toggle-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.keycaps {
			justify-content: flex-start;
		}
	}
</style>
