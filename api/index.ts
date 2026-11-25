import * as serverNamespace from "../dist/server.cjs";

const ns = serverNamespace as Record<string, any>;
const app = ns.app ?? ns.default?.app ?? ns.default;

export default app;
