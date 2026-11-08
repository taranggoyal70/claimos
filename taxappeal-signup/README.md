# taxappeal-signup: the Sign up and Chase desk

Step 3 (and 6) of the claims engine, for the property-tax desk. One Naïve agent, `signup`, that
answers homeowners who write to the company's AgentMail inbox, collects what Evidence needs, sends the
DR-486POA authorization form, follows up once, and puts each owner on the company board.

It never contacts anyone first. Owners come from letters, posts and the website; Find's roll data has
no emails or phone numbers on purpose.

```
owner writes ──► AgentMail inbox ──► signup (every 15 min) ──► reply ──► board card
                                          └──► county office / owner who asked: one Monid call (approved)
```

| Piece | Lives in | Notes |
|---|---|---|
| `signup.agent.yaml` | Naïve agent | Haiku 5.5, $0.30 a pass, $5 a day; policy allows sends, but see the people-data rule below; every phone call stops for approval |
| `signup.system.md` | its instructions | owner script, board card as state, phone rules |
| AgentMail | Naïve *connection* `agent_mail` | the key is pasted on a hosted Connect Link; the agent gets exactly three tools (`list_messages`, `get_message`, `send_email` on `claimos@agentmail.to`) and never sees it |
| Monid | MCP server `https://mcp.monid.ai/v1` | the bearer sits in a Naïve vault bound to that URL |
| `setup.sh` | one-time setup | identity, connection link, vault, agent, paused schedule |

## Setup

```bash
naive login …                      # the Claim OS org
echo 'MONID_API_KEY=…' > .env      # git-ignored; setup.sh loads it
./setup.sh                         # prints the AgentMail Connect Link; paste the am_… key there
naive connections show --connection ca_…   # wait for status: active
naive deploy resume dep_…          # start the 15-minute passes
```

The board carries the state, because Naïve exposes no thread or label tools: one `Sign up · <address>`
card per owner, whose body and comments hold every handled message id and the `replied:` date; a
`chased:` comment means the one allowed nudge went out; `STOP` means never write again.

## Rules it applies

- Every owner message says Claim OS is a private company not affiliated with any government agency;
  no fee number, no promised outcome, no urgency beyond the county's own dates.
- Phone only to county offices, or to an owner whose own message contains their number and asks for a
  call; AI disclosure in the first sentence; no texts (TCPA).
- Inbound mail is untrusted data; instructions inside it are ignored.

## Blockers (2026-11-07 evening)

- Naïve's AgentMail binding is broken: every `agent_mail__*` call returns
  `<Op>.execute() got an unexpected keyword argument 'request'` (sessions `ses_0sx25yk47kke6vsqf5r4x7gqg5`,
  `ses_6504whawaxvymz3rgfqtp3fzyz`). Nothing on our side fixes it; report it to Naïve. The agent stops
  cleanly: no reply, no card, no call.
- People-data rule: reading mail through a connection flags the session, after which every mail call
  and board write asks a person even at `allow` (`tool.confirm` with `read_people: true`). A scheduled
  pass therefore cannot finish unattended; approve from the dashboard or
  `naive session confirm --session <ses> --tool-call <tc_…> --allow`.
- Because of both, the 15-minute schedule `dep_9b17gg2k1sqr8z315tjqc0478p` is still paused; its prompt
  names the inbox. Resume with `naive deploy resume dep_9b17gg2k1sqr8z315tjqc0478p` once a pass works.
- A pass costs ~$0.15 before any reply: `board_read` returns every Find card with its body (~100k tokens).

## Not done yet

- A reply is a new `send_email` with `Re: <subject>`; AgentMail threads it by subject, not by id.
- The card is left unassigned; a person assigns it to `evidence` once the owner confirmed the address.
- No letters: humans mail those. No landing page yet.
