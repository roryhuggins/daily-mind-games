/** @type {import('next').NextConfig} */
export default {
  // PGlite (local dev database) loads its own wasm files and must not be bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};
