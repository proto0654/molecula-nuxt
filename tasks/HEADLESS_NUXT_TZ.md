# WebLaba headless — полное ТЗ и чекпоинт

> **Для следующей итерации / нового чата:** читать этот файл целиком.  
> Ниже: (A) где остановились, (B) исходное ТЗ пользователя **без сокращений и без переписывания**.

Связанные файлы:

- [`api-real-response.md`](../docs/api-real-response.md) — фактическая структура WP API
- [`../CONTEXT.md`](../CONTEXT.md) — короткий стек / entry points
- [`ROADMAP.md`](ROADMAP.md) — STEPs 1–19 Done; case visual redesign + composition done; next = full molecular → route transition

---

# A. ГДЕ МЫ СЕЙЧАС ОСТАНОВИЛИСЬ

**Дата чекпоинта:** 2026-08-26  
**Ветка:** `feat/nuxt-headless-foundation` (от `main`)  
**Удалено намеренно:** ветка `feat/headless-api-foundation` (неудачная Vite-API итерация; не переносить)

## Статус шагов из §27 IMPLEMENTATION ORDER

| STEP | Описание | Статус |
|------|----------|--------|
| 1 | Inspect existing repository | **DONE** |
| 2 | Create/migrate to Nuxt 4 | **DONE** |
| 3 | Install/configure Tailwind | **DONE** |
| 4 | Preserve existing Three.js molecular hero | **DONE** |
| 5 | Create runtime config for WordPress API | **DONE** |
| 6 | Inspect real API responses | **DONE** |
| 7 | Document actual API structure | **DONE** → [`docs/api-real-response.md`](../docs/api-real-response.md) |
| 8 | Create TypeScript API types (raw + proposed domain) | **DONE** → [`app/types/wp/`](../app/types/wp/) |
| 9 | Create API client/services | **DONE** → [`app/api/`](../app/api/) |
| 10 | Create normalized portfolio/case models (mappers) | **DONE** → [`app/domain/portfolio/`](../app/domain/portfolio/) |
| 11 | Portfolio archive + pagination | **DONE** → `/portfolio` + `usePortfolio` |
| 12 | Case route with real data | **DONE** → `/portfolio/[slug]` |
| 13 | Conditional case components | **DONE** → [`app/components/case/`](../app/components/case/) |
| 14 | Basic prev/next | **DONE** → `getAdjacentCases` (menu_order ASC, date DESC) |
| 15 | Connect menu API if available | **DONE** → `app/api/menus.ts` + `useWpMenu` (`menus/v1`) |
| 16 | Prerender routes for portfolio slugs | **DONE** → `nitro:config` hook (~59 slugs) |
| 17 | GitHub Pages deploy config | **DONE** (workflow + baseURL + prerender) |
| 18 | Test local dev | **DONE** (build/prerender smoke) |
| 19 | Test production build | **DONE** (`npm run build`: prerendered 122 routes) |

Foundation-итерация закрыта. **Case visual redesign (§25) + composition pass done.** Не ломать conditional rendering.

## Что уже в репозитории (факт)

- **Стек:** Nuxt 4.5 + Vue 3 + TypeScript + Tailwind 4 + Three.js + GSAP
- **Node:** `^22.19.0` (`engines` в `package.json`)
- **Home `/`:** `ClientOnly` → `MolecularHero.vue` → `mountHeroApp.ts` + `TransitionController.transitionTo` → Nuxt routes (Работы → `/portfolio`)
- **API:** `app/api/client.ts` + portfolio/menus/pages/media; components не знают REST URL
- **Normalize:** `normalizePortfolioPost` → `Case`; absence = `null` / `[]`
- **Portfolio:** listing + WP header pagination; case page = editorial inspection (12-col grid, CaseShell chrome); Interface = `landing_screen` + repeater (inner-pages 3-col / masonry); sequential `getCaseComposition` markers including NEXT; lightbox + `useCaseScrollEntry` (L1 fade / L2 lift / L3 gallery+slices); in-page case→case via `useCasePageTransition`; prev/next via slim index + titles
- **Prerender:** all portfolio slugs queued at generate/build via live WP API
- **Deploy:** `.github/workflows/deploy.yml` → `nuxt generate` + `NUXT_APP_BASE_URL`
- **Case docs:** [`docs/CASES.md`](../docs/CASES.md), [`docs/CONTENT.md`](../docs/CONTENT.md)

## Следующая итерация

**Выбранный scope:** полный molecular → route transition (сейчас foundation `transitionTo`).

Позже (пока не попросят): `/about`, `/services`, `/contact`.

Мелкий долг: unused menu composable, SEO canonical — [`ROADMAP.md`](ROADMAP.md) → Foundation gaps.  
Не ломать content pipeline, conditional rendering, case visual system.

Acceptance предыдущих итераций — §28 (foundation) + case redesign + composition pass (sequential markers, sparse recipes, motion levels, case→case reveal, no WebGL on case).

---

# B. ИСХОДНОЕ ТЗ (как прислал пользователь)

Ниже — полный текст требований. Содержимое сохранено; разметка слегка структурирована заголовками для навигации, смысл и формулировки не сокращались и не «улучшались».

---

Переключаемся на главную ветку гита.

Ветку heades api foundation удаляем. не удачная итерация.

Затем создаем новую ветку переключаемся в нее и продолжаем

Мы продолжаем разработку нового headless-проекта WebLaba.

Сейчас уже есть рабочий прототип нового molecular hero на TypeScript + Three.js с интерактивной 3D-молекулой, navigation, focus, selection и transition foundation.

Следующая задача — перевести проект на нормальную архитектуру Nuxt 4 + Vue 3 + TypeScript + Tailwind и подключить реальные данные существующего WordPress сайта.

ВАЖНО:

На этом этапе НЕ делать redesign кейсов.

Сначала нужно:
1. привести архитектуру проекта в порядок;
2. подключить реальный WordPress REST API;
3. проверить фактическую структуру ответа API;
4. типизировать данные;
5. вывести реальный архив портфолио;
6. вывести реальные страницы кейсов;
7. сохранить conditional rendering существующей WordPress-логики;
8. подготовить основу для дальнейших visual transitions и redesign.

Visual redesign case pages будет отдельной следующей итерацией.

---

## 1. SOURCE OF TRUTH

Существующий production WordPress сайт:

https://weblaba.ru/

WordPress API:

https://weblaba.ru/wp-json/

Кейсы:

/wp-json/wp/v2/portfolio

Отдельный кейс:

/wp-json/wp/v2/portfolio/{id}

Категории:

/wp-json/wp/v2/portfolio_category

Pages:

/wp-json/wp/v2/pages

Media:

/wp-json/wp/v2/media/{id}

Также в production WordPress установлены/используются плагины:

- WP REST API V2 Menus
- ACF to REST API

Нужно НЕ предполагать структуру ACF response.

Сначала фактически запросить API и посмотреть реальные ответы.

Существующий проект построен на WordPress SSR и ACF.

В существующей модели portfolio используются:

WordPress core:
- title
- content
- featured image
- slug
- tags
- menu_order

ACF:
- landing_screen
- repeater[].repeater_field
- screenshot_image
- screen-mobile
- block_ratio
- video
- podpis_vozle_mokapa_mobily_pravo
- case_dark_bg_color
- case_dark_bg_color_lock

Некоторые данные могут отсутствовать.

ВАЖНО:
условный рендеринг — часть текущей бизнес-логики.

Не считать, что каждый case имеет одинаковый набор данных.

---

## 2. EXISTING CASE LOGIC

Существующая страница кейса примерно работает так:

1. Featured background
2. Video — если есть
3. H1
4. Back to portfolio
5. CMS content — если есть
6. Inner-pages gallery — если есть
7. Mobile mockup — если есть
8. Mobile signature — если есть соответствующий блок
9. Slice grid — если есть screen-mobile + valid block_ratio
10. Footer / prev / next

Не менять эту бизнес-логику на этом этапе.

Нужно воспроизвести её в Nuxt-компонентах через conditional rendering.

Пример:

```vue
<CaseVideo v-if="case.video" />

<CaseContent v-if="case.content" />

<CaseGallery
  v-if="case.gallery?.length"
/>

<CaseMobile
  v-if="case.mobile"
/>

<CaseSlices
  v-if="case.mobileSlices"
/>
```

Не создавать пустые блоки только потому, что компонент существует.

---

## 3. TECH STACK

Перевести проект на:

Nuxt 4
Vue 3
TypeScript
Tailwind CSS
Three.js
GSAP

Сохранять существующую Three.js implementation.

Не использовать React.

Не использовать React Three Fiber.

Не переписывать рабочую molecular math architecture.

Three.js должен оставаться отдельным 3D-layer.

Vue/Nuxt отвечает за:

application lifecycle
routing
data loading
layouts
UI
transitions

Three.js отвечает за:

scene
camera
molecule
atoms
bonds
labels
raycasting
focus
3D animation

Не смешивать эти обязанности.

---

## 4. TAILWIND

Tailwind нужно подключить сейчас, до начала дальнейшей верстки.

Использовать Tailwind для:

layout
spacing
responsive behavior
typography
positioning
component layout

Но не превращать проект в огромные utility-string компоненты.

Общие visual tokens должны быть доступны через CSS variables.

Создай базовую систему примерно:

```css
:root {
  --wl-bg: ...;
  --wl-text: ...;
  --wl-muted: ...;
  --wl-line: ...;
  --wl-accent: ...;
}
```

Не нужно пока придумывать окончательные дизайн-токены кейсов.

На этом этапе достаточно базовой UI foundation.

---

## 5. ENVIRONMENT

Локальная разработка:

Nuxt dev server

Данные должны приходить с production WordPress API:

https://weblaba.ru/wp-json/

Создай environment variable:

NUXT_PUBLIC_WP_API_BASE

или equivalent Nuxt runtime config.

Local default:

https://weblaba.ru/wp-json/

Не хардкодить URL API внутри компонентов.

Пример архитектуры:

```
runtimeConfig: {
  public: {
    wpApiBase: ''
  }
}
```

Важно:

локальный headless frontend не должен становиться источником данных.

WordPress production остаётся source of truth.

---

## 6. API LAYER

Не делать fetch непосредственно из страниц и компонентов.

Создать отдельный API layer.

Пример:

```
app/
  api/
    client.ts
    portfolio.ts
    menus.ts
    pages.ts
    media.ts
```

API functions:

getPortfolio()
getPortfolioPage(page, perPage)
getPortfolioCase(slug)
getPortfolioCategories()
getMenus()
getPage(slug)

Названия можно улучшить, если есть более удачная архитектура.

Главное:
компоненты не должны знать URL REST endpoints.

---

## 7. TYPESCRIPT TYPES

Создать явные types/interfaces для WordPress responses.

Отдельно:

raw WordPress response
normalized application model

Не использовать any, кроме действительно неизбежных мест API response.

Например:

```
type PortfolioPost = {
  id: number
  slug: string
  title: string
  excerpt?: string
  content?: string
  featuredImage?: string | null
  menuOrder?: number
  tags?: string[]
  acf?: ...
}
```

Но НЕ придумывай окончательную структуру ACF.

Сначала посмотри реальный API response.

---

## 8. API INSPECTION FIRST

До написания большого количества application code:

Выполни реальные API requests.
Посмотри response одного portfolio item.
Посмотри response нескольких portfolio items.
Посмотри response portfolio category.
Посмотри меню.
Определи, какие ACF fields реально возвращаются.
Определи структуру media fields.
Определи, как представлены repeater values.
Определи pagination headers.

Особенно важно проверить:

landing_screen
repeater
screenshot_image
screen-mobile
block_ratio
video
подпись mobile
case_dark_bg_color

Не заменяй отсутствующие данные выдуманными fallback values.

Если конкретное поле не приходит:
оставь его optional/null и зафиксируй проблему.

В конце этого этапа создай небольшой документ:

docs/api-real-response.md

с примерами структуры полученных responses.

Не добавляй туда огромные JSON responses.
Достаточно компактно описать фактическую структуру.

---

## 9. NORMALIZATION LAYER

Создай mapper:

raw WordPress response
→ normalized Case model

Например:

```
api/
  portfolio.ts

domain/
  portfolio/
    types.ts
    normalizePortfolio.ts
```

Цель:

Vue-компоненты должны получать удобный normalized object.

Например:

```
type Case = {
  id: number
  slug: string
  title: string
  content: string | null
  featuredImage: Media | null

  video: Media | null

  gallery: GalleryItem[]

  mobile: MobileVisual | null

  mobileSlices: MobileSlices | null

  accentColor: string | null

  menuOrder: number
}
```

Но структуру адаптируй к фактическому API.

Важно:
normalized model должна сохранять отсутствие данных.

Не превращать отсутствующий блок в пустой объект, если это ломает conditional rendering.

---

## 10. ROUTES

Создать:

/
/portfolio/
/portfolio/[slug]/

Home пока сохраняет существующий molecular hero.

Portfolio пока простой.

Case пока простой.

---

## 11. PORTFOLIO ARCHIVE

Создать:

pages/portfolio/index.vue

Пока без сложного дизайна.

Нужен простой listing.

Карточка должна использовать реальные WordPress данные:

featured image
title
category/tag если доступно
slug

Пример:

```
Portfolio
-------------------------

[ image ]
Title
Category

[ image ]
Title
Category

[ image ]
Title
Category

1 2 3 4 5 →
```

Не делать:

molecular archive
сложную 3D-карусель
сложные filters
новый visual system

Пока задача — проверить реальный content pipeline.

---

## 12. PAGINATION

Сделать pagination на уровне WordPress REST API.

Не загружать все 50+ cases и потом пагинировать только CSS/JS.

Использовать server/API pagination:

?page=1&per_page=...

Обязательно использовать pagination metadata из WordPress REST response headers.

Не хардкодить количество страниц.

При наличии:

X-WP-Total
X-WP-TotalPages

использовать их.

Сделать composable:

usePortfolio(page)

или equivalent.

---

## 13. CASE PAGE

Создать:

pages/portfolio/[slug].vue

Страница должна получить реальный post по slug.

Не использовать заранее прописанный список кейсов.

Case URL:

/portfolio/{slug}/

На первом этапе вывести обычную debug-friendly структуру:

CASE

title

featured image

content

video if exists

gallery if exists

mobile if exists

slices if exists

prev / next

Главное:
убедиться, что все conditional blocks реально получают данные.

---

## 14. CASE COMPONENTS

Даже несмотря на отсутствие redesign сейчас, сразу разделить блоки:

```
components/case/
  CaseHeader.vue
  CaseContent.vue
  CaseVideo.vue
  CaseGallery.vue
  CaseMobile.vue
  CaseSlices.vue
  CaseNavigation.vue
```

Каждый компонент отвечает только за свой блок.

Например:
CaseGallery не должен знать про CaseMobile.

---

## 15. PREV / NEXT

Существующий WordPress порядок:

menu_order ASC
then date DESC

Нужно сохранить существующую логику максимально близко к production.

На первом этапе допустим простой prev/next.

Важно:
не строить navigation на случайном array index загруженной страницы.

Если API не предоставляет готовый adjacent-post query,
создай корректный API/helper слой для определения prev/next.

Не переносить business logic в Vue component.

---

## 16. MENU

Проверить API меню через WP REST API V2 Menus.

Если меню реально доступно:
подключить его через API layer.

Но не делать сложный UI.

Нужно только получить:

label
url
hierarchy/order

Создать normalized menu type.

Если текущий меню API не возвращает структуру в ожидаемом виде:
не придумывать её, а документировать реальный response.

---

## 17. HOME / MOLECULAR HERO

Существующий molecular hero сохранить.

Перенести его в Nuxt/Vue wrapper.

Примерная архитектура:

```
components/
  molecular/
    MolecularHero.vue
    MoleculeScene.ts
    MoleculeController.ts
```

Vue-компонент отвечает за:

mount/unmount
canvas ref
lifecycle

Three.js classes отвечают за:

scene
renderer
animation
interaction

При unmount обязательно dispose:

renderer
geometries
materials
event listeners
animation loops

Не переписывать уже работающую molecular math.

---

## 18. PAGE TRANSITIONS FOUNDATION

Сразу заложить место для будущих transitions.

Нужен отдельный:

TransitionController

Он должен быть независим от WordPress API.

Пока можно реализовать простой route/page transition.

Но API:

transitionTo(route, options?)

должен быть рассчитан на будущий сценарий:

molecular atom
→ focus
→ zoom
→ route navigation
→ new page reveal

Не реализовывать пока полный final transition.

Только foundation.

---

## 19. GITHUB PAGES

Проект должен готовиться к preview deployment на GitHub Pages.

Предполагаемый сценарий:

```
local development
    ↓
npm run dev
    ↓
production WordPress API

push to GitHub
    ↓
GitHub Actions
    ↓
Nuxt generate/prerender
    ↓
GitHub Pages
```

Нужно сразу заложить корректный base URL.

Не хардкодить:

/weblaba/

или другой repository path.

Использовать environment/config.

Подготовить:

.github/workflows/deploy.yml

но не обязательно включать deployment автоматически, если для этого пока не хватает repo information.

Создай конфиг так, чтобы его потом можно было легко активировать.

---

## 20. STATIC PRERENDER / DYNAMIC ROUTES

Важно:

GitHub Pages не является runtime SSR сервером.

Поэтому case routes должны быть доступны после static generation.

Во время Nuxt build нужно получить список portfolio slugs из WordPress API и добавить routes:

/portfolio/
/portfolio/case-1/
/portfolio/case-2/
/portfolio/case-3/
...

Не прописывать список руками.

Использовать реальный API.

На локальном dev route /portfolio/[slug] должен также работать динамически.

Сделать архитектуру так, чтобы один и тот же source of truth использовался и для local dev, и для prerender.

---

## 21. ERROR STATES

Добавить минимально:

loading state
API error state
404 case
empty portfolio result

Не делать красивый final design.

Пример:

Portfolio unavailable.

Try again later.

---

## 22. IMAGE HANDLING

Пока использовать реальные WordPress media URLs.

Не скачивать assets в Git repository.

Не копировать все изображения локально.

Использовать responsive image strategy там, где это возможно.

С учетом production данных потенциально доступны:

full
weblaba-screen
weblaba-landing
WebP variants

Не ломать существующие media URLs.

Если фактическая API response не позволяет удобно выбрать нужный image size:
сначала задокументировать response и реализовать максимально безопасный fallback.

---

## 23. SEO FOUNDATION

Не делать полный SEO system сейчас.

Но заложить:

case title
description / excerpt
canonical route

И убедиться, что portfolio case routes могут быть prerendered.

---

## 24. FILE / CODE QUALITY

Проект должен быть:

TypeScript-first
componentized
readable
no giant page components
no API calls directly inside deeply nested components
no any where avoidable
no duplicated normalization logic

Prefer composables and services.

---

## 25. DO NOT DO NOW

На этом этапе НЕ делать:

final case redesign
WebGL inside case pages
fancy case gallery
3D screenshot animations
new visual effects
new molecular effects
complex archive animations
advanced filtering
search
infinite scroll
CMS admin changes
modifications to production WordPress
modification of existing ACF model
migration of existing production theme

Сейчас мы только подключаем новый headless frontend к существующему WordPress.

---

## 26. IMPORTANT: inspect current project before changing architecture

Перед изменениями:

Посмотри существующую структуру repository.
Определи, что уже сделано для molecular hero.
Не удаляй working Three.js code.
Определи текущий build setup.
Проверь package.json.
Проверь существующий TypeScript configuration.
Проверь текущие assets.
Определи, насколько безопасно мигрировать текущий Vite setup в Nuxt.

Если текущий проект проще создать заново на Nuxt,
сначала предложи migration plan,
но не уничтожай существующую working implementation.

Если возможно сохранить существующие Three.js modules — сохранить.

---

## 27. IMPLEMENTATION ORDER

Работай строго в таком порядке:

STEP 1
Inspect existing repository.

STEP 2
Create/migrate to Nuxt 4.

STEP 3
Install/configure Tailwind.

STEP 4
Preserve existing Three.js molecular hero.

STEP 5
Create runtime config for WordPress API.

STEP 6
Inspect real API responses.

STEP 7
Document actual API structure.

STEP 8
Create TypeScript API types.

STEP 9
Create API client/services.

STEP 10
Create normalized portfolio/case models.

STEP 11
Create portfolio archive with real data + pagination.

STEP 12
Create case route with real data.

STEP 13
Create conditional case components.

STEP 14
Create basic prev/next.

STEP 15
Connect menu API if available.

STEP 16
Prepare prerender routes for all portfolio slugs.

STEP 17
Prepare GitHub Pages deployment configuration.

STEP 18
Test local dev.

STEP 19
Test production build.

Do not skip directly to visual redesign.

---

## 28. ACCEPTANCE CRITERIA

At the end of this iteration:

LOCAL:

/
→ working molecular hero

/portfolio/
→ real portfolio listing from WordPress
→ pagination works

/portfolio/some-real-slug/
→ real WordPress case
→ title works
→ content works if available
→ gallery works if available
→ video works if available
→ mobile works if available
→ slices work if available
→ absent fields do not render empty sections

API:
→ centralized
→ typed
→ normalized

ARCHITECTURE:
→ Nuxt 4
→ Vue 3
→ TypeScript
→ Tailwind
→ Three.js
→ GSAP

DEPLOYMENT:
→ production build succeeds
→ architecture prepared for GitHub Pages
→ portfolio slugs can be prerendered

IMPORTANT:

The application must work correctly even when different cases have completely different combinations of available content fields.

The absence of content must be treated as a normal valid state, not an error.

---

## 29. FIRST RESPONSE

Before modifying code, first give me:

current repository structure you found;
current framework/build setup;
current molecular hero entry points;
proposed Nuxt migration plan;
exact WordPress API endpoints you will inspect;
expected changes to package.json;
any potentially dangerous migration points.

Then implement STEP 1 → STEP 8.

After STEP 8 stop and report:

actual API structure discovered;
which ACF fields are available;
which fields are missing;
proposed normalized TypeScript types.

Do NOT continue automatically into visual case redesign.

---

# C. КРАТКИЕ ФАКТЫ API (уже проверено, не выдумывать заново)

См. полный документ: [`docs/api-real-response.md`](../docs/api-real-response.md).

- ACF ключ: `acf`; пустые media/repeater = `false`; пустой текст часто `""`
- Меню: использовать `/menus/v1/...`; `/wp/v2/menus` = 401
- Pagination: `X-WP-Total`, `X-WP-TotalPages` (CORS expose OK)
- Composite sort `menu_order ASC, date DESC` в REST нет — prev/next через slim index + helper
- Отдельных WebP URL в JSON нет
- Единственная portfolio_category: `legacy` (124)

---

# D. ПРОМПТ ДЛЯ СЛЕДУЮЩЕГО ЧАТА (короткий)

```
Продолжаем headless WebLaba: STEP 9–19 + §28 foundation done; case visual redesign (§25) + composition pass done.

Источник правды: tasks/HEADLESS_NUXT_TZ.md
Сверка: tasks/ROADMAP.md
Case visual: app/assets/css/case.css + docs/CASES.md (composition, markers, Interface inner-pages, lightbox, useCaseScrollEntry, case→case)
API: app/api/ + docs/api-real-response.md

Scope: полный molecular → route transition (сейчас foundation transitionTo; case→case уже in-page).
Не ломать conditional rendering, absence-as-null, case visual / composition system.
Не делать /about /services /contact, пока не попросят.
```
