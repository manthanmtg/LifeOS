import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

export type ExcalidrawElements = readonly ExcalidrawElement[];
export type ExcalidrawAppState = Readonly<Partial<AppState>>;
export type ExcalidrawFiles = BinaryFiles;
export type ExcalidrawApi = ExcalidrawImperativeAPI;

export function toExcalidrawElements(
  elements: Record<string, unknown>[],
): ExcalidrawElements {
  return elements as unknown as ExcalidrawElements;
}

export function toExcalidrawAppState(
  appState: Record<string, unknown>,
): ExcalidrawAppState {
  return appState as unknown as ExcalidrawAppState;
}

export function toExcalidrawFiles(
  files: Record<string, unknown>,
): ExcalidrawFiles {
  return files as unknown as ExcalidrawFiles;
}
