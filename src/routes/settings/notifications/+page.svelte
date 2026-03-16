<script lang="ts">
	import { Bell } from 'lucide-svelte';
</script>

<div class="settings-page">
	<div class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<div class="flex size-10 items-center justify-center rounded-xl bg-orange-100">
				<Bell class="size-5 text-orange-600" />
			</div>
			<div>
				<h2 class="text-2xl font-semibold tracking-tight text-gray-900">Notifications</h2>
			</div>
		</div>
		<p class="text-sm text-gray-500 ml-13">
			Manage how you receive notifications.
		</p>
	</div>

	<div class="rounded-2xl border border-gray-200 bg-white p-6">
		<p class="text-center text-gray-500">Notification settings coming soon.</p>
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
