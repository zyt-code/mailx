import { ContextMenu as ContextMenuPrimitive } from "bits-ui";
import Content from "./context-menu-content.svelte";
import Item from "./context-menu-item.svelte";
import Separator from "./context-menu-separator.svelte";
import SubTrigger from "./context-menu-sub-trigger.svelte";
import SubContent from "./context-menu-sub-content.svelte";

const Root = ContextMenuPrimitive.Root;
const Trigger = ContextMenuPrimitive.Trigger;
const Sub = ContextMenuPrimitive.Sub;
const Group = ContextMenuPrimitive.Group;

export {
	Root,
	Trigger,
	Content,
	Item,
	Separator,
	Sub,
	SubTrigger,
	SubContent,
	Group,
	//
	Root as ContextMenu,
	Trigger as ContextMenuTrigger,
	Content as ContextMenuContent,
	Item as ContextMenuItem,
	Separator as ContextMenuSeparator,
	Sub as ContextMenuSub,
	SubTrigger as ContextMenuSubTrigger,
	SubContent as ContextMenuSubContent,
	Group as ContextMenuGroup,
};
