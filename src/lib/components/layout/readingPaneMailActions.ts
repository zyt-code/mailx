import type { Mail, Folder } from '$lib/types.js';

type ReadingPaneMailDb = {
	moveToArchive: (mailId: string) => Promise<void>;
	moveToTrash: (mailId: string, currentFolder: Folder) => Promise<void>;
	toggleStar: (mailId: string, starred: boolean) => Promise<void>;
	updateMail: (mail: Mail) => Promise<void>;
};

type ReadingPaneMailActionsDeps = {
	db: ReadingPaneMailDb;
	onRefresh?: () => void;
	onMailRemoved?: (mail: Mail) => void;
	logError?: (message: string, error: unknown) => void;
};

export function createReadingPaneMailActions({
	db,
	onRefresh,
	onMailRemoved,
	logError = (message, error) => console.error(message, error)
}: ReadingPaneMailActionsDeps) {
	async function archiveMail(mail: Mail): Promise<void> {
		try {
			if (mail.folder === 'archive') {
				await db.updateMail({
					...mail,
					folder: 'inbox'
				});
			} else {
				await db.moveToArchive(mail.id);
			}
			onMailRemoved?.(mail);
			onRefresh?.();
		} catch (error) {
			logError('Failed to archive mail:', error);
		}
	}

	async function deleteMail(mail: Mail): Promise<void> {
		try {
			await db.moveToTrash(mail.id, mail.folder);
			onMailRemoved?.(mail);
			onRefresh?.();
		} catch (error) {
			logError('Failed to delete mail:', error);
		}
	}

	async function toggleStar(mail: Mail): Promise<void> {
		try {
			await db.toggleStar(mail.id, !mail.starred);
			onRefresh?.();
		} catch (error) {
			logError('Failed to toggle star:', error);
		}
	}

	return {
		archiveMail,
		deleteMail,
		toggleStar
	};
}
