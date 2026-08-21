import { expect, test } from "@playwright/test";

test("@pyodide fixed Pyodide computes the reference vector, renders PNG, and restarts", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const pyodideRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("pyodide")) pyodideRequests.push(request.url());
  });
  await page.goto("./");
  expect(page.url()).toContain("/astronomy-begins-with-curiosity/");
  expect(pyodideRequests).toEqual([]);

  const run = () =>
    page.evaluate(async () => {
      const workerSource = `self.onmessage=async()=>{const {loadPyodide}=await import("https://cdn.jsdelivr.net/pyodide/v314.0.5/full/pyodide.mjs");const py=await loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v314.0.5/full/"});await py.loadPackage(["numpy","matplotlib"]);const value=await py.runPythonAsync(\`import io, json, numpy as np, matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt; rho=np.asarray([1.,2.,4.,8.],dtype=np.float64); q=rho/np.mean(rho); delta=q-1.; fig=plt.figure(); plt.plot(q); out=io.BytesIO(); fig.savefig(out,format="png"); plt.close(fig); json.dumps({"version": "314.0.5", "mean":float(np.mean(rho)), "sigma":float(np.sqrt(np.mean(delta**2))), "dense":int(np.count_nonzero(q>=2.0)), "png":len(out.getvalue())})\`);self.postMessage(value)}`;
      const url = URL.createObjectURL(
        new Blob([workerSource], { type: "text/javascript" }),
      );
      const worker = new Worker(url, { type: "module" });
      const result = await new Promise<string>((resolve, reject) => {
        worker.onmessage = (event) => resolve(event.data);
        worker.onerror = (event) => reject(new Error(event.message));
        worker.postMessage(null);
      });
      worker.terminate();
      URL.revokeObjectURL(url);
      return JSON.parse(result) as {
        version: string;
        mean: number;
        sigma: number;
        dense: number;
        png: number;
      };
    });
  const first = await run();
  expect(first.version).toBe("314.0.5");
  expect(first.mean).toBe(3.75);
  expect(first.sigma).toBeCloseTo(
    Math.sqrt(
      [1, 2, 4, 8].map((x) => x / 3.75 - 1).reduce((sum, x) => sum + x * x, 0) /
        4,
    ),
    12,
  );
  expect(first.dense).toBe(1);
  expect(first.png).toBeGreaterThan(100);
  const restarted = await run();
  expect(restarted).toEqual(first);
});
