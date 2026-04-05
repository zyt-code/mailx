type LayoutStorage = Pick<Storage, 'getItem' | 'setItem'>;

type LayoutState = {
	sidebarCollapsed: boolean;
	mailListWidth: number;
};

type MediaQueryListLike = {
	matches: boolean;
	addEventListener: (type: 'change', listener: (event: MediaQueryListEvent) => void) => void;
	removeEventListener: (type: 'change', listener: (event: MediaQueryListEvent) => void) => void;
};

type AppShellLayoutDeps = {
	storageKey: string;
	storage: LayoutStorage;
	matchMedia: (query: string) => MediaQueryListLike;
	getWindowWidth: () => number;
	getSidebarWidth: () => number;
	getSidebarCollapsed: () => boolean;
	getMailListWidth: () => number;
	getIsMobile: () => boolean;
	setSidebarCollapsed: (value: boolean) => void;
	setMailListWidth: (value: number) => void;
	setIsMobile: (value: boolean) => void;
	minMailWidth?: number;
	minReadingWidth?: number;
};

function parseStoredLayout(raw: string | null): LayoutState | null {
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as Partial<LayoutState>;
		return {
			sidebarCollapsed:
				typeof parsed.sidebarCollapsed === 'boolean' ? parsed.sidebarCollapsed : false,
			mailListWidth: typeof parsed.mailListWidth === 'number' ? parsed.mailListWidth : 0
		};
	} catch {
		return null;
	}
}

export function createAppShellLayoutController({
	storageKey,
	storage,
	matchMedia,
	getWindowWidth,
	getSidebarWidth,
	getSidebarCollapsed,
	getMailListWidth,
	getIsMobile,
	setSidebarCollapsed,
	setMailListWidth,
	setIsMobile,
	minMailWidth = 280,
	minReadingWidth = 400
}: AppShellLayoutDeps) {
	function persistLayout(): void {
		try {
			storage.setItem(
				storageKey,
				JSON.stringify({
					sidebarCollapsed: getSidebarCollapsed(),
					mailListWidth: getMailListWidth()
				})
			);
		} catch {
			// Ignore storage failures in runtime code paths.
		}
	}

	function initialize(): () => void {
		const stored = parseStoredLayout(storage.getItem(storageKey));
		if (stored) {
			setSidebarCollapsed(stored.sidebarCollapsed);
			if (stored.mailListWidth > 0) {
				setMailListWidth(stored.mailListWidth);
			}
		}

		const mediaQueryList = matchMedia('(max-width: 768px)');
		setIsMobile(mediaQueryList.matches);

		const handleMediaChange = (event: MediaQueryListEvent) => {
			setIsMobile(event.matches);
		};

		mediaQueryList.addEventListener('change', handleMediaChange);
		return () => {
			mediaQueryList.removeEventListener('change', handleMediaChange);
		};
	}

	function toggleSidebar(): void {
		setSidebarCollapsed(!getSidebarCollapsed());
		persistLayout();
	}

	function resizeMailList(deltaX: number): void {
		const availableWidth =
			getWindowWidth() - (getIsMobile() ? 0 : getSidebarWidth()) - minReadingWidth;
		const boundedMaxWidth = Math.max(0, availableWidth);
		const boundedMinWidth = Math.min(minMailWidth, boundedMaxWidth);
		const nextWidth = Math.max(
			boundedMinWidth,
			Math.min(boundedMaxWidth, getMailListWidth() + deltaX)
		);
		setMailListWidth(nextWidth);
	}

	function finishResize(): void {
		persistLayout();
	}

	return {
		initialize,
		toggleSidebar,
		resizeMailList,
		finishResize
	};
}
