import { derived, writable } from 'svelte/store';

const openModalCount = writable(0);

if (typeof document !== 'undefined') {
	openModalCount.subscribe((count) => {
		document.body.classList.toggle('compose-modal-open', count > 0);
	});
}

export const hasOpenModal = derived(openModalCount, (count) => count > 0);

export function acquireModalLayer(): () => void {
	let released = false;
	openModalCount.update((count) => count + 1);

	return () => {
		if (released) return;
		released = true;
		openModalCount.update((count) => Math.max(0, count - 1));
	};
}
