import type { Mail } from '$lib/types.js';

export type ReadingPaneComposeMode = 'reply' | 'forward' | null;

type ReadingPaneComposeStateDeps = {
	getMail: () => Mail | null;
	setShowCompose: (value: boolean) => void;
	setComposeMode: (value: ReadingPaneComposeMode) => void;
	setComposeMail: (value: Mail | null) => void;
	onRefresh?: () => void;
};

export function createReadingPaneComposeState({
	getMail,
	setShowCompose,
	setComposeMode,
	setComposeMail,
	onRefresh
}: ReadingPaneComposeStateDeps) {
	function openCompose(mode: Exclude<ReadingPaneComposeMode, null>): void {
		setComposeMode(mode);
		setComposeMail(getMail());
		setShowCompose(true);
	}

	function openReply(): void {
		openCompose('reply');
	}

	function openReplyAll(): void {
		openCompose('reply');
	}

	function openForward(): void {
		openCompose('forward');
	}

	function closeCompose(): void {
		setShowCompose(false);
		setComposeMode(null);
		setComposeMail(null);
	}

	function onComposeSent(): void {
		closeCompose();
		onRefresh?.();
	}

	return {
		openReply,
		openReplyAll,
		openForward,
		closeCompose,
		onComposeSent
	};
}
