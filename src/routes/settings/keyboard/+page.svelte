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
	.shortcut-grid,
	.insight-grid {
		display: grid;
		gap: 0.75rem;
	}

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

	.shortcut-card:hover,
	.insight-card:hover {
		border-color: color-mix(in srgb, var(--accent-primary) 22%, var(--border-primary));
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
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

	@media (max-width: 720px) {
		.shortcut-head {
			flex-direction: column;
			align-items: flex-start;
		}

		.keycaps {
			justify-content: flex-start;
		}
	}
</style>
