# Audio Engineer Trainer

Первый прототип тренажёра слуха для звукорежиссёров.

## Сейчас есть

- EQ Bell Cut training
- определение вырезанной частоты
- случайные задания
- 4 варианта ответа
- счёт и точность
- повторное прослушивание
- синтетический audio source, поэтому внешние WAV-файлы для первого прототипа не нужны

## Запуск локально

Можно просто открыть `index.html` в браузере.

Для разработки удобнее использовать локальный сервер, например VS Code Live Server.

## GitHub Pages

1. Создай публичный репозиторий.
2. Загрузи `index.html`, `style.css` и `app.js`.
3. Открой Settings → Pages.
4. В разделе Build and deployment выбери:
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`
5. Сохрани настройки.

После публикации GitHub даст ссылку на сайт.

## Следующий этап

- Compression training
- Saturation training
- Attack / Release
- EQ gain identification
- Q identification
- уровни сложности
- статистика по диапазонам
- сохранение прогресса в localStorage
