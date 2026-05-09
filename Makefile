.PHONY: help install-hooks dev build data test test-integration smoke lint fmt pages-preview clean hooks-pre-commit hooks-commit-msg hooks-pre-push release

help:
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "%-22s %s\n", $$1, $$2}'

install-hooks: ## Wire local git hooks
	git config core.hooksPath .githooks

dev: ## Run the frontend dev server
	npm run dev

build: ## Build the GitHub Pages site into docs/
	npm run build

data: ## Mode A has no shared data pipeline
	@echo "Mode A: no data-generation pipeline."

test: ## Run unit tests
	npm test

test-integration: ## No separate integration suite in Mode A yet
	@echo "No integration tests for Mode A."

smoke: ## Build and run the Playwright smoke test
	npm run smoke

lint: ## Run linters and format checks
	npm run fmt:check
	npm run lint
	npm run typecheck
	npm audit --audit-level=high

fmt: ## Autoformat source and docs
	npm run fmt

pages-preview: ## Serve docs/ exactly as GitHub Pages would
	node scripts/static-server.mjs docs 4175

hooks-pre-commit: ## Run pre-commit checks manually
	.githooks/pre-commit

hooks-commit-msg: ## Validate a commit message file manually
	@test -n "$(MSG)" || (echo "Use MSG=.git/COMMIT_EDITMSG" && exit 1)
	.githooks/commit-msg "$(MSG)"

hooks-pre-push: ## Run pre-push checks manually
	.githooks/pre-push

release: ## Tag the current commit; use VERSION=vX.Y.Z
	@test -n "$(VERSION)" || (echo "Use VERSION=vX.Y.Z" && exit 1)
	git tag "$(VERSION)"
	git push origin "$(VERSION)"

clean: ## Remove generated local artifacts
	rm -rf coverage test-results playwright-report node_modules/.tmp
