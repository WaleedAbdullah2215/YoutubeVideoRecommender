'use strict';

const catalog = [
  ['JtUAAXe_0VI', 'The Egg · A Short Story', 'Kurzgesagt', 'Science', 'animation philosophy life universe'],
  ['aircAruvnKk', 'But what is a neural network?', '3Blue1Brown', 'Technology', 'ai machine learning math deep learning tutorial'],
  ['N5vJSNXPEwA', 'Can you solve the prisoner hat riddle?', 'TED-Ed', 'Learning', 'logic puzzle math'],
  ['uD4izuDMUQA', 'Timelapse of the Future', 'melodysheep', 'Science', 'space documentary astronomy universe'],
  ['jfKfPfyJRdk', 'lofi hip hop radio', 'Lofi Girl', 'Music', 'chill study beats instrumental jazz'],
  ['dQw4w9WgXcQ', 'Never Gonna Give You Up', 'Rick Astley', 'Music', 'pop 80s music video'],
  ['MmB9b5njVbA', 'Official Minecraft Trailer', 'Minecraft', 'Gaming', 'sandbox building survival gameplay'],
  ['kCc8FmEb1nY', 'Let’s build GPT from scratch', 'Andrej Karpathy', 'Technology', 'ai coding python machine learning tutorial'],
  ['zQGOcOUBi6s', 'The Immune System Explained I – Bacteria Infection', 'Kurzgesagt', 'Science', 'biology medicine animation'],
  ['cS-hFKC_RKI', 'Tokyo Vacation Travel Guide', 'Expedia', 'Travel', 'japan city cinematic tourism'],
  ['1teUhznIYeU', 'How to make fresh pasta shapes with Gennaro', 'Jamie Oliver', 'Food', 'italian cooking noodles recipe beginner'],
  ['V-_O7nl0Ii0', 'Me at the zoo', 'jawed', 'History', 'youtube internet first video san diego'],
  ['dBN86y30Ufc', 'Can you solve the bridge riddle?', 'TED-Ed', 'Learning', 'logic puzzle math'],
  ['Fp_y0skhXKM', 'The Most Radioactive Places on Earth', 'Veritasium', 'Science', 'radiation documentary chernobyl travel'],
  ['lhW8BPH3y-8', 'The danger of a single story', 'Chimamanda Ngozi Adichie', 'Learning', 'literature culture storytelling ted'],
  ['nF2y31Kt8KE', 'The French Revolution', 'CrashCourse', 'History', 'france world history documentary'],
  ['ce9nt7FULJ8', 'Gordon Ramsay Is Making Scrambled Eggs Around the World', 'Gordon Ramsay', 'Food', 'eggs breakfast cooking recipe']
].map(([id, title, channel, genre, tags]) => ({ id, title, channel, genre, tags }));

const genres = ['All', 'Science', 'Technology', 'Learning', 'Music', 'Gaming', 'Travel', 'Food', 'History'];
const idPattern = /^[A-Za-z0-9_-]{11}$/;
const $ = id => document.getElementById(id);
const storageKey = 'nextwatch-v1';
let data = { history: [], saved: [], hidden: [], personalize: true };
try {
  const stored = JSON.parse(localStorage.getItem(storageKey));
  if (stored) data = { ...data, ...stored };
} catch {}
let storageFailed = false;
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(data)); }
  catch { storageFailed = true; }
}

let genre = 'All';
let query = '';
let view = 'discover';
let key = '';
let request;
let importSequence = 0;
let page = 0;
let picks = [];
const pageSize = 3;
const searchCache = new Map();
const stopWords = new Set('the a an to of in for and or with how this that it is are can you your watched watch video videos lets from by on at'.split(' '));
function tokens(value) {
  return [...new Set((value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
    .filter(word => word.length > 1 && !stopWords.has(word))
    .map(word => /^[a-z]{5,}s$/.test(word) ? word.slice(0, -1) : word))];
}
function wordsFor(video) {
  return tokens([video.title, video.channel, video.genre, video.tags].filter(Boolean).join(' '));
}
function rank(videos, topic, selectedGenre, history, favorites = []) {
  const wanted = tokens(topic);
  const seen = new Set(history.map(video => video.id));
  const interests = new Map();
  history.slice(0, 60).forEach((entry, index) => {
    const known = catalog.find(video => video.id === entry.id);
    wordsFor(known || entry).forEach(word => {
      interests.set(word, (interests.get(word) || 0) + 1 / (1 + index / 8));
    });
  });
  favorites.forEach(video => wordsFor(video).forEach(word => {
    interests.set(word, (interests.get(word) || 0) + 2);
  }));
  return videos.filter(video => (selectedGenre === 'All' || video.genre === selectedGenre) && !seen.has(video.id) && !data.hidden.includes(video.id) && !favorites.some(saved => saved.id === video.id))
    .map(video => {
      const words = wordsFor(video);
      const matches = wanted.filter(word => words.includes(word)).length;
      const interest = words.reduce((sum, word) => sum + (interests.get(word) || 0), 0);
      return { video, matches, interest, score: matches * 20 + Math.min(interest, 12) };
    })
    .filter(item => !topic || item.matches)
    .sort((a, b) => b.score - a.score);
}

function youtubeId(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    const parts = url.pathname.split('/');
    let id;
    if (url.hostname === 'youtu.be') id = parts[1];
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      if (['shorts', 'live', 'embed'].includes(parts[1])) id = parts[2];
    }
    return idPattern.test(id || '') ? id : '';
  } catch { return ''; }
}
function parseHistory(source, html) {
  let rows;
  if (html) {
    const template = document.createElement('template');
    template.innerHTML = source;
    rows = Array.from(template.content.querySelectorAll('a[href]'),
      link => ({ titleUrl: link.getAttribute('href'), title: link.textContent }));
  } else {
    rows = JSON.parse(source);
  }
  if (!Array.isArray(rows)) throw new Error('Choose a YouTube watch-history export.');
  return rows.flatMap(row => {
    const id = youtubeId(row?.titleUrl);
    if (!id) return [];
    const title = typeof row.title === 'string' ? row.title.replace(/^Watched\s+/i, '').trim().slice(0, 250) : '';
    const channel = typeof row.subtitles?.[0]?.name === 'string' ? row.subtitles[0].name.slice(0, 150) : '';
    return [{ id, title: title || 'YouTube video', channel, time: Number(new Date(row.time)) || 0 }];
  });
}
function mergeHistory(entries) {
  const unique = new Map();
  [...entries, ...data.history].sort((a, b) => b.time - a.time).forEach(entry => {
    if (!unique.has(entry.id)) unique.set(entry.id, entry);
  });
  data.history = [...unique.values()].slice(0, 1500);
  persist();
}
function historyTopics(history) {
  const scores = new Map();
  history.slice(0, 20).forEach((entry, index) => {
    const known = catalog.find(video => video.id === entry.id);
    const terms = known?.genre === 'Music' ? [known.channel] : tokens(known?.tags || entry.title).slice(0, 5);
    terms.forEach(term => scores.set(term, (scores.get(term) || 0) + 1 / (1 + index / 5)));
  });
  return [...scores].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([word]) => word).join(' ');
}
function node(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}
const watchUrl = id => 'https://www.youtube.com/watch?v=' + id;
function watchLink(video, label, className) {
  const link = node('a', className, label);
  link.href = watchUrl(video.id);
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const track = () => mergeHistory([{ id: video.id, title: video.title, channel: video.channel, time: Date.now() }]);
  link.addEventListener('click', track);
  link.addEventListener('auxclick', event => { if (event.button === 1) track(); });
  return link;
}
function renderCards(items) {
  $('count').textContent = items.length + (items.length === 1 ? ' video' : ' videos');
  $('saved-count').textContent = data.saved.length;
  $('cards').replaceChildren(...items.map(({ video, reason }) => {
    const card = node('article', 'card');
    const link = watchLink(video, undefined, 'thumb');
    link.setAttribute('aria-label', 'Watch ' + video.title + ' on YouTube');
    const img = node('img');
    img.loading = 'lazy';
    img.alt = '';
    img.src = 'https://i.ytimg.com/vi/' + video.id + '/hqdefault.jpg';
    img.addEventListener('error', () => img.remove(), { once: true });
    link.append(img, node('span', '', '▶ YouTube'));
    const body = node('div', 'card-body');
    const title = node('h3');
    title.append(watchLink(video, video.title));
    const saved = data.saved.some(item => item.id === video.id);
    const save = node('button', '', saved ? 'Saved ✓' : 'Save');
    save.setAttribute('aria-pressed', String(saved));
    save.setAttribute('aria-label', (saved ? 'Remove from saved: ' : 'Save: ') + video.title);
    save.onclick = () => {
      const existing = data.saved.some(item => item.id === video.id);
      data.saved = existing ? data.saved.filter(item => item.id !== video.id) : [...data.saved, video];
      persist();
      if (view === 'saved') {
        refresh();
        ($('cards').querySelector('button') || $('library')).focus();
      } else {
        save.textContent = existing ? 'Save' : 'Saved ✓';
        save.setAttribute('aria-pressed', String(!existing));
        save.setAttribute('aria-label', (existing ? 'Save: ' : 'Remove from saved: ') + video.title);
        $('saved-count').textContent = data.saved.length;
      }
    };
    const actions = node('div', 'card-actions');
    actions.append(watchLink(video, 'Watch ↗', 'watch-button'), save);
    if (view === 'discover') {
      const hide = node('button', '', 'Hide');
      hide.setAttribute('aria-label', 'Hide: ' + video.title);
      hide.onclick = () => {
        data.hidden.push(video.id);
        persist();
        picks = picks.filter(item => item.video.id !== video.id);
        renderPicks();
        ($('cards').querySelector('button') || $('topic')).focus();
        $('feedback').textContent = 'Hidden: ' + video.title;
      };
      actions.append(hide);
    }
    body.append(node('span', 'tag', reason), title, node('p', '', video.channel), actions);
    card.append(link, body);
    return card;
  }));
}
function renderPicks() {
  const pageCount = Math.ceil(picks.length / pageSize);
  if (page >= pageCount) page = Math.max(0, pageCount - 1);
  renderCards(picks.slice(page * pageSize, (page + 1) * pageSize));
  $('next-picks').hidden = pageCount < 2;
}
function setPicks(items) {
  picks = items;
  renderPicks();
}
function fallback(term) {
  if (!term) return;
  const link = node('a', '', 'Search YouTube for “' + term + '” ↗');
  link.href = 'https://www.youtube.com/results?' + new URLSearchParams({ search_query: term });
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  $('fallback').append(link);
}
function decode(value) {
  const safe = value.replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return new DOMParser().parseFromString(safe, 'text/html').body.textContent;
}
async function liveSearch(term, signal) {
  if (searchCache.has(term)) return searchCache.get(term);
  const params = new URLSearchParams({ part: 'snippet', type: 'video', q: term, maxResults: '24', safeSearch: 'moderate' });
  const response = await fetch('https://www.googleapis.com/youtube/v3/search?' + params, {
    headers: { 'X-Goog-Api-Key': key }, signal
  });
  if (!response.ok) {
    const message = response.status === 403 ? 'YouTube rejected the key or its quota was reached.'
      : response.status === 400 ? 'YouTube could not use this API key or search.'
      : 'YouTube search is temporarily unavailable.';
    throw new Error(message);
  }
  const payload = await response.json();
  const videos = payload.items.filter(item => idPattern.test(item.id?.videoId || '') && item.snippet)
    .map(item => ({ id: item.id.videoId, title: decode(item.snippet.title), channel: decode(item.snippet.channelTitle) }));
  if (searchCache.size >= 30) searchCache.clear();
  searchCache.set(term, videos);
  return videos;
}

async function refresh(allowHistorySearch = false) {
  request?.abort();
  request = new AbortController();
  const { signal } = request;
  const saved = view === 'saved';
  $('discover').setAttribute('aria-pressed', String(!saved));
  $('library').setAttribute('aria-pressed', String(saved));
  $('controls').hidden = saved;
  page = 0;
  $('fallback').replaceChildren();
  $('feedback').textContent = '';
  $('status').textContent = '';
  if (saved) {
    $('next-picks').hidden = true;
    $('results-title').textContent = 'Saved videos';
    renderCards(data.saved.map(video => ({ video, reason: video.genre || 'YouTube' })));
    if (!data.saved.length) $('status').textContent = 'Save a video from Discover to find it here later.';
    return;
  }
  const history = data.personalize ? data.history : [];
  const favorites = data.personalize ? data.saved : [];
  const ranked = rank(catalog, query, genre, history, favorites);
  $('results-title').textContent = query ? 'Results for “' + query + '”' : genre !== 'All' ? genre : 'Your next three';
  const local = ranked.map(({ video, interest }) => ({
    video, reason: interest ? 'Similar to your activity · ' + video.genre : video.genre
  }));
  setPicks(local);
  const explicitTerm = [query, genre !== 'All' ? genre : ''].filter(Boolean).join(' ');
  const inferred = explicitTerm ? '' : historyTopics([...favorites, ...history]);
  const term = explicitTerm || (allowHistorySearch ? inferred : '');
  if (!local.length) $('status').textContent = history.length || data.hidden.length
    ? 'No unseen matches in the built-in collection. Try another topic or genre.'
    : 'No matches in the built-in collection. Try another topic or search on YouTube.';
  else if (data.personalize && !history.length) $('status').textContent = 'Import history or open a video to start personalizing.';
  if (inferred && !term) {
    const more = node('button', 'outline', key ? 'Find more like my history on YouTube' : 'Use my history to find more');
    more.onclick = () => refresh(true);
    $('fallback').append(more);
  } else if (term) fallback(term);
  if (!key || !term) return;
  $('status').textContent = 'Searching YouTube…';
  try {
    const results = await liveSearch(term, signal);
    if (signal.aborted) return;
    const ids = new Set([...history.map(video => video.id), ...favorites.map(video => video.id), ...data.hidden, ...local.map(item => item.video.id)]);
    const extra = results.filter(video => {
      if (ids.has(video.id)) return false;
      ids.add(video.id);
      return true;
    });
    const live = extra.map(video => ({
      video, reason: inferred ? 'Similar to your activity · YouTube' : 'YouTube search'
    }));
    setPicks(explicitTerm ? [...live, ...local] : [...local, ...live]);
    $('status').textContent = local.length + extra.length ? '' : 'No unseen videos matched. Try different search terms.';
  } catch (error) {
    if (!signal.aborted) $('status').textContent = error.message + ' You can still use the collection or open the search on YouTube.';
  }
}
function renderHistory() {
  const recent = data.history.slice(0, 8);
  $('history-list').replaceChildren(...recent.map(video => node('li', '', video.title)));
  $('clear-history').disabled = !data.history.length;
  $('reset-hidden').disabled = !data.hidden.length;
}
genres.forEach(value => {
  const button = node('button', '', value);
  button.setAttribute('aria-pressed', String(value === genre));
  button.onclick = () => {
    genre = value;
    Array.from($('genres').children).forEach(chip => chip.setAttribute('aria-pressed', String(chip === button)));
    refresh();
  };
  $('genres').append(button);
});
$('next-picks').onclick = () => {
  page = (page + 1) % Math.ceil(picks.length / pageSize);
  renderPicks();
  $('feedback').textContent = 'Showing set ' + (page + 1) + ' of ' + Math.ceil(picks.length / pageSize) + '.';
};
$('reset-hidden').onclick = () => {
  data.hidden = [];
  persist();
  renderHistory();
  refresh();
  $('import-status').textContent = 'Hidden videos restored.';
};
$('search').onsubmit = event => {
  event.preventDefault();
  query = $('topic').value.trim();
  refresh();
};
$('discover').onclick = () => { view = 'discover'; refresh(); };
$('library').onclick = () => { view = 'saved'; refresh(); };
$('history').onclick = () => { renderHistory(); $('history-dialog').showModal(); };
$('settings').onclick = () => $('settings-dialog').showModal();
$('personalize').checked = data.personalize;
$('personalize').onchange = () => { data.personalize = $('personalize').checked; persist(); refresh(); };
$('clear-history').onclick = () => {
  if (!window.confirm('Clear watch history stored in this browser?')) return;
  importSequence++;
  $('import').value = '';
  data.history = [];
  searchCache.clear();
  persist();
  $('import-status').textContent = storageFailed ? 'History cleared for this session. Browser storage is unavailable.' : 'History cleared.';
  renderHistory();
  refresh();
};
$('import').onchange = async () => {
  const file = $('import').files[0];
  if (!file) return;
  const sequence = ++importSequence;
  $('import-status').textContent = 'Reading history…';
  try {
    if (file.size > 35 * 1024 * 1024) throw new Error('Choose a history file smaller than 35 MB.');
    const source = await file.text();
    if (sequence !== importSequence) return;
    const entries = parseHistory(source, /\.html?$/i.test(file.name));
    if (!entries.length) throw new Error('No YouTube video links were found in this file.');
    mergeHistory(entries);
    data.personalize = true;
    $('personalize').checked = true;
    persist();
    $('import-status').textContent = 'Using ' + data.history.length + ' recent unique videos.' + (storageFailed ? ' Browser storage is unavailable.' : '');
    renderHistory();
    refresh();
  } catch (error) {
    if (sequence === importSequence) $('import-status').textContent = error instanceof SyntaxError ? 'This file is not valid JSON.' : error.message;
  } finally {
    if (sequence === importSequence) $('import').value = '';
  }
};
$('key-form').onsubmit = event => {
  event.preventDefault();
  const value = $('key').value.trim();
  if (!value) { $('key-status').textContent = 'Enter an API key first.'; return; }
  key = value;
  $('key').value = '';
  searchCache.clear();
  $('key-status').textContent = 'Key set for this session. Search for a topic or select a genre to use it.';
  refresh();
};
$('remove-key').onclick = () => {
  key = '';
  $('key').value = '';
  searchCache.clear();
  $('key-status').textContent = 'Key removed.';
  refresh();
};
refresh();
