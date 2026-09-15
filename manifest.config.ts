import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Code Recall",
  version: "0.1.0",
  description: "A spaced repetition companion for NeetCode practice.",
  permissions: ["storage", "activeTab"],
  host_permissions: ["https://neetcode.io/*"],
  action: {
    default_popup: "index.html",
    default_title: "Code Recall",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://neetcode.io/problems/*"],
      js: ["src/content/neetcode.ts"],
      run_at: "document_idle",
    },
  ],
});
