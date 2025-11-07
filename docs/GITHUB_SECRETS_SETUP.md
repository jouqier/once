# Настройка GitHub Secrets

Для корректной работы приложения при деплое на GitHub Pages необходимо настроить следующие секреты в репозитории.

## Как добавить секреты

1. Перейдите в репозиторий на GitHub
2. Откройте **Settings** → **Secrets and variables** → **Actions**
3. Нажмите **New repository secret**
4. Добавьте каждый секрет из списка ниже

## Список обязательных секретов

### VITE_TMDB_API_KEY
- **Описание**: API ключ для The Movie Database (TMDB)
- **Значение**: Ваш TMDB API ключ
- **Получить**: https://www.themoviedb.org/settings/api

### VITE_BOT_TOKEN
- **Описание**: Токен Telegram бота
- **Значение**: Токен, полученный от @BotFather
- **Формат**: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

### VITE_BOT_USERNAME
- **Описание**: Username Telegram бота (без @)
- **Значение**: Имя вашего бота
- **Пример**: `onceappbot`

### VITE_SUPABASE_URL
- **Описание**: URL вашего Supabase проекта
- **Значение**: URL из настроек Supabase
- **Формат**: `https://xxxxx.supabase.co`

### VITE_SUPABASE_ANON_KEY
- **Описание**: Публичный (anon) ключ Supabase
- **Значение**: Anon key из настроек Supabase
- **Получить**: Supabase Dashboard → Project Settings → API

## Проверка

После добавления всех секретов:
1. Сделайте commit и push в ветку `main`
2. Проверьте статус GitHub Actions в разделе **Actions**
3. Убедитесь, что деплой прошел успешно

## Важно

⚠️ **Никогда не коммитьте файл `.env` в репозиторий!**
- Файл `.env` уже добавлен в `.gitignore`
- Все API ключи хранятся только локально и в GitHub Secrets
- При клонировании репозитория создайте свой `.env` файл на основе значений выше

