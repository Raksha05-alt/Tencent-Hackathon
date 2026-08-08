# SilverOps

**The agent that makes sure no senior falls through the cracks.**

An autonomous agent that runs an Active Ageing Centre's operations: it detects members who have
quietly stopped attending, infers *why* by correlating patterns across the roster, drafts
dialect-appropriate outreach, and rebuilds the programme calendar from its own findings — with a
human coordinator approving every outbound action.

Built for the **AI CAN DO IT | Tencent Cloud Hackathon — "Age Well" Social Good Challenge
Singapore** (AI Agent / Skills track).

## Run it

```bash
npm install
npm run build
npx next start   # → http://localhost:3000
```

Open **Agent Run** and press *Run this month's review*. The demo needs no network and no API key:
it replays a recorded run at watchable pace.

## The honest-architecture note

- **Tools are real.** All 13 agent tools in `lib/agent/tools.ts` are deterministic data operations
  over the seed roster — no LLM inside any tool. Every tool call and result you see in the trace is
  a genuine output of those functions (`scripts/record-run.ts` executes them for real when
  producing the recording).
- **Judgement lives in the model.** `lib/agent/loop.ts` is a full Anthropic tool-use loop (SSE via
  `/api/agent`) that produces the same event stream live. Set `ANTHROPIC_API_KEY` in `.env.local`
  and `NEXT_PUBLIC_DEMO_MODE=live` to run it; without a key the app replays the recorded run, whose
  reasoning text was authored to match what the loop produces.
- **The re-planning loop is enforced.** The calendar proposal must cite the finding IDs that
  motivated each change (`linkedFindingIds`); the recorder asserts this, and the UI renders it as
  the linked chips on the Calendar screen.
- **Human-in-the-loop by construction.** Write-tools only queue drafts. Nothing in the codebase can
  send a message to a member.

## What the agent finds in the demo data

The 45-member roster (`scripts/generate-data.ts`, seeded PRNG, `npm run verify-data` asserts all
of it) plants five patterns:

1. **The cluster** — four Tuesday-mahjong regulars all stopped the week the session moved to
   Thursday. One structural cause, not four disengagements.
2. **The taper** — Fatimah, 81, faded out when her husband was hospitalised. High risk; phone
   call in Malay, not a WhatsApp message.
3. **The teacher** — Mrs Wong, retired tailor, 20 members with sewing-family interests spelled
   eight different ways, and no programme serving them. She's invited to lead, not just attend.
4. **The flop** — Calligraphy lost 6 of 8 starters by week two; recommended for wind-down.
5. **The queues** — Chair Yoga (88% retention, 12 waitlisted) and Cooking (15 waitlisted vs
   capacity 12) each get an added slot.

## Repo map

```
scripts/generate-data.ts   seeded roster generator (patterns planted here)
scripts/verify-data.ts     executable acceptance checks for every pattern
scripts/record-run.ts      builds the replay from REAL tool executions
lib/agent/tools.ts         13 deterministic tools + run state
lib/agent/loop.ts          live Anthropic tool-use loop (SSE)
lib/agent/prompts.ts       system prompt (correlation-first triage rules)
lib/replay.ts              client-side replay engine w/ silent live fallback
lib/store.tsx              app state; approvals persist to localStorage
app/…                      Morning Brief · Agent Run · Member · Approvals · Calendar · Report
```

## AI-assisted build log (for the deck's "AI creation description")

- Product spec and proposal drafted with Claude (Opus), then reviewed and re-scoped.
- Entire implementation — data generator, tool layer, agent loop, replay engine, all six screens —
  built with **Claude Code** in a single session on submission day, including automated
  verification (`verify-data`) and browser-driven end-to-end checks (Playwright) before commit.
- Design direction (celadon/jade palette, ledger-spine trace, civic grotesque type) developed with
  a frontend-design skill and an automated design-review hook flagging generic-AI patterns.

## Privacy position

Staff-facing only; operates on data the centre already holds; human approval on every outbound
action; no autonomous contact with any senior; no external system integration. The monthly report
is compiled as a document the coordinator submits through existing channels.
