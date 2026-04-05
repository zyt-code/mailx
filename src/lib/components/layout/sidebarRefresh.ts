type SidebarRefreshDeps = {
	getSelectedAccountId: () => string | null;
	getIsRefreshing: () => boolean;
	getIsRefreshPending: () => boolean;
	getIsAccountConfigured: () => boolean;
	setIsRefreshPending: (value: boolean) => void;
	triggerSync: (payload?: { accountId: string }) => Promise<void>;
	showDisabledFeedback?: () => void;
	logError?: (message: string, error: unknown) => void;
};

export function createSidebarRefresh({
	getSelectedAccountId,
	getIsRefreshing,
	getIsRefreshPending,
	getIsAccountConfigured,
	setIsRefreshPending,
	triggerSync,
	showDisabledFeedback,
	logError = (message, error) => console.error(message, error)
}: SidebarRefreshDeps) {
	async function refresh(): Promise<void> {
		if (getIsRefreshing() || getIsRefreshPending()) {
			return;
		}

		if (!getIsAccountConfigured()) {
			showDisabledFeedback?.();
			return;
		}

		setIsRefreshPending(true);

		try {
			const selectedAccountId = getSelectedAccountId();
			if (selectedAccountId) {
				await triggerSync({ accountId: selectedAccountId });
			} else {
				await triggerSync();
			}
		} catch (error) {
			logError('Refresh failed:', error);
		} finally {
			setIsRefreshPending(false);
		}
	}

	return {
		refresh
	};
}
