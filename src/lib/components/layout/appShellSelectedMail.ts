import type { Mail } from '$lib/types.js';

export function resolveSelectedMail(mails: Mail[], selectedMailId: string | null): Mail | null {
	if (!selectedMailId) {
		return null;
	}

	return mails.find((mail) => mail.id === selectedMailId) ?? null;
}
