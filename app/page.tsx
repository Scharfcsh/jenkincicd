export default function Home() {
  const appInfo = {
    name: "CI/CD Application",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    buildDate: "2026-02-10",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-900">
      <main className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg dark:bg-zinc-800">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">
          {appInfo.name}
        </h1>

        <div className="space-y-4">
          <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-700">
            <span className="text-zinc-600 dark:text-zinc-400">Version</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-white">
              {appInfo.version}
            </span>
          </div>

          <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-700">
            <span className="text-zinc-600 dark:text-zinc-400">Environment</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-white">
              {appInfo.environment}
            </span>
          </div>

          <div className="flex justify-between border-b border-zinc-200 pb-2 dark:border-zinc-700">
            <span className="text-zinc-600 dark:text-zinc-400">Build Date</span>
            <span className="font-mono font-semibold text-zinc-900 dark:text-white">
              {appInfo.buildDate}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Status</span>
            <span className="flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Running
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
