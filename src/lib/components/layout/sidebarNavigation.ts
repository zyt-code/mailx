import type { Folder } from '$lib/types.js';

type SidebarNavigationDeps = {
	getIsAccountConfigured: () => boolean;
	getIsMobile: () => boolean;
	setSelectedAccountId: (value: string | null) => void;
	onSelectAccount?: (accountId: string | null) => void;
	onSelectFolder: (folder: Folder) => void;
	onToggle: () => void;
	showDisabledFeedback: () => void;
};

export function createSidebarNavigation({
	getIsAccountConfigured,
	getIsMobile,
	setSelectedAccountId,
	onSelectAccount,
	onSelectFolder,
	onToggle,
	showDisabledFeedback
}: SidebarNavigationDeps) {
	function selectAccount(accountId: string | null): void {
		setSelectedAccountId(accountId);
		onSelectAccount?.(accountId);
	}

	function selectFolder(folder: Folder): void {
		if (!getIsAccountConfigured()) {
			showDisabledFeedback();
			return;
		}

		onSelectFolder(folder);
		if (getIsMobile()) {
			onToggle();
		}
	}

	return {
		selectAccount,
		selectFolder
	};
}
