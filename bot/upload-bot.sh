#!/bin/bash

# Скрипт для загрузки бота на сервер
# Использование: ./upload-bot.sh [user@server-ip] [remote-path]

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка аргументов
if [ -z "$1" ]; then
    echo -e "${RED}❌ Ошибка: Укажите сервер${NC}"
    echo "Использование: ./upload-bot.sh user@server-ip [remote-path]"
    echo "Пример: ./upload-bot.sh user@192.168.1.100 ~/bot"
    exit 1
fi

SERVER="$1"
REMOTE_PATH="${2:-~/bot}"

# Проверка, что мы в правильной директории
if [ ! -f "package.json" ] || [ ! -f "index.js" ]; then
    echo -e "${RED}❌ Ошибка: Запустите скрипт из папки bot/${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Загрузка бота на сервер...${NC}"
echo -e "Сервер: ${YELLOW}${SERVER}${NC}"
echo -e "Путь: ${YELLOW}${REMOTE_PATH}${NC}"
echo ""

# Загрузка через rsync с исключениями
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.DS_Store' \
  --exclude='Thumbs.db' \
  --exclude='.vscode' \
  --exclude='.idea' \
  --exclude='*.log' \
  --exclude='logs' \
  --exclude='.pm2' \
  --exclude='.vercel' \
  --exclude='.git' \
  ./ ${SERVER}:${REMOTE_PATH}/

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Загрузка завершена успешно!${NC}"
    echo ""
    echo -e "${YELLOW}📝 Следующие шаги на сервере:${NC}"
    echo "   1. ssh ${SERVER}"
    echo "   2. cd ${REMOTE_PATH}"
    echo "   3. npm install --production"
    echo "   4. nano .env (создать файл с переменными окружения)"
    echo "   5. pm2 start index.js --name movie-bot"
    echo "   6. pm2 save"
else
    echo ""
    echo -e "${RED}❌ Ошибка при загрузке${NC}"
    exit 1
fi

