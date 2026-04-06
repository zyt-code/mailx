import type { Folder } from '$lib/types.js';

type MobileView = 'list' | 'reading';

type AppShellMailboxNavigationDeps = {
	isMobile: () => boolean;
	setSelectedMailId: (mailId: string | null) => void;
	setMobileView: (view: MobileView) => void;
	setActiveFolder: (folder: Folder) => void;
	switchFolder: (folder: Folder) => void;
	selectAccount: (accountId: string | null) => void | Promise<void>;
};

export function createAppShellMailboxNavigation({
	isMobile,
	setSelectedMailId,
	setMobileView,
	setActiveFolder,
	switchFolder,
	selectAccount: runSelectAccount
}: AppShellMailboxNavigationDeps) {
	async function selectMail(id: string): Promise<void> {
		setSelectedMailId(id);
		if (isMobile()) {
			setMobileView('reading');
		}
	}

	function selectFolder(folder: Folder): void {
		setActiveFolder(folder);
		setSelectedMailId(null);
		setMobileView('list');
		switchFolder(folder);
	}

	function selectAccount(accountId: string | null): void {
		void runSelectAccount(accountId);
		setSelectedMailId(null);
		setMobileView('list');
	}

	function goBackToList(): void {
		setMobileView('list');
	}

	return {
		selectMail,
		selectFolder,
		selectAccount,
		goBackToList
	};
}
