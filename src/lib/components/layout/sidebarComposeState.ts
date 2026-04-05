type SidebarComposeStateDeps = {
	getIsAccountConfigured: () => boolean;
	setShowCompose: (value: boolean) => void;
	showDisabledFeedback?: () => void;
	onRefresh?: () => void;
};

export function createSidebarComposeState({
	getIsAccountConfigured,
	setShowCompose,
	showDisabledFeedback,
	onRefresh
}: SidebarComposeStateDeps) {
	function openCompose(): void {
		if (!getIsAccountConfigured()) {
			showDisabledFeedback?.();
			return;
		}

		setShowCompose(true);
	}

	function closeCompose(): void {
		setShowCompose(false);
	}

	async function onComposeSent(): Promise<void> {
		closeCompose();
		onRefresh?.();
	}

	return {
		openCompose,
		closeCompose,
		onComposeSent
	};
}
