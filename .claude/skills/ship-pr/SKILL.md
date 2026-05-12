---
name: ship-pr
description: Take an azani-ui branch from local commits to merged on main — verify local gates, push, open or sync the PR, post a self-review against project conventions, address feedback, squash-merge, then sync local main and prune merged branches. Use when the user says ship/merge/self-review/rebase/finish #N, or types a bare PR number.
---

# Ship a PR

## PATH

```sh
export PATH="/opt/homebrew/bin:$HOME/.nvm/versions/node/v24.4.0/bin:$PATH"
```

## Merge gates — all three must hold before `gh pr merge`

1. **Local gates green** — `npm run typecheck`, `npm run lint`, `npm test`. The repo has no CI; local is the only gate.
2. **Zero unresolved threads** on the PR.
3. **Self-review comment posted** on the PR — visible on GitHub, not in chat.

## 0. Pre-flight

```sh
npm run typecheck && npm run lint && npm test
```

Any red → fix before pushing. Pre-existing failures in files this branch did not touch (`git log main..HEAD -- <path>` returns empty) are not blockers for this branch but should be called out in the self-review.

## 1. Push and open (or locate) the PR

```sh
HEAD_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push -u origin "$HEAD_BRANCH"
gh pr view --json number 2>/dev/null \
  || gh pr create --base main --head "$HEAD_BRANCH" \
       --title "<one-line, under 70 chars>" \
       --body "$(cat <<'EOF'
## Summary
<2–3 bullets of what changed and why>

## Test plan
- [ ] <verification steps>
EOF
)"
```

Capture `headRefName` from `gh pr view N --json headRefName` — every later push uses `git push origin HEAD:<headRefName>` because a worktree branch may diverge from the PR branch name.

## 2. Orient

```sh
gh pr view N --json title,headRefName,baseRefName,mergeable,reviews
```

## 3. Self-review

Audit the diff against the conventions below. Post findings (not narrative). Only include what applies.

- **Server vs client.** Components default to server. `'use client'` only when the file needs hooks, state, effects, or browser-only APIs. A server component importing a client component is fine; the other direction breaks.
- **Tailwind 4 tokens.** Use design tokens from `globals.css` (`primary`, `secondary`, `accent-*`, `muted`, `foreground`, `card`, etc.) over arbitrary hex. Brand colours (e.g. WhatsApp `#25D366`) may be hardcoded with a comment explaining why they live outside the token set. Don't add new theme tokens for one-off brand colours.
- **Icons.** Prefer `lucide-react`. Inline SVGs are reserved for trademark logos lucide does not ship (TikTok, WhatsApp). Each decorative SVG carries `aria-hidden="true"` and `focusable="false"`.
- **Accessibility.** Interactive elements with no visible text get `aria-label`. Focus styles (`focus-visible:ring-2 ...`) sit on the interactive element itself, not an inner wrapper. Animations are gated by `motion-safe:`. Touch targets ≥ 44×44 px.
- **Money + currency.** KES via `@/lib/formatters` (Intl-based). No hardcoded `"Ksh"`/`"KES"` interpolation in components.
- **Env vars.** All public config uses the `NEXT_PUBLIC_AZANI_*` prefix and is documented in `.env.example`. Use `||` (not `??`) for placeholder fallbacks so empty-string env vars don't silently produce broken state.
- **Medusa boundary.** Backend calls go through `@/lib/http.ts` and `@/lib/medusa-api.ts`. Don't fetch Medusa endpoints directly from components.
- **Tests.** Vitest + `@testing-library/react`. Prefer role/label queries (`getByRole`, `getByLabelText`) over `container.querySelector`. Use bare `render` for components with no providers; use `renderWithProviders` from `src/__tests__/test-utils.tsx` only when a `<ToastProvider>` or `<QueryClientProvider>` is needed. Read shared values (`siteConfig.*`) from source instead of hardcoding literals — keeps tests valid across env configurations.
- **Image domains.** New remote image hosts must be whitelisted in `next.config.ts` `remotePatterns`. The Azani MinIO host is already registered.
- **Out of scope.** List deferred items so reviewers don't flag them.

```sh
gh pr comment N --body "$(cat <<'EOF'
## Self-review
...findings against the diff...
EOF
)"
```

## 4. Iterate until gates met

### Rebase when `mergeable: CONFLICTING`

```sh
git fetch origin main
git rebase origin/main
# resolve, then:
git rebase --continue
git push --force-with-lease origin HEAD:<headRefName>
```

`--force-with-lease`, never `--force` — rejects if upstream moved.

### Address review feedback

```sh
gh api --paginate repos/vonmutinda/azani-ui/pulls/N/comments \
  --jq '.[] | {path, line, body: .body[0:400]}'
```

Per finding: **fix** or **defend**.

- **Fix** — real bug, accessibility regression, type drift, broken claimed behaviour.
- **Defend** — YAGNI suggestion (premature abstraction, single-use helper), or explicitly deferred. Post reasoning AND resolve the thread.

### Push fixes

Separate commits, conventional form: `fix(<scope>): address review on #N`. Pre-commit runs `lint-staged` + `tsc --noEmit`; fix the underlying issue and re-commit rather than `--no-verify`.

```sh
git push origin HEAD:<headRefName>
```

### Resolve every thread

```sh
gh api graphql -f query='query { repository(owner: "vonmutinda", name: "azani-ui") { pullRequest(number: N) { reviewThreads(first: 100) { nodes { id isResolved } } } } }' \
  --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .id' \
  | xargs -I{} gh api graphql \
      -f query='mutation { resolveReviewThread(input: { threadId: "{}" }) { thread { isResolved } } }'
```

### Re-run local gates

```sh
npm run typecheck && npm run lint && npm test
```

Loop back to **Self-review / Address feedback** if any change.

## 5. Merge

```sh
# Confirm zero unresolved
gh api graphql -f query='query { repository(owner: "vonmutinda", name: "azani-ui") { pullRequest(number: N) { reviewThreads(first: 100) { nodes { isResolved } } } } }' \
  --jq '.data.repository.pullRequest.reviewThreads.nodes | {total: length, unresolved: map(select(.isResolved == false)) | length}'

gh pr merge N --squash --delete-branch
gh pr view N --json state,mergedAt
```

Squash so each PR becomes one commit on `main`. `--delete-branch` removes the remote branch.

## 6. Sync main + prune

```sh
git checkout main
git pull --ff-only origin main
git fetch --prune origin                                                       # drop dead remote-tracking refs
git branch --merged main | grep -vE '^\*|^  main$' | xargs -r git branch -d   # delete merged locals
git worktree prune                                                             # if worktrees were used
```

## Red Flags — stop and ask

| Signal                                                                                                        | Why stop                                                    |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Touching `src/lib/http.ts`, `src/lib/medusa-api.ts`, `next.config.ts`, or auth flow under `src/app/account/`. | Storefront-wide contracts.                                  |
| Local gates fail in files this branch did NOT modify (`git log main..HEAD -- <path>` returns empty).          | Pre-existing — call out in self-review, don't fix silently. |
| Review feedback requires editing code outside the PR diff.                                                    | Scope-creep needs sign-off.                                 |
| Image, video, or asset host added without updating `next.config.ts` `remotePatterns`.                         | Next/Image will 500 in prod.                                |

## References

- `README.md` — stack overview.
- `.env.example` — required + optional public config.
- `~/.claude/projects/-Users-vonmutinda-code-azani-ui/memory/MEMORY.md` (if present) — user guardrails override on conflict.
