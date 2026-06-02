# TajStay PMS — архитектура, роли, синхронизация, архив

Документ для разработчиков: описывает **целевую логику** панели владельца, персонала отеля, офлайн-броней и синхронизации.  
Раздел **«Статус в коде»** фиксирует, что уже реализовано в репозитории, а что запланировано.

Связанные файлы:

| Тема | Путь в репозитории |
|------|-------------------|
| Права персонала отеля | `src/lib/pms/staff.ts` |
| Маскирование офлайн-данных | `src/lib/pms/offlinePrivacy.ts` |
| Настройки синхронизации владельца | `src/lib/pms/ownerPmsSettings.ts` |
| Офлайн-бронь (создание) | `src/lib/services/ownerOfflineBooking.ts` |
| Панель владельца | `src/app/dashboard/owner/` |
| Панель админа платформы | `src/app/dashboard/admin/` |
| Мобильная оболочка админа | `src/components/admin/mobile/` |
| Мобильная оболочка владельца | `src/components/owner/mobile/` |
| Схема БД | `prisma/schema.prisma` |

---

## 1. Обзор системы

### 1.1 Назначение

TajStay PMS (Property Management) — слой управления отелем **поверх** маркетплейса бронирований:

- **Онлайн-брони** (`Booking.source = PLATFORM`) — гость бронирует через сайт, оплата/чат/модерация платформы.
- **Офлайн-брони** (`Booking.source = OWNER_MANUAL`) — владелец или персонал вносит гостя вручную; жизненный цикл в `offlineStatus`.
- **Календарь занятости** — единый источник правды по датам (онлайн + офлайн блокируют слоты).
- **Разделение данных** — ресепшен видит операционные PII (имя, телефон) для заселения; **финансы и выгрузка архива** — только владелец; платформенный **ADMIN** — модерация всей TajStay.

### 1.2 Ключевые модули

```mermaid
flowchart TB
  subgraph platform [Платформа TajStay]
    Guest[Гость GUEST]
    AdminPanel["/dashboard/admin"]
    AdminAPI[API admin/*]
  end

  subgraph hotel [Отель / PMS]
    OwnerPanel["/dashboard/owner"]
    OwnerAPI[API owner/*]
    Staff[HotelStaff RECEPTIONIST / MANAGER / HOUSEKEEPING]
    Calendar[Календарь + инвентарь]
    Offline[Офлайн-брони]
  end

  subgraph sync [Синхронизация — целевая]
    CloudSync[Облачная копия TajStay]
    LocalOnly[Только учёт владельца]
    Backup[Email / Telegram / PDF архив]
  end

  Guest -->|PLATFORM booking| Calendar
  OwnerPanel --> OwnerAPI --> Offline
  OwnerPanel --> Calendar
  Staff -.->|план: вход в owner panel| OwnerPanel
  Offline --> sync
  AdminPanel --> AdminAPI
  AdminPanel -->|модерация отелей| hotel
```

| Модуль | URL / точка входа | Кто использует |
|--------|-------------------|----------------|
| **Панель владельца** | `/dashboard/owner?section=…` | `User.role = OWNER` (сейчас) |
| **Панель помощника** | тот же URL + RBAC по `HotelStaff` | `RECEPTIONIST`, `MANAGER`, `HOUSEKEEPING` (P0: отдельный логин) |
| **Панель администратора** | `/dashboard/admin?section=…` | `User.role = ADMIN` |
| **Система синхронизации** | `HostProfile.pmsSettings` + jobs (план) | только владелец отеля |
| **Гостевой кабинет** | `/dashboard/bookings`, `/profile` | `GUEST` |

### 1.3 Два уровня ролей (важно)

В коде **не путать**:

1. **`User.role`** — роль на уровне платформы: `GUEST` | `OWNER` | `ADMIN`.
2. **`HotelStaff.staffRole`** — роль сотрудника **внутри конкретного отеля**: `RECEPTIONIST` | `MANAGER` | `HOUSEKEEPING`.

Владелец (`OWNER`) не имеет строки в `HotelStaff` — он владеет отелем через `Hotel.ownerId`.

---

## 2. RBAC — роли, иерархия, разрешения

### 2.1 Терминология (продукт ↔ код)

| Термин в ТЗ / UI | В коде | Область |
|------------------|--------|---------|
| **Владелец** | `User.role = OWNER` | Все свои отели |
| **Помощник** (ресепшен) | `HotelStaff.staffRole = RECEPTIONIST` | Один `hotelId` |
| **Управляющий отеля** | `HotelStaff.staffRole = MANAGER` | Один `hotelId`, без «Финансов» |
| **Помощник** (уборка) | `HotelStaff.staffRole = HOUSEKEEPING` | Один `hotelId` |
| **Модератор платформы** | `User.role = ADMIN` | Вся платформа TajStay (не путать с MANAGER) |
| **Гость** | `User.role = GUEST` | Бронирование, профиль |

> **ADMIN** (глобальный модератор TajStay) и **MANAGER** (управляющий одного отеля) — **разные сущности**. MANAGER добавлен в `STAFF_ROLE` (см. `src/lib/pms/types.ts`); UI создания сотрудников — P0.

### 2.2 Иерархия (кто кого перекрывает)

```
ADMIN (платформа)
  └── может всё в рамках модерации (отели, пользователи, брони платформы)
OWNER (владелец отеля)
  └── полные права PMS на свои Hotel.ownerId = userId
HotelStaff (привязка hotelId + userId)
  └── только разрешения из ROLE_PERMISSIONS[staffRole]
GUEST
  └── нет доступа к /dashboard/owner и /dashboard/admin
```

**Правило:** при проверке API всегда: `resolveHotelAccess(userId, user.role, hotelId)` → `permissions[]` → `hasPermission(permissions, "…")`.

### 2.3 Матрица разрешений (`StaffPermission`)

Источник: `src/lib/pms/staff.ts`.

| Permission | OWNER | ADMIN* | RECEPTIONIST | MANAGER | HOUSEKEEPING |
|------------|:-----:|:------:|:------------:|:-------:|:------------:|
| `assign_rooms` | ✅ | ✅ | ✅ | ✅ | — |
| `check_in_out` | ✅ | ✅ | ✅ | ✅ | — |
| `offline_booking` | ✅ | ✅ | ✅ | ✅ | — |
| `view_calendar` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `view_finances` | ✅ | ✅ | — | — | — |
| `view_guest_pii` | ✅ | ✅ | ✅ | ✅ | — |
| `change_housekeeping` | ✅ | ✅ | — | — | ✅ |
| `manage_rooms` | ✅ | ✅ | — | ✅ | — |
| Скачивание архива | ✅ | legal | — | — | — |

\* ADMIN в `resolveHotelAccess` сейчас получает полный набор `OWNER_PERMISSIONS` для любого `hotelId` (модерация платформы).

### 2.4 Что видит каждая роль в офлайн-бронях

Целевая модель (продукт, Таджикистан): на ресепшене **нужны имя и телефон** даже без интернета — см. §7.2 (IndexedDB → sync).

Реализация: `src/lib/pms/offlinePrivacy.ts` — поля режутся по `view_guest_pii` / `view_finances`.

| Поле | OWNER | MANAGER | RECEPTIONIST | HOUSEKEEPING |
|------|:-----:|:-------:|:------------:|:--------------:|
| Имя гостя (поиск) | ✅ | ✅ | ✅ | — |
| Телефон, email (заселение) | ✅ | ✅ | ✅ | — |
| Даты заезд/выезд | ✅ | ✅ | ✅ | календарь |
| Категория / тип номера | ✅ | ✅ | ✅ | — |
| № комнаты (`roomNumber`) | ✅ | ✅ | ✅ | — |
| Статус `offlineStatus` | ✅ | ✅ | ✅ (редакт.) | — |
| `guestDocumentUrl` (паспорт) | ✅ | ✅ | ✅* | — |
| Суммы, предоплата, выручка | ✅ | ❌ | ❌ | ❌ |
| Настройки синхронизации / архив | ✅ | ❌ | ❌ | ❌ |

\* На ресепшене документ нужен **в момент заселения**; **скачать архив** после выезда может только владелец.

**Статус в коде:** `view_guest_pii` для `RECEPTIONIST` / `MANAGER` возвращён в `staff.ts`. UI и offline-first (IndexedDB) — P1.

### 2.5 API и guards (текущее состояние)

| Guard | Файл | Кто проходит |
|-------|------|--------------|
| `requireOwner()` | `src/lib/auth/requireOwner.ts` | только `User.role === OWNER` |
| `requireAdmin()` | `src/lib/auth/requireAdmin.ts` | только `ADMIN` |
| `getOwnerUser()` | `requireOwner.ts` | OWNER для API `owner/*` |
| `resolveHotelAccess()` | `staff.ts` | **готов**, но не везде подключён |

**Статус в коде (P0):**

- Отдельный `User` + строка `HotelStaff` на каждого сотрудника (владелец создаёт логин в панели).
- `requireOwnerOrStaff()` + Activity Log: *«Бронь №10 создана пользователем malika_reception»*.
- Сейчас: только `requireOwner()`; персонал в панель не входит.

### 2.6 Рекомендуемый паттерн для новых эндпоинтов

```typescript
// Псевдокод для owner API с hotelId
const user = await requireOwnerOrStaff(); // расширить guard
const access = await resolveHotelAccess(user.id, user.role, hotelId);
if (!access) return forbiddenJson();
if (!hasPermission(access.permissions, "offline_booking")) return forbiddenJson();

const canViewPii = hasPermission(access.permissions, "view_guest_pii");
const canViewFinances = hasPermission(access.permissions, "view_finances");
return toOfflineOwnerView(booking, canViewPii, canViewFinances);
```

---

## 3. Синхронизация и разрешение конфликтов

### 3.1 Типы данных

| Класс | Примеры | Где хранится |
|-------|---------|--------------|
| **Операционные** | даты, статус, roomTypeId, assignedRoomId | `Booking` (всегда в БД для календаря) |
| **PII / финансы** | phone, email, guestDocumentUrl, totalPrice | `Booking` + маскирование в API для staff |
| **Настройки синхронизации** | cloudSync, interval, backup flags | `HostProfile.pmsSettings` (JSON) |
| **Локальный черновик** (план) | форма до отправки на сервер | IndexedDB / device storage |

### 3.2 Режимы хранения (принято, §7.2)

| Слой | Поведение |
|------|-----------|
| **Устройство (офлайн)** | IndexedDB / localStorage на планшете ресепшена: черновики и кэш броней с **именем и телефоном**, пока нет сети |
| **Сервер TajStay** | При появлении сети — `POST`/`PATCH` синхронизирует в PostgreSQL (календарь, инвентарь, Activity Log) |
| **Облачный backup** | Если `offlineCloudSync = true` — периодическая выгрузка владельцу (Telegram → Email, §7.5) |

> **Не делаем:** «не писать PII на сервер вообще» — ломает календарь и общую синхронизацию между сменами.  
> **Не делаем:** скрывать телефон от ресепшена — без этого невозможно заселение при обрыве интернета.

### 3.3 Интервалы синхронизации

Тип: `OfflineSyncInterval` = `off` | `15m` | `1h` | `24h` (`ownerPmsSettings.ts`).

| Значение | Назначение (целевое) |
|----------|----------------------|
| `off` | Только запись при действии пользователя, без фоновых job |
| `15m` / `1h` / `24h` | Cron/worker: экспорт дельты → **сначала Telegram**, затем Email (§7.5) |

**Статус в коде:** UI сохраняет настройки (`POST /api/owner/offline-settings`). **Фоновые job не реализованы.**

### 3.4 Поток создания офлайн-брони (как сейчас)

```mermaid
sequenceDiagram
  participant UI as OfflineBookingForm
  participant API as POST /api/owner/offline-bookings
  participant Svc as createOwnerOfflineBooking
  participant DB as PostgreSQL

  UI->>API: formData roomType, dates, guestName, phone...
  API->>Svc: validate ownerId, inventory
  Svc->>DB: Booking source=OWNER_MANUAL offlineStatus
  Svc-->>API: booking id
  API-->>UI: redirect ?section=offline-bookings&created=1
```

Проверка занятости: `src/lib/pms/inventory.ts` (пересечение дат + `offlineStatus` occupying).

### 3.5 Конфликты: типы и приоритеты (целевой алгоритм)

Конфликт возникает, когда **две версии** одной сущности расходятся (сервер vs устройство, или два сотрудника).

#### Типы конфликтов

| ID | Ситуация | Сущность |
|----|----------|----------|
| C1 | Офлайн-форма сохранена на телефоне, на сервере уже заняты даты | `Booking` / inventory |
| C2 | Два staff меняют `offlineStatus` одновременно | `Booking.offlineStatus` |
| C3 | Владелец правит сумму, staff меняет статус | financial + status |
| C4 | PLATFORM бронь vs OWNER_MANUAL на те же даты | inventory |
| C5 | Restore из архива vs активная бронь | archived snapshot |

#### Приоритеты (от высшего к низшему)

1. **Инвентарь / календарь** — нельзя подтвердить пересекающиеся даты на одной физической комнате (`assignedRoomId` / `roomId`).
2. **PLATFORM бронь с оплатой в процессе** — не перезаписывать статусом офлайн без явного действия владельца.
3. **Версия с большим `updatedAt`** (добавить поле при внедрении sync) — last-write-wins для некритичных полей.
4. **Действие владельца** (`createdByOwnerId` или role OWNER) — перекрывает staff для PII и финансов.
5. **Действие staff** — только поля, разрешённые RBAC (статус, assign room).

#### Алгоритм при `POST` / `PATCH` офлайн-брони

```
1. Загрузить booking (если update) с version / updatedAt
2. Если dates или room изменились → run inventory.check()
   → если conflict: вернуть 409 { code: "dates_unavailable", conflicts: [...] }
3. Если client.updatedAt < server.updatedAt
   → 409 { code: "stale_client", serverSnapshot: publicView }
4. Применить patch только к полям, разрешённым permissions
5. Записать audit log (план): who, what, when
6. Если offlineCloudSync → enqueue backup job
```

**Статус в коде:** шаг 2 частично (`dates_unavailable` в `createOwnerOfflineBooking`). Шаги 3–6 — **план**.

### 3.6 Поиск для персонала (реализовано)

`GET /api/owner/offline-bookings/search?q=имя`

- Фильтр: `ownerOfflineBookingWhere(ownerId)` + `guestName contains q` (case insensitive).
- Ответ: только `OfflineBookingPublicView` (без phone, document, amounts).

---

## 4. Оптимизация хранения и архив

### 4.1 Цели

- Снизить объём PII в «горячей» таблице `Booking` для старых выездов.
- Дать владельцу восстановление по запросу (PDF / zip / бот).
- Соответствие: персонал не видит архив — только владелец и платформа (ADMIN при legal).

### 4.2 Жизненный цикл записи (целевой)

```mermaid
stateDiagram-v2
  [*] --> Active: check_in
  Active --> CheckedOut: offlineStatus CHECKED_OUT
  CheckedOut --> Warm: 5-7 days
  Warm --> Archived: job archive PII
  Archived --> Restored: owner request via bot/admin
  Restored --> Warm: re-hydrate fields
```

Сроки (пример, настраиваемые в `pmsSettings`):

| Стадия | Срок после выезда | Что в БД |
|--------|-------------------|----------|
| Active | — | все поля |
| Warm | 0–**7** дней после выезда | все поля; споры с гостем |
| Archived | **7+** дней | операционные + `archiveRef`; PII в object storage |
| Legal hold | — | не архивировать (flag) |

**Скачивание файла архива:** только **владелец** (не ресепшен, не MANAGER).

### 4.3 Формат архива (целевой)

**Пакет на одну бронь или день:**

```
archive/{ownerId}/{yyyy-mm-dd}/bookings-{batchId}.zip
  ├── manifest.json      # id, publicCode, checksums
  ├── bookings.json      # operational snapshot
  ├── guest-pii.enc      # encrypted blob OR omitted if local-only
  └── export.html        # P2: HTML или JSON; PDF — позже
```

| Файл | Содержимое |
|------|------------|
| `manifest.json` | версия схемы, hotelId, createdAt, sha256 |
| `bookings.json` | public view + internal ids |
| `guest-pii.enc` | phone, email, document URLs — AES-256, key per owner |
| `export.html` / `bookings.json` | P2: достаточно для первого релиза архива |
| `receipt.pdf` | опционально после P2 |

**Сжатие:** zip + для PDF — оптимизация изображений; JSON → gzip внутри zip.

### 4.4 Восстановление (целевое)

| Канал | Сценарий |
|-------|----------|
| **Telegram-бот** | **Приоритет 1** — `/archive 2024-03` → zip в чат владельцу |
| **Email** | **Приоритет 2** — резервная копия (`offlineBackupEmail`) |
| **Google Drive** | P3 или не делать (усложнение OAuth) |
| **UI владельца** | «Запросить архив за период» → job + уведомление |

**Статус в коде:** не реализовано. В UI есть флаги `offlineBackupEmail`, `offlineBackupTelegram` и текст `syncComingSoon`.

### 4.5 Что уже есть в платформе

- `Booking.guestDocumentUrl` — загрузка документа гостем (онлайн-flow).
- `ChatArchive` / `chatArchivedAt` — архивация чата по брони (отдельный контур).
- PDF receipt — искать `generateReceipt` / payment routes (см. `TZ-IMPLEMENTATION.md`).

Архив PMS должен **переиспользовать** object storage и паттерны загрузки, не дублировать логику.

---

## 5. UI: мобильные панели (реализовано)

### 5.1 Админ (`/dashboard/admin`)

- Оболочка: `AdminMobileShell`, bottom tabs, drawer.
- Стили: `src/styles/admin-mobile-app.css`, body class `admin-mobile-app`.
- Разделы через `?section=dashboard|hotels|…`.

### 5.2 Владелец (`/dashboard/owner`)

- Оболочка: `OwnerMobileShell` (те же CSS-классы + `owner-mobile-app`).
- Tabs: overview | properties | bookings | calendar | more.
- Overview: `OwnerMobileDashboard` (KPI из `getOwnerDashboardKpis`).

---

## 6. Roadmap для разработчиков

| Приоритет | Задача | Зависимости |
|:---------:|--------|-------------|
| P0 | Отдельный логин сотрудника (`User` + `HotelStaff`), CRUD в панели владельца | — |
| P0 | `requireOwnerOrStaff()` + Activity Log (`createdByUserId`) | staff accounts |
| P0 | `resolveHotelAccess` на все `owner/*` API | guards |
| P0 | Роль `MANAGER` в UI назначения персонала | `staff.ts` ✅ |
| P1 | IndexedDB offline-first + sync при online | §7.2 |
| P1 | Optimistic locking (`updatedAt`) | конфликты |
| P1 | Backup worker: **Telegram**, затем Email | pmsSettings |
| P2 | Archive job (**7 дней** после выезда), HTML/JSON export | storage §4 |
| P2 | Telegram bot: выдача архива | archive |
| P3 | PDF в архиве, Google Drive (опционально) | — |

---

## 7. Принятые продуктовые решения (закрыто)

Ответы владельца продукта для реализации в коде. Дата фиксации: **2026-05-30**.

### 7.1 Помощник — отдельный логин или общий планшет?

**Решение: отдельный логин и пароль на каждого сотрудника (P0).**

- Владелец в панели создаёт учётку (пример: `malika_reception` / временный пароль).
- В БД: отдельный `User` + `HotelStaff { hotelId, staffRole }`.
- **Не использовать** один общий вход владельца на ресепшене — невозможно расследовать ошибки (удалили бронь, неверное заселение).
- **Activity Log (P0):** *«Бронь №10 создана пользователем malika_reception»* — поле `createdByOwnerId` расширить до `actedByUserId` или audit-таблица.

### 7.2 «Офлайн» и PII — скрыть от персонала или не писать на сервер?

**Решение: локально на устройстве (IndexedDB), при сети — синхронизация на сервер TajStay. Персонал видит имя и телефон.**

- Ресепшен **обязан** видеть имя и телефон без интернета (заселение по паспорту).
- Пока связи нет — данные в браузере планшета/ПК; при восстановлении — отправка в API.
- **Нельзя:** полностью не писать на сервер (нет общего календаря между сменами).
- **Нельзя:** скрывать телефон от ресепшена (теряется смысл автоматизации).

### 7.3 Модератор — ADMIN платформы или менеджер отеля?

**Решение: разделить понятия.**

| Роль | Кто | Права |
|------|-----|--------|
| **ADMIN** | Команда TajStay (глобально) | Одобрение отелей, блокировки, `/dashboard/admin` |
| **MANAGER** | `HotelStaff.MANAGER` | Управляющий **одного** отеля: комнаты, брони, календарь — **без вкладки «Финансы»** (вывод средств) |
| **OWNER** | Владелец | Полный доступ, включая финансы и архив |

### 7.4 Архив — срок и формат

**Решение: архивация через 5–7 дней после выезда (`CHECKED_OUT`).**

- 5 дней хватает на споры с гостем; дальше запись уходит в архив (календарь не перегружается).
- **P2:** первый формат экспорта — **HTML или JSON** (простой лог); PDF — позже.
- **Скачать архив** может **только владелец**; сотрудникам доступ закрыт.

### 7.5 Приоритет бэкапа

**Решение (по убыванию):**

1. **Telegram-бот** — основной канал для владельцев в Таджикистане (файл всегда в телефоне).
2. **Email** — резервная копия.
3. **Google Drive** — P3 или не реализовывать (сложность OAuth).

---

## 8. История документа

| Дата | Изменение |
|------|-----------|
| 2026-05-30 | Первая версия: RBAC, sync target, archive target, статус кода |
| 2026-05-30 | §7 закрыт: отдельные логины, IndexedDB+sync, MANAGER vs ADMIN, архив 7д, Telegram>Email |
