import type { Bill, BillFolder, FolderNode } from "./types";

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildFolderTree(
  folders: BillFolder[],
  bills: Bill[],
  parentId?: string,
): FolderNode[] {
  return folders
    .filter((f) => (f.payload.parent_id ?? undefined) === parentId)
    .map((f) => {
      const children = buildFolderTree(folders, bills, f._id);
      const directCount = bills.filter(
        (b) => b.payload.folder_id === f._id,
      ).length;
      const descendantCount = children.reduce((sum, n) => sum + n.billCount, 0);
      return { ...f, children, billCount: directCount + descendantCount };
    });
}

export function getBillsForFolder(
  bills: Bill[],
  folderId: string | null,
): Bill[] {
  if (folderId === null) return bills;
  return bills.filter((b) => b.payload.folder_id === folderId);
}

export function getSubfolders(
  folders: BillFolder[],
  parentId: string | null,
): BillFolder[] {
  if (parentId === null) {
    return folders.filter((f) => !f.payload.parent_id);
  }
  return folders.filter((f) => f.payload.parent_id === parentId);
}

export function getBreadcrumbPath(
  folders: BillFolder[],
  folderId: string | null,
): { id: string | null; name: string }[] {
  const path: { id: string | null; name: string }[] = [
    { id: null, name: "All Bills" },
  ];
  if (!folderId) return path;

  const chain: BillFolder[] = [];
  let current = folders.find((f) => f._id === folderId);
  while (current) {
    chain.unshift(current);
    current = current.payload.parent_id
      ? folders.find((f) => f._id === current!.payload.parent_id)
      : undefined;
  }
  for (const f of chain) {
    path.push({ id: f._id, name: f.payload.name });
  }
  return path;
}

export function getFolderPath(folders: BillFolder[], folderId: string): string {
  const parts: string[] = [];
  let current = folders.find((f) => f._id === folderId);
  while (current) {
    parts.unshift(current.payload.name);
    current = current.payload.parent_id
      ? folders.find((f) => f._id === current!.payload.parent_id)
      : undefined;
  }
  return parts.join(" / ");
}

export function getAllDescendantFolderIds(
  folders: BillFolder[],
  parentId: string,
): string[] {
  const ids: string[] = [];
  const children = folders.filter((f) => f.payload.parent_id === parentId);
  for (const child of children) {
    ids.push(child._id);
    ids.push(...getAllDescendantFolderIds(folders, child._id));
  }
  return ids;
}
