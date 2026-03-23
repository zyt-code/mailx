const UNKNOWN_ERROR_FALLBACK = 'Unknown error';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function firstNonEmptyString(values: unknown[]): string | null {
	for (const value of values) {
		if (typeof value === 'string') {
			const trimmed = value.trim();
			if (trimmed.length > 0) {
				return trimmed;
			}
		}
	}
	return null;
}

export function extractErrorMessage(error: unknown, fallback = UNKNOWN_ERROR_FALLBACK): string {
	if (error instanceof Error) {
		const message = error.message.trim();
		return message.length > 0 ? message : fallback;
	}

	if (typeof error === 'string') {
		const message = error.trim();
		return message.length > 0 ? message : fallback;
	}

	if (isPlainObject(error)) {
		const directMessage = firstNonEmptyString([
			error.message,
			error.error,
			error.reason,
			error.details,
			error.description
		]);
		if (directMessage) {
			return directMessage;
		}

		if (isPlainObject(error.cause)) {
			const causeMessage = extractErrorMessage(error.cause, '');
			if (causeMessage) {
				return causeMessage;
			}
		} else if (typeof error.cause === 'string' && error.cause.trim()) {
			return error.cause.trim();
		}

		try {
			const serialized = JSON.stringify(error);
			if (serialized && serialized !== '{}') {
				return serialized;
			}
		} catch {
			// ignore serialization errors
		}
	}

	return fallback;
}
