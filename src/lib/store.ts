import { get, set, keys, del } from 'idb-keyval';

export interface RepertoireItem {
  id: string;
  name: string;
  audioFile?: File;
  sheetFile?: File;
  notes?: string;
  practiceDays?: number[];
  musicalKeys?: string[];
  updatedAt: number;
}

export const Store = {
  async saveItem(item: RepertoireItem) {
    await set(item.id, item);
  },
  async getItem(id: string): Promise<RepertoireItem | undefined> {
    return await get(id);
  },
  async getAllItems(): Promise<RepertoireItem[]> {
    const allKeys = await keys();
    const items: RepertoireItem[] = [];
    for (const key of allKeys) {
      if (typeof key === 'string' && !key.startsWith('_')) {
        const item = await get<RepertoireItem>(key);
        if (item) items.push(item);
      }
    }
    return items.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async deleteItem(id: string) {
    await del(id);
  }
};
