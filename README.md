# Estefano

Portfolio site for renovation, custom carpentry, and antique wood restoration in New York City. Static HTML, CSS, and a little JavaScript. Hosted on GitHub Pages. No paid services and no trackers.

The published address this repo is set up for is `https://fanovationbuilds.github.io/estefano-portfolio/`. Change `url` in `data/site.json` if that changes, then rebuild.

## Preview

```bash
node scripts/build.js
node scripts/preview.js
```

Open the URL the preview script prints. It serves the site at the GitHub Pages project path, which is how the links are written.

`node scripts/check.js` checks links, the quote form, local SEO tags, and the Vollana credit. `node --test scripts/validate-quote.test.js` checks form validation.

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

`service` is `renovation`, `carpentry`, or `restoration`. The first `featured` project is the large one on the home page. Others marked `featured` sit under Selected work.

Leave `before` and `after` out to get a labeled placeholder drawing. Placeholder alt text has to say it is a placeholder and not a photograph.

Restoration projects must set `"apprenticeship": true`. The site then credits Vollana Antiques on the project, the restoration page, and the footer, and it does not present the shop's pieces as Estefano's alone. Do not add a restoration project that was not done there unless you also change that credit in `scripts/build.js`.

## Add a real photo

Place the camera original outside the repo if it has location data. The script writes a smaller JPEG or WebP with metadata removed. The long edge is at most 1600 pixels. ffmpeg is required.

```bash
./scripts/process-photo.sh ~/Pictures/kitchen-before.jpg src/images/projects/kitchen-before.jpg
```

Point `before` or `after` in `data/projects.json` at `images/projects/kitchen-before.jpg`, describe the photo in the alt text, and rebuild. Do not use stock photos of people or homes.

## Quote form

The destination is one constant:

```js
export const QUOTE_ENDPOINT = "";
```

in `src/js/config.js`. Leave it empty until the Google Apps Script web app exists. Submitting a valid form then shows a message on the page and does not pretend the request was sent.

When you have the URL, paste the `/exec` link (not `/dev`), rebuild, and deploy. The browser sends JSON as `text/plain` so the Apps Script request stays a simple POST. Fields: `name`, `phone`, `email`, `jobType`, `size`, `location`, `timeline`, `message`, `photos` (JPEG base64, already resized in the browser), `submittedAt`, `source`.

A script that logs a row and saves photos to Drive:

```javascript
var FOLDER_NAME = "Estefano quote photos";

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

This repository does not have a Pages site yet. Turning the site on is a repository setting, and the workflow token is not allowed to change it. `actions/configure-pages` is set to try (`enablement: true`). Until the setting below is flipped, the deploy job fails with "Resource not accessible by integration" or "Get Pages site failed … Not Found".

What to flip, once, in the browser:

1. Open the repository on GitHub.
2. Settings → Pages.
3. Under Build and deployment, set Source to **GitHub Actions**.
4. Re-run the "Publish to GitHub Pages" workflow on `main` if the first deploy failed before this.

After that, the same workflow publishes on each push to `main`. The site URL is `https://fanovationbuilds.github.io/estefano-portfolio/`.

## Fonts

Source Serif 4 and Source Sans 3 are self-hosted in `src/fonts/` under the SIL Open Font License (`src/fonts/OFL.txt`).
