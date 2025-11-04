export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4 text-center">
          MCP Chart-Image Server
        </h1>
        <p className="text-center mb-8">
          Model Context Protocol server for chart-img.com integration
        </p>

        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Server Status</h2>
          <ul className="space-y-2">
            <li>✅ Next.js Server: Running</li>
            <li>✅ Port: 3010</li>
            <li>⚙️ MCP Server: Run with <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">npm run mcp</code></li>
          </ul>

          <h2 className="text-xl font-semibold mt-6 mb-4">MCP Tools Available</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>fetch_chart_documentation</li>
            <li>get_exchanges</li>
            <li>get_symbols</li>
            <li>construct_chart_config</li>
            <li>validate_chart_config</li>
            <li>generate_chart_image</li>
          </ol>

          <h2 className="text-xl font-semibold mt-6 mb-4">Documentation</h2>
          <ul className="space-y-1">
            <li>📘 <a href="/docs/architecture" className="text-blue-600 dark:text-blue-400">Architecture</a></li>
            <li>📗 <a href="/docs/tools" className="text-blue-600 dark:text-blue-400">MCP Tools</a></li>
            <li>📙 <a href="/docs/examples" className="text-blue-600 dark:text-blue-400">Examples</a></li>
          </ul>
        </div>

        <p className="text-center mt-8 text-sm text-gray-600 dark:text-gray-400">
          This Next.js server is optional. The MCP server runs independently via stdio.
        </p>
      </div>
    </main>
  );
}
