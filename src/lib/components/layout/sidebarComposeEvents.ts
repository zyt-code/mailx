type SidebarComposeEventsDeps = {
	eventBus: {
		on: (event: string, callback: () => void) => void;
		off: (event: string, callback: () => void) => void;
	};
	openCompose: () => void;
};

export function bindSidebarComposeEvents({
	eventBus,
	openCompose
}: SidebarComposeEventsDeps): () => void {
	const handleComposeOpen = () => {
		openCompose();
	};

	eventBus.on('compose:open', handleComposeOpen);

	return () => {
		eventBus.off('compose:open', handleComposeOpen);
	};
}
