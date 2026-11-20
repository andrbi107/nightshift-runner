# Nightshift Runner

> یک runner بی‌پایان نئون-سایبرپانک side-scroller با فیزیک jump/slide/boost و حفاظ hull — PWA با Vanilla JS.

[![Version](https://img.shields.io/badge/version-v0.0.5-blue)](https://github.com/andrbi107/nightshift-runner/releases/tag/v0.0.5) [![PWA](https://img.shields.io/badge/PWA-installable-purple)](https://andrbi107.github.io/nightshift-runner/) [![deps](https://img.shields.io/badge/deps-Howler.js_local-blueviolet)](https://github.com/andrbi107/nightshift-runner) [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

🎮 **[بازی کن](https://andrbi107.github.io/nightshift-runner/)** — نسخه‌ی آنلاین روی GitHub Pages
📦 **[مخزن گیت‌هاب](https://github.com/andrbi107/nightshift-runner)** · 🏷️ **[Release v0.0.5](https://github.com/andrbi107/nightshift-runner/releases/tag/v0.0.5)**

---

## تغییرات v0.0.5 (جدید)

**همه‌ی بازی‌ها (v0.0.5)** — لایه‌ی متای محصول افزوده شد: **صفحه‌ی لودینگ** برندشده، **منوی اصلی** (راهنما / آمار و تاریخچه / امتیازات و رقابت / تنظیمات)، **تاریخچه و آمار** (آخرین بازی‌ها + مجموع/میانگین/بهترین + دستاوردها)، **جدول امتیازات و رقابت** (مدال‌های 🥇🥈🥉 + تیرهای Bronze→Diamond + کد اشتراک رکورد)، و **بروزرسانی خودکار PWA** (بنر «نسخه‌ی جدید آماده است» → با یک کلیک بروزرسانی، نسخه‌ی جدید جایگزین می‌شود). `sw.js` بازنویسی شد: cache v5 + network-first برای صفحات (دریافت خودکار HTML جدید) + skipWaiting از طریق بنر + رفع باگ cache آفلاین SFX (پسوند .wav).

---

## تغییرات v0.0.4

**سکه‌های قابل‌جمع** (+۵ امتیاز) + powerup **Magnet** (۶s جذب سکه) + دستاوردهای Long Runner / Marathoner / Iron Runner.

**همه‌ی بازی‌ها (v0.0.4)** — `gamekit.js` مشترک + `vendor/howler.min.js` محلی: صدای Howler با SFX خودکار (pickup/collision/game-over از طریق پل MUX)، صفحه‌ی **راهنما**، صفحه‌ی **تنظیمات** (قطع/وصل صدا)، قلاب‌های تست (`render_game_to_text`/`advanceTime`)، **فول‌اسکرین** (کلید F)، و سیستم **دستاوردها**. cache سرویس‌ورکر به v4 ارتقا یافت (آفلاین کامل با vendor).

---

## تغییرات v0.0.3

**Nightshift Runner** — ارتفاع پرش کمتر شد (۱۲۶px) ولی تعداد پرش به ۳ رسید (با قدرت کاهشی ۱→۰.۸۲→۰.۶۸).

---

## تغییرات v0.0.2

**Nightshift Runner** — double-jump: هر بار روی زمین، ۲ پرش در دسترس (پرش دوم ۸۵٪ قدر). haptic روی jump/damage/game-over.

**همه‌ی بازی‌ها** — `mobile-ux.js` مشترک (haptics/install prompt/version stamp) + cache sw.js به v2.

---

## تغییرات v0.0.1

نسخه‌ی پایه‌ی اولیه (پیش از پایداری) — runner بی‌پایان side-scroller نئون-سایبرپانک؛ jump/slide/boost، ۳ نوع مانع، pickup energy core/shield، حفاظ hull؛ PWA (manifest + service worker).

---

## معرفی

Nightshift Runner یک runner بی‌پایان side-scroller با حال‌وهوای شهر سایبرپانک نئون در شب است. بازیکن یک سیلوئت سیاه با visor cyan است که به‌صورت auto-run به راست می‌دود؛ world به چپ scroll می‌شود و موانع/collectibleها از لبه‌ی راست نزدیک می‌شوند. تمام هویت بصری با primitives کانواس ساخته شده: آسمان gradient آبی-بنفش، ماه درخشان، دو لایه‌ی parallax ساختمان با پنجره‌های روشن، و یک خط نئون cyan-magenta در لبه‌ی خیابان.

هدف: تا حد ممکن زنده ماندن و امتیاز جمع کردن. امتیاز = فاصله (۱ امتیاز هر ~۸px) + هسته‌های انرژی (+۱۰). run با صفر شدن hull تمام می‌شود؛ هر برخورد ۱ hull کم می‌کند و ۱ ثانیه invulnerability می‌دهد. سرعت از ۳۲۰ px/s تا cap ۷۶۰ رشد می‌کند و فاصله‌ی اسپاون فشرده‌تر می‌شود.

## ویژگی‌ها

- **auto-run + scroll چپ** — بازیکن در x ثابت، world با سرعت رشدی حرکت می‌کند.
- **jump، slide، boost** — پرش با gravity، slide با hitbox کوتاه، boost با بار شارژی pulse.
- **سه نوع مانع** — barrier magenta (پرش)، laser gate red (slide)، drone hex تیره با چراغ قرمز (پرش یا slide).
- **collectibleها** — energy core cyan (+۱۰ + شارژ boost) و shield pack green (+۱ hull).
- **۳ hull + ۱s invuln** چشمک‌زن، screen shake، فلش red.
- **boost economy** — ۴ هسته = یک بار کامل؛ boost ۲s با سرعت ×۱.۷ و امتیاز ×۲، cooldown ۸s.
- **رشد دشواری** — سرعت خطی با فاصله رشد، فاصله‌ی اسپاون از ~۴۶۰px به ~۲۶۰px می‌رسد.
- **کنترل کامل تاچ + کیبورد + موس**.
- **PWA آفلاین** — پس از اولین بارگذاری.

## نحوه‌ی بازی

| دستگاه | پرش | slide | boost | توقف |
|---|---|---|---|---|
| **کیبورد** | Space/↑/W | ↓/S | Shift (نگه‌دار) | P/Esc |
| **تاچ** | tap نیمه‌ی بالا | tap نیمه‌ی پایین یا swipe پایین | دکمه‌ی BOOST | دکمه‌ی Pause |
| **موس** | کلیک نیمه‌ی بالا | کلیک نیمه‌ی پایین | دکمه‌ی BOOST روی صفحه | دکمه‌ی Pause |

### مکانیک بازی

- **auto-run**: `distance += speed*dt`؛ speed = `min(MAX, BASE + distance*SPEED_K)` × `BOOST_MULT` هنگام boost.
- **jump**: `vy = JUMP_VEL` فقط هنگام grounded؛ apex ~۱۸۴px کلیه‌ی barrierها را پاک می‌کند.
- **slide**: `sliding=true` به مدت ۰.۶s، hitbox کوتاه؛ در هوا = fast-fall.
- **boost**: نیاز به بار کامل (۱۰۰)؛ ۲s boost با شارژ → صفر، سپس ۸s cooldown. هر core +۲۵ شارژ.
- **hull**: شروع ۳؛ هر برخورد −۱ + ۱s invuln؛ ۰ = گیم‌اور.
- **امتیاز**: `score += speed*dt/8` (×۲ هنگام boost) + ۱۰ هر core.
- **اسپاون**: distance-based، frame-rate independent؛ gateها/droneها بعد از ~۷۰۰px ظاهر می‌شوند.
- **رکورد**: `localStorage['nightshiftRunner.best']`.

## نصب روی موبایل/دسکتاپ (PWA)

1. لینک بازی را در **Chrome** یا **Edge** باز کنید (اندروید/دسکتاپ) یا **Safari** (iOS).
2. منوی مرورگر → **Install app** / **Add to Home screen** (اندروید) یا **Share → Add to Home Screen** (iOS).
3. آیکن روی صفحه‌ی اصلی ظاهر می‌شود؛ اجرای آن تمام‌صفحه و مستقل از مرورگر است.
4. پس از اولین بارگذاری، بازی **بدون اینترنت** هم کار می‌کند (service worker کل shell را cache کرده است).

## تکنولوژی

- **HTML5 `<canvas>`** — تمام رندر با primitives (`arc`, `fillRect`, `translate`, `rotate`, `shadowBlur`).
- **Vanilla JavaScript** — بدون هیچ کتابخانه، framework یا CDN.
- **CSS** با `clamp()` برای تایپوگرافی responsive، `safe-area-inset` برای notch موبایل، و `100dvh`.
- **PWA**: `manifest.json` + `sw.js` (service worker که کل shell را precache می‌کند) → بازی پس از اولین بارگذاری **کاملاً آفلاین** و **قابل نصب** روی اندروید/iOS/دسکتاپ است.
- بدون تصویر، فونت یا فایل صوتی خارجی — همه‌چیز با کد تولید می‌شود.

## ساختار پروژه

| فایل | نقش |
|---|---|
| `index.html` | canvas، HUD، کنترل‌های روی صفحه، overlayهای start/pause/game-over |
| `styles.css` | HUD نئون، کنترل‌های safe-area، overlayها، نوار pulse |
| `main.js` | کل بازی: setup با DPR، parallax، فیزیک runner، spawn، collision، ذرات، speed lines |
| `manifest.json` | PWA، `display:fullscreen`، `orientation:portrait` |
| `sw.js` | precache + cache-first با fallback offline |
| `icon.svg` | سیلوئت runner با visor cyan روی skyline |

## شخصی‌سازی

تمام tuningها بالای `main.js` به‌صورت ثابت:

- `BASE_SPEED`, `MAX_SPEED`, `SPEED_K` — سرعت و ramp آن.
- `GRAVITY`, `JUMP_VEL`, `SLIDE_TIME` — قوس پرش و مدت slide.
- `HULL_MAX`, `INVULN_TIME` — جان و پنجره‌ی i-frame.
- `BOOST_TIME`, `BOOST_COOLDOWN`, `BOOST_MULT`, `BOOST_SCORE_MULT`, `CHARGE_MAX`, `CHARGE_PER_CORE`, `CHARGE_DRAIN` — اقتصاد boost.
- `SCORE_PER_PX`, `CORE_SCORE` — نرخ‌های امتیاز.
- pacing در `updateSpawns()` و وزن typeها در `spawnObstacle()`.
- پالت رنگ در توابع `draw*` و `opts` ساختمان در `makeBuildings()`.

## توسعه و اجرای محلی

```bash
git clone https://github.com/andrbi107/nightshift-runner.git
cd nightshift-runner
# سرویس‌ورکر فقط روی http(s) ثبت می‌شود، پس یک سرور محلی راه بیندازید:
python3 -m http.server 8080
# سپس http://localhost:8080/ را در مرورگر باز کنید
```

برای آزمایش روی موبایل، می‌توانید پوشه را روی گوشی با یک سرور استاتیک سرو کنید یا از `ngrok`/مرورگر موبایل روی همان شبکه استفاده کنید.

## استقرار

محتوای شاخه‌ی `main` به‌صورت خودکار از طریق **GitHub Pages** سرو می‌شود:

**https://andrbi107.github.io/nightshift-runner/**

هیچ build stepی لازم نیست — همه‌ی مسیرها relative هستند (`./`)، پس بازی هم از root مخزن و هم از زیرپوشه کار می‌کند.

## نسخه‌گذاری (SemVer)

این پروژه از [Semantic Versioning](https://semver.org/lang/fa/) پیروی می‌کند:

- نسخه‌ها از **`0.0.1`** آغاز می‌شوند (مرحله‌ی پیش از پایداری نهایی؛ هر تغییر می‌تواند breaking باشد).
- قالب: `MAJOR.MINOR.PATCH` → در فاز 0.x: `0.MINOR.PATCH`.
- **هر توسعه یا شخصی‌سازی** در یک شاخه‌ی جداگانه انجام می‌شود:
  - `feat/<name>` برای قابلیت جدید یا شخصی‌سازی
  - `fix/<name>` برای رفع باگ
  - `docs/<name>` برای مستندسازی
  - `refactor/<name>` برای بازسازمان‌دهی کد
- پس از merge به `main`، تگ SemVer بعدی زده می‌شود و یک **GitHub Release** منتشر می‌گردد.
- RELEASE NOTES هر بار در صفحه‌ی Releases مخزن ثبت می‌شود.

### نقشه‌ی نسخه‌بندی پیشنهادی برای توسعه‌های بعدی

| نوع تغییر | bump | مثال |
|---|---|---|
| رفع باگ کوچک، tweak رنگ/عدد | PATCH | `0.0.1` → `0.0.2` |
| قابلیت جدید، مکانیک جدید، level جدید | MINOR | `0.0.1` → `0.1.0` |
| بازنویسی API/ساختار، تغییر breaking | MAJOR (هنوز در 0.x) | `0.1.0` → `0.2.0` |
| رسیدن به پایداری نهایی | — | `0.x.0` → `1.0.0` |

## لایسنس

MIT — استفاده، تغییر و بازنشر آزاد. ساختهشده بهعنوان یک مهارت/قالب آموزشی برای بازی‌سازی PWA با Vanilla JS.
