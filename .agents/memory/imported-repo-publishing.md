---
name: Safe imported-repo publishing
description: Guidance for publishing code imported from repositories with tracked local configuration or generated files.
---

When publishing an imported repository to a new remote, create a sanitized snapshot if tracked environment files may contain credentials or deployment-specific values. Exclude environment files, dependency trees, and generated caches, and preserve the original history separately rather than pushing it blindly.

**Why:** Imported projects sometimes commit `.env` files and `node_modules`, and pushing their full history can expose values that are not appropriate for a new public repository.

**How to apply:** Before a GitHub push, inspect tracked file names and value types without printing secrets, add appropriate ignore rules, and verify the staged snapshot contains no environment files or generated dependency output.