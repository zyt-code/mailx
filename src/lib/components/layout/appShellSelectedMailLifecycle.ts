import type { Mail } from '$lib/types.js';

type MobileView = 'list' | 'reading';

type AppShellSelectedMailLifecycleDeps = {
	getVisibleMails: () => Mail[];
	getSelectedMailId: () => string | null;
	getMobileView: () => MobileView;
	clearSelectedMail: () => void;
	setMobileView: (view: MobileView) => void;
};

export function createAppShellSelectedMailLifecycle({
	getVisibleMails,
	getSelectedMailId,
	getMobileView,
	clearSelectedMail,
	setMobileView
}: AppShellSelectedMailLifecycleDeps) {
	function reconcile(): void {
		const selectedMailId = getSelectedMailId();
		if (!selectedMailId) {
			return;
		}

		const selectedStillExists = getVisibleMails().some((mail) => mail.id === selectedMailId);
		if (selectedStillExists) {
			return;
		}

		clearSelectedMail();

		if (getMobileView() === 'reading') {
			setMobileView('list');
		}
	}

	return {
		reconcile
	};
}
