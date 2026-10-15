# EditMaktab media

## Asosiy arxitektura

Video metadata folder ichidagi `txt` fayllarga bo'linmaydi. Bitta markaziy data file ishlatiladi:

- `src/data/portfolio.js`

Shu file ichida:

- `projects` — har bir video/ishning yagona manbasi: `id`, `title`, `slug`, `file`, `description`, card rotation/position.
- `sectionProjectIds.heroCards` — tepadagi 4 ta narxli card qaysi projectlardan olinishi.
- `sectionProjectIds.featuredWork` — o'rtadagi swipe/carousel qaysi projectlardan olinishi.
- `sectionProjectIds.moreWork` — pastdagi qator-qator work cardlar qaysi projectlardan olinishi.

Yangi video qo'shishda avval `projects`ga bitta object qo'shiladi, keyin kerakli sectionga faqat uning `id`si qo'shiladi.

## Fayllar qayerda turadi

- `preview/` — sahifadagi muted autoplay loop videolar. Yengil, ovozsiz, preview uchun.
- `detail/` — slash/detail oynada ochiladigan ovozli videolar. Sifatliroq va ovozli.
- `uploads/` — original/source backup fayllar.

`hero/`, `carousel/`, `works/`, `details/` folderlari tarixiy/segmentlash uchun qoldirilgan, hozir asosiy manba emas.

## Nega har video uchun alohida folder + txt emas

Har video ichiga `title.txt` / `detail.txt` qo'yilmaydi, chunki metadata tarqalib ketadi va section tartibini boshqarish qiyinlashadi. `src/data/portfolio.js` bitta joydan ham title/descriptionni, ham qaysi video qayerda chiqishini boshqaradi.

## Pastdagi cardlar qanday ko'payadi

Pastdagi qator-qator cardlar folderdagi fayl soniga avtomatik emas, `sectionProjectIds.moreWork` ro'yxatiga qarab ko'payadi. Bu ataylab shunday: har bir card uchun title, slug, description va detail video kerak.

## Preview stack qoidasi

Hozir har bir work bitta o'quvchining bitta videosi sifatida chiqadi. `moreWork` exportida har project uchun `items: [previewItem(project)]` beriladi, shuning uchun preview bitta card bo'ladi.

Keyin bitta project ichida 2+ media kerak bo'lsa, `items`ni ko'paytirish mumkin; UI ikki qavat previewni qo'llab-quvvatlaydi.
## Compression scripts

Preview video (muted, light autoplay):

```bash
npm run media:preview -- "../videos/final 4.mp4" final-4.mp4
```

Detail video (audio, modal/detail page):

```bash
npm run media:detail -- "../videos/final 4.mp4" final-4.mp4
```

