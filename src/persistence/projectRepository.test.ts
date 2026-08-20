import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../domain/project";
import { projectRepository } from "./projectRepository";

interface MockRequest<T> {
  result: T;
  error: DOMException | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onupgradeneeded?: (() => void) | null;
}

function request<T>(result: T): MockRequest<T> {
  return { result, error: null, onsuccess: null, onerror: null };
}

function indexedDbHarness() {
  const writeRequest = request<IDBValidKey>("project-id");
  const transaction = {
    error: null,
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onabort: null as (() => void) | null,
    objectStore: () => ({ put: () => writeRequest }),
  };
  const database = {
    close: vi.fn(),
    transaction: () => transaction,
    objectStoreNames: { contains: () => true },
  };
  const openRequest = request(database) as MockRequest<typeof database>;
  openRequest.onupgradeneeded = null;
  vi.stubGlobal("indexedDB", { open: () => openRequest });
  return { database, openRequest, transaction, writeRequest };
}

afterEach(() => vi.unstubAllGlobals());

describe("projectRepository transaction", () => {
  it("書き込みrequest成功後もtransactionのcommit完了までresolveしない", async () => {
    const harness = indexedDbHarness();
    const save = projectRepository.save(createEmptyProject());
    harness.openRequest.onsuccess?.();
    await Promise.resolve();

    let resolved = false;
    void save.then(() => {
      resolved = true;
    });
    harness.writeRequest.onsuccess?.();
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(harness.database.close).not.toHaveBeenCalled();

    harness.transaction.oncomplete?.();
    await expect(save).resolves.toBeUndefined();
    expect(harness.database.close).toHaveBeenCalledOnce();
  });

  it("transaction abortでrejectし接続を一度だけcloseする", async () => {
    const harness = indexedDbHarness();
    const save = projectRepository.save(createEmptyProject());
    harness.openRequest.onsuccess?.();
    await Promise.resolve();
    harness.transaction.onabort?.();
    harness.transaction.onerror?.();

    await expect(save).rejects.toThrow("保存処理に失敗しました。");
    expect(harness.database.close).toHaveBeenCalledOnce();
  });
});
