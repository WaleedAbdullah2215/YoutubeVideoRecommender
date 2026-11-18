# Nextwatch

[Open the hosted app](https://nextwatch-video-discovery.observantmesa.chatgpt.site), or clone this repository and open `dist/index.html` in your browser. There’s no build step.

## Find your next watch

- Discover shows three picks when at least three matches are available. **Watch** opens the video on YouTube and records the selection in your local history. **More picks** moves to the next set.
- **Save** adds a video to your library and gives similar videos more weight when personalization is enabled. **Hide** removes a video from your picks. You can restore hidden videos from the history dialog.
- Select a genre, enter a specific topic, or combine both. Searches with fewer than three matches show the matches available. A YouTube search link covers topics beyond the built-in collection.

## Personalize it with your YouTube history

1. Open [Google Takeout](https://takeout.google.com/) in the Google account you use for YouTube.
2. Select **YouTube and YouTube Music**, include **history**, and create the export.
3. Download and unzip the export. In Nextwatch, choose **Import or manage history**, then select `watch-history.json` or `watch-history.html`.

Nextwatch prioritizes interests from recent activity and saved videos and excludes previously opened or imported videos while personalization is enabled. History, saved videos, and hidden videos are stored in the current browser.

## Live search

In **Settings**, add an optional browser-restricted YouTube Data API v3 key for live search results. Restrict the key to that API and to the app's HTTPS origin. The key stays in memory until page reload. Your explicit search terms are sent to YouTube. To send inferred topics, select the history search button.
