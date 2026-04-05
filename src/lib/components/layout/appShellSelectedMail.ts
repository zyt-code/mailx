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
