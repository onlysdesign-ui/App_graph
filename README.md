# App Graph

Минимальный React + TypeScript + Tailwind проект для визуализации App Graph из JSON тест-кейсов.

## Локальный запуск

```bash
npm install
npm run dev
```

## Деплой на GitHub Pages

1. В репозитории перейдите в **Settings → Pages** и выберите **Source: GitHub Actions**.
2. Запушьте изменения в `main` или `master` — workflow соберёт проект и задеплоит `dist`.
3. При необходимости измените имя репозитория в `vite.config.ts`, чтобы `base` совпадал с вашим Pages URL.
4. Если хотите использовать `npm ci`, сначала закоммитьте `package-lock.json`. Сейчас workflow использует `npm install`, чтобы обходиться без lock-файла.
