<script module lang="ts">
  export type NotificationType = 'success' | 'error' | 'info' | 'warning';

  export interface NotificationItem {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    duration?: number;
  }
</script>

<script lang="ts">
  import { fly } from 'svelte/transition';
  import { X, CheckCircle, AlertCircle, Info } from 'lucide-svelte';
  import { cn } from '$lib/utils.js';

  let notifications = $state<NotificationItem[]>([]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle
  };

  const colors = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-amber-600'
  };

  export function show(notification: Omit<NotificationItem, 'id'>): void {
    const id = crypto.randomUUID();
    notifications = [...notifications, { id, ...notification }];

    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }

  export function dismiss(id: string): void {
    notifications = notifications.filter(n => n.id !== id);
  }

  // Expose globally
  if (typeof window !== 'undefined') {
    (window as any).notification = { show, dismiss };
  }
</script>

<div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
  {#each notifications as notification (notification.id)}
    {@const Icon = icons[notification.type]}
    <div
      transition:fly={{ y: 50, duration: 300 }}
      class={cn(
        "pointer-events-auto min-w-[320px] max-w-[400px] bg-white rounded-lg shadow-lg border border-zinc-200",
        "p-4 flex items-start gap-3",
        colors[notification.type]
      )}
      role="alert"
    >
      <Icon class="size-5 shrink-0 mt-0.5" strokeWidth={1.5} />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-zinc-900">{notification.title}</p>
        {#if notification.message}
          <p class="text-sm text-zinc-500 mt-0.5">{notification.message}</p>
        {/if}
      </div>
      <button
        onclick={() => dismiss(notification.id)}
        class="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors"
        aria-label="Dismiss"
      >
        <X class="size-4" strokeWidth={1.5} />
      </button>
    </div>
  {/each}
</div>
