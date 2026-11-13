# ASIYA — Islamic App

Мобильное веб-приложение (PWA): Коран, намаз, дуа и исламские знания.

## ▶ Запустить и проверить приложение

**[Открыть ASIYA в браузере](https://germany95reg-boop.github.io/ASIYA-Islamic-App/)**

Ссылка работает после включения GitHub Pages в настройках репозитория. Если открывается 404:

1. Открой [Settings → Pages](https://github.com/germany95reg-boop/ASIYA-Islamic-App/settings/pages).
2. В разделе **Build and deployment** выбери **Deploy from a branch**.
3. Укажи ветку **main** и папку **/(root)**, затем **Save**.
4. Подожди публикации и снова открой ссылку выше.

После новых коммитов в `main` GitHub Pages обновляет сайт автоматически. Если видишь старую версию, обнови страницу; в случае установленного PWA также проверь кэш браузера.

### Установить на телефон

- **iPhone:** открой ссылку в Safari → «Поделиться» → «На экран Домой».
- **Android:** открой ссылку в Chrome → меню → «Установить приложение» или «Добавить на главный экран».

Это веб-приложение, **не APK**. Для первого открытия и загрузки новых сур нужен интернет; часть данных может быть доступна офлайн после загрузки.

### Что тестировать

- Открой Аль-Фатиху, затем любую длинную суру.
- Проверь чтение, перевод, аудио, скорость и повторение.
- Раскрой «Разбор слов · учебный просмотр», нажми на несколько арабских слов и проверь появление подсказки прямо под выбранным словом.
- Проверь поворот экрана, размер шрифта, закладки и возврат к чтению.

**Важно:** пословный учебный режим пока не содержит проверенных значений и произношения; не используй его как источник таджвида. Текст и переводы требуют сверки с указанными источниками.

## Разработка

Главная страница: `index.html`. PWA: `manifest.webmanifest`, `sw.js`. Политика проверки пословных материалов: `QURAN_WORD_REVIEW.md`, реестр: `quran-word-sources.json`.

## Quran surah completeness reference
The reader and service worker include a fixed 114-entry verse-count table for the standard Kufan/Hafs numbering (total **6,236** numbered ayahs). This table is checked independently of the numberOfAyahs metadata returned by the live API. Sources for the numbering convention and metadata: [Tanzil Quran Metadata](https://tanzil.net/docs/Quran_Metadata) and [Quran.ws numbering-system registry](https://quran.ws/docs/guidelines/reference/registries/). Different traditional verse-numbering systems exist; ASIYA currently uses Kufan/Hafs counts. This is a structural completeness check, **not** a certification of the exact Arabic letters, translation, or tajwid. The app must not silently substitute another numbering convention.
