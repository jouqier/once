# 🚀 Быстрый старт с GitHub Pages

## За 5 минут до деплоя

### 1️⃣ Подготовьте ключи API

**TMDB API:**
- Регистрация: https://www.themoviedb.org/
- Получите API Key (v3): Settings → API

**Telegram Bot:**
- Найдите @BotFather в Telegram
- Создайте бота: `/newbot`
- Скопируйте токен и username

---

### 2️⃣ Создайте репозиторий на GitHub

1. Создайте новый репозиторий на github.com
2. Запушьте код:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/repo-name.git
git push -u origin main
```

---

### 3️⃣ Настройте GitHub

**Добавьте секреты:**
1. Репозиторий → **Settings** → **Secrets and variables** → **Actions**
2. Нажмите **"New repository secret"** 3 раза и добавьте:

| Имя | Значение |
|-----|---------|
| `VITE_TMDB_API_KEY` | Ваш TMDB API ключ |
| `VITE_BOT_TOKEN` | Токен Telegram бота |
| `VITE_BOT_USERNAME` | Username бота (без @) |

**Включите Pages:**
1. **Settings** → **Pages**
2. **Source** → выберите **"GitHub Actions"**

---

### 4️⃣ Обновите конфигурацию

В файле `vite.config.js` замените `'my-mini-app'` на имя вашего репозитория:

```javascript
base: process.env.GITHUB_PAGES === 'true' ? '/название-вашего-репозитория/' : '/',
```

**Пример:**
```javascript
base: process.env.GITHUB_PAGES === 'true' ? '/telegram-movies/' : '/',
```

---

### 5️⃣ Деплой!

```bash
git add vite.config.js
git commit -m "Configure base path for GitHub Pages"
git push
```

Готово! 🎉

- Следите за деплоем: **Actions** → **Deploy to GitHub Pages**
- После завершения сайт будет доступен:
  ```
  https://username.github.io/repo-name/
  ```

---

### 6️⃣ Настройте Telegram бота

1. Откройте @BotFather
2. Отправьте: `/setmenubutton`
3. Выберите бота
4. Укажите URL: `https://username.github.io/repo-name/`

---

## Готово!

Ваш Mini App работает! 🚀

**Что дальше?**
- 📖 Полная документация: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 🔧 Настройка окружения: [ENV_SETUP.md](./ENV_SETUP.md)
- 📚 Описание проекта: [README.md](./README.md)

---

## 🆘 Проблемы?

**404 на странице:**
- Проверьте base path в `vite.config.js`
- Убедитесь, что Pages включен (Settings → Pages → GitHub Actions)

**API не работает:**
- Проверьте секреты (Settings → Secrets and variables → Actions)
- Перезапустите workflow вручную (Actions → Re-run jobs)

**Деплой не запускается:**
- Проверьте, что файл `.github/workflows/deploy.yml` существует
- Убедитесь, что пушите в ветку `main`

