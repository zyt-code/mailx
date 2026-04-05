import type { Mail } from '$lib/types.js';

type MailUpdater = (mailId: string, updater: (mail: Mail) => Mail) => Mail | null;

type MailboxActionsDeps = {
	db: {
		markMailRead: (mailId: string, read: boolean) => Promise<void>;
	};
	updateMail: MailUpdater;
	emit: (event: string, payload?: unknown) => void;
};

function ensureReadState(mail: Mail, read: boolean): Mail {
	return {
		...mail,
		is_read: read,
		unread: !read
	};
}

function emitMailUpdated(
	emit: MailboxActionsDeps['emit'],
	mail: Mail,
	read: boolean
): void {
	emit('mail:updated', {
		mailId: mail.id,
		accountId: mail.account_id ?? null,
		folder: mail.folder,
		read
	});
}

export function createMailboxActions({ db, updateMail, emit }: MailboxActionsDeps) {
	function applyReadChange(mailId: string, read: boolean): Mail | null {
		const updated = updateMail(mailId, (mail) => ensureReadState(mail, read));
		if (!updated) {
			return null;
		}

		emitMailUpdated(emit, updated, read);

		db.markMailRead(mailId, read).catch((error) => {
			console.error('[MailboxActions] Failed to persist read status to DB:', error);
			updateMail(mailId, () => ensureReadState(updated, !read));
		}).finally(() => {
			emit('mail:counts:refresh');
		});

		return updated;
	}

	return {
		markMailReadLocally(mailId: string): Mail | null {
			return applyReadChange(mailId, true);
		},
		markMailUnreadLocally(mailId: string): Mail | null {
			return applyReadChange(mailId, false);
		}
	};
}
