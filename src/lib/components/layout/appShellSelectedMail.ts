import type { Mail } from '$lib/types.js';

export function resolveSelectedMail(mails: Mail[], selectedMailId: string | null): Mail | null {
	if (!selectedMailId) {
		return null;
	}

	return mails.find((mail) => mail.id === selectedMailId) ?? null;
}

export function resolveNextSelectedMailId(mails: Mail[], removedMailId: string): string | null {
	const removedIndex = mails.findIndex((mail) => mail.id === removedMailId);
	if (removedIndex === -1) {
		return null;
	}

	return mails[removedIndex + 1]?.id ?? mails[removedIndex - 1]?.id ?? null;
}

export function resolveReplacementSelectedMailId(
	previousMails: Mail[],
	currentMails: Mail[],
	removedMailId: string
): string | null {
	const removedIndex = previousMails.findIndex((mail) => mail.id === removedMailId);
	if (removedIndex === -1) {
		return null;
	}

	const currentMailIds = new Set(currentMails.map((mail) => mail.id));

	for (let offset = 1; offset < previousMails.length; offset += 1) {
		const nextId = previousMails[removedIndex + offset]?.id;
		if (nextId && currentMailIds.has(nextId)) {
			return nextId;
		}

		const previousId = previousMails[removedIndex - offset]?.id;
		if (previousId && currentMailIds.has(previousId)) {
			return previousId;
		}
	}

	return null;
}
