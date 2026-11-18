# Nextwatch

[Open the private hosted app](https://nextwatch-video-discovery.observantmesa.chatgpt.site), or clone this repository and open `dist/index.html` in your browser. There’s no build step.

## Find something to watch during a break

1. Choose **1–20 mins**, **20–40 mins**, or **More than 40 mins**. A video exactly 20 minutes long goes in the first group. A video exactly 40 minutes long goes in the second.
2. When you open Nextwatch, it suggests up to three similar creators you haven't voted on. Say **Yes** to add them to your picks, **No** to skip them, or **Done** to continue. **Pick creators** lets you change your answers at any time. Suggestions pause once you have voted on the whole collection.
3. Choose **Watch** on one of the three picks to open YouTube. **More picks** shows another set. Genre and topic filters are optional.

The default Entertainment feed emphasizes Pakistani and Indian comedy, vlogs, and food, alongside international group challenges. Yes boosts a creator and No excludes them from Discover. The app shows fewer than three picks if fewer videos fit. Starter video titles and runtimes come from the creators’ public YouTube upload listings.

Creator preferences, saved videos, hidden videos, and activity from links you open in Nextwatch are stored in your browser. Your answers carry over between visits. Choose your available time each visit.

## Optional watch history

YouTube's [Data API does not expose watch history](https://developers.google.com/youtube/data/revision_history). If you'd like to seed your preferences with past activity, export **YouTube and YouTube Music** history from [Google Takeout](https://takeout.google.com/), unzip it, and use **Import or manage history** to select `watch-history.json` or `watch-history.html`. No regular import is needed. Nextwatch weights repeat watches and frequent creators and excludes watched videos when personalization is enabled.

## Optional live search

Add a browser-restricted YouTube Data API v3 key in **Settings**. Restrict it to the API and the hosted site's HTTPS origin. The key stays in memory until page reload. Topic and genre searches send those terms to YouTube. **Find more from my creators** can fetch uploads from up to three selected channels. The app checks [YouTube’s reported runtime](https://developers.google.com/youtube/data/reference/rest/v3/videos#contentDetails.duration) before displaying each live result.
