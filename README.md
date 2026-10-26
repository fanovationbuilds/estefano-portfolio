# Fanovation Builds

Portfolio site for hiring Estefano at Fanovation Builds: renovation, custom carpentry, and antique wood restoration in New York City. Static HTML, CSS, and a little JavaScript. Hosted on GitHub Pages. No paid services and no trackers.

The tagline is "Real renovations. Real results." The site is for hiring the shop. It does not repeat the YouTube channel's DIY or tutorial language. Job videos are linked from the footer and the about page: [youtube.com/@FanovationBuilds](https://www.youtube.com/@FanovationBuilds).

## Address

`url` in `data/site.json` is the one setting for the canonical origin and the path prefix. It is `https://fanovationbuilds.com`, so canonical URLs, the sitemap, `robots.txt`, JSON-LD, and every page and asset link use that origin at `/`.

The same code still accepts a project path. Set `url` to `https://fanovationbuilds.github.io/estefano-portfolio` and rebuild if the site has to be served from `/estefano-portfolio/` again.

DNS for `fanovationbuilds.com` already points at GitHub Pages. The custom domain itself is turned on in the repository Pages settings (Actions deploy). This repo does not include a CNAME file. GitHub ignores a CNAME file when Pages is published with a custom workflow.

## Preview

```bash
node scripts/build.js
node scripts/preview.js
```

Open the URL the preview script prints. It serves the site at the path in `url`, which is `/` for `fanovationbuilds.com`.

`node scripts/check.js` checks links, the quote form, local SEO tags, the Fanovation Builds name, and the single Vollana mention. `node --test scripts/validate-quote.test.js scripts/site-url.test.js` checks form validation and the Pages path versus the domain root.

## Pages

- Home
- Work (before-and-after sliders)
- Antique repair and wood restoration
- Custom carpentry
- Full renovations
- About
- Request a quote

## Add a project

Edit `data/projects.json`. One object per job:

```json
{
  "id": "kitchen-renovation",
  "title": "Kitchen renovation",
  "service": "renovation",
  "featured": false,
  "summary": "What changed, and where, in a sentence or two.",
  "before": "images/projects/kitchen-before.jpg",
  "after": "images/projects/kitchen-after.jpg",
  "beforeAlt": "Describe the before photo.",
  "afterAlt": "Describe the after photo."
}
```

`service` is `renovation`, `carpentry`, or `restoration`. The first `featured` project should be restoration. It is the large piece in the home hero. A featured carpentry project sits in the next section.

Leave `before` and `after` out to get a labeled placeholder drawing. Placeholder alt text has to say it is a placeholder and not a photograph.

The site speaks as one team. Fanovation Builds and Vollana Antiques work out of the same shop. The home page has the one mention, with the link to [vollana-antiques.com](https://vollana-antiques.com/). Forty years in antiques, restoration, and woodwork is a team strength. Do not add lines about whose pieces are whose. Do not add real client photos until there are real job photos to process.

## Add a real photo

Place the camera original outside the repo if it has location data. The script writes a smaller JPEG or WebP with metadata removed. The long edge is at most 1600 pixels. ffmpeg is required.

```bash
./scripts/process-photo.sh ~/Pictures/kitchen-before.jpg src/images/projects/kitchen-before.jpg
```

Point `before` or `after` in `data/projects.json` at `images/projects/kitchen-before.jpg`, describe the photo in the alt text, and rebuild. Do not use stock photos of people or homes.

## Quote form

The destination is one constant:

```js
export const QUOTE_ENDPOINT = "https://script.google.com/macros/s/…/exec";
```

in `src/js/config.js`. The value is the deployed web app `/exec` URL, not `/dev`. The browser sends JSON as `text/plain` so the Apps Script request stays a simple POST. Fields: `name`, `phone`, `email`, `jobType`, `size`, `location`, `timeline`, `message`, `photos` (JPEG base64, already resized in the browser), `submittedAt`, `source`.

If that constant is empty or still a placeholder, a valid submit stays on the page and says nothing was sent.

A script that logs a row and saves photos to Drive:

```javascript
var FOLDER_NAME = "Fanovation Builds quote photos";

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActive().getSheetByName("Quotes");
  if (!sheet) {
    sheet = SpreadsheetApp.getActive().insertSheet("Quotes");
    sheet.appendRow(["Submitted", "Name", "Phone", "Email", "Job type", "Size", "Location", "Timeline", "Message", "Photo links"]);
  }
  var links = [];
  var photos = data.photos || [];
  if (photos.length) {
    var found = DriveApp.getFoldersByName(FOLDER_NAME);
    var folder = found.hasNext() ? found.next() : DriveApp.createFolder(FOLDER_NAME);
    photos.forEach(function (photo, index) {
      var blob = Utilities.newBlob(
        Utilities.base64Decode(photo.dataBase64),
        photo.type || "image/jpeg",
        photo.name || ("photo-" + index + ".jpg")
      );
      links.push(folder.createFile(blob).getUrl());
    });
  }
  sheet.appendRow([
    data.submittedAt || new Date().toISOString(),
    data.name || "",
    data.phone || "",
    data.email || "",
    data.jobType || "",
    data.size || "",
    data.location || "",
    data.timeline || "",
    data.message || "",
    links.join("\n")
  ]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy it as a web app, execute as yourself, access "Anyone". Put the `/exec` URL in `QUOTE_ENDPOINT`.

## Contact details

Phone on the about page and in the footer is [(347) 746-9070](tel:+13477469070). The same number is `telephone` in the LocalBusiness JSON-LD as `+1-347-746-9070`. Email is an **Email me** button. That address is only in the `mailto:` link (subject `Quote request`). It is not printed on the page and it is not in the JSON-LD. Do not add another number, a license, a review, a price, or years of experience.

## GitHub Pages

`.github/workflows/pages.yml` builds `dist/` and deploys it with GitHub Actions on every push to `main`. Pull requests build and check, and do not deploy.

The published address is `https://fanovationbuilds.com/`. Source is GitHub Actions. Set the custom domain in Settings → Pages when this is on `main`. The workflow still calls `actions/configure-pages` with `enablement: true`. That step only matters if Pages is turned off; the default token cannot create the Pages site by itself.

## Brand files

`src/images/logo.webp` and the favicons (`src/favicon-32.png`, `src/favicon-192.png`, `src/apple-touch-icon.png`) are web-sized crops of the channel avatar. `src/images/hero-banner.webp` is a compressed copy of the channel banner, used as a faint background behind the home hero. There is no vector logo.

## Fonts

Outfit (headings), Source Serif 4 (body), and Source Sans 3 (interface) are self-hosted in `src/fonts/` under the SIL Open Font License (`src/fonts/OFL.txt`). Headings are set in uppercase Outfit.
