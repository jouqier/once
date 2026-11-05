#!/bin/bash

# Скрипт для загрузки бота из Git репозитория на сервер
# Использование: ./deploy-from-git.sh [repo-url] [branch] [bot-dir]

# Конфигурация по умолчанию
REPO_URL="${1:-https://github.com/jouqier/once.git}"
BRANCH="${2:-main}"
BOT_DIR="${3:-$HOME/bot}"

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Загрузка бота из Git репозитория...${NC}"
echo -e "Репозиторий: ${YELLOW}${REPO_URL}${NC}"
echo -e "Ветка: ${YELLOW}${BRANCH}${NC}"
echo -e "Папка: ${YELLOW}${BOT_DIR}${NC}"
echo ""

# Проверка наличия Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git не установлен${NC}"
    echo "Установите Git: sudo apt install git -y"
    exit 1
fi

# Создание временной директории
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

cd "$TEMP_DIR"

# Клонирование репозитория
echo "📥 Клонирование репозитория..."
if ! git clone --depth 1 --branch "$BRANCH" "$REPO_URL" repo 2>/dev/null; then
    echo -e "${RED}❌ Ошибка при клонировании репозитория${NC}"
    echo "Проверьте URL репозитория и доступ к интернету"
    exit 1
fi

# Проверка наличия папки bot
if [ ! -d "repo/bot" ]; then
    echo -e "${RED}❌ Папка bot не найдена в репозитории${NC}"
    exit 1
fi

# Копирование папки bot
echo "📦 Копирование папки bot..."
if [ -d "$BOT_DIR" ]; then
    echo "Папка $BOT_DIR уже существует, создается резервная копия..."
    BACKUP_DIR="${BOT_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    mv "$BOT_DIR" "$BACKUP_DIR"
    echo "Резервная копия создана: $BACKUP_DIR"
fi

cp -r repo/bot "$BOT_DIR"

# Переход в папку бота
cd "$BOT_DIR"

# Проверка наличия package.json
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json не найден${NC}"
    exit 1
fi

# Установка зависимостей
echo "📥 Установка зависимостей..."
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}⚠️  npm не найден, пропуск установки зависимостей${NC}"
else
    npm install --production
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Зависимости установлены${NC}"
    else
        echo -e "${YELLOW}⚠️  Ошибка при установке зависимостей${NC}"
    fi
fi

# Проверка наличия .env
if [ ! -f ".env" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Файл .env не найден${NC}"
    if [ -f ".env.example" ]; then
        echo "Создайте .env на основе .env.example:"
        echo "  cp .env.example .env"
        echo "  vi .env  # или cat > .env << 'EOF' ..."
    else
        echo "Создайте файл .env с переменными окружения:"
        echo "  cat > .env << 'EOF'"
        echo "  BOT_TOKEN=your_token"
        echo "  TMDB_API_KEY=your_key"
        echo "  WEB_APP_URL=https://your-url.com"
        echo "  BOT_USERNAME=your_username"
        echo "  APP_SHORT_NAME=app"
        echo "  EOF"
        echo "  # Или используйте: vi .env"
    fi
fi

echo ""
echo -e "${GREEN}✅ Бот успешно загружен!${NC}"
echo ""
echo -e "${YELLOW}📝 Следующие шаги:${NC}"
echo "   1. cd $BOT_DIR"
if [ ! -f ".env" ]; then
    echo "   2. Создайте .env файл:"
    echo "      cat > .env << 'EOF'"
    echo "      BOT_TOKEN=your_token"
    echo "      TMDB_API_KEY=your_key"
    echo "      WEB_APP_URL=https://your-url.com"
    echo "      BOT_USERNAME=your_username"
    echo "      APP_SHORT_NAME=app"
    echo "      EOF"
    echo "      # Или используйте: vi .env"
    echo "   3. pm2 start index.js --name movie-bot"
else
    echo "   2. pm2 start index.js --name movie-bot"
fi
if [ ! -f ".env" ]; then
    echo "   4. pm2 save"
else
    echo "   3. pm2 save"
fi
echo ""
echo "Для обновления бота запустите этот скрипт снова."

