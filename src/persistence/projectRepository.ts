import { type ProjectState, projectStateSchema } from "../domain/project";

const DATABASE_NAME = "abcs-projects";
const STORE_NAME = "projects";
const DATABASE_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME))
        database.createObjectStore(STORE_NAME, { keyPath: "projectId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        request.error ??
          new Error("研究プロジェクトの保存領域を開けませんでした。"),
      );
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));
    let requestResult: T;
    let requestSucceeded = false;
    let settled = false;

    const close = () => {
      settled = true;
      database.close();
    };
    const fail = (error: DOMException | null) => {
      if (settled) return;
      close();
      reject(error ?? new Error("保存処理に失敗しました。"));
    };

    request.onsuccess = () => {
      requestResult = request.result;
      requestSucceeded = true;
    };
    request.onerror = () => fail(request.error);
    transaction.oncomplete = () => {
      if (settled) return;
      if (!requestSucceeded) {
        fail(new DOMException("保存要求が完了しませんでした。"));
        return;
      }
      close();
      resolve(requestResult);
    };
    transaction.onerror = () => fail(transaction.error);
    transaction.onabort = () => fail(transaction.error);
  });
}

export const projectRepository = {
  async list(): Promise<ProjectState[]> {
    const values = await transact("readonly", (store) => store.getAll());
    return values
      .map((value) => projectStateSchema.parse(value))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async get(projectId: string): Promise<ProjectState | undefined> {
    const value = await transact("readonly", (store) => store.get(projectId));
    return value === undefined ? undefined : projectStateSchema.parse(value);
  },
  async save(project: ProjectState): Promise<void> {
    const validProject = projectStateSchema.parse(project);
    await transact("readwrite", (store) => store.put(validProject));
  },
  async remove(projectId: string): Promise<void> {
    await transact("readwrite", (store) => store.delete(projectId));
  },
};
