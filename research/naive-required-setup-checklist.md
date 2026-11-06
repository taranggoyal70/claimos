# Naive Hackathon — Required Setup Checklist

Validated on November 4, 2026 against the attached `naive-required-setup.pdf` and current Naive documentation.

## Current status on this Mac

- [x] Node.js installed: `v24.10.0`
- [x] npm installed: `11.6.0`
- [x] `jq` installed: `/usr/bin/jq`
- [x] Naive/Vetta CLI installed: `vetta 0.11.0` (API `2026-09-30`)
- [ ] Naive account authenticated and verified
- [ ] Active plan or hackathon-provided billing entitlement confirmed
- [ ] Test agent created and run
- [ ] Reproducible agent definitions checked into `./agents/`
- [ ] Coordinator and worker agents assembled into a Naive team
- [ ] Email identity tested, if email will be part of the demo
- [ ] Phone/voice capability tested, if voice will be part of the demo

## P0 — Complete before building

### 1. Install the official CLI

```bash
npm i -g @usenaive-sdk/vetta-cli
vetta --version
vetta --help
```

The package also installs `naive` as an alias, but use `vetta` consistently for the managed-agent workflow.

### 2. Create or authenticate the account

Do not paste a real password into a shared screen recording, repository, issue, or chat.

```bash
vetta auth --help
vetta login --email YOUR_EMAIL --password 'YOUR_PASSWORD'
vetta whoami
```

If the account does not exist, inspect the installed CLI before registering because the attached PDF and the public docs expose more than one registration spelling:

```bash
vetta auth --help
vetta auth register --help
```

- [ ] Click the email-verification link.
- [ ] Confirm `vetta whoami` returns the intended organization.

### 3. Confirm billing before spending

```bash
vetta plan show
vetta credits show
```

The current quickstart says a plan is required before non-billing commands work. Before subscribing, confirm whether the hackathon has already provisioned an organization, plan, or credits for attendees. If it has not:

```bash
vetta plan subscribe
vetta plan show
```

- [ ] Plan status is active.
- [ ] Credit balance is visible.
- [ ] A strict development budget is chosen to prevent accidental spend.

## P0 — Prove the runtime works

### 4. Create one minimal test agent

```bash
vetta models list --human
vetta agent create --help
```

Create the agent with a model, system prompt, completion window, and all required budget fields. Then run it:

```bash
vetta run --agent AGENT_ID --message "Reply with exactly: setup works"
vetta agent spend AGENT_ID
```

- [ ] Run ends with `end_turn`.
- [ ] Output is correct.
- [ ] Spend appears and remains within the cap.
- [ ] Session events/tool calls are visible for the future demo UI.

### 5. Make every agent reproducible

Store each definition as `agents/<name>.agent.yaml`, then apply the directory:

```bash
vetta agent apply -f ./agents/
```

- [ ] A clean apply creates or updates all agents.
- [ ] Agent definitions contain no API keys or passwords.
- [ ] Model IDs, tools, skills, budgets, and windows are explicit.
- [ ] Agent versions used for the demo are recorded.

### 6. Build and verify an actual Naive team

The attached PDF says an agent team is required but does not include this step. A Naive team consists of a coordinator with a version-pinned worker roster.

```bash
vetta team set COORDINATOR_ID \
  --member WORKER_NAME@VERSION \
  --board
vetta team show COORDINATOR_ID
```

- [ ] Coordinator exists.
- [ ] At least one specialist worker is version-pinned.
- [ ] Shared board is enabled if the UI will visualize assignments.
- [ ] Coordinator successfully delegates a real test task.
- [ ] Worker completes it and the coordinator incorporates the result.

## P1 — Required for our intended voice + revenue demo

### 7. Create a durable company identity

```bash
vetta identity create --name "COMPANY_AGENT_NAME" --description "ROLE"
vetta identity attach --agent AGENT_ID --identity IDENTITY_ID
vetta identity show IDENTITY_ID
```

- [ ] Identity is attached to the correct agent.
- [ ] The identity has only the channels and connections it needs.

### 8. Test email end to end

Use IDs returned by the preceding commands; do not rely on display names where the CLI expects an ID.

```bash
vetta identity domain list --human
vetta identity email provision --help
vetta identity email send --help
vetta identity email messages --help
```

The current CLI requires an inbox ID when sending and a channel ID when reading messages. The PDF's shorter send/list examples are incomplete for the current interface.

- [ ] System or custom domain reports healthy sending status.
- [ ] Inbound status is independently healthy.
- [ ] Inbox is provisioned for the identity.
- [ ] Test email reaches your personal inbox.
- [ ] Your reply appears in `identity email messages`.
- [ ] You can locate and approve a guarded send with `vetta session inbox` and `vetta session confirm`.
- [ ] If send returns `501 not_implemented`, escalate to Naive staff; current docs say this indicates missing provider configuration and retrying will not fix it.

### 9. Test voice/phone separately

```bash
vetta identity phone --help
```

- [ ] Phone number provisioned or event-provided voice path confirmed.
- [ ] One inbound call reaches the intended agent.
- [ ] Transcript/events are available to the visual control room.
- [ ] One outbound or follow-up action works, if the concept requires it.
- [ ] A deterministic recorded-call fallback exists without pretending it is live.

## P1 — API key only when our app calls Naive directly

The CLI's stored login is enough for manual operation. The product UI/backend needs a scoped API key.

```bash
vetta keys create --name hackathon-app \
  --scopes agents:write,sessions:write,billing:read
```

- [ ] Use the smallest sufficient scope list.
- [ ] Capture the secret immediately; it is displayed only once.
- [ ] Store it only in a local secret manager or uncommitted environment file.
- [ ] Add `.env*` to `.gitignore` before creating local environment files.
- [ ] Never expose the key to browser-side code.

## Final readiness gate

Do not begin the hackathon with any unchecked P0 item.

- [ ] `vetta whoami`, `vetta plan show`, and `vetta credits show` succeed.
- [ ] Entire agent company can be recreated from checked-in definitions.
- [ ] Coordinator delegates to version-pinned workers.
- [ ] A complete test session finishes and its cost/tool events are observable.
- [ ] Every external channel used in the demo has passed an end-to-end test.
- [ ] Approval handling is rehearsed.
- [ ] Budgets and maximum task spend are deliberately capped.
- [ ] Live-demo fallback is prepared and clearly labeled.

## Official references

- [Quickstart](https://usenaive.ai/docs/quickstart)
- [CLI overview](https://usenaive.ai/docs/cli/overview)
- [`vetta agent`](https://usenaive.ai/docs/cli/agents)
- [`vetta team`](https://usenaive.ai/docs/cli/team)
- [`vetta session`](https://usenaive.ai/docs/cli/sessions)
- [`vetta keys`](https://usenaive.ai/docs/cli/keys)
- [`vetta identity`](https://usenaive.ai/docs/cli/identity)
- [Identity domains and email](https://usenaive.ai/docs/cli/comms)
