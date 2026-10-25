# Autoškola „Edukacija – Drobo“ — web stranica

Statična stranica (Vite) hostovana na Netlify + Firebase (Firestore baza i prijava za admina).

| Stranica | Putanja | Sadržaj |
|---|---|---|
| Početna | `/` | Hero sa skrol-animacijom ceste, online učenje (CTA), usluge, kategorije, termini časova, naredni ispiti, upis, FAQ, kontakt |
| Online učenje | `/testovi` | Lekcije po kategorijama (A, B, C, D, T), znakovi, raskrsnice, prva pomoć + simulacije ispita |
| Ispitni rokovi | `/ispiti` | Svi termini sa filterima (vrsta ispita, kategorija) |
| Administracija | `/admin` | Prijave za upis, poruke, ispitni rokovi, termini časova, usluge, kategorije, FAQ, postavke |

## Lokalno pokretanje

Potrebno: Node.js 22.12+.

```bash
npm install
npm run dev              # http://localhost:5173, spojeno na PRAVU Firebase bazu (projekat autoskola-drobo)
```

Za testiranje bez diranja prave baze (potrebna Java 21):

```bash
npm run emulators        # terminal 1: lokalna baza i prijava
npm run seed:emulator    # terminal 2: probni admin + primjer rasporeda i ispitnih rokova
npm run dev:emulator     # terminal 2: http://localhost:5173 na emulatoru
```

Probni admin nalog postoji samo u emulatoru i zapisan je u `scripts/seed-emulator.mjs`.

## Gdje šta živi

- **Stranica (HTML, CSS, JS, pitanja, slike)**: Netlify. Statični fajlovi iz `dist/` (`npm run build`).
- **Baza i prijava za admina**: Firebase projekat `autoskola-drobo` (Firestore + Authentication). Netlify je ne dira, a podaci ostaju isti bez obzira gdje je stranica hostovana.
- **Firebase konfiguracija**: upisana u `src/lib/firebase.js`. Vrijednosti su javni identifikatori aplikacije, a zaštitu podataka rade pravila u `firestore.rules`. `.env` nije potreban (opcionalno pregazi konfiguraciju, vidi `.env.example`).

## Objava: GitHub + Netlify

`netlify.toml` već sadrži sve za build (`npm run build`, folder `dist`, Node 22), a Firebase konfiguracija je u kodu. Na Netlifyju zato ne treba podešavati nikakve varijable.

**1. GitHub**
1. Na [github.com/new](https://github.com/new) napravite repozitorij (npr. `autoskola-drobo`). Može biti privatan, ali bez README, .gitignore i licence.
2. Postavite ovaj folder u repozitorij:
   - **GitHub Desktop**: *File → Add local repository* → odaberite folder → *create a repository* → *Publish repository*.
   - **Terminal**:
     ```bash
     git init
     git add .
     git commit -m "Prva verzija stranice"
     git branch -M main
     git remote add origin https://github.com/KORISNIK/autoskola-drobo.git
     git push -u origin main
     ```
   `node_modules` i `dist` se ne postavljaju (izostavljeni su u `.gitignore`); Netlify ih pravi sam.

**2. Netlify**
1. [app.netlify.com](https://app.netlify.com) → *Add new site → Import an existing project → GitHub* → odaberite repozitorij.
2. Postavke builda se same popune iz `netlify.toml` → *Deploy*.
3. *Site configuration → Change site name* (npr. `autoskola-drobo` → `autoskola-drobo.netlify.app`), a po želji *Domain management* za vlastitu domenu.

**3. Firebase: dozvoli novu domenu**
Firebase konzola → **Authentication → Settings → Authorized domains → Add domain**: vlastita domena ako je imate (`autoskola-drobo.netlify.app` je već dodana).

Svaki `git push` na `main` automatski objavljuje novu verziju. Baza se pritom ne mijenja.

## Firebase (baza i admin)

Već podešeno: Firestore (Evropa), Email/Password prijava, nalog vlasnika i `admins/{UID}` dokument. Administrator je svaki korisnik čiji UID postoji u kolekciji `admins`.

Novi administrator: **Authentication → Users → Add user**, kopirajte UID, pa u Firestore kolekciji `admins` napravite dokument s tim UID-om (polje `email`).

Nakon izmjene `firestore.rules`:

```bash
npx firebase-tools login
npm run deploy:rules
```

(Na Windows PowerShellu koristite `npx.cmd` umjesto `npx` ako PowerShell blokira skripte.)

Nakon prve prijave u `/admin`, u karticama **Usluge**, **Kategorije** i **Česta pitanja** kliknite „Preuzmi zadani sadržaj“ da ga možete uređivati.

## Pitanja za testove

Pitanja su izvučena iz zvaničnih kataloga MON KS (Oblast I–IV) u `public/data/questions.json`, a slike znakova i raskrsnica u `public/img/pitanja/`. Kad ministarstvo objavi nove kataloge:

```bash
pip install pymupdf pillow
python scripts/extract_questions.py oblast1.pdf oblast2.pdf oblast3.pdf oblast4.pdf
```

Slike se spremaju kao WebP (najviše 900 px širine), a njihova širina i visina se upisuju u JSON.

Skripta prijavljuje svako pitanje kod kojeg nije prepoznala tačan odgovor ili sliku.

## Hero video (Google Flow)

Dok video ne postoji, hero crta animiranu cestu iz loga (canvas). Kad Flow video bude gotov:

```bash
pip install imageio-ffmpeg
python scripts/prepare_hero_video.py putanja/do/flow-videa.mp4
```

Skripta pravi `public/video/hero.mp4`, `hero-mobile.mp4` i `hero-poster.jpg` sa svakim frejmom kao ključnim, za glatko premotavanje skrolom. Zatim u `index.html` na `<video class="hero-video">` dodajte `data-src="/video/hero.mp4" data-src-mobile="/video/hero-mobile.mp4"`. Bez tih atributa stranica ne pokušava učitati video.

## SEO

- **Sadržaj je u HTML-u.** Pri svakom buildu `scripts/prerender-plugin.mjs` povuče sadržaj iz Firestore-a i upiše ga direktno u HTML: zaglavlje, usluge, kategorije, raspored, ispitne rokove, FAQ, kontakt i pregled testova. Pretraživači i AI alati tako vide sav tekst i bez JavaScripta. U pregledniku se sadržaj odmah osvježi iz baze.
- **Izmjene iz admina** posjetioci vide odmah, a u HTML (za Google) ulaze pri sljedećem buildu. Nakon većih izmjena (FAQ, usluge, kontakt, novi ispitni rokovi) na Netlifyju kliknite *Deploys → Trigger deploy → Deploy site*.
- **Meta oznake** (canonical, Open Graph, Twitter) i **JSON-LD** (`LocalBusiness`, `FAQPage`) pravi isti plugin. Title i description su upisani u svaki HTML fajl.
- **Adresa sajta** za canonical, `og:url`, `robots.txt` i `sitemap.xml`: Netlify je sam postavlja (varijabla `URL`, uvijek glavna domena). Lokalno se koristi `https://autoskola-drobo.netlify.app`, a može se pregaziti varijablom `SITE_URL`.
- **`robots.txt` i `sitemap.xml`** nastaju pri buildu u `dist/`, pored `index.html`.
- **Slike**: `public/img/hero-poster-1600.webp` i `hero-poster-mobile.webp` su prvi kadar animacije ceste (glavna slika, učitava se odmah), a `og-image.jpg` (1200×630) je slika za dijeljenje na društvenim mrežama. Obje su nacrtane istim kodom kao animacija (`createRoad` u `src/lib/hero.js`).

## Struktura

```
index.html, testovi.html, ispiti.html, admin.html
src/lib/        firebase-config.js, firebase.js, db.js (Firestore Lite), admin-firebase.js, content.js, defaults.js,
                ui.js (logo, ikone, zaglavlje, podnožje), render.js (HTML sekcija + JSON-LD), hero.js
src/pages/      logika svake stranice
src/styles/     main.css (dizajn sistem) + CSS po stranici
firestore.rules sigurnosna pravila (javno čitanje sadržaja, prijave samo za admina)
scripts/        prerender-plugin.mjs (SEO build), izvlačenje pitanja, priprema videa, punjenje emulatora
design/         originalni logo (ne objavljuje se)
```
