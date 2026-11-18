'use strict';

const generalCatalog = [
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

const catalog = [...entertainmentCatalog, ...generalCatalog.map(video => ({ ...video, seconds: generalRuntimes[video.id] }))];
const genres = ['Entertainment', 'Comedy', 'Vlogs', 'All', 'Science', 'Technology', 'Learning', 'Music', 'Gaming', 'Travel', 'Food', 'History'];
const idPattern = /^[A-Za-z0-9_-]{11}$/;
const $ = id => document.getElementById(id);
const storageKey = 'nextwatch-v1';
let data = { history: [], saved: [], hidden: [], creatorVotes: {}, creatorSeen: {}, personalize: true };
try {
  const stored = JSON.parse(localStorage.getItem(storageKey));
  if (stored) data = { ...data, ...stored };
} catch {}
let storageFailed = false;
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(data)); }
  catch { storageFailed = true; }
}

let genre = 'Entertainment';
let timeSlot = '';
const newlyPicked = new Set();
let query = '';
let view = 'discover';
let key = '';
let request;
let importSequence = 0;
let page = 0;
let picks = [];
const pageSize = 3;
const timeOptions = [
  { id: 'quick', label: '1–20 mins', includes: seconds => seconds >= 60 && seconds <= 1200 },
  { id: 'meal', label: '20–40 mins', includes: seconds => seconds > 1200 && seconds <= 2400 },
  { id: 'long', label: 'More than 40 mins', includes: seconds => seconds > 2400 }
];
function fitsTime(video) {
  return timeOptions.find(option => option.id === timeSlot)?.includes(video.seconds) ?? false;
}
function runtimeLabel(seconds) {
  const minutes = Math.floor(seconds / 60);
  return minutes + ':' + String(seconds % 60).padStart(2, '0');
}
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
const catalogById = new Map(catalog.map(video => [video.id, video]));
const channelIdPattern = /^UC[A-Za-z0-9_-]{22}$/;
const creatorKey = name => (name || '').normalize('NFKC').trim().toLowerCase();
const creatorByName = new Map(creatorOptions.flatMap(creator =>
  [creator.name, creator.channel].map(name => [creatorKey(name), creator])));
const creatorById = new Map(creatorOptions.map(creator => [creator.id, creator]));
function creatorOf(video) {
  return creatorById.get(video.channelId) || creatorByName.get(creatorKey(video.channel));
}
function creatorVote(video) {
  return data.creatorVotes[creatorOf(video)?.id];
}
function preferredCreators() {
  return creatorOptions.filter(creator => data.creatorVotes[creator.id] === 'yes');
}

function topicsFor(video) {
  return tokens([video.title, video.genre, video.tags].filter(Boolean).join(' '));
}

function profileFor(history, favorites) {
  const creators = new Map();
  const topics = new Map();
  history.forEach(entry => {
    const video = { ...catalogById.get(entry.id), ...entry };
    const channel = entry.channel || catalogById.get(entry.id)?.channel;
    const name = creatorKey(channel);
    const count = entry.count || 1;
    if (name) {
      const previous = creators.get(name);
      creators.set(name, {
        name: channel,
        id: entry.channelId || previous?.id,
        count: (previous?.count || 0) + count
      });
    }
    const weight = count >= 2 ? 2 + Math.log2(count) : 0.35;
    topicsFor(video).forEach(word => {
      topics.set(word, (topics.get(word) || 0) + weight);
    });
  });
  favorites.forEach(video => wordsFor(video).forEach(word => {
    topics.set(word, (topics.get(word) || 0) + 1);
  }));
  return { creators, topics };
}

function rank(videos, topic, selectedGenre, history, favorites = [], profile = profileFor(history, favorites)) {
  const wanted = tokens(topic);
  const seen = new Set(history.map(video => video.id));
  const saved = new Set(favorites.map(video => video.id));
  const creatorIds = new Map([...profile.creators.values()].filter(creator => creator.id)
    .map(creator => [creator.id, creator]));
  return videos.filter(video => fitsTime(video) && (selectedGenre === 'All' || video.genre === selectedGenre ||
    (selectedGenre === 'Entertainment' && video.entertainment)) && creatorVote(video) !== 'no' && !seen.has(video.id) && !data.hidden.includes(video.id) && !saved.has(video.id))
    .map(video => {
      const words = wordsFor(video);
      const matches = wanted.filter(word => words.includes(word)).length;
      const creatorCount = (creatorIds.get(video.channelId) || profile.creators.get(creatorKey(video.channel)))?.count || 0;
      const interest = topicsFor(video).map(word => profile.topics.get(word) || 0)
        .sort((a, b) => b - a).slice(0, 3).reduce((sum, weight) => sum + weight, 0);
      const creatorBonus = creatorCount >= 2 ? 20 + 9 * Math.log2(creatorCount) : creatorCount;
      const vote = creatorVote(video);
      const preference = vote === 'yes' ? 60 + (newlyPicked.has(video.channelId) ? 20 : 0) : creatorOf(video)?.starter ? 8 : 0;
      return { video, matches, interest, creatorCount, score: matches * 100 + preference + creatorBonus + Math.min(interest, 20) };
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
function channelIdFrom(value) {
  try {
    const url = new URL(value);
    if (!['www.youtube.com', 'youtube.com', 'music.youtube.com'].includes(url.hostname)) return '';
    const [, type, id] = url.pathname.split('/');
    return type === 'channel' && channelIdPattern.test(id || '') ? id : '';
  } catch { return ''; }
}

function parseHistory(source, html) {
  let rows;
  if (html) {
    const template = document.createElement('template');
    template.innerHTML = source;
    rows = [];
    for (const link of template.content.querySelectorAll('a[href]')) {
      const titleUrl = link.getAttribute('href');
      if (!youtubeId(titleUrl)) continue;
      const group = link.closest('.content-cell') || link.parentElement;
      const channel = Array.from(group?.querySelectorAll('a[href]') || [])
        .find(anchor => channelIdFrom(anchor.getAttribute('href')));
      rows.push({
        titleUrl, title: link.textContent,
        subtitles: channel ? [{ name: channel.textContent, url: channel.getAttribute('href') }] : []
      });
    }
  } else {
    rows = JSON.parse(source);
  }
  if (!Array.isArray(rows)) throw new Error('Choose a YouTube watch-history export.');
  return rows.flatMap(row => {
    const id = youtubeId(row?.titleUrl);
    if (!id) return [];
    const title = typeof row.title === 'string' ? row.title.replace(/^Watched\s+/i, '').trim().slice(0, 250) : '';
    const channel = typeof row.subtitles?.[0]?.name === 'string' ? row.subtitles[0].name.slice(0, 150) : '';
    return [{ id, title: title || 'YouTube video', channel, channelId: channelIdFrom(row.subtitles?.[0]?.url), time: Number(new Date(row.time)) || 0 }];
  });
}
function mergeHistory(entries, openedHere = false) {
  const imported = new Map();
  entries.forEach(entry => {
    const previous = imported.get(entry.id);
    const newest = !previous || entry.time >= previous.time ? entry : previous;
    imported.set(entry.id, {
      ...newest,
      channel: newest.channel || previous?.channel || entry.channel,
      channelId: newest.channelId || previous?.channelId || entry.channelId,
      count: (previous?.count || 0) + 1
    });
  });
  const unique = new Map(data.history.map(entry => [entry.id, entry]));
  imported.forEach(entry => {
    const previous = unique.get(entry.id);
    const newest = !previous || entry.time >= previous.time ? entry : previous;
    const previousCount = previous ? previous.count || 1 : 0;
    unique.set(entry.id, {
      ...newest,
      channel: newest.channel || previous?.channel || entry.channel,
      channelId: newest.channelId || previous?.channelId || entry.channelId,
      count: openedHere ? previousCount + entry.count : Math.max(previousCount, entry.count)
    });
  });
  data.history = [...unique.values()].sort((a, b) => b.time - a.time).slice(0, 1500);
  persist();
}
function historySearch(profile) {
  const creator = [...profile.creators.values()].filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count)[0];
  if (creator) return { term: creator.name, channelId: creator.id };
  const term = [...profile.topics].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([word]) => word).join(' ');
  return { term };
}
function mixPickedCreators(ranked) {
  const queues = new Map();
  const others = [];
  for (const item of ranked) {
    const creator = creatorOf(item.video);
    if (creatorVote(item.video) !== 'yes') {
      others.push(item);
      continue;
    }
    if (!queues.has(creator.id)) queues.set(creator.id, []);
    queues.get(creator.id).push(item);
  }
  const mixed = [];
  for (let round = 0; mixed.length < ranked.length - others.length; round++) {
    for (const queue of queues.values()) {
      if (queue[round]) mixed.push(queue[round]);
    }
  }
  return [...mixed, ...others];
}
function recommendationReason({ video, creatorCount, interest }) {
  if (creatorVote(video) === 'yes') return 'Creator you picked';
  if (creatorCount >= 2) return 'Creator you watch often';
  return interest ? 'Related to your history or saves' : video.genre || 'YouTube';
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
  const track = () => mergeHistory([{ id: video.id, title: video.title, channel: video.channel, channelId: video.channelId, time: Date.now() }], true);
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
    link.append(img, node('span', 'runtime', video.seconds ? runtimeLabel(video.seconds) : '▶ YouTube'));
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
function fallback(term, channelId) {
  if (!term) return;
  if (channelId) {
    const channel = node('a', '', 'Browse ' + term + ' on YouTube ↗');
    channel.href = 'https://www.youtube.com/channel/' + channelId + '/videos';
    channel.target = '_blank';
    channel.rel = 'noopener noreferrer';
    $('fallback').append(channel);
    return;
  }
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
function parseDuration(value) {
  const parts = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || '');
  if (!parts) return 0;
  const [, days = 0, hours = 0, minutes = 0, seconds = 0] = parts;
  return days * 86400 + hours * 3600 + minutes * 60 + Number(seconds);
}
async function youtubeRequest(resource, params, signal) {
  const response = await fetch('https://www.googleapis.com/youtube/v3/' + resource + '?' + new URLSearchParams(params), {
    headers: { 'X-Goog-Api-Key': key }, signal
  });
  if (!response.ok) {
    const message = response.status === 403 ? 'YouTube rejected the key or its quota was reached.'
      : response.status === 400 ? 'YouTube could not use this API key or search.'
      : 'YouTube search is temporarily unavailable.';
    throw new Error(message);
  }
  return response.json();
}
async function liveSearch(term, signal, channelId) {
  const cacheKey = channelId || term;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);
  const params = new URLSearchParams({ part: 'snippet', type: 'video', q: term, maxResults: '24', safeSearch: 'moderate' });
  if (channelId) {
    params.delete('q');
    params.set('channelId', channelId);
    params.set('order', 'date');
  }
  const payload = await youtubeRequest('search', params, signal);
  const ids = payload.items.filter(item => idPattern.test(item.id?.videoId || '')).map(item => item.id.videoId);
  if (!ids.length) return [];
  const details = await youtubeRequest('videos', { part: 'snippet,contentDetails', id: ids.join(',') }, signal);
  const videosById = new Map(details.items
    .filter(item => item.snippet?.liveBroadcastContent === 'none')
    .map(item => [item.id, {
      id: item.id, title: decode(item.snippet.title), channel: decode(item.snippet.channelTitle),
      channelId: item.snippet.channelId, seconds: parseDuration(item.contentDetails?.duration), entertainment: true
    }]));
  const videos = ids.map(id => videosById.get(id)).filter(Boolean);
  if (searchCache.size >= 30) searchCache.clear();
  searchCache.set(cacheKey, videos);
  return videos;
}

async function refresh(creatorSearch = false) {
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
  if (!timeSlot) {
    $('results-title').textContent = 'Your next three';
    $('status').textContent = 'Choose how much time you have to see your picks.';
    setPicks([]);
    return;
  }
  const history = data.personalize ? data.history : [];
  const favorites = data.personalize ? data.saved : [];
  const profile = profileFor(history, favorites);
  const ranked = rank(catalog, query, genre, history, favorites, profile);
  $('results-title').textContent = query ? 'Results for “' + query + '”' : !['All', 'Entertainment'].includes(genre) ? genre : 'Your next three';
  const local = (query ? ranked : mixPickedCreators(ranked)).map(item => ({ video: item.video, reason: recommendationReason(item) }));
  setPicks(local);
  const explicitTerm = [query, !['All', 'Entertainment'].includes(genre) ? genre : ''].filter(Boolean).join(' ');
  const selected = preferredCreators();
  const inferred = explicitTerm ? {} : selected.length
    ? { term: selected[0].name, channelId: selected[0].id }
    : historySearch(profile);
  const term = explicitTerm || (creatorSearch ? inferred.term : '');
  if (!local.length) $('status').textContent = 'No unseen videos fit this time and filter. Try another duration or topic.';
  if (inferred.term && !term) {
    const more = node('button', 'outline', selected.length > 1 ? 'Find more from my creators'
      : inferred.channelId ? 'Find more from ' + inferred.term : 'Find more like my history');
    more.onclick = () => refresh(true);
    $('fallback').append(more);
  } else if (creatorSearch && selected.length > 1) {
    selected.slice(0, 3).forEach(creator => fallback(creator.name, creator.id));
  } else if (term) fallback(term, inferred.channelId);
  if (!key || !term) return;
  $('status').textContent = 'Searching YouTube…';
  try {
    const requests = creatorSearch && selected.length
      ? selected.slice(0, 3).map(creator => liveSearch(creator.name, signal, creator.id))
      : [liveSearch(term, signal, inferred.channelId)];
    const settled = await Promise.allSettled(requests);
    if (settled.every(result => result.status === 'rejected')) throw settled[0].reason;
    const results = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    if (signal.aborted) return;
    const ids = new Set([...history.map(video => video.id), ...favorites.map(video => video.id), ...data.hidden, ...local.map(item => item.video.id)]);
    const extra = results.filter(video => {
      if (ids.has(video.id) || !fitsTime(video) || creatorVote(video) === 'no') return false;
      ids.add(video.id);
      return true;
    });
    const resultsToShow = explicitTerm
      ? [...extra.map(video => ({ video, reason: 'YouTube search' })), ...local]
      : mixPickedCreators(rank([...catalog, ...extra], '', genre, history, favorites, profile))
        .map(item => ({ video: item.video, reason: recommendationReason(item) }));
    setPicks(resultsToShow);
    $('status').textContent = resultsToShow.length ? '' : 'No unseen videos fit this time and filter.';
  } catch (error) {
    if (!signal.aborted) $('status').textContent = error.message + ' You can still use the collection or open the search on YouTube.';
  }
}
function renderHistory() {
  const recent = data.history.slice(0, 8);
  $('history-list').replaceChildren(...recent.map(video => node('li', '', video.title + (video.count > 1 ? ' · ' + video.count + ' times' : ''))));
  $('clear-history').disabled = !data.history.length;
  $('reset-hidden').disabled = !data.hidden.length;
}
function updateCreatorSummary() {
  const count = preferredCreators().length;
  $('creator-summary').textContent = count ? count + (count === 1 ? ' creator picked' : ' creators picked')
    : 'Choose favorites once. History import is optional.';
}
function suggestedCreators() {
  const picked = preferredCreators();
  const anchors = picked.length ? picked : creatorOptions.filter(creator => creator.starter);
  const similarity = creator => Math.max(0, ...anchors.map(anchor => {
    const keywords = tokens(anchor.tags);
    return 3 * Number(creator.region === anchor.region) + 2 * Number(creator.genre === anchor.genre) +
      tokens(creator.tags).filter(word => keywords.includes(word)).length;
  }));
  return creatorOptions.filter(creator => !data.creatorVotes[creator.id])
    .map(creator => ({ creator, score: similarity(creator), seen: data.creatorSeen[creator.id] || 0 }))
    .sort((a, b) => a.seen - b.seen || b.score - a.score)
    .slice(0, 3).map(({ creator }) => creator);
}
function openCreatorPicker(creators = creatorOptions, discovery = false) {
  $('creators-title').textContent = discovery ? 'Try these creators?' : 'Who do you enjoy watching?';
  $('creators-help').textContent = discovery
    ? 'Say Yes to add their videos to your picks, or No to skip the creator. You can also choose Done.'
    : 'Choose Yes or No for any creator. Your choices are saved on this device.';
  const rows = creators.map(creator => {
    const row = node('div', 'creator-row');
    const details = node('div');
    details.append(node('strong', '', creator.name), node('small', '', creator.region + ' · ' + creator.style));
    const actions = node('div');
    const update = () => Array.from(actions.children).forEach(button =>
      button.setAttribute('aria-pressed', String(data.creatorVotes[creator.id] === button.dataset.vote)));
    for (const vote of ['yes', 'no']) {
      const button = node('button', '', vote === 'yes' ? 'Yes' : 'No');
      button.dataset.vote = vote;
      button.setAttribute('aria-label', button.textContent + ' to ' + creator.name);
      button.onclick = () => {
        if (data.creatorVotes[creator.id] === vote) delete data.creatorVotes[creator.id];
        else data.creatorVotes[creator.id] = vote;
        if (data.creatorVotes[creator.id] === 'yes') newlyPicked.add(creator.id);
        else newlyPicked.delete(creator.id);
        persist();
        update();
        updateCreatorSummary();
      };
      actions.append(button);
    }
    update();
    row.append(details, actions);
    return row;
  });
  $('creator-list').replaceChildren(...rows);
  $('creators-dialog').showModal();
}
$('creators').onclick = () => openCreatorPicker();
$('creators-dialog').addEventListener('close', () => refresh());
updateCreatorSummary();
timeOptions.forEach(option => {
  const button = node('button', '', option.label);
  button.setAttribute('aria-pressed', 'false');
  button.onclick = () => {
    timeSlot = option.id;
    Array.from($('time-options').children).forEach(chip => chip.setAttribute('aria-pressed', String(chip === button)));
    refresh();
  };
  $('time-options').append(button);
});
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
const suggestions = suggestedCreators();
if (suggestions.length) {
  for (const creator of suggestions) data.creatorSeen[creator.id] = (data.creatorSeen[creator.id] || 0) + 1;
  persist();
  openCreatorPicker(suggestions, true);
}
