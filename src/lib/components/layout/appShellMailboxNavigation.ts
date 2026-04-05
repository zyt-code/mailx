import type { Folder } from '$lib/types.js';

type MobileView = 'list' | 'reading';

type AppShellMailboxNavigationDeps = {
	isMobile: () => boolean;
	setSelectedMailId: (mailId: string | null) => void;
	setMobileView: (view: MobileView) => void;
	setActiveFolder: (folder: Folder) => void;
	switchFolder: (folder: Folder) => void;
	setSelectedAccount: (accountId: string | null) => void;
};

export function createAppShellMailboxNavigation({
	isMobile,
	setSelectedMailId,
	setMobileView,
	setActiveFolder,
	switchFolder,
	setSelectedAccount
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
		setSelectedAccount(accountId);
		setActiveFolder('inbox');
		setSelectedMailId(null);
		setMobileView('list');
		switchFolder('inbox');
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
