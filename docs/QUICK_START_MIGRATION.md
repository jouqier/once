# Быстрый старт: Миграция данных

## Для пользователей с проблемами

### Простое решение
1. Перезагрузите страницу (F5)
2. Готово! Данные автоматически исправлены

### Если не помогло
1. F12 (открыть консоль)
2. Ввести: `dataRepair.repair()`
3. Перезагрузить страницу

---

## Для разработчиков

### Что изменилось
- Версия данных: `1.0` → `1.1`
- Структура movies: объект → массивы
- Добавлена автоматическая миграция
- Добавлена валидация данных

### Файлы
- `src/services/data-migration.js` - логика миграции
- `src/services/user-data-store.js` - обновлен для миграции
- `src/services/data-repair-utility.js` - утилита отладки

### Тестирование
```javascript
// В консоли браузера
dataRepair.diagnose()  // Проверить данные
dataRepair.repair()    // Исправить проблемы
```

### Добавление новой миграции
1. Увеличить `CURRENT_VERSION` в `data-migration.js`
2. Добавить метод `_migrateFromX_Y(data)`
3. Зарегистрировать в `migrations`
4. Обновить `migrate()` метод

---

## Команды утилиты

```javascript
dataRepair.diagnose()     // Диагностика
dataRepair.repair()       // Исправление
dataRepair.backup()       // Резервная копия
dataRepair.listBackups()  // Список копий
dataRepair.restore(key)   // Восстановление
dataRepair.help()         // Справка
```

---

## Документация
- `DATA_MIGRATION_GUIDE.md` - полное руководство
- `USER_DATA_FIX.md` - для пользователей
- `MIGRATION_SUMMARY.md` - сводка изменений
