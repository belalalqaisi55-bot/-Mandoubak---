declare module "../dist/server.cjs" {
  import type { Express } from "express";
  export const app: Express;
  export default app;
}
