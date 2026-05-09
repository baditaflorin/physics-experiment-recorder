# 0016 - Local Git Hooks

## Status

Accepted

## Context

The project intentionally uses no GitHub Actions. Checks must run locally.

## Decision

Use plain `.githooks/` wired by `make install-hooks`. Hooks run formatting,
linting, typechecking, tests, build, smoke, commit-message validation, and
gitleaks scanning when available.

## Consequences

Contributors need one local setup command. Hooks remain transparent shell
scripts and can be run manually through Make targets.

## Alternatives Considered

Lefthook was considered but plain hooks are adequate and avoid another tool.
