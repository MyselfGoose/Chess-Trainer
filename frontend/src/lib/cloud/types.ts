export interface RepertoireDirectoryEntry {
  id: string;
  name: string;
  author: string;
  description?: string;
  downloadUrl: string;
  tags: string[];
  color?: "white" | "black";
}

export interface RepertoireDirectory {
  version: 1;
  updatedAt: string;
  entries: RepertoireDirectoryEntry[];
}

export interface CloudProvider {
  listCommunityRepertoires(): Promise<RepertoireDirectoryEntry[]>;
  downloadRepertoire(id: string): Promise<string>;
}
