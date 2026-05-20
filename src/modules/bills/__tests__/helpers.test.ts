import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDate,
  getAllDescendantFolderIds,
  getBillsForFolder,
  getBreadcrumbPath,
  getSubfolders,
} from "../helpers";
import type { Bill, BillFolder } from "../types";

const bill = (id: string, folderId?: string): Bill => ({
  _id: id,
  module_type: "bill",
  is_public: false,
  payload: {
    name: `Bill ${id}`,
    bill_date: "2026-05-01T00:00:00.000Z",
    currency: "USD",
    folder_id: folderId,
    attachments: [],
  },
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
});

const folder = (
  id: string,
  name: string,
  parentId?: string,
): BillFolder => ({
  _id: id,
  module_type: "bill_folder",
  is_public: false,
  payload: {
    name,
    parent_id: parentId,
  },
  created_at: "2026-05-01T00:00:00.000Z",
  updated_at: "2026-05-01T00:00:00.000Z",
});

describe("bill helpers", () => {
  it("formats ISO dates with a readable year", () => {
    expect(formatDate("2026-05-20T12:00:00.000Z")).toContain("2026");
  });

  it("formats bytes below one kilobyte", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats bytes as kilobytes and megabytes", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("returns every bill for the all-bills folder", () => {
    const bills = [bill("one"), bill("two", "folder-a")];

    expect(getBillsForFolder(bills, null)).toEqual(bills);
  });

  it("returns bills assigned to the requested folder", () => {
    const bills = [bill("one", "folder-a"), bill("two", "folder-b")];

    expect(getBillsForFolder(bills, "folder-a")).toEqual([bills[0]]);
  });

  it("finds root folders and nested subfolders", () => {
    const folders = [
      folder("root", "Root"),
      folder("child", "Child", "root"),
      folder("orphan", "Orphan"),
    ];

    expect(getSubfolders(folders, null)).toEqual([folders[0], folders[2]]);
    expect(getSubfolders(folders, "root")).toEqual([folders[1]]);
  });

  it("builds breadcrumb paths from root to the current folder", () => {
    const folders = [
      folder("root", "Root"),
      folder("child", "Child", "root"),
      folder("grandchild", "Grandchild", "child"),
    ];

    expect(getBreadcrumbPath(folders, "grandchild")).toEqual([
      { id: null, name: "All Bills" },
      { id: "root", name: "Root" },
      { id: "child", name: "Child" },
      { id: "grandchild", name: "Grandchild" },
    ]);
  });

  it("returns all descendant folder ids recursively", () => {
    const folders = [
      folder("root", "Root"),
      folder("child-a", "Child A", "root"),
      folder("child-b", "Child B", "root"),
      folder("grandchild", "Grandchild", "child-a"),
    ];

    expect(getAllDescendantFolderIds(folders, "root")).toEqual([
      "child-a",
      "grandchild",
      "child-b",
    ]);
  });
});
