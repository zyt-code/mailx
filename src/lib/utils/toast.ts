export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
	type: ToastType;
	title: string;
	message?: string;
	duration?: number;
}

type NotificationApi = {
	show: (notification: ToastOptions) => void;
	dismiss?: (id: string) => void;
};

function getNotificationApi(): NotificationApi | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const api = (window as Window & { notification?: NotificationApi }).notification;
	if (!api || typeof api.show !== 'function') {
		return null;
	}

	return api;
}

export function showToast(notification: ToastOptions): void {
	const api = getNotificationApi();
	if (!api) {
		if (notification.type === 'error') {
			console.error('[toast] notification API unavailable:', notification);
		} else {
			console.warn('[toast] notification API unavailable:', notification);
		}
		return;
	}

	api.show(notification);
}
