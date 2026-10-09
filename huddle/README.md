# Huddle: website + Windows app, no building on your PC

Everything is in this one folder. You do three things, once:

1. Put it on GitHub.
2. Put the chat server online with Render (free).
3. Let GitHub build `Huddle-Setup.exe` for you. You do not need Node.js or any commands.

---

## Step 1: Put it on GitHub

1. Make a free account at **github.com**, click **New repository**, name it `huddle`, click **Create repository**.
2. Click **uploading an existing file**.
3. Unzip this package. Open the `huddle` folder, select **everything inside it** (including the `public`, `desktop` and `.github` folders) and drag it into the GitHub page. Click **Commit changes**.
4. Check the repo shows: `.github`, `desktop`, `public`, `server.js`, `package.json`.
   - If `.github` is missing: click **Add file > Create new file**, type `.github/workflows/build-exe.yml` as the name, paste the contents of that file from this package, and commit.

## Step 2: Put the server online (Render)

1. Make a free account at **render.com**, click **New + > Web Service**, and connect your `huddle` repo.
2. Settings: **Build Command** `npm install`, **Start Command** `npm start`, **Instance type** Free.
3. (Optional, for GIFs) **Environment > Add Environment Variable**: name `GIPHY_KEY`, value = a free key from developers.giphy.com.
4. Click **Create Web Service**. After a couple of minutes you get an address like `https://huddle-abcd.onrender.com`. Open it to check it works. **Copy this address.**

## Step 3: Get your .exe

1. In your GitHub repo open the folder `desktop`, then the file `app-url.txt`.
2. Click the pencil icon, replace the text with your Render address (no `/` at the end), and click **Commit changes**.
3. Click the **Actions** tab. If asked, click the green button to enable workflows.
4. Click **Build Windows app** on the left, then **Run workflow** (the button on the right), then the green **Run workflow**.
5. Wait about 3 to 5 minutes until it shows a green tick.
6. Go to the main repo page and click **Releases** (right side). Download **Huddle-Setup.exe**.

Double-click it to install. Huddle appears on the desktop and in the Start menu, and opens like any other app.

### Sharing it
Send friends this link (replace YOUR-NAME):

`https://github.com/YOUR-NAME/huddle/releases/latest/download/Huddle-Setup.exe`

### Changed the Render address later?
Edit `desktop/app-url.txt` and run **Build Windows app** again.

---

## Good to know

- **Windows warning:** it may say "Windows protected your PC" because the app is not signed (signing costs money). Click **More info**, then **Run anyway**.
- **Needs internet:** the app opens your Render server. On the free plan the server sleeps when unused, so the first open can take up to a minute. The app shows "Connecting..." and retries by itself.
- **Accounts disappeared?** Render's free plan wipes `data.json` when the server restarts. A paid persistent disk or a database fixes it.
- **Easier option without the .exe:** open your Render address in Chrome or Edge and click the install icon in the address bar.

## Troubleshooting

| Problem | Fix |
|---|---|
| Actions run shows a red cross | Click the run, open the failed step and send me the error text |
| Window says "No server address set yet" | `desktop/app-url.txt` still has the placeholder. Edit it and run the build again |
| Window stuck on "Connecting..." | Open the Render address in a browser. If it does not load, check the Render dashboard |
| No Releases section | The build has not finished or failed. Check the Actions tab |
