export function dbConnectionOptions() {
  const useSsl = process.env.DATABASE_SSL === 'true';
  return {
    connectionString: process.env.DATABASE_URL,
    ...(useSsl && { ssl: { rejectUnauthorized: false } }),
  };
}
