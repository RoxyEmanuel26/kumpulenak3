<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LustHub Architecture Constraints

You are working on LustHub. Before making any changes, you MUST read the `.cursorrules` file and `README.md` (which serves as the Architectural Source of Truth).

**Strict Rules:**
1. **NO TELEGRAM**: Do not add Telegram bots, webhooks, or messaging integrations.
2. **NO USER STATE**: Do not add auth, login, or user tracking beyond basic local storage for "continue watching".
3. **NATIVE FETCH**: Use native `fetch` over external libraries like `axios`.
4. **NO ARCHITECTURAL CHURN**: Do not rewrite stable modules or introduce new patterns just for stylistic reasons.
5. **EVIDENCE-BASED OPTIMIZATION**: Do not refactor for speculative performance gains. Require measurable CWV data. Do not add heavy telemetry SDKs.
