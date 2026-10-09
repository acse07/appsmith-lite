# AppSmith Lite

**Low-code конструктор внутренних инструментов:** собирайте интерфейс из компонентов, подключайте данные и публикуйте готовое приложение для своей команды.

[Открыть демо](https://appsmith-lite.vercel.app) — нажмите **Explore the demo workspace**, чтобы открыть редактор без регистрации.

Например, можно собрать панель управления клиентами: таблицу, поля ввода, кнопки запуска запросов и несколько страниц. Интерфейс создаётся в визуальном редакторе, а настройки и версии сохраняются в PostgreSQL.

Самостоятельный учебный MVP по [техническому заданию](docs/specification.md). Не является официальным продуктом Appsmith. Интерфейс приложения на английском.

![Визуальный редактор](docs/screenshots/editor.png)

[Демо-видео](docs/demo.webm) · [Подробная архитектура и политики безопасности (English)](docs/architecture.md)

## Возможности

- Регистрация и вход, рабочие пространства, роли Owner / Editor / Viewer.
- Создание, переименование, дублирование и удаление приложений; поиск, фильтры и шаблон Customer management.
- Вложенный drag-and-drop, дерево слоёв, настройки контента и стилей, копирование и дублирование компонентов.
- Container, Heading, Text, Button, Input, Select, Table и Divider.
- Несколько страниц, Undo/Redo на 50 операций, автосохранение, локальное восстановление черновика и конфликты между вкладками.
- GET/POST к mock и JSONPlaceholder: параметры, разрешённые заголовки, JSON body, тестирование и просмотр ответа.
- Привязки данных, выбор строки таблицы, действия: запрос, уведомление, переход, изменение значения и сброс ввода.
- Интерактивный Preview, публикация неизменяемых снимков и история версий. Редактирование черновика не меняет опубликованную версию.
- Адаптивная панель приложений, горячие клавиши и встроенный Builder guide.

## Стек

| Часть             | Технологии                                           |
| ----------------- | ---------------------------------------------------- |
| Приложение и API  | Next.js App Router, React 19, TypeScript             |
| Интерфейс         | Tailwind CSS, Radix UI, dnd-kit                      |
| Состояние и формы | Zustand, Immer, TanStack Query, React Hook Form, Zod |
| База              | PostgreSQL 17, Prisma                                |
| Проверки          | ESLint, Vitest, Testing Library, Playwright          |
| Инфраструктура    | Docker, Docker Compose, GitHub Actions               |

## Быстрый запуск

Нужны **Node.js 24+**, npm, Git и Docker с Docker Compose. На Windows сначала запустите Docker Desktop. Вместо Docker можно использовать собственный PostgreSQL.

### 1. Установить зависимости

```sh
git clone https://github.com/acse07/appsmith-lite.git
cd appsmith-lite
npm ci
```

Если репозиторий приватный, Git должен быть авторизован в аккаунте с доступом.

### 2. Создать настройки

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```sh
cp .env.example .env
```

Значения из примера уже подходят для локального запуска:

```dotenv
DATABASE_URL="postgresql://appsmith:appsmith_local@127.0.0.1:54329/appsmith?schema=public"
DIRECT_URL="postgresql://appsmith:appsmith_local@127.0.0.1:54329/appsmith?schema=public"
APP_ORIGIN="http://127.0.0.1:3000"
```

`DATABASE_URL` — подключение приложения к PostgreSQL; `DIRECT_URL` — прямое подключение для миграций (локально совпадает с `DATABASE_URL`); `APP_ORIGIN` — точный адрес приложения для проверки запросов. `.env` исключён из Git.

### 3. Запустить базу и приложение

```sh
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Откройте **[http://127.0.0.1:3000](http://127.0.0.1:3000)**. Нажмите **Explore the demo workspace** для готового примера с клиентами или создайте свой аккаунт. Демо создаёт отдельный аккаунт и рабочее пространство; ручной seed не нужен.

PostgreSQL доступен локально на порту `54329`. Данные сохраняются в Docker volume. Остановить приложение: `Ctrl+C`. Остановить базу:

```sh
docker compose down
```

Для следующего запуска достаточно `docker compose up -d` и `npm run dev`. Не добавляйте `-v` к остановке, если хотите сохранить данные.

При собственной PostgreSQL-базе укажите её `DATABASE_URL` и пропустите `docker compose up`.

## Первый сценарий

1. Откройте демо и приложение **Customer management**.
2. Выберите заголовок на холсте и измените текст в правой панели.
3. Добавьте Container, перетащите в него компонент и настройте отступы в Style.
4. Откройте Queries и выполните `getCustomers`.
5. Выберите таблицу: Data можно связать с `queries.getCustomers.data`.
6. Настройте у кнопки действие **Run query** во вкладке Events.
7. Откройте **Preview**, проверьте поля, таблицу и кнопки.
8. Нажмите **Publish** и откройте опубликованное приложение.

Публиковать может Owner. Доступ к опубликованной версии есть только у вошедших участников рабочего пространства. Owner добавляет участников по email уже зарегистрированного аккаунта.

## Команды и проверки

| Команда                       | Назначение                                                             |
| ----------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`                 | Разработка на `127.0.0.1:3000`                                         |
| `npm run build` / `npm start` | Production-сборка / запуск сборки                                      |
| `npm run db:generate`         | Генерация Prisma Client                                                |
| `npm run db:migrate`          | Применение сохранённых миграций                                        |
| `npm run db:seed`             | Необязательное создание владельца через `SEED_EMAIL` и `SEED_PASSWORD` |
| `npm run lint`                | ESLint                                                                 |
| `npm run typecheck`           | TypeScript                                                             |
| `npm test`                    | Unit- и component-тесты                                                |
| `npm run test:e2e`            | Браузерные и API-сценарии                                              |
| `npm run format`              | Форматирование Prettier                                                |

Перед первым запуском E2E:

```sh
npx playwright install chromium
npm run test:e2e
```

База должна работать, миграции должны быть применены. Playwright запускает сервер, если он ещё не запущен. Тест REST требует интернета для JSONPlaceholder. Тесты создают отдельные аккаунты и очищают их данные.

GitHub Actions выполняет lint, проверку типов, тесты, сборку и E2E с PostgreSQL. Локально проверены 37 unit/component-тестов и 10 E2E-сценариев.

## Структура и архитектура

```text
src/
  app/          Страницы Next.js, API routes, providers и стили
  entities/     Типы и валидация документа интерфейса
  features/     Редактор, компоненты, запросы, runtime, авторизация
  server/       Сессии, права доступа, сервисы и Prisma
  shared/       UI-примитивы, API-клиент и демо-данные
  tests/        Unit, component и E2E
prisma/         Схема БД, миграции и seed
docs/           ТЗ, архитектура, скриншоты и демо
.github/        CI workflow
```

Черновик — нормализованное дерево компонентов. Команды проходят валидацию и попадают в историю Zustand. Preview и опубликованное приложение используют общий renderer без зависимостей от редактора. Сохранение проверяет revision, публикация создаёт снимок страниц и запросов. Подробности — в [архитектуре](docs/architecture.md).

## Production и Docker

Для публикации демо на Vercel используйте [инструкцию по деплою](docs/vercel.md). Конфигурация сборки уже есть в `vercel.json`; нужна облачная PostgreSQL-база и переменные окружения.

Задайте собственную PostgreSQL-базу и `APP_ORIGIN` с точным HTTPS-адресом. Нужен TLS reverse proxy: production cookies требуют HTTPS. Локальные значения из `.env.example` предназначены для разработки.

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run build
npm start
```

Для Docker создайте `.env.production` по `.env.production.example`. База должна быть доступна из контейнера: `127.0.0.1` внутри него указывает на сам контейнер. Для PostgreSQL из этого Compose используйте одну Docker-сеть и адрес `postgres:5432`.

```sh
docker build -t appsmith-lite .
docker run --rm --env-file .env.production appsmith-lite ./node_modules/.bin/prisma migrate deploy
docker run --env-file .env.production -p 127.0.0.1:3000:3000 appsmith-lite
```

Для базы в отдельной Docker-сети добавьте `--network ИМЯ_СЕТИ` к обеим командам `docker run`. Миграции выполняйте перед запуском новой версии. Облачный хостинг автоматически не настроен.

## Частые проблемы

- **База недоступна:** проверьте `docker compose ps`, Docker Desktop, порт `54329` и `DATABASE_URL`.
- **Prisma не может обновить DLL на Windows:** остановите `npm run dev`, выполните `npm run db:generate` и снова запустите сервер.
- **Ошибка origin:** открывайте адрес из `APP_ORIGIN`; `localhost` и `127.0.0.1` — разные origin.
- **Конфликт между вкладками:** скачайте свой черновик через баннер, затем загрузите серверную версию. Чужие изменения не перезаписываются автоматически.
- **POST не сохраняет клиента:** mock и JSONPlaceholder имитируют создание записи, это не постоянная база бизнес-данных. Документы приложения, аккаунты, настройки и версии сохраняются в PostgreSQL.

## Ограничения MVP

Нет Chart/Form-компонентов, OAuth, email-приглашений, совместного редактирования в реальном времени, произвольных API-адресов, хранилища секретов и выполнения JavaScript-выражений. Разрешены mock и фиксированные HTTPS-endpoint JSONPlaceholder; доступ и роли проверяются на сервере.

Редактор рассчитан на desktop; панель приложений и опубликованные интерфейсы адаптируются к телефону. Демо-аккаунты сохраняются без автоматической очистки. Лимиты запросов хранятся в памяти процесса — для нескольких production-реплик нужен общий rate limiter. Подробнее — в [архитектуре](docs/architecture.md).
