import type { Mail } from '$lib/types.js';

type AppShellReadStateDeps = {
	markMailReadLocally: (mailId: string) => unknown;
	markMailUnreadLocally: (mailId: string) => unknown;
	logError?: (message: string, error: unknown) => void;
};

export function createAppShellReadState({
	markMailReadLocally,
	markMailUnreadLocally,
	logError = (message, error) => console.error(message, error)
}: AppShellReadStateDeps) {
	async function setReadState(mail: Mail, read: boolean): Promise<void> {
		try {
			if (read) {
				markMailReadLocally(mail.id);
			} else {
				markMailUnreadLocally(mail.id);
			}
		} catch (error) {
			logError('Failed to mark mail:', error);
		}
	}

	return {
		setReadState
	};
}
