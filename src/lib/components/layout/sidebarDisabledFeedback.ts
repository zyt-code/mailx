type SidebarDisabledFeedbackDeps = {
	setVisible: (value: boolean) => void;
	durationMs?: number;
	setTimeoutFn?: typeof setTimeout;
	clearTimeoutFn?: typeof clearTimeout;
};

export function createSidebarDisabledFeedback({
	setVisible,
	durationMs = 2000,
	setTimeoutFn = setTimeout,
	clearTimeoutFn = clearTimeout
}: SidebarDisabledFeedbackDeps) {
	let timerId: ReturnType<typeof setTimeout> | null = null;

	function clearTimer(): void {
		if (timerId === null) {
			return;
		}

		clearTimeoutFn(timerId);
		timerId = null;
	}

	function show(): void {
		setVisible(true);
		clearTimer();
		timerId = setTimeoutFn(() => {
			timerId = null;
			setVisible(false);
		}, durationMs);
	}

	function cleanup(): void {
		clearTimer();
	}

	return {
		show,
		cleanup
	};
}
