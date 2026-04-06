import type { Mail } from '$lib/types.js';
import { resolveReplacementSelectedMailId } from './appShellSelectedMail.js';

type MobileView = 'list' | 'reading';

type AppShellSelectedMailLifecycleDeps = {
	getVisibleMails: () => Mail[];
	getSelectedMailId: () => string | null;
	getMobileView: () => MobileView;
	clearSelectedMail: () => void;
	setSelectedMailId: (mailId: string | null) => void;
	setMobileView: (view: MobileView) => void;
};

export function createAppShellSelectedMailLifecycle({
	getVisibleMails,
	getSelectedMailId,
	getMobileView,
	clearSelectedMail,
	setSelectedMailId,
	setMobileView
}: AppShellSelectedMailLifecycleDeps) {
	let previousVisibleMails: Mail[] = [];

	function reconcile(): void {
		const visibleMails = getVisibleMails();
		const selectedMailId = getSelectedMailId();
		if (!selectedMailId) {
			previousVisibleMails = visibleMails;
			return;
		}

		const selectedStillExists = visibleMails.some((mail) => mail.id === selectedMailId);
		if (selectedStillExists) {
			previousVisibleMails = visibleMails;
			return;
		}

		if (getMobileView() !== 'reading') {
			const replacementMailId = resolveReplacementSelectedMailId(
				previousVisibleMails,
				visibleMails,
				selectedMailId
			);
			if (replacementMailId) {
				setSelectedMailId(replacementMailId);
				previousVisibleMails = visibleMails;
				return;
			}
		}

		clearSelectedMail();

		if (getMobileView() === 'reading') {
			setMobileView('list');
		}

		previousVisibleMails = visibleMails;
	}

	return {
		reconcile
	};
}
