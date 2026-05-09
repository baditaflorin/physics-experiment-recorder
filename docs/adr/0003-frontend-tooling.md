# 0003 - Frontend Framework And Build Tooling

## Status

Accepted

## Context

The app needs typed stateful UI, local worker orchestration, a static build, and
small enough chunks for GitHub Pages.

## Decision

Use React, TypeScript strict mode, Vite, Tailwind CSS, TanStack Query, zod,
Comlink, idb, lucide-react, Vitest, and Playwright.

## Consequences

The stack is familiar, production-ready, and static-hosting friendly. WASM-heavy
libraries are lazy-loaded behind user action to keep the initial payload under
the asset budget.

## Alternatives Considered

Plain TypeScript was rejected because the workflow has enough state to benefit
from React. A framework with server rendering was rejected because Pages-only
deployment is the goal.
