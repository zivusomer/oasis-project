/**
 * Logic that runs once when the server boots (before it starts listening).
 * Use for: DB connection, migrations, loading config, warming caches, etc.
 */
export async function runStartup(): Promise<void> {
  // Example: await connectToDatabase();
  // Example: await runMigrations();
  console.log('Startup complete.');
}
