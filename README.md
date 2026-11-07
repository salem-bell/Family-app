# Bellah Family HQ – phone app

The installable phone app for the family dashboard. It opens at **https://salem-bell.github.io/Family-app/**.

- **This repo** holds only the app's shell (the page, code and icons). Nothing private lives here.
- **The data** stays in the *Family Dashboard* Google Sheet, behind each person's first name and 4-digit code.
- **backend/** has the matching Code.gs and App.html for the sheet's Apps Script (v3.0). App.html is the same app served by Google at the older script.google.com address, so that address keeps working.
- **config.js** points the app at the sheet's Apps Script web app.

## Updating
1. Change the app, then bump VERSION in sw.js so phones pick it up.
2. If Code.gs changed: paste it over the one in Apps Script, then Deploy › Manage deployments › pencil › **New version** › Deploy.

## Daily Word
A word game a day (the **Daily Word** tab), with a weekly leaderboard. Guesses save to the sheet's *Game* tab; each Monday the week's results go to the Everyone chat and the *Game weeks* tab (a Monday 8 AM trigger made by Dashboard › 1. Set up, or the first app visit that Monday). Dashboard › Post the Daily Word results for last week sends it by hand.

## Notifications
They use the same Cloudflare Worker as the Peregrine Team app. The sheet's Settings tab needs Push service address, Push service secret and Push public key (copy them from the Peregrine sheet's Settings).
