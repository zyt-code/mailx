import type { Folder, Mail } from '$lib/types.js';

type MailboxContextDb = {
	moveToTrash: (id: string, currentFolder: Folder) => Promise<void>;
	moveToArchive: (id: string) => Promise<void>;
	updateMail: (mail: Mail) => Promise<void>;
};

type MailboxContextActionDeps = {
	db: MailboxContextDb;
	reload: () => Promise<unknown>;
	clearSelectedMail: (mailId: string) => void;
	logError?: (message: string, error: unknown) => void;
};

export function createMailboxContextActions({
	db,
	reload,
	clearSelectedMail,
	logError = (message, error) => console.error(message, error)
}: MailboxContextActionDeps) {
	async function deleteMail(mail: Mail): Promise<void> {
		try {
			await db.moveToTrash(mail.id, mail.folder);
			clearSelectedMail(mail.id);
			await reload();
		} catch (error) {
			logError('Failed to delete mail:', error);
		}
	}

	async function archiveMail(mail: Mail): Promise<void> {
		try {
			if (mail.folder === 'archive') {
				await db.updateMail({ ...mail, folder: 'inbox' });
			} else {
				await db.moveToArchive(mail.id);
			}
			clearSelectedMail(mail.id);
			await reload();
		} catch (error) {
			logError('Failed to archive mail:', error);
		}
	}

	async function moveToFolder(mail: Mail, folder: Folder): Promise<void> {
		try {
			await db.updateMail({ ...mail, folder });
			clearSelectedMail(mail.id);
			await reload();
		} catch (error) {
			logError('Failed to move mail:', error);
		}
	}

	return {
		deleteMail,
		archiveMail,
		moveToFolder
	};
}
