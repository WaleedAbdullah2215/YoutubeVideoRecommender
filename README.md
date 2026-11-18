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

Nextwatch gives the strongest priority to creators you watch repeatedly. Topics from videos you rewatch count more than topics from one-off watches. Saved videos also help rank related picks, and already watched videos are excluded while personalization is enabled. Re-import your original Takeout file if you used an older version of Nextwatch, since older versions kept only one entry per video. History, saved videos, and hidden videos are stored in the current browser.

## Live search

In **Settings**, add an optional browser-restricted YouTube Data API v3 key for live search results. Restrict the key to that API and to the app's HTTPS origin. The key stays in memory until page reload. Your explicit search terms are sent to YouTube. Use the history search button to find more from your most-watched creator or top topics. When the export includes a creator’s YouTube channel ID, this search fetches videos from that channel directly.
