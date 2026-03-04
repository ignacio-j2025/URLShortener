export const config = {
  port:    parseInt(process.env.PORT ?? '3001', 10),
  dbPath:  process.env.DB_PATH ?? './data/urlshortener.db',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3001',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
