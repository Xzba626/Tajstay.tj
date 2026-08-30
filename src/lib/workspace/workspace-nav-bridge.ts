/** Cross-tree bridge: Fixed Mobile App Header menu → workspace More drawer. */

export const WORKSPACE_DRAWER_OPEN = "tajstay:workspace-drawer-open";

export type WorkspaceDrawerTarget = "admin" | "owner";

export function openWorkspaceDrawer(target: WorkspaceDrawerTarget) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_DRAWER_OPEN, { detail: { target } }));
}

export function subscribeWorkspaceDrawerOpen(
  target: WorkspaceDrawerTarget,
  handler: () => void
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ target?: WorkspaceDrawerTarget }>).detail;
    if (detail?.target === target) handler();
  };
  window.addEventListener(WORKSPACE_DRAWER_OPEN, listener);
  return () => window.removeEventListener(WORKSPACE_DRAWER_OPEN, listener);
}
