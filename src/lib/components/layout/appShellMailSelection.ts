import type { Mail } from '$lib/types.js';

type AppShellMailSelectionDeps = {
	getVisibleMails: () => Mail[];
	getSelectedMailId: () => string | null;
	selectMail: (mailId: string) => Promise<void>;
};

export function createAppShellMailSelection({
	getVisibleMails,
	getSelectedMailId,
	selectMail
}: AppShellMailSelectionDeps) {
	async function stepSelection(delta: number): Promise<void> {
		const visibleMails = getVisibleMails();
		if (visibleMails.length === 0) {
			return;
		}

		const currentIndex = visibleMails.findIndex((mail) => mail.id === getSelectedMailId());
		const nextIndex =
			currentIndex === -1
				? delta > 0
					? 0
					: visibleMails.length - 1
				: Math.max(0, Math.min(visibleMails.length - 1, currentIndex + delta));

		await selectMail(visibleMails[nextIndex].id);
	}

	return {
		stepSelection
	};
}
