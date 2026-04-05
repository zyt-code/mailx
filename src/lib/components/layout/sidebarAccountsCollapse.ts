type SidebarCollapseReader = {
	getItem: (key: string) => string | null;
};

type SidebarCollapseStorage = SidebarCollapseReader & {
	setItem: (key: string, value: string) => void;
};

const STORAGE_KEY = 'sidebar-accounts-collapsed';

type SidebarAccountsCollapseDeps = {
	getCollapsed: () => boolean;
	setCollapsed: (value: boolean) => void;
	storage?: SidebarCollapseStorage;
	logWarn?: (message: string, error: unknown) => void;
};

export function readSidebarAccountsCollapsed(storage?: SidebarCollapseReader): boolean {
	try {
		return storage?.getItem(STORAGE_KEY) === 'true';
	} catch {
		return false;
	}
}

export function createSidebarAccountsCollapse({
	getCollapsed,
	setCollapsed,
	storage,
	logWarn = (message, error) => console.warn(message, error)
}: SidebarAccountsCollapseDeps) {
	function toggle(): void {
		setCollapsed(!getCollapsed());
	}

	function persist(): void {
		if (!storage) {
			return;
		}

		try {
			storage.setItem(STORAGE_KEY, String(getCollapsed()));
		} catch (error) {
			logWarn('Failed to save sidebar collapse state:', error);
		}
	}

	return {
		toggle,
		persist
	};
}
