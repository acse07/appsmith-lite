# Деплой AppSmith Lite на Vercel

Приложению нужны Next.js на сервере и облачная PostgreSQL-база. GitHub Pages не запускает его API и авторизацию.

1. Создайте отдельную PostgreSQL-базу для демо, например в Neon или Supabase. Для serverless используйте строку подключения с пулом соединений, которую выдаёт провайдер.
2. В Vercel импортируйте репозиторий `acse07/appsmith-lite`. Framework — Next.js, корневая папка — корень репозитория, Node.js — 24.x.
3. Добавьте `DATABASE_URL` в Environment Variables для **Production**: полную PostgreSQL-строку подключения с параметрами провайдера и SSL.
4. Добавьте `APP_ORIGIN` для **Production**: основной HTTPS-домен приложения без завершающего `/`. Его можно задать после первого деплоя и выполнить Redeploy.
5. Запустите Deploy. `vercel.json` задаёт сборку: генерация Prisma Client, применение сохранённых миграций и сборка Next.js.
6. В настройках Deployment Protection разрешите публичный доступ к production-демо. Затем проверьте сайт в приватном окне браузера.
7. Нажмите **Explore the demo workspace**: приложение создаёт отдельный демо-аккаунт и пример Customer management. Общий логин и пароль для посетителей не нужны.

Для Preview используйте отдельную базу и отдельные значения окружения: сборка применяет миграции к указанной `DATABASE_URL`. Не подключайте preview-сборки к production-базе.

Автоматический деплой production запускается при изменениях в `main`, после подключения репозитория к Vercel.

Настройка Vercel не создаёт базу и не публикует приложение сама по себе. Живой URL появится после успешного Deploy.

Документация: [Next.js на Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Prisma 6 на Vercel](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/serverless/deploy-to-vercel).
