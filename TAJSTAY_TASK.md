Да — если ты сейчас именно про **Claude Code + Claude Pro + Sonnet 5**, то его можно заметно усилить и при этом **не сжигать контекст на повторное чтение всего TajStay**.

Главное: плагины сами по себе не делают модель «умнее бесплатно». Максимальный выигрыш дают **Skills + короткий `CLAUDE.md` + Hooks + правильно ограниченные MCP + дисциплина контекста**. Anthropic сейчас официально поддерживает в Claude Code `CLAUDE.md`, custom Skills, hooks, subagents, MCP и plugins; их же команда рекомендует эти механизмы для больших реальных репозиториев. ([anthropic.com][1])

## Что я бы настроил для TajStay

| Инструмент                | Для TajStay                                          | Экономия                             |
| ------------------------- | ---------------------------------------------------- | ------------------------------------ |
| **CLAUDE.md**             | Короткие постоянные правила проекта                  | 🔥 Очень высокая                     |
| **Skills**                | UI, Security, QA, CRM загружаются только когда нужны | 🔥 Очень высокая                     |
| **Hooks**                 | Автоматические lint/typecheck/security guards        | 🔥 Высокая                           |
| **Subagents**             | Отдельные узкие аудиты                               | 🟡 Полезно, но расходуют свои токены |
| **MCP**                   | GitHub/внешние сервисы только при необходимости      | 🟡 Зависит от задачи                 |
| **Plugins**               | Готовые пакеты skills+agents+connectors              | 🟡 Полезно, но не ставить всё подряд |
| **`/clear` + state file** | Новый блок без старого мусорного контекста           | 🔥 Очень высокая                     |

Agent Skills особенно подходят тебе: это папки с `SKILL.md`, инструкциями, скриптами и ресурсами, которые Claude может обнаруживать и подгружать **по необходимости**, вместо того чтобы держать весь огромный MASTER в активном контексте постоянно. Anthropic поддерживает Skills непосредственно в Claude Code. ([anthropic.com][2])

---

# 1. Самое полезное: переделать огромный MASTER в двухуровневую систему

Сейчас у тебя накопилось огромное количество требований. Если Claude читает десятки страниц MASTER при каждой мелкой CSS-задаче — ты тратишь контекст впустую.

Я бы сделал:

```text
CLAUDE.md                    ← только 100–200 важных строк

.agent/
  STATE.md                   ← где сейчас проект

.claude/skills/
  tajstay-design/
    SKILL.md
  tajstay-browser-qa/
    SKILL.md
  tajstay-security/
    SKILL.md
  tajstay-owner-crm/
    SKILL.md
  tajstay-admin-crm/
    SKILL.md
  tajstay-database-safety/
    SKILL.md
```

### В `CLAUDE.md` только постоянное

Например:

```text
TajStay is an existing production-oriented Next.js project.

Do not rebuild from scratch.
Do not reset or destroy data.
Do not force push.
Preserve conforming existing functionality.

Canonical TajStay green: #0F7A4D.
Main page canvas: #FFFFFF.
No alternate brand-green shades.

Mobile is not compressed desktop.

Use evidence gates:
CODE / TEST / DEPLOYED / REAL RUNTIME / EVIDENCE.

Never claim PASS without runtime evidence.

For specialized work, load the relevant project skill instead of
reading unrelated specifications.
```

**Не помещать туда всю историю проекта.**

---

# 2. Сделать специальные TajStay Skills

Это будет, пожалуй, самое выгодное улучшение.

Например когда Claude занимается интерфейсом, ему не требуется каждый раз читать 100 правил passport storage.

### `tajstay-design`

Внутри:

* `#0F7A4D`;
* white canvas;
* inputs;
* button interaction;
* responsive;
* Consumer/Admin/Owner visual rules;
* accessibility;
* no green variants;
* browser visual QA.

### `tajstay-security`

Отдельно:

* auth;
* RBAC;
* tenant isolation;
* sensitive data;
* passport storage;
* admin audit;
* payments;
* recovery;
* destructive operation rules.

### `tajstay-owner-crm`

* Hotel Desk;
* Rooms;
* Booking;
* Stay;
* Guest;
* Check-in/out;
* Payment;
* Receipt;
* Printing;
* Analytics.

### `tajstay-browser-qa`

* роли;
* viewport matrix;
* human-like navigation;
* screenshots;
* runtime evidence.

Claude будет брать **только нужную специальность**. Это именно тот принцип, для которого Anthropic создала Skills. ([anthropic.com][2])

---

# 3. Hooks — очень выгодно, потому что простые проверки не надо поручать Sonnet

Hooks позволяют запускать shell-команды автоматически на определённых этапах работы Claude Code — например formatting или тесты после изменений. Anthropic прямо приводит automatic formatting и guardrails как сценарии hooks. ([resources.anthropic.com][3])

Например после изменения `.ts/.tsx`:

```text
eslint targeted files
typecheck
```

После CSS:

```text
style/static check
```

Перед потенциально опасной командой:

```text
detect:
git reset --hard
git push --force
prisma migrate reset
DROP DATABASE
```

→ block.

Это хороший случай, потому что **детерминированную проверку выполняет shell, а не дорогая модель**.

⚠️ Но чужие hooks из интернета нельзя ставить вслепую: hooks выполняют команды с правами пользователя, и сама Anthropic отдельно предупреждает об их security blast radius. ([resources.anthropic.com][3])

---

# 4. Не надо ставить 30 MCP-серверов

Это распространённая ошибка.

MCP может дать Claude доступ к GitHub, Jira, внутренним сервисам и другим источникам. Anthropic рекомендует MCP именно для подключения внешних систем. ([anthropic.com][4])

Но если подключить всё подряд:

```text
GitHub
Postgres
filesystem
browser
Slack
Notion
Jira
...
```

модель получает кучу описаний инструментов и решений → контекст становится тяжелее.

Для TajStay я бы начал только с:

**GitHub MCP** — если Claude реально должен читать PR/issues/remote.

И всё.

Если browser уже встроен и работает — **не подключать второй browser MCP**.

Если shell уже видит repository — **не нужен отдельный filesystem MCP**.

Если ему не нужен прямой DB-admin — **не давать database MCP**, особенно при реальных данных.

MCP поддерживает allowlist/denylist инструментов, поэтому лучше дать минимум необходимых tools. ([Claude Platform Docs][5])

---

# 5. Subagents использовать точечно

Они очень мощные, но **не экономят суммарные токены автоматически**.

Каждый subagent тоже думает и читает данные.

Плохо:

> запусти 8 агентов — UI, backend, security, QA, database, architect, performance, design — на каждую кнопку.

Получишь токеновую электростанцию.

Хорошо:

### Основной Sonnet

делает implementation.

### Security subagent

вызывается только когда меняются:

* auth;
* permissions;
* passport;
* payment;
* Admin;
* API security.

### Browser QA subagent

только после завершения логического блока.

### Design reviewer

после крупного UI-блока.

Anthropic прямо позиционирует subagents для специализированной/параллельной работы, но для экономии их следует использовать **только там, где разделение контекста реально окупается**. ([anthropic.com][6])

---

# 6. Sonnet 5 — нормальный основной двигатель

Ты сказал, что сейчас стоит **Sonnet 5**. Это актуальная активная модель Anthropic на сегодняшний момент. ([Claude Platform Docs][7])

Для TajStay я бы сделал:

**Sonnet 5 → 90% implementation**

А более дорогую модель уровня Opus использовать только для:

* сложной архитектуры;
* security design;
* тяжёлого debugging;
* крупной миграции БД;
* финального независимого review.

Anthropic сама в материалах по Claude Code предлагает подход **Opus для planning, Sonnet для повседневного исполнения**. ([anthropic.com][8])

Не надо использовать максимальную модель для:

> поменяй radius
> исправь responsive card
> запусти тест
> исправь CSS.

---

# 7. Очень важный трюк: STATE.md

Создай:

```text
.agent/STATE.md
```

Пусть Claude обновляет его **только при завершении логического блока**.

Например:

```text
# TajStay Current State

Branch:
feature/...

Base SHA:
...

Current block:
Global Visual Migration

DONE:
- canonical green
- mobile search
- role guards

OPEN:
- auth
- desktop QA
- owner finance
- Decimal warning

DO NOT TOUCH:
- production DB
- security migration X

NEXT:
Finish auth + responsive evidence.
```

После этого при новом Claude Code session:

> Прочитай CLAUDE.md и .agent/STATE.md. Затем загрузи только skill, относящийся к текущему NEXT. Не перечитывай весь repository или старые отчёты без необходимости.

Это даст огромную экономию.

---

# 8. Используй `/clear`

Команда Claude Code `/clear` специально полезна после завершённого блока, чтобы старые обсуждения не продолжали занимать активный контекст; Anthropic сама обучает работе с `/clear`, `CLAUDE.md` и проектным контекстом. ([anthropic.com][8])

Например:

```text
VISUAL BLOCK завершён
→ обновили STATE.md
→ /clear
→ новый session
→ читаем CLAUDE.md + STATE.md
→ SECURITY BLOCK
```

Гораздо эффективнее, чем держать бесконечный чат месяц.

---

# 9. Не заставлять Claude читать весь repository

Добавь ему постоянное правило:

```text
Use targeted discovery.

Start with:
rg
git diff
git status
route inventory
symbol search

Read only files needed for the current task.

Never recursively inspect the whole repository unless the task
actually requires a repository-wide audit.
```

Anthropic отдельно рекомендует последним моделям **сначала исследовать соответствующий код, а не строить предположения**, но это не означает читать вообще всё подряд. ([Claude Platform Docs][9])

---

# 10. Plan Mode только для дорогих решений

Не надо Plan Mode перед:

> изменить padding с 12 на 16.

Использовать для:

* новая CRM entity model;
* passport architecture;
* financial model;
* RBAC;
* database migrations;
* massive refactor;
* deployment change.

То есть:

```text
сложное решение
→ Plan
→ утвердить архитектуру
→ Execute
```

Мелкие реализации → сразу action.

---

## Что я предлагаю сделать прямо сейчас

**Не устанавливай случайные Marketplace plugins.**

Сначала попроси Sonnet самому настроить **легковесную TajStay Claude Code architecture**.

Можешь дать ему такой запрос:

> Проект TajStay уже имеет большой MASTER и накопленный контекст.
> Перед продолжением implementation настрой Claude Code так, чтобы снизить расход контекста без потери качества.
>
> Не устанавливай сторонние плагины/MCP и не скачивай исполняемый код без моего разрешения.
>
> 1. Проанализируй существующие `CLAUDE.md`, `.cursor/rules`, TajStay MASTER и текущий repository.
> 2. Создай или оптимизируй короткий root `CLAUDE.md`, содержащий только постоянные глобальные правила и ссылки на специализированные skills. Не копируй туда весь MASTER.
> 3. Создай modular project Skills для:
>
>    * TajStay Design System / UX;
>    * Security / RBAC / sensitive data;
>    * Browser Human-like QA;
>    * Owner Hotel CRM;
>    * Admin CRM;
>    * Database / migration safety.
> 4. Создай `.agent/STATE.md` с текущим branch/SHA/current block/DONE/OPEN/NEXT/BLOCKERS. Не дублируй туда длинные спецификации.
> 5. Предложи минимальный набор safe hooks для targeted formatting, lint/typecheck и блокировки явно destructive commands. Не устанавливай hook до проверки его точной команды.
> 6. Проверь доступные plugins/MCP, но ничего стороннего не устанавливай автоматически. Предлагай только то, что даёт конкретную пользу TajStay и не дублирует встроенный browser/shell/filesystem.
> 7. Subagents используй только для реально независимых security/QA/review задач; не создавай fleet на обычные изменения.
> 8. После настройки объясни кратко, какие файлы созданы/изменены, приблизительно зачем каждый нужен, и затем продолжай текущий TajStay BLOCK из `STATE.md`.
>
> Цель: минимальный active context, отсутствие повторного чтения огромного MASTER, высокая автономность и evidence-based качество.

### Самое главное

Для твоего проекта я бы ставил приоритет так:

**Skills → STATE.md → короткий CLAUDE.md → Hooks → только потом MCP/plugins/subagents.**

Именно первые три дадут тебе наибольшую практическую экономию контекста. Плагины — уже дополнительный инструмент, а не волшебная кнопка.

Если хочешь, следующим сообщением я могу собрать тебе **готовую структуру `CLAUDE.md + 6 SKILL.md + STATE.md + безопасные hooks именно под TajStay`**, которую ты просто отдашь Sonnet для создания.

[1]: https://www.anthropic.com/webinars/claude-code-workshop-foundations-may-28?utm_source=chatgpt.com "Claude Code Workshop: Foundations | Webinars \ Anthropic"
[2]: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills?utm_source=chatgpt.com "Equipping agents for the real world with Agent Skills \ Anthropic"
[3]: https://resources.anthropic.com/hubfs/Claude%20Code%20Advanced%20Patterns_%20Subagents%2C%20MCP%2C%20and%20Scaling%20to%20Real%20Codebases.pdf?utm_source=chatgpt.com "Claude Code Advanced Patterns: Subagents, MCP, and Scaling to Real Codebases"
[4]: https://www.anthropic.com/webinars/claude-code-advanced-patterns?utm_source=chatgpt.com "Claude Code Advanced Patterns: Subagents, MCP, and Scaling to Real Codebases | Webinars \ Anthropic"
[5]: https://docs.anthropic.com/ja/docs/agents-and-tools/mcp-connector?utm_source=chatgpt.com "MCPコネクター - Claude Platform Docs"
[6]: https://www.anthropic.com/news/enabling-claude-code-to-work-more-autonomously?utm_source=chatgpt.com "Enabling Claude Code to work more autonomously \ Anthropic"
[7]: https://docs.anthropic.com/en/docs/about-claude/model-deprecations?utm_source=chatgpt.com "Model deprecations - Claude Platform Docs"
[8]: https://www.anthropic.com/webinars/claude-code-foundations?utm_source=chatgpt.com "Claude Code: Foundations | Webinars \ Anthropic"
[9]: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables?utm_source=chatgpt.com "Prompting best practices - Claude Platform Docs"
