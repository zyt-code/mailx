<script lang="ts">
	import { Palette } from 'lucide-svelte';
</script>

<div class="settings-page">
	<div class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<div class="flex size-10 items-center justify-center rounded-xl bg-purple-100">
				<Palette class="size-5 text-purple-600" />
			</div>
			<div>
				<h2 class="text-2xl font-semibold tracking-tight text-gray-900">Appearance</h2>
			</div>
		</div>
		<p class="text-sm text-gray-500 ml-13">
			Customize the look and feel of Mailx.
		</p>
	</div>

	<div class="space-y-6">
		<div class="rounded-2xl border border-gray-200 bg-white p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Theme</h3>
			<div class="grid grid-cols-3 gap-4">
				<button class="flex flex-col items-center gap-3 rounded-xl border-2 border-blue-500 bg-blue-50 p-4">
					<div class="flex h-16 w-full items-center justify-center rounded-lg bg-white border border-gray-200">
						<span class="text-2xl">☀️</span>
					</div>
					<span class="text-sm font-medium text-gray-900">Light</span>
				</button>
				<button class="flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-300">
					<div class="flex h-16 w-full items-center justify-center rounded-lg bg-gray-900">
						<span class="text-2xl">🌙</span>
					</div>
					<span class="text-sm font-medium text-gray-900">Dark</span>
				</button>
				<button class="flex flex-col items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-300">
					<div class="flex h-16 w-full items-center justify-center rounded-lg bg-gradient-to-r from-white to-gray-900">
						<span class="text-2xl">🌓</span>
					</div>
					<span class="text-sm font-medium text-gray-900">System</span>
				</button>
			</div>
		</div>

		<div class="rounded-2xl border border-gray-200 bg-white p-6">
			<h3 class="text-lg font-semibold text-gray-900 mb-4">Font Size</h3>
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Text size</span>
					<div class="flex items-center gap-2">
						<button class="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100">A</button>
						<button class="rounded-lg bg-blue-500 px-3 py-1.5 text-base font-medium text-white">A</button>
						<button class="rounded-lg px-3 py-1.5 text-lg font-medium text-gray-600 hover:bg-gray-100">A</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.settings-page {
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.ml-13 {
		margin-left: 3.25rem;
	}
</style>
