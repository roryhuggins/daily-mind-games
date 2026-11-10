/** @type {import('next').NextConfig} */
export default {
  // PGlite (local dev database) loads its own wasm files and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // db/schema.sql is read at runtime to create tables, so ship it with the functions.
  outputFileTracingIncludes: { "/**": ["./db/schema.sql"] },
};
