---
name: security-review
description: Runs TajStay security review using curated UnitOne SecuritySkills — threat modeling, secure code review, OWASP web/API, dependency scan, LLM/TST safety. Use as a separate stage after implementation; not part of routine frontend polish.
disable-model-invocation: true
---

# Security review (TajStay)

Install skills once: `powershell -File scripts/install-security-skills.ps1`

Skills live in `.agents/skills/security/`.

## When to invoke

- Auth, session, role changes
- API routes (`src/app/api/**`)
- Payment / booking mutations
- TST Assistant intents and `/api/tst/**`
- New user input surfaces (prompt injection)
- Dependencies / supply chain changes

## Skill picker

| Concern | Skill folder |
|---------|----------------|
| Design review | `security/threat-modeling` |
| Code review | `security/secure-code-review` |
| Web UI/API surface | `security/owasp-top-10-web` |
| REST handlers | `security/api-security` |
| npm deps | `security/dependency-scanning` |
| TST / chat AI | `security/llm-top-10`, `security/prompt-injection`, `security/agent-security` |
| PII in AI flows | `security/ai-data-privacy` |

## TajStay-specific checks

- TST never stores passwords; opens secure routes only
- `/api/tst/my-bookings` uses session `userId` only
- No cross-user data in assistant responses
- Payment stays on `/payment/[code]`
- Rate limits / auth on sensitive APIs

## Output

Structured findings: severity, evidence, framework reference (OWASP/NIST), remediation.

**Do not** merge security-sensitive changes without addressing Critical/High items.
