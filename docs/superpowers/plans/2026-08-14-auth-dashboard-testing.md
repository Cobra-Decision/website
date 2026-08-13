# Auth Dashboard and Testing Implementation Plan

**Goal:** Implement the approved auth UI, flow, dashboard, seed, and testing contracts.

1. Add failing database and unit tests for nullable profile fields, repeatable seeds, optional admin, validation, and permissions.
2. Extract database initialization and auth helpers; update the schema minimally.
3. Add failing integration tests for shared assets, ALTCHA, redirects, dashboard, and logout.
4. Add the shared layout, auth route factory, session middleware, dashboard, and logout.
5. Run the full suite and type check, document project conventions, and create focused commits.
