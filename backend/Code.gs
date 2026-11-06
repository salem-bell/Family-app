/**
 * Dashboard template – v2.0
 *
 * Editions: Personal, Couple, Family. v3: family chat, a phone app with notifications, and light/dark/auto.
 * Everything is set up from the sheet's "Dashboard" menu. Nobody needs to edit this file.
 * To update a copy: paste the newer Code.gs and App.html over these, then
 * Deploy > Manage deployments > pencil > New version > Deploy, then Dashboard > 1. Set up again.
 */

const VERSION = '3.4';
const EDITIONS = ['Personal', 'Couple', 'Family'];
const ROLES = ['Organizer', 'Member', 'Viewer'];
const PALETTE = ['#2F6FB2', '#C2185B', '#2E7D32', '#EF6C00', '#6A1B9A', '#00838F', '#8D6E63', '#455A64'];

/* ============================================================
   Features. Defaults are per edition: [Personal, Couple].
   ============================================================ */
const FEATURES = [
  // name, tab id in the app, [P, C], what it shows, where to set it up, sheet tabs it needs
  ['Calendar',           'calendar',  [1, 1, 1], 'Upcoming events, colored by person. Add, edit and repeat events in the app; each person can subscribe from their phone.', 'Events tab; Outside calendars tab; Settings › Google Calendar', ['Events', 'Outside calendars']],
  ['Messages',           'chat',      [0, 0, 1], 'Family chat: an everyone channel, small groups and private messages, with photos, replies and @mentions.', 'The app (Organizers can make channels)', ['Channels', 'Messages', 'Chat reads']],
  ['Week ahead',         'week',      [0, 1, 0], 'The next 7 days on one screen: events, meals, bills, upkeep and trips.',     'Nothing – it uses the other features', []],
  ['To-dos',             'todos',     [1, 1, 1], 'Checklists in your named lists, assigned to a person or to both.',          'Settings › To-do lists', ['To-dos']],
  ['Shopping list',      'shopping',  [0, 1, 0], 'A shared list, grouped by store. Tick items as you buy them.',               'The app', ['Shopping']],
  ['Meal plan',          'meals',     [0, 1, 0], "This week's meals and who's cooking.",                                       'The app, or the Meals tab', ['Meals']],
  ['Routines & chores',  'routines',  [1, 0, 0], 'Daily or weekly habits and chores. They reset each day.',                    'Routines tab', ['Routines', 'Routine log']],
  ['Home & car upkeep',  'upkeep',    [0, 1, 0], 'Filters, alarms, oil changes: what is due, from the date you last did it.', 'Upkeep tab', ['Upkeep']],
  ['Bills & renewals',   'bills',     [0, 1, 0], 'Due dates with a 7-day heads-up and a Paid button.',                         'Bills tab', ['Bills']],
  ['Budget snapshot',    'budget',    [0, 1, 0], 'Spent this month against your budget, in dollars or just "on track / over".', 'Budget tab', ['Budget']],
  ['Savings goals',      'goals',     [0, 1, 0], 'A progress bar for each goal.',                                              'Goals tab', ['Goals']],
  ['Numbers',            'numbers',   [1, 1, 0], 'Any number you track, with a trend line.',                                   'Numbers tab', ['Numbers', 'Number log']],
  ['Trips',              'trips',     [0, 1, 1], 'Each trip with a countdown, links, and a before-you-go and packing list.',  'Trips tab, or the app', ['Trips', 'Trip list']],
  ['Date nights',        'dates-out', [0, 1, 0], 'Countdown to the next date night, an ideas list, and whose turn it is.',    'Date ideas tab; put "date night" in the calendar event', ['Date ideas']],
  ['Important dates',    'dates',     [1, 1, 1], 'Birthdays, anniversaries and deadlines with a countdown.',                   'Dates tab', ['Dates']],
  ['Notes board',        'notes',     [0, 1, 1], 'Short notes for each other. Pin the important ones.',                        'The app', ['Notes']],
  ['Links',              'links',     [1, 1, 1], 'One-tap links, e.g. your important documents in Drive.',                     'Links tab', ['Links']],
  ['Follow-ups',         'followups', [1, 1, 0], 'Messages to send on a date, with the email or text pre-written.',            'The app, or the Follow-ups tab', ['Follow-ups']],
  ['Family directory',   'directory', [0, 0, 1], 'Everyone\'s phone, email, address and birthday, grouped by household.',   'Directory tab', ['Directory']],
  ['Gatherings',         'gatherings',[0, 0, 1], 'Family events with RSVPs (with headcount) and a bring list people can claim.', 'The app, or the Gatherings tab', ['Gatherings', 'RSVPs', 'Bring list']],
  ['Polls',              'polls',     [0, 0, 1], 'Quick votes, like picking a date or a place. Shows who voted for what.',   'The app', ['Polls', 'Votes']],
  ['Recipes',            'recipes',   [0, 0, 1], 'The family cookbook: ingredients, steps and whose recipe it is.',         'The app, or the Recipes tab', ['Recipes']],
  ['Marketplace',        'market',    [0, 0, 1], 'Give things away or ask for a hand – tagged by region, so people nearby see it first.', 'The app; Settings › Regions', ['Marketplace']],
  ['Stories',            'stories',   [0, 0, 1], 'Family stories and memories, so they don\'t get lost.',                      'The app, or the Stories tab', ['Stories']],
  ['Inventory alerts',   'inventory', [0, 0, 0], 'Items below par (for a pantry, supplies or a shop).',                        'Inventory tab', ['Inventory']],
];
const ED_INDEX = { personal: 0, couple: 1, family: 2 };
const pickEd_ = (arr, ed) => arr[Math.min(ED_INDEX[ed] || 0, arr.length - 1)];

/* ============================================================
   Sheet layout
   ============================================================ */
const TABS = {
  'People':      ['Name', 'Household', 'Role', 'Color', 'Calendar ID (optional)', 'Key (do not edit)', 'App link', 'Active', 'Sign-in code', 'Chat ID (do not edit)', 'Notifications', 'Last active'],
  'To-dos':      ['ID', 'List', 'To-do', 'Done', 'Order', 'Done at', 'For', 'Added by'],
  'Shopping':    ['Item', 'Qty', 'Added by', 'Got it', 'Got at', 'Store'],
  'Meals':       ['Date', 'Meal', 'What', 'Cook'],
  'Routines':    ['Routine', 'Who', 'Days', 'Order'],
  'Upkeep':      ['Item', 'Every (days)', 'Last done', 'Category', 'Notes'],
  'Bills':       ['Bill', 'Amount', 'Due (day of month or a date)', 'Repeats', 'Autopay', 'Last paid', 'Notes'],
  'Budget':      ['Name', 'Monthly budget', 'Spent so far (type it, or leave blank and fill the next two)', 'Source sheet link', 'Source cell (e.g. Summary!C5)', 'Show as'],
  'Goals':       ['Goal', 'Target', 'Saved so far', 'Target date', 'Notes'],
  'Numbers':     ['Name', 'Unit', 'Source sheet link (optional)', 'Source tab', 'Date column', 'Value column', 'Decimals'],
  'Trips':       ['Trip', 'Start', 'End', 'Where', 'Link 1', 'Link 2', 'Notes'],
  'Trip list':   ['Trip', 'Item', 'Type', 'Who', 'Done'],
  'Date ideas':  ['Idea', 'Cost', 'Tried', 'Notes'],
  'Dates':       ['Name', 'Date', 'Type', 'Every year'],
  'Notes':       ['Posted', 'From', 'Note', 'Pin'],
  'Links':       ['List', 'Name', 'Link', 'Pin to Today', 'Order'],
  'Follow-ups':  ['ID', 'Due', 'Who', 'Topic', 'Channel', 'Email', 'Phone', 'Subject', 'Message', 'Note', 'Status', 'Done at'],
  'Inventory':   ['Item', 'On hand', 'Par', 'Unit', 'Where to buy'],
  'Directory':   ['Name', 'Household', 'Phone', 'Email', 'Address', 'Birthday', 'Notes'],
  'Gatherings':  ['ID', 'Gathering', 'Date', 'Time', 'Where', 'Host', 'Details', 'RSVP by'],
  'RSVPs':       ['Gathering ID', 'Person', 'Answer', 'How many', 'Note', 'Updated'],
  'Bring list':  ['Gathering ID', 'Item', 'Who', 'Added by'],
  'Polls':       ['ID', 'Question', 'Options (one per line)', 'Closes', 'Created by', 'Pick more than one'],
  'Votes':       ['Poll ID', 'Person', 'Choice', 'Updated'],
  'Marketplace': ['ID', 'Posted', 'From', 'Type', 'What', 'Details', 'Region', 'Status', 'Taken by', 'Updated'],
  'Stories':     ['ID', 'Posted', 'From', 'Title', 'Story', 'About (who)', 'When it happened', 'Photo link'],
  'Recipes':     ['Recipe', 'From', 'Category', 'Ingredients', 'Steps', 'Link', 'Added by'],
  // system tabs
  'Views':       ['Person', 'Features (in order)', 'Look', 'Text', 'Seen', 'Mode'],
  'Channels':    ['ID', 'Name', 'Kind', 'Members (chat IDs; blank = everyone)', 'Who sees it', 'Created by', 'Created'],
  'Messages':    ['ID', 'Channel ID', 'From ID', 'From', 'Sent', 'Text', 'Photo (Drive file)', 'Reply to (message ID)', 'Read marks (chat IDs)'],
  'Chat reads':  ['Chat ID', 'Channel ID', 'Read at'],
  'Push':        ['Chat ID', 'Name', 'Endpoint', 'Keys (do not edit)', 'Device', 'Added', 'Last sent'],
  'Number log':  ['Date', 'Name', 'Value'],
  'Routine log': ['Date', 'Routine', 'Who', 'Done at'],
  'Event marks': ['Event ID', 'Done at'],
  'Events':      ['ID', 'Date', 'Start time', 'End time', 'Title', 'Where', 'Who', 'Repeats', 'Until', 'Notes', 'Added by'],
  'Outside calendars': ['Name', 'iCal link', 'Whose (optional)', 'Color', 'Show'],
};
const LOOKS = ['sky', 'lavender', 'ivory', 'paper', 'light', 'dark', 'burgundy'];   // the first five are the themes; the rest are older names the app still understands
function lookOf_(v) { v = String(v || '').toLowerCase(); return /lavender|bellah/.test(v) ? 'lavender' : /ivory|burgundy/.test(v) ? 'ivory' : /sky|navy/.test(v) ? 'sky' : /paper/.test(v) ? 'paper' : 'light'; }
/** Settings › Logo image link → an inline image (cached 6 hours), so it shows without the viewer needing access to Drive. */
function logo_(ss) {
  const link = setting_(ss, 'Logo image link');
  if (!link) return '';
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(link)) return link.length < 95000 ? link : '';
  const id = (link.match(/\/d\/([\w-]{20,})/) || link.match(/[?&]id=([\w-]{20,})/) || [])[1];
  const url = id ? 'https://drive.google.com/uc?export=download&id=' + id : link;
  if (!/^https:\/\//.test(url)) return '';
  const cache = CacheService.getScriptCache(), key = 'logo_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, url).map(b => ((b + 256) % 256).toString(16)).join('');
  const hit = cache.get(key); if (hit !== null) return hit;
  let out = '';
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true }), type = String(res.getHeaders()['Content-Type'] || res.getHeaders()['content-type'] || '');
    if (res.getResponseCode() === 200 && /^image\//.test(type)) { const b = res.getBlob().getBytes(); if (b.length < 70000) out = 'data:' + type.split(';')[0] + ';base64,' + Utilities.base64Encode(b); }
  } catch (_) {}
  cache.put(key, out, out ? 21600 : 600);
  return out;
}
const REPEATS = ['', 'Daily', 'Weekdays', 'Weekly', 'Every 2 weeks', 'Monthly', 'Yearly'];
const SYSTEM_TABS = ['Views', 'Number log', 'Routine log', 'Event marks', 'Chat reads', 'Push'];

const SETTINGS = [
  // label, [Personal, Couple], help
  ['Edition',               ['Personal', 'Couple', 'Family'],       'Personal, Couple or Family. Change it, then run Dashboard › 1. Set up again to get that edition\'s tabs.'],
  ['Dashboard name',        ['My Dashboard', 'Our Home', 'Our Family'],            'Shown at the top of the app.'],
  ['To-do lists',           ['Work, Home, Errands', 'Home, Errands, Admin', 'Holidays, Reunion, Errands'], 'Names of your to-do lists, separated by commas.'],
  ['Google Calendar',       ['On', 'On', 'Off'],                            'On: also show Google Calendar events (the calendars below, plus each person\'s on the People tab). Off: the dashboard only uses its own Events tab and the Outside calendars tab.'],
  ['Calendars to show',     ['primary', ''],                  '"primary" is the main Google Calendar of whoever owns this sheet. Add shared calendars by Calendar ID, separated by commas. Each person\'s own calendar goes on the People tab.'],
  ['Add new events to',     ['App', 'App'],                          '"App" keeps new events in the Events tab, so they can be edited, repeated, and seen by everyone through their subscription link. Or type "primary" or a Google Calendar ID to add them to Google Calendar instead.'],
  ['Calendar subscriptions',['On', 'On'],                            'On: each person gets a private link (in the app\'s Calendar tab) that shows the dashboard\'s events in Apple Calendar, Outlook or Google Calendar. Needs App web address below.'],
  ['Add to calendar buttons',['On', 'On'],                           'On: tapping an event shows buttons to save a copy of it to your own calendar.'],
  ['Days ahead',            ['7', '7'],                              'How many days the Calendar tab shows.'],
  ['Date night keyword',    ['date night', 'date night'],            'Calendar events with this in the title count as date nights.'],
  ['Monthly budget shows',  ['Dollars', 'Dollars'],                  'Dollars, or Status (only "on track / over", no amounts).'],
  ['App web address',       ['', ''],                                'Paste the Web app URL from Apps Script › Deploy › Manage deployments. The links use it. (Google\'s own guess is often wrong.)'],
  ['Regions',               ['', '', 'Texas, Colorado, Out of state'], 'Family edition: the region tags for the Marketplace, separated by commas (cities, states, or "Online").'],
  ['Sign in with',          ['Link', 'Link', 'Name + code only'],  'Link: each person opens their own private link. Link or name + code: private links work, and anyone can also open the plain app address and sign in with their first name and 4-digit code (People tab › Sign-in code). Name + code only: one shared address for everyone; private links stop working.'],
  ['Ask for the code again every', ['60', '60', '60'],             'Days before a signed-in device asks for the name and code again (0 = never). Only applies to sign-in with a code.'],
  ['Phone app address',     ['', '', ''],                            'Optional. The address of the installable phone app (e.g. https://you.github.io/Family-App/). Shown in "Get app links" so people install that one.'],
  ['Delete chat photos after (days)', ['60', '60', '60'],          'Photos sent in Messages are kept in a private Drive folder and deleted after this many days.'],
  ['Chat service address',  ['', '', ''],                            'Live Messages (the Cloudflare team-chat Worker), e.g. https://team-chat….workers.dev. Blank = Messages run on this sheet (slower; messages saved in the Messages tab).'],
  ['Chat service secret',   ['', '', ''],                            'Must match SECRET_FAMILY in the team-chat Worker. Don\'t share it.'],
  ['Push service address',  ['', '', ''],                            'For phone notifications: the Cloudflare Worker address (https://….workers.dev). Blank = no notifications. The same Worker can serve several dashboards.'],
  ['Push service secret',   ['', '', ''],                            'Must match SECRET in that Worker. Don\'t share it.'],
  ['Push public key',       ['', '', ''],                            'Must match VAPID_PUBLIC in that Worker.'],
  ['Look',                  ['Paper', 'Simple', 'Sky & navy'],                'The theme everyone starts with: Sky & navy, Lavender & gold, Ivory & burgundy, Paper or Simple. Each has a light and a dark version; each person picks theirs (and Light/Dark/Auto) in the app under My view.'],
  ['Logo image link',       ['', ''],                                'Optional. A link to a small PNG or JPG (under 70 KB) shown at the top of the app. For a Google Drive file: Share › Anyone with the link, then paste the link here.'],
  ['Tagline',               ['', ''],                                'Optional. A short line under the name, like a date or a motto.'],
  ['Accent color',          ['#50602B', '#2F6FB2'],                  'Any color code, like #2F6FB2.'],
];

/* ============================================================
   Menu + setup
   ============================================================ */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Dashboard')
    .addItem('1. Set up this sheet', 'setup')
    .addItem('2. Get app links for everyone', 'showLinks')
    .addSeparator()
    .addItem('New link for the selected person', 'resetSelected')
    .addItem('New links for everyone', 'resetAll')
    .addToUi();
}

/** Builds the tabs the edition needs. Safe to run again: it never deletes or overwrites your rows. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const ed = guessEdition_(ss);
  const isCopy = PropertiesService.getScriptProperties().getProperty('SHEET_ID') !== ss.getId();

  const legacyPeople = splitList_(setting_(ss, 'People'));   // v1 kept people as a comma list in Settings
  writeStartHere_(ss);
  buildSettings_(ss, ed);
  buildFeatures_(ss, ed);
  fixColumns_(ss, 'People');
  buildTab_(ss, 'People', ed, legacyPeople);
  migrateV1People_(ss);
  const on = config_(ss).features;
  FEATURES.forEach(f => { if (on[f[0]]) f[5].forEach(t => buildTab_(ss, t, ed)); });
  Object.keys(TABS).forEach(t => { if (ss.getSheetByName(t)) buildTab_(ss, t, ed); });   // older copies: add new columns
  SYSTEM_TABS.forEach(t => buildTab_(ss, t, ed));
  ensureKeys_(ss, isCopy);
  if (isCopy) PropertiesService.getScriptProperties().setProperties({ SHEET_ID: ss.getId() });

  ['Start Here', 'Settings', 'Features', 'People'].forEach((n, i) => move_(ss, n, i + 1));
  SYSTEM_TABS.forEach(n => { const s = ss.getSheetByName(n); if (s) { move_(ss, n, ss.getSheets().length); s.setTabColor('#bbbbbb'); } });
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);

  ss.setActiveSheet(ss.getSheetByName('Start Here'));
  ui_().alert('Set up done', 'Your tabs are ready.\n\nNext: fill in the People tab, then follow Step 3 on the Start Here tab to turn on the app.', ui_().ButtonSet.OK);
}

function guessEdition_(ss) {
  const s = setting_(ss, 'Edition');
  if (s) return /family/i.test(s) ? 'family' : /couple/i.test(s) ? 'couple' : 'personal';
  if (/family/i.test(setting_(ss, 'Mode'))) return 'couple';          // v1 family copies → closest v2 edition
  return /family/i.test(ss.getName()) ? 'family' : /couple|our home|us\b/i.test(ss.getName()) ? 'couple' : 'personal';
}

function buildSettings_(ss, ed) {
  let sh = ss.getSheetByName('Settings');
  if (!sh) { sh = ss.insertSheet('Settings'); sh.getRange(1, 1, 1, 3).setValues([['Setting', 'Your choice', 'What it means']]); }
  const have = colValues_(sh, 1);
  SETTINGS.forEach(([label, def, help]) => { if (have.indexOf(label) < 0) sh.appendRow([label, pickEd_(def, ed), help]); });
  // retire v1 settings that moved elsewhere
  ['Mode', 'People', 'Access key', 'App link'].forEach(label => {
    const i = colValues_(sh, 1).indexOf(label);
    if (i >= 0) sh.deleteRow(i + 1);
  });
  const vals = sh.getDataRange().getValues();
  const rule = (label, list) => { const r = vals.findIndex(x => x[0] === label) + 1; if (r) sh.getRange(r, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(list, true).build()); };
  rule('Edition', EDITIONS); rule('Look', ['Sky & navy', 'Lavender & gold', 'Ivory & burgundy', 'Paper', 'Simple']); rule('Sign in with', ['Link', 'Link or name + code', 'Name + code only']); rule('Monthly budget shows', ['Dollars', 'Status']);
  ['Google Calendar', 'Calendar subscriptions', 'Add to calendar buttons'].forEach(l => rule(l, ['On', 'Off']));
  header_(sh, 3);
  sh.setColumnWidth(1, 190); sh.setColumnWidth(2, 300); sh.setColumnWidth(3, 560);
  sh.getRange(2, 2, Math.max(sh.getLastRow() - 1, 1), 1).setBackground('#fff8e1');
}

function buildFeatures_(ss, ed) {
  let sh = ss.getSheetByName('Features');
  if (!sh) { sh = ss.insertSheet('Features'); sh.getRange(1, 1, 1, 4).setValues([['Feature', 'On?', 'What it shows', 'Set it up in']]); }
  const have = colValues_(sh, 1);
  FEATURES.forEach(f => { if (have.indexOf(f[0]) < 0) sh.appendRow([f[0], pickEd_(f[2], ed) === 1, f[3], f[4]]); });
  sh.getRange(2, 2, sh.getLastRow() - 1, 1).insertCheckboxes();
  header_(sh, 4);
  sh.setColumnWidth(1, 170); sh.setColumnWidth(2, 60); sh.setColumnWidth(3, 520); sh.setColumnWidth(4, 300);
}

function buildTab_(ss, name, ed, legacyPeople) {
  const header = TABS[name];
  const existing = ss.getSheetByName(name);
  if (existing) {                                   // older copies: add any new columns to the header, touch nothing else
    const have = existing.getLastColumn();
    if (have < header.length) { existing.getRange(1, have + 1, 1, header.length - have).setValues([header.slice(have)]); header_(existing, header.length); }
    return;
  }
  const sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, header.length).setValues([header]);
  header_(sh, header.length);
  if (name === 'Gatherings') [3, 4, 8].forEach(c => sh.getRange(2, c, 499, 1).setNumberFormat('@'));
  if (name === 'Polls') sh.getRange(2, 4, 499, 1).setNumberFormat('@');
  if (name === 'Events') [2, 3, 4, 9].forEach(c => sh.getRange(2, c, 499, 1).setNumberFormat('@'));   // keep dates/times as typed
  let ex = examples_(ss, name, ed || guessEdition_(ss));
  if (name === 'People' && legacyPeople && legacyPeople.length)
    ex = legacyPeople.map((n, i) => [n, '', i === 0 ? 'Organizer' : 'Member', PALETTE[i % PALETTE.length], '', '', '', true]);
  if (ex.length) sh.getRange(2, 1, ex.length, header.length).setValues(ex.map(r => header.map((_, i) => r[i] === undefined ? '' : r[i])));
  const box = col => sh.getRange(2, col, 499, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  const list = (col, items, strict) => sh.getRange(2, col, 499, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(items, true).setAllowInvalid(!strict).build());
  const textCol = col => sh.getRange(2, col, 499, 1).setNumberFormat('@');
  switch (name) {
    case 'People': list(3, ROLES, true); box(8); sh.getRange(2, 9, 499, 1).setNumberFormat('@'); sh.setColumnWidth(6, 120); sh.setColumnWidth(7, 380); sh.getRange(2, 6, 499, 2).setFontColor('#777777'); break;
    case 'To-dos': box(4); break;
    case 'Shopping': box(4); break;
    case 'Links': box(4); break;
    case 'Notes': box(4); break;
    case 'Dates': box(4); break;
    case 'Bills': list(4, ['Monthly', 'Quarterly', 'Yearly', 'Once'], true); box(5); break;
    case 'Budget': list(6, ['Dollars', 'Status'], false); break;
    case 'Trip list': list(3, ['Before you go', 'Packing'], false); box(5); break;
    case 'Date ideas': box(3); break;
    case 'Meals': list(2, ['Breakfast', 'Lunch', 'Dinner', 'Snack'], false); break;
    case 'Events': list(8, REPEATS.slice(1), true); sh.getRange(2, 10, 499, 1).setWrap(true); break;
    case 'Outside calendars': box(5); break;
    case 'Directory': textCol(3); sh.getRange(2, 5, 499, 1).setWrap(true); break;
    case 'Gatherings': textCol(3); textCol(4); textCol(8); sh.getRange(2, 7, 499, 1).setWrap(true); break;
    case 'RSVPs': list(3, ['Yes', 'Maybe', 'No'], true); break;
    case 'Polls': textCol(4); box(6); sh.getRange(2, 3, 499, 1).setWrap(true); break;
    case 'Marketplace': list(4, ['Giving away', 'Need help'], true); list(8, ['Open', 'Taken', 'Done'], true); sh.getRange(2, 6, 499, 1).setWrap(true); break;
    case 'Stories': sh.getRange(2, 5, 499, 1).setWrap(true).setVerticalAlignment('top'); sh.setColumnWidth(5, 480); break;
    case 'Recipes': sh.getRange(2, 4, 499, 2).setWrap(true).setVerticalAlignment('top'); sh.setColumnWidth(4, 300); sh.setColumnWidth(5, 380); break;
    case 'Follow-ups':
      textCol(2); list(5, ['Email', 'Text', 'Call', 'Other'], true); list(11, ['Open', 'Sent', 'Skipped'], true);
      sh.getRange(2, 9, 499, 2).setWrap(true).setVerticalAlignment('top'); sh.setColumnWidth(9, 420); break;
  }
  if (name !== 'People') sh.autoResizeColumns(1, header.length);
}

function examples_(ss, name, ed) {
  const tz = ss.getSpreadsheetTimeZone(), today = new Date();
  const base = Utilities.formatDate(today, tz, 'yyyy-MM-dd'), d = n => addDays_(base, n);   // calendar days, safe across clock changes
  const couple = ed === 'couple', family = ed === 'family';
  if (name === 'Channels') return [['general', 'Everyone', 'channel', '', 'Everyone', 'Setup', new Date()]];
  if (family) { const ex = familyExamples_(name, d); if (ex) return ex; }
  switch (name) {
    case 'People': return couple
      ? [['Partner 1', 'Home', 'Organizer', PALETTE[0], 'primary', '', '', true], ['Partner 2', 'Home', 'Member', PALETTE[1], '', '', '', true]]
      : [['Me', '', 'Organizer', PALETTE[0], '', '', '', true]];
    case 'To-dos': return couple
      ? [['t01', 'Home', 'Replace the porch light', false, 1, '', 'Both'], ['t02', 'Admin', 'Renew car registration', false, 2, '', 'Partner 1']]
      : [['t01', 'Work', 'Example to-do: replace me', false, 1], ['t02', 'Home', 'Example: call the plumber', false, 2]];
    case 'Shopping': return [['Milk', '1', '', false, '', 'Grocery'], ['Light bulbs', '2', '', false, '', 'Hardware store']];
    case 'Meals': return [[d(0), 'Dinner', 'Tacos', couple ? 'Partner 1' : '']];
    case 'Routines': return [['Plan the week', '', 'Sun', 1], ['Drink water', '', 'Every day', 2]];
    case 'Upkeep': return [['HVAC filter', 90, d(-80), 'Home'], ['Smoke alarm test', 180, d(-30), 'Home'], ['Oil change', 120, d(-100), 'Car']];
    case 'Bills': return [['Mortgage or rent', 1500, 1, 'Monthly', true], ['Internet', 70, 15, 'Monthly', false], ['Car insurance', 600, d(40), 'Yearly', false]];
    case 'Budget': return [['Monthly spending', 2500, 1200, '', '', '']];
    case 'Goals': return [['Emergency fund', 10000, 3500, d(365)], ['Trip fund', 3000, 900, d(180)]];
    case 'Numbers': return [['Example number', '$', '', '', '', '', 2]];
    case 'Number log': return [[d(-2), 'Example number', 10], [d(-1), 'Example number', 12], [d(0), 'Example number', 11]];
    case 'Trips': return [['Example trip', d(45), d(50), 'Somewhere warm', 'https://www.google.com/travel/flights', '', 'Replace with your own']];
    case 'Trip list': return [['Example trip', 'Book the dog sitter', 'Before you go', couple ? 'Partner 2' : ''], ['Example trip', 'Passports', 'Packing', 'Both']];
    case 'Date ideas': return [['Try the new taco place', '$$', false], ['Picnic at the arboretum', '$', false], ['Cooking class', '$$$', false]];
    case 'Dates': return couple ? [['Our anniversary', d(60), 'Anniversary', true], ['Example birthday', d(20), 'Birthday', true]] : [['Example birthday', d(20), 'Birthday', true]];
    case 'Notes': return [[new Date(), 'Dashboard', 'Welcome! Leave each other notes here. Pin the important ones.', true]];
    case 'Links': return couple
      ? [['Documents', 'Insurance policies (Drive folder)', 'https://drive.google.com', true, 1], ['', 'Google Calendar', 'https://calendar.google.com', false, 2]]
      : [['', 'Google Calendar', 'https://calendar.google.com', true, 1], ['', 'Google Drive', 'https://drive.google.com', false, 2]];
    case 'Follow-ups': return [['f01', d(1), 'Example person', 'Example follow-up', 'Email', 'someone@example.com', '', 'Checking in', 'Hi there,\n\nJust checking in. Any update?\n\nThanks', 'Delete this example once you add your own.', 'Open']];
    case 'Inventory': return [['Example item', 4, 6, 'bags', '']];
    case 'Events': return couple
      ? [['ev01', d(3), '18:30', '20:30', 'Dinner with friends (example)', '', '', '', '', 'Delete this example once you add your own.', 'Dashboard'],
         ['ev02', d(1), '', '', 'Trash night', '', 'Partner 2', 'Weekly', '', '', 'Dashboard']]
      : [['ev01', d(1), '', '', 'Example: take out the trash', '', '', 'Weekly', '', 'Delete this example once you add your own.', 'Dashboard']];
    case 'Outside calendars': return [['Example: US holidays', 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics', '', '#8D6E63', false]];
  }
  return [];
}

/** v1 copies kept people as a comma list in Settings. Move them onto the People tab once. */
function migrateV1People_(ss) {
  const sh = ss.getSheetByName('People');
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('MIGRATED_V1') || !props.getProperty('KEY')) return;
  const legacyKey = props.getProperty('KEY');
  const rows = rows_(ss, 'People');
  if (rows.length) { sh.getRange(2, 6).setValue(legacyKey); }   // first person keeps the old link working
  props.setProperties({ MIGRATED_V1: '1' });
}

function ensureKeys_(ss, regenerateAll) {
  const sh = ss.getSheetByName('People'); if (!sh) return;
  fixColumns_(ss, 'People');
  const vals = rows_(ss, 'People');
  vals.forEach((r, i) => {
    if (!r[0]) return;
    if (regenerateAll || !r[5]) sh.getRange(i + 2, 6).setValue(newKey_());
    if (!r[2]) sh.getRange(i + 2, 3).setValue(i === 0 ? 'Organizer' : 'Member');
    if (!r[3]) sh.getRange(i + 2, 4).setValue(PALETTE[i % PALETTE.length]);
    if (r[7] === '' || r[7] === null) sh.getRange(i + 2, 8).setValue(true);
    if (regenerateAll) sh.getRange(i + 2, 7).setValue('');
  });
  ensureChatIds_(ss);
  // 4-digit sign-in codes: one per person, all different.
  const used = {}; if (!regenerateAll) vals.forEach(r => { if (/^\d{4}$/.test(String(r[8] || ''))) used[String(r[8])] = 1; });
  vals.forEach((r, i) => {
    if (!r[0] || (!regenerateAll && /^\d{4}$/.test(String(r[8] || '')))) return;
    let c; do { c = String(Math.floor(Math.random() * 10000)).padStart(4, '0'); } while (used[c] || /^(\d)\1{3}$/.test(c) || '0123456789'.indexOf(c) >= 0 || '9876543210'.indexOf(c) >= 0);
    used[c] = 1; sh.getRange(i + 2, 9).setNumberFormat('@').setValue(c);
  });
}
function newKey_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40); }

function showLinks() {
  const ss = SpreadsheetApp.getActive();
  ensureKeys_(ss, false);
  const typed = setting_(ss, 'App web address');
  if (!/^https:\/\/script\.google\.com\/.*\/exec\/?$/.test(typed)) {
    ui_().alert('One-time step: paste your app\'s web address',
      '1. Extensions › Apps Script › Deploy › Manage deployments.\n2. Click your web app and copy its Web app URL (it ends in /exec). Check "Who has access" says Anyone.\n3. Paste it into Settings › App web address.\n4. Run Dashboard › 2. Get app links for everyone again.\n\nNo deployment yet? Do Step 3 on the Start Here tab first.', ui_().ButtonSet.OK);
    return;
  }
  const url = webUrl_(ss);
  if (url !== typed.trim()) putSetting_(ss, 'App web address', url);
  const phone = /^https:\/\//.test(setting_(ss, 'Phone app address')) ? setting_(ss, 'Phone app address') : '';
  const sh = ss.getSheetByName('People'), people = rows_(ss, 'People'), codes = codeSignIn_(ss), only = codeOnly_(ss);
  const list = [];
  people.forEach((r, i) => {
    if (!r[0] || !r[5]) return;
    const link = url + '#' + r[5];
    if (only) { sh.getRange(i + 2, 7).setValue(truthy_(r[7]) ? '(signs in with name + code)' : '(inactive)'); if (truthy_(r[7])) list.push('<li><b>' + esc_(r[0]) + '</b> (' + esc_(r[2]) + ') · code <b>' + esc_(r[8]) + '</b></li>'); return; }
    sh.getRange(i + 2, 7).setValue(truthy_(r[7]) ? link : '(inactive)');
    if (truthy_(r[7])) list.push('<li><b>' + esc_(r[0]) + '</b> (' + esc_(r[2]) + ')' + (codes ? ' · code <b>' + esc_(r[8]) + '</b>' : '') + ':<br><a href="' + link + '" target="_blank" style="word-break:break-all;font-size:12px">' + link + '</a></li>');
  });
  ui_().showModalDialog(HtmlService.createHtmlOutput(
    '<div style="font:14px/1.5 sans-serif">' + (only ? '<p><b>One address for everyone:</b> <a href="' + (phone || url) + '" target="_blank">' + (phone || url) + '</a>' + (phone ? '<br><span style="color:#666">That\'s the phone app: on a phone, open it and Add to Home Screen. The older address still works: ' + url + '</span>' : '') + '</p><p>Send this address to the whole family (a group chat is fine). Each person signs in with their first name and <b>their own code</b> – tell each person only theirs. Devices ask again every ' + (sessionDays_(ss) || 'never – 0') + ' days.</p><ul>' + list.join('') + '</ul><p style="color:#a33">Someone\'s code got out? Change it in the People tab (any 4 digits, all different) – their devices are signed out. Lost a phone? Dashboard › New link for the selected person signs that person out everywhere.</p></div>' : '<p>Each person has <b>their own link</b> (also saved in the People tab). Send each person only theirs – by text or email.</p>' +
    (codes ? '<p style="background:#f3f6f9;padding:8px 10px;border-radius:6px"><b>Or the family address:</b> <a href="' + url + '" target="_blank">' + url + '</a><br>Anyone can open it and sign in with their first name and their 4-digit code below. Tell each person only their own code.</p>' : '') + '<ul>' + list.join('') +
    '</ul><p style="color:#a33">Anyone with a link can use the dashboard as that person. Lost a phone? Select that person\'s row on the People tab, then Dashboard › New link for the selected person.</p></div>')
  ).setWidth(620).setHeight(440), only ? 'Family address and codes' : 'App links');
}

function resetSelected() {
  const ss = SpreadsheetApp.getActive(), sh = ss.getActiveSheet();
  if (sh.getName() !== 'People' || sh.getActiveRange().getRow() < 2) { ui_().alert('Select a person first', 'Go to the People tab, click anywhere in that person\'s row, then try again.', ui_().ButtonSet.OK); return; }
  const r = sh.getActiveRange().getRow(), name = sh.getRange(r, 1).getValue();
  if (ui_().alert('New link for ' + name + '?', 'Their current link stops working right away. Everyone else is unaffected.', ui_().ButtonSet.OK_CANCEL) !== ui_().Button.OK) return;
  sh.getRange(r, 6).setValue(newKey_()); sh.getRange(r, 7).setValue('');
  showLinks();
}
function resetAll() {
  if (ui_().alert('New links for everyone?', 'Every current link stops working. You\'ll need to send everyone their new link.', ui_().ButtonSet.OK_CANCEL) !== ui_().Button.OK) return;
  ensureKeys_(SpreadsheetApp.getActive(), true);
  showLinks();
}

function writeStartHere_(ss) {
  let sh = ss.getSheetByName('Start Here');
  if (!sh) sh = ss.insertSheet('Start Here', 0);
  sh.clear();
  const L = [
    ['START HERE – about 10 minutes, once'], [''],
    ['Step 1. Set up your copy'],
    ['   Menu at the top: Dashboard › 1. Set up this sheet. Do this first – it gives your copy its own private links.'],
    ['   Google asks for permission the first time; see the note at the bottom. (No Dashboard menu? Reload and wait a few seconds.)'], [''],
    ['Step 2. Make it yours'],
    ['   • People tab: one row per person. Name, role, and optionally their own Calendar ID so their events show in their color.'],
    ['   • Events tab: the dashboard\'s own calendar. Add events in the app (or type rows here). No Google Calendar needed.'],
    ['   • Outside calendars tab: paste iCal links (iCloud shared calendar, Outlook, school or team calendars) to show them too. Tick Show.'],
    ['       Organizer = runs the sheet.  Member = can use everything in the app.  Viewer = can look but not change anything.'],
    ['   • Settings tab: change the yellow cells.     • Features tab: tick what this dashboard should have.'],
    ['   • Each person then picks which of those features they see, in the app under "My view".'], [''],
    ['Step 3. Turn on the app (about 2 minutes)'],
    ['   1. Menu: Extensions › Apps Script. A new tab opens.'],
    ['   2. Top right, click the blue Deploy button › New deployment.'],
    ['   3. Click the gear icon next to "Select type" › Web app.'],
    ['   4. Set "Execute as" to Me, and "Who has access" to Anyone.'],
    ['   5. Click Deploy. If asked, click Authorize access and allow it. Click Done and close that tab.'], [''],
    ['   6. Still in Apps Script: Deploy › Manage deployments › click the web app › copy the Web app URL (ends in /exec).'], [''],
    ['Step 4. Send everyone their link'],
    ['   Paste that URL into Settings › App web address. Then: Dashboard › 2. Get app links for everyone. Send each person only theirs.'],
    ['   • iPhone: open the link in Safari › Share › Add to Home Screen.   • Android: Chrome › ⋮ › Add to Home screen.   • Computer: bookmark it.'], [''],
    ['Day to day'],
    ['   • Quick things in the app: check off, add, mark paid, log.   • Bigger edits here in the sheet: rename, delete, reorder.'], [''],
    ['Keeping it private'],
    ['   • This copy is yours. Nobody can see it unless you share this sheet or a link.'],
    ['   • A link works like a key for that person. Lost a phone? Select the person on the People tab › Dashboard › New link for the selected person.'],
    ['   • Remove someone: untick Active on their row. Their link stops working; nobody else is affected.'], [''],
    ['About the Google permission warning'],
    ['   Google says "Google hasn\'t verified this app" for any copied sheet. The app is this sheet, running in your own account.'],
    ['   Click Advanced › Go to (unsafe) › Allow. It needs Sheets (your lists), Calendar (to show and add events) and external links (to read iCal calendars you paste in).'], [''],
    ['Dashboard template v' + VERSION],
  ];
  sh.getRange(1, 1, L.length, 1).setValues(L);
  sh.setColumnWidth(1, 1000);
  sh.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  L.forEach((r, i) => { if (/^(Step \d|Day to day|Keeping it private|About the Google)/.test(r[0])) sh.getRange(i + 1, 1).setFontWeight('bold').setFontSize(12); });
  sh.setHiddenGridlines(true);
  sh.setTabColor('#f4b400');
}

/* ============================================================
   Web app
   ============================================================ */
function doGet(e) {
  const q = (e && e.parameter) || {};
  if (q.feed) return feedResponse_(String(q.feed), q.mine === '1');
  if (q.ics) return eventFileResponse_(String(q.ics), q);
  return HtmlService.createTemplateFromFile('App').evaluate()
    .setTitle(setting_(SpreadsheetApp.getActive(), 'Dashboard name') || 'Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('apple-mobile-web-app-capable', 'yes');
}

/** Who is this key? null if unknown, inactive, or this copy hasn't run setup. */
function whoIs_(ss, key) {
  if (!key || PropertiesService.getScriptProperties().getProperty('SHEET_ID') !== ss.getId()) return null;
  peopleOk_(ss);
  let r;
  if (/^S\./.test(String(key))) {                  // a device signed in with name + code
    const [, who, issued, sig] = String(key).split('.');
    r = rows_(ss, 'People').find(x => x[0] && x[5] && feedToken_(String(x[5])) === who);
    if (!r || !truthy_(r[7]) || !codeSignIn_(ss) || sessionSig_(r, issued) !== sig) return null;
    const days = sessionDays_(ss);
    if (days && Date.now() - Number(issued) > days * 864e5) throw new Error('expired: it has been ' + days + ' days – sign in again');
  } else {                                          // a private link
    if (codeOnly_(ss)) return null;
    r = rows_(ss, 'People').find(x => x[0] && String(x[5]) === String(key));
  }
  if (!r || !truthy_(r[7])) return null;
  return { name: String(r[0]), household: String(r[1] || ''), role: ROLES.indexOf(String(r[2])) >= 0 ? String(r[2]) : 'Member', feed: feedToken_(String(r[5])), id: String(r[9] || '') };
}

/** Every call from the app comes through here. */
function api(key, p) {
  memoReset_(false);
  const ss = SpreadsheetApp.getActive();
  const me = whoIs_(ss, key);
  if (!me) throw new Error('unauthorized');
  touch_(ss, me);
  p = p || {};
  let results = null;
  if (Array.isArray(p.actions)) {                    // v3.2: the app's save queue – several changes, one lock, one read back
    const cache = CacheService.getScriptCache(), lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try {
      results = p.actions.slice(0, 40).map(a => {
        a = a || {}; const op = String(a.op || '').slice(0, 40), k = op ? 'op_' + op : '';
        if (k && cache.get(k)) return { op, ok: true, dup: true };   // already saved (the first try timed out on the phone)
        try {
          if (me.role === 'Viewer' && !/^(saveView|push(Sub|Unsub|Prefs|Test))$/.test(a.action)) throw new Error('This sign-in is view-only');
          memoReset_(false); act_(ss, a, me); SpreadsheetApp.flush();
          if (k) cache.put(k, '1', 21600);
          return { op, ok: true };
        } catch (e) { if (k) cache.put(k, '1', 21600); return { op, error: String(e && e.message || e) }; }
      });
    } finally { lock.releaseLock(); }
  } else if (p.action) {
    if (me.role === 'Viewer' && !/^(saveView|push(Sub|Unsub|Prefs|Test))$/.test(p.action)) throw new Error('This link is view-only');
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { act_(ss, p, me); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  } else {
    // A plain read waits for any change that's mid-save, so it never returns the "before" picture.
    const lock = LockService.getScriptLock();
    if (lock.tryLock(8000)) lock.releaseLock();
  }
  memoReset_(true);                                  // the read below can reuse each tab it has already read
  try { const out = state_(ss, me); if (results) out.results = results; return out; } finally { memoReset_(false); }
}

/* ============================================================
   Reading
   ============================================================ */
function state_(ss, me) {
  const tz = ss.getSpreadsheetTimeZone(), cfg = config_(ss), on = cfg.features, errors = [];
  if (on['Messages'] && !me.id) { try { me = chatMe_(ss, me); memoReset_(true); } catch (e) { errors.push('Messages: ' + e.message); } }   // gives anyone new a chat ID
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const out = {
    version: VERSION, edition: cfg.edition, name: cfg.name, me, lists: cfg.lists, look: cfg.look, accent: cfg.accent,
    budgetShows: cfg.budgetShows, logo: logo_(ss), tagline: setting_(ss, 'Tagline').slice(0, 120), today, features: on, sheet: me.role === 'Organizer' ? ss.getUrl() : '', updated: new Date().toISOString(), errors,
    people: rows_(ss, 'People').filter(r => r[0] && truthy_(r[7])).map(r => ({ name: String(r[0]), household: String(r[1] || ''), color: String(r[3] || ''), id: String(r[9] || ''), role: String(r[2] || 'Member') })),
    order: FEATURES.map(f => [f[0], f[1]]),
    view: view_(ss, me.name), signin: codeSignIn_(ss),
  };
  const run = (name, fn) => { if (!on[name]) return undefined; try { return fn(); } catch (e) { errors.push(name + ': ' + e.message); return null; } };
  out.events    = run('Calendar', () => events_(ss, cfg, tz, on['Week ahead'] ? Math.max(cfg.days, 8) : cfg.days, errors));
  if (!out.events && on['Week ahead']) { try { out.events = events_(ss, cfg, tz, 8, errors); } catch (e) { errors.push('Week ahead: ' + e.message); } }
  if (on['Calendar'] || on['Week ahead']) out.cal = calInfo_(ss, cfg, me);
  out.tasks     = run('To-dos', () => tasks_(ss, today));
  out.shopping  = run('Shopping list', () => shopping_(ss));
  out.meals     = run('Meal plan', () => meals_(ss, tz, today));
  out.routines  = run('Routines & chores', () => routines_(ss, tz, today));
  out.upkeep    = run('Home & car upkeep', () => upkeep_(ss, tz, today));
  out.bills     = run('Bills & renewals', () => bills_(ss, tz, today));
  out.budget    = run('Budget snapshot', () => budget_(ss, tz, today, cfg));
  out.goals     = run('Savings goals', () => goals_(ss, tz));
  out.numbers   = run('Numbers', () => numbers_(ss, tz));
  out.trips     = run('Trips', () => trips_(ss, tz, today));
  out.dateNights= run('Date nights', () => dateNights_(ss, cfg, tz));
  out.dates     = run('Important dates', () => dates_(ss, tz, today));
  out.notes     = run('Notes board', () => notes_(ss));
  out.links     = run('Links', () => links_(ss));
  out.followups = run('Follow-ups', () => followups_(ss, tz));
  out.inventory = run('Inventory alerts', () => inventory_(ss));
  out.directory = run('Family directory', () => directory_(ss, tz, today));
  out.gatherings = run('Gatherings', () => gatherings_(ss, tz, today, me));
  out.polls     = run('Polls', () => polls_(ss, tz, today, me));
  out.recipes   = run('Recipes', () => recipes_(ss));
  out.market    = run('Marketplace', () => market_(ss, tz, today));
  out.stories   = run('Stories', () => stories_(ss));
  if (out.market) out.regions = splitList_(setting_(ss, 'Regions'));
  if (on['Messages'] && me.id) { try { out.meId = me.id; out.active = activeMap_(ss, me);
      if (chatLive_(ss)) { out.chat = { url: setting_(ss, 'Chat service address').replace(/\/+$/, '') }; out.channels = []; } else out.channels = channels_(ss, me); } catch (e) { errors.push('Messages: ' + e.message); } }
  out.push = pushInfo_(ss, me);
  out.phoneApp = /^https:\/\//.test(setting_(ss, 'Phone app address')) ? setting_(ss, 'Phone app address') : '';
  return out;
}

function config_(ss) { if (!MEMO_ON_) return config0_(ss); return MEMO_.config || (MEMO_.config = config0_(ss)); }
function config0_(ss) {
  const features = {};
  rows_(ss, 'Features').forEach(r => { if (r[0]) features[String(r[0]).trim()] = r[1] === true; });
  const lists = splitList_(setting_(ss, 'To-do lists'));
  const cals = splitList_(setting_(ss, 'Calendars to show'));
  const anyPersonal = rows_(ss, 'People').some(r => r[0] && truthy_(r[7]) && String(r[4]).trim());
  return {
    edition: guessEdition_(ss),
    name: setting_(ss, 'Dashboard name') || 'My Dashboard',
    lists: lists.length ? lists : ['To-dos'],
    google: !/^(off|no|false)$/i.test(setting_(ss, 'Google Calendar')),
    calendars: cals.length || anyPersonal ? cals : ['primary'],
    addTo: setting_(ss, 'Add new events to') || 'primary',
    feeds: !/^(off|no|false)$/i.test(setting_(ss, 'Calendar subscriptions')),
    addButtons: !/^(off|no|false)$/i.test(setting_(ss, 'Add to calendar buttons')),
    days: Math.min(Math.max(Number(setting_(ss, 'Days ahead')) || 7, 1), 31),
    keyword: setting_(ss, 'Date night keyword') || 'date night',
    budgetShows: /status/i.test(setting_(ss, 'Monthly budget shows')) ? 'status' : 'dollars',
    look: lookOf_(setting_(ss, 'Look')),
    accent: /^#[0-9a-f]{3,8}$/i.test(setting_(ss, 'Accent color')) ? setting_(ss, 'Accent color') : '#50602B',
    features,
  };
}

function view_(ss, name) {
  const r = rows_(ss, 'Views').find(x => String(x[0]) === name);
  if (!r) return null;
  let feats = null;
  try { feats = JSON.parse(String(r[1] || 'null')); } catch (_) { feats = splitList_(r[1]); }
  let seen = []; try { seen = JSON.parse(String(r[4] || '[]')); } catch (_) {}
  return { features: Array.isArray(feats) ? feats : null, look: String(r[2] || '').toLowerCase(), text: String(r[3] || '').toLowerCase(), seen: Array.isArray(seen) ? seen : [], mode: /^(light|dark|auto)$/.test(String(r[5] || '')) ? String(r[5]) : '' };
}

function calendar_(id) { return (!id || id === 'primary') ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(id); }

function calendarSources_(ss, cfg) {
  // Each person's own calendar first, so their events carry their name and color; shared calendars after.
  const src = [];
  if (!cfg.google) return src;
  rows_(ss, 'People').forEach(r => { if (r[0] && truthy_(r[7]) && String(r[4]).trim()) src.push({ id: String(r[4]).trim(), person: String(r[0]), color: String(r[3] || '') }); });
  cfg.calendars.forEach(id => src.push({ id, person: '', color: '' }));
  const seen = {};
  return src.filter(s => { const k = s.id.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
}

function events_(ss, cfg, tz, days, warn) {
  const base = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const start = atLocal_(base, '00:00', tz), end = atLocal_(addDays_(base, days), '00:00', tz);
  const marks = {};
  rows_(ss, 'Event marks').forEach(r => { if (r[0]) marks[String(r[0])] = toMs_(r[1]); });
  const out = [], seen = {};
  calendarSources_(ss, cfg).forEach(src => {
    const cal = calendar_(src.id);
    if (!cal) throw new Error('can\'t find calendar "' + src.id + '"' + (src.person ? ' for ' + src.person + ' (share it with the sheet owner, or check the People tab)' : ' (check Settings › Calendars to show)'));
    cal.getEvents(start, end).forEach(ev => {
      const s = ev.getStartTime(), e = ev.getEndTime(), allDay = ev.isAllDayEvent();
      const id = safeId_(ev.getId() + '_' + s.getTime());
      if (seen[id]) { if (src.person && seen[id].who.indexOf(src.person) < 0) seen[id].who.push(src.person); return; }
      const item = {
        id, title: ev.getTitle() || '(no title)', cal: cal.getName(), color: src.color || cal.getColor(), who: src.person ? [src.person] : [],
        start: allDay ? Utilities.formatDate(s, tz, 'yyyy-MM-dd') : s.toISOString(),
        end: allDay ? Utilities.formatDate(e, tz, 'yyyy-MM-dd') : e.toISOString(),
        allDay, location: ev.getLocation() || '', done: !!marks[id],
      };
      seen[id] = item; out.push(item);
    });
  });
  appEvents_(ss, tz, start, end).concat(outsideEvents_(ss, tz, start, end, warn || []), gatheringEvents_(ss, tz, start, end)).forEach(e => { e.done = !!marks[e.id]; out.push(e); });
  const day = e => e.allDay ? e.start : Utilities.formatDate(new Date(e.start), tz, 'yyyy-MM-dd');
  out.forEach(e => { e.day = day(e); });
  out.sort((a, b) => a.day.localeCompare(b.day) || (a.allDay === b.allDay ? new Date(a.start) - new Date(b.start) : a.allDay ? -1 : 1));
  return out;
}

function tasks_(ss, today) {
  const t0 = new Date(today + 'T00:00:00').getTime();
  let doneToday = 0; const open = [];
  rows_(ss, 'To-dos').forEach(r => {
    if (!r[0] || !r[2]) return;
    if (truthy_(r[3])) { if (toMs_(r[5]) >= t0) doneToday++; return; }
    open.push({ id: String(r[0]), list: String(r[1] || ''), text: String(r[2]), order: Number(r[4]) || 0, for: String(r[6] || ''), by: String(r[7] || '') });
  });
  open.sort((a, b) => a.order - b.order);
  return { open, doneToday };
}

function shopping_(ss) {
  return rows_(ss, 'Shopping').map((r, i) => ({ row: i + 2, item: String(r[0] || ''), qty: String(r[1] || ''), by: String(r[2] || ''), got: truthy_(r[3]), store: String(r[5] || '') }))
    .filter(x => x.item);
}

function meals_(ss, tz, today) {
  const last = addDays_(today, 7), order = { breakfast: 1, lunch: 2, dinner: 3, snack: 4 };
  return rows_(ss, 'Meals').map(r => ({ date: ymd_(r[0], tz), meal: String(r[1] || ''), what: String(r[2] || ''), cook: String(r[3] || '') }))
    .filter(m => m.date && m.what && m.date >= today && m.date < last)
    .sort((a, b) => a.date.localeCompare(b.date) || (order[a.meal.toLowerCase()] || 9) - (order[b.meal.toLowerCase()] || 9));
}

function routines_(ss, tz, today) {
  const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(today + 'T12:00:00').getDay()];
  const done = {};
  rows_(ss, 'Routine log').forEach(r => { if (ymd_(r[0], tz) === today) done[String(r[1]) + '|' + String(r[2] || '')] = true; });
  return rows_(ss, 'Routines').filter(r => r[0]).map((r, i) => ({
    name: String(r[0]), who: String(r[1] || ''), days: String(r[2] || 'Every day'), order: Number(r[3]) || i,
    dueToday: dueOn_(String(r[2] || 'Every day'), dow), done: !!done[String(r[0]) + '|' + String(r[1] || '')],
  })).sort((a, b) => a.order - b.order);
}
function dueOn_(days, dow) {
  const d = days.toLowerCase();
  if (!d || /every|daily/.test(d)) return true;
  if (/weekday/.test(d)) return ['mon', 'tue', 'wed', 'thu', 'fri'].indexOf(dow) >= 0;
  if (/weekend/.test(d)) return dow === 'sat' || dow === 'sun';
  return d.split(/[^a-z]+/).some(x => x.slice(0, 3) === dow);
}

function upkeep_(ss, tz, today) {
  return rows_(ss, 'Upkeep').map((r, i) => {
    if (!r[0]) return null;
    const every = Number(r[1]) || 0, last = ymd_(r[2], tz);
    const due = last && every ? addDays_(last, every) : '';
    return { row: i + 2, item: String(r[0]), every, last, due, days: due ? daysBetween_(today, due) : null, category: String(r[3] || ''), notes: String(r[4] || '') };
  }).filter(Boolean).sort((a, b) => (a.days === null ? 1e9 : a.days) - (b.days === null ? 1e9 : b.days));
}

/** Bills: next due date and whether the current one is paid. */
function bills_(ss, tz, today) {
  const t = parseYmd_(today);
  return rows_(ss, 'Bills').map((r, i) => {
    if (!r[0]) return null;
    const rep = String(r[3] || 'Monthly').toLowerCase(), raw = r[2], lastPaid = ymd_(r[5], tz);
    let due = '';
    if (/month|quarter/.test(rep) && (typeof raw === 'number' || /^\d{1,2}$/.test(String(raw).trim()))) {
      const day = Math.min(Math.max(Number(raw), 1), 31), step = /quarter/.test(rep) ? 3 : 1;
      // This cycle's due date. If it was paid within 20 days before it (or any time after), the next cycle is what's due.
      const make = (yy, mm) => { const last = new Date(yy, mm + 1, 0).getDate(); return ymdOf_(new Date(yy, mm, Math.min(day, last))); };
      due = make(t.getFullYear(), t.getMonth());
      if (lastPaid && lastPaid >= addDays_(due, -20)) due = make(t.getFullYear(), t.getMonth() + step);
    } else {
      const base = ymd_(raw, tz);
      if (!base) return { row: i + 2, bill: String(r[0]), amount: num_(r[1]), due: '', days: null, repeats: rep, autopay: truthy_(r[4]), paid: false, lastPaid, notes: 'Set a due date' };
      due = base;
      if (/year/.test(rep)) {
        let d = parseYmd_(base); d.setFullYear(t.getFullYear()); if (ymdOf_(d) < addDays_(today, -30)) d.setFullYear(t.getFullYear() + 1);
        due = ymdOf_(d);
        if (lastPaid && lastPaid >= addDays_(due, -60)) { d.setFullYear(d.getFullYear() + 1); due = ymdOf_(d); }
      } else if (lastPaid) {
        return { row: i + 2, bill: String(r[0]), amount: num_(r[1]), due, days: null, repeats: rep, autopay: truthy_(r[4]), paid: true, lastPaid, notes: String(r[6] || '') };
      }
    }
    return { row: i + 2, bill: String(r[0]), amount: num_(r[1]), due, days: daysBetween_(today, due), repeats: rep, autopay: truthy_(r[4]), paid: false, lastPaid, notes: String(r[6] || '') };
  }).filter(Boolean).sort((a, b) => (a.days === null ? 1e9 : a.days) - (b.days === null ? 1e9 : b.days));
}

function budget_(ss, tz, today, cfg) {
  const t = parseYmd_(today), daysIn = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(), dayNo = t.getDate();
  const cache = CacheService.getScriptCache();
  return rows_(ss, 'Budget').map(r => {
    if (!r[0]) return null;
    const budget = num_(r[1]); let spent = num_(r[2]);
    if (spent === null && r[3] && r[4]) {
      const ck = 'bud_' + Utilities.base64EncodeWebSafe(String(r[3]) + String(r[4])).slice(0, 200);
      const hit = cache.get(ck);
      if (hit !== null) spent = Number(hit);
      else { spent = num_(SpreadsheetApp.openByUrl(String(r[3])).getRange(String(r[4])).getValue()); if (spent !== null) cache.put(ck, String(spent), 900); }
    }
    const pace = budget ? budget * dayNo / daysIn : null;
    const status = budget === null || spent === null ? 'unknown' : spent > budget ? 'over' : spent > pace * 1.1 ? 'ahead' : 'on track';
    const show = /status/i.test(String(r[5] || '')) ? 'status' : /dollar/i.test(String(r[5] || '')) ? 'dollars' : cfg.budgetShows;
    return { name: String(r[0]), show, status, pct: budget && spent !== null ? Math.round(spent / budget * 100) : null, monthPct: Math.round(dayNo / daysIn * 100), daysLeft: daysIn - dayNo,
             budget: show === 'dollars' ? budget : null, spent: show === 'dollars' ? spent : null };
  }).filter(Boolean);
}

function goals_(ss, tz) {
  return rows_(ss, 'Goals').map((r, i) => r[0] ? { row: i + 2, goal: String(r[0]), target: num_(r[1]), saved: num_(r[2]) || 0, by: ymd_(r[3], tz), notes: String(r[4] || '') } : null).filter(Boolean);
}

function trips_(ss, tz, today) {
  const items = rows_(ss, 'Trip list').map((r, i) => ({ row: i + 2, trip: String(r[0] || ''), item: String(r[1] || ''), type: String(r[2] || 'Before you go'), who: String(r[3] || ''), done: truthy_(r[4]) })).filter(x => x.trip && x.item);
  return rows_(ss, 'Trips').map(r => {
    if (!r[0]) return null;
    const start = ymd_(r[1], tz), end = ymd_(r[2], tz) || start;
    if (end && end < today) return null;               // finished trips drop off
    return { trip: String(r[0]), start, end, days: start ? daysBetween_(today, start) : null, where: String(r[3] || ''),
             links: [r[4], r[5]].map(String).filter(u => /^https?:\/\//i.test(u)), notes: String(r[6] || ''), items: items.filter(x => x.trip === String(r[0])) };
  }).filter(Boolean).sort((a, b) => (a.start || '9').localeCompare(b.start || '9'));
}

function dateNights_(ss, cfg, tz) {
  const start = new Date(), end = new Date(start.getTime() + 90 * 864e5), kw = cfg.keyword.toLowerCase();
  let next = null;
  calendarSources_(ss, cfg).some(src => {
    const cal = calendar_(src.id); if (!cal) return false;
    const ev = cal.getEvents(start, end, { search: cfg.keyword }).find(e => (e.getTitle() || '').toLowerCase().indexOf(kw) >= 0);
    if (ev && (!next || ev.getStartTime() < next.s)) next = { s: ev.getStartTime(), title: ev.getTitle(), allDay: ev.isAllDayEvent() };
    return false;
  });
  appEvents_(ss, tz, start, end).concat(outsideEvents_(ss, tz, start, end, [])).forEach(e => {
    if (e.title.toLowerCase().indexOf(kw) < 0) return;
    const s = e.allDay ? parseYmd_(e.start) : new Date(e.start);
    if (s >= start && (!next || s < next.s)) next = { s, title: e.title, allDay: e.allDay };
  });
  const ideas = rows_(ss, 'Date ideas').map((r, i) => ({ row: i + 2, idea: String(r[0] || ''), cost: String(r[1] || ''), tried: truthy_(r[2]), notes: String(r[3] || '') })).filter(x => x.idea);
  const people = rows_(ss, 'People').filter(r => r[0] && truthy_(r[7])).map(r => String(r[0]));
  const props = PropertiesService.getScriptProperties();
  const turnIdx = Number(props.getProperty('DATE_TURN') || 0);
  return { next: next ? { start: next.allDay ? Utilities.formatDate(next.s, tz, 'yyyy-MM-dd') : next.s.toISOString(), allDay: next.allDay, title: next.title } : null,
           ideas, turn: people.length ? people[turnIdx % people.length] : '' };
}

function numbers_(ss, tz) {
  const cache = CacheService.getScriptCache();
  return rows_(ss, 'Numbers').filter(r => r[0]).map(r => {
    const name = String(r[0]), unit = String(r[1] || ''), src = String(r[2] || '').trim(), dec = r[6] === '' ? 2 : Number(r[6]);
    let series;
    if (src) {
      const ck = 'num_' + Utilities.base64EncodeWebSafe(name).slice(0, 200), hit = cache.get(ck);
      if (hit) series = JSON.parse(hit);
      else {
        const book = SpreadsheetApp.openByUrl(src), sh = r[3] ? book.getSheetByName(String(r[3])) : book.getSheets()[0];
        if (!sh) throw new Error(name + ': no tab named "' + r[3] + '"');
        const last = sh.getLastRow(), n = Math.min(120, last - 1), dc = colIndex_(r[4] || 'A'), vc = colIndex_(r[5] || 'B');
        const vals = n > 0 ? sh.getRange(last - n + 1, 1, n, Math.max(dc, vc)).getValues() : [];
        series = vals.map(v => [ymd_(v[dc - 1], tz), num_(v[vc - 1])]).filter(x => x[0] && x[1] !== null && x[1] !== 0);
        cache.put(ck, JSON.stringify(series), 1800);
      }
    } else {
      series = rows_(ss, 'Number log').filter(x => String(x[1]) === name).map(x => [ymd_(x[0], tz), num_(x[2])])
        .filter(x => x[0] && x[1] !== null).sort((a, b) => a[0].localeCompare(b[0])).slice(-120);
    }
    return { name, unit, dec: isNaN(dec) ? 2 : dec, loggable: !src, series: series.slice(-60),
             latest: series.length ? series[series.length - 1] : null, prev: series.length > 1 ? series[series.length - 2] : null, d30: back_(series, 30) };
  });
}
function back_(series, days) {
  if (!series.length) return null;
  const c = addDays_(series[series.length - 1][0], -days);
  for (let i = series.length - 1; i >= 0; i--) if (series[i][0] <= c) return series[i];
  return null;
}

function dates_(ss, tz, today) {
  const t = parseYmd_(today);
  const have = {}; rows_(ss, 'Dates').forEach(r => { if (r[0]) have[String(r[0]).toLowerCase()] = 1; });
  const bdays = config_(ss).features['Family directory'] ? rows_(ss, 'Directory').filter(r => r[0] && ymd_(r[5], tz) && !have[(String(r[0]) + '\'s birthday').toLowerCase()])
    .map(r => [String(r[0]) + '\'s birthday', r[5], 'Birthday', true]) : [];
  return rows_(ss, 'Dates').concat(bdays).map(r => {
    const d = ymd_(r[1], tz); if (!r[0] || !d) return null;
    let next = parseYmd_(d);
    if (truthy_(r[3])) { next.setFullYear(t.getFullYear()); if (next < t) next.setFullYear(t.getFullYear() + 1); }
    const ds = ymdOf_(next), days = daysBetween_(today, ds);
    return { name: String(r[0]), type: String(r[2] || ''), date: ds, days, years: truthy_(r[3]) ? next.getFullYear() - Number(d.slice(0, 4)) : null };
  }).filter(x => x && x.days >= 0).sort((a, b) => a.days - b.days).slice(0, 30);
}

function notes_(ss) {
  return rows_(ss, 'Notes').map((r, i) => ({ row: i + 2, at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), from: String(r[1] || ''), text: String(r[2] || ''), pin: truthy_(r[3]) }))
    .filter(n => n.text).sort((a, b) => (b.pin - a.pin) || String(b.at).localeCompare(String(a.at))).slice(0, 40);
}
function links_(ss) {
  return rows_(ss, 'Links').filter(r => r[1] && /^https?:\/\//i.test(String(r[2])))
    .map(r => ({ list: String(r[0] || ''), name: String(r[1]), url: String(r[2]), pin: truthy_(r[3]), order: Number(r[4]) || 99 })).sort((a, b) => a.order - b.order);
}
function followups_(ss, tz) {
  return rows_(ss, 'Follow-ups').filter(r => r[0] && (r[2] || r[3]) && !/^(sent|skipped)$/i.test(String(r[10]).trim()))
    .map(r => ({ id: String(r[0]), due: ymd_(r[1], tz), who: String(r[2]), topic: String(r[3]), channel: String(r[4] || 'Email'),
                 to: String(r[5]).trim(), phone: String(r[6]).trim(), subject: String(r[7]), message: String(r[8]), note: String(r[9]) }))
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
}
function inventory_(ss) {
  return rows_(ss, 'Inventory').map((r, i) => ({ row: i + 2, item: String(r[0] || ''), onHand: num_(r[1]), par: num_(r[2]), unit: String(r[3] || ''), where: String(r[4] || '') })).filter(x => x.item);
}

/* ============================================================
   Writing
   ============================================================ */
function act_(ss, p, me) {
  const tz = ss.getSpreadsheetTimeZone(), today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const who = me.name, A = p.action;
  const sheet = n => { const s = ss.getSheetByName(n); if (!s) throw new Error('The ' + n + ' tab is missing. Ask the organizer to run Dashboard › 1. Set up.'); return s; };
  const rowMatches = (sh, r, col, val) => r >= 2 && r <= sh.getLastRow() && String(sh.getRange(r, col).getValue()) === String(val);

  if (/^(newChannel|editChannel|deleteMessage)$/.test(A)) return chatAct_(ss, p, me);
  if (/^push(Sub|Unsub|Prefs|Test)$/.test(A)) return pushAct_(ss, p, me);
  switch (A) {
    case 'saveView': {
      const sh = sheet('Views'), names = colValues_(sh, 1), i = names.indexOf(who);
      const known = list => { try { return JSON.parse(String(list || '[]')).filter(f => FEATURES.some(x => x[0] === f)).slice(0, 40); } catch (_) { return []; } };
      if (sh.getLastColumn() < 6) buildTab_(ss, 'Views');
      const old = i >= 1 ? String(sh.getRange(i + 1, 6).getValue() || '') : '';
      const row = [who, JSON.stringify(known(p.features)), LOOKS.concat('').indexOf(String(p.look)) >= 0 ? String(p.look) : '', p.text === 'large' ? 'large' : '', JSON.stringify(known(p.seen)), /^(light|dark|auto)$/.test(String(p.mode || '')) ? String(p.mode) : p.mode === undefined ? old : ''];
      if (i >= 1) sh.getRange(i + 1, 1, 1, 6).setValues([row]); else sh.appendRow(row);
      return;
    }
    case 'toggleTask': { const sh = sheet('To-dos'), r = findRow_(sh, p.id); if (r) { sh.getRange(r, 4).setValue(p.done === '1'); sh.getRange(r, 6).setValue(p.done === '1' ? new Date() : ''); } return; }
    case 'addTask': { const text = clean_(p.text, 300); if (!text) return; const sh = sheet('To-dos'); sh.appendRow([nextId_(sh, 't'), clean_(p.list, 60), text, false, Date.now(), '', clean_(p.for, 60), who]); return; }
    case 'toggleEvent': { const sh = sheet('Event marks'), r = findRow_(sh, p.id); if (r) sh.getRange(r, 2).setValue(p.done === '1' ? Date.now() : ''); else if (p.done === '1') sh.appendRow([clean_(p.id, 200), Date.now()]); return; }
    case 'addEvent': case 'editEvent': {
      const title = clean_(p.title, 200); if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw new Error('Event needs a title and a date');
      if (A === 'editEvent' || !isGoogleTarget_(config_(ss).addTo)) {
        const sh = sheet('Events'), row = eventRowValues_(p, who);
        if (A === 'addEvent') { row[0] = nextId_(sh, 'ev'); sh.appendRow(row); return; }
        const r = findRow_(sh, p.id); if (!r) throw new Error('That event was deleted from the sheet');
        row[0] = String(p.id); row[10] = sh.getRange(r, 11).getValue() || who;
        sh.getRange(r, 1, 1, row.length).setValues([row]); return;
      }
      if (p.repeats) throw new Error('Repeating events only work when Settings › Add new events to is "App"');
      const cal = calendar_(config_(ss).addTo); if (!cal) throw new Error('Can\'t find the "Add new events to" calendar');
      const opts = { description: 'Added by ' + who + ' from the dashboard' }, [y, m, d] = p.date.split('-').map(Number);
      if (!p.time) cal.createAllDayEvent(title, new Date(y, m - 1, d), opts);
      else { const [hh, mm] = String(p.time).split(':').map(Number), s = new Date(y, m - 1, d, hh, mm || 0); const [eh, em] = String(p.end || '').split(':').map(Number);
        let e = /^\d{2}:\d{2}$/.test(p.end || '') ? new Date(y, m - 1, d, eh, em) : new Date(s.getTime() + (Number(p.mins) || 60) * 60000);
        if (e <= s) e = new Date(e.getTime() + 864e5);
        cal.createEvent(title, s, e, opts); }
      return;
    }
    case 'rsvp': {
      const ans = { yes: 'Yes', maybe: 'Maybe', no: 'No' }[String(p.answer).toLowerCase()]; if (!ans) throw new Error('Pick yes, maybe or no');
      if (!findRow_(sheet('Gatherings'), p.id)) throw new Error('That gathering was removed');
      const sh = sheet('RSVPs'), v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues() : [];
      const n = Math.max(0, Math.min(30, Math.round(Number(p.count) || (ans === 'No' ? 0 : 1))));
      const row = [String(p.id), who, ans, ans === 'No' ? 0 : n, clean_(p.note, 300), new Date()];
      const i = v.findIndex(r => String(r[0]) === String(p.id) && String(r[1]) === who);
      if (i >= 0) sh.getRange(i + 2, 1, 1, 6).setValues([row]); else sh.appendRow(row);
      return;
    }
    case 'addGathering': {
      const title = clean_(p.title, 200); if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw new Error('A gathering needs a name and a date');
      const sh = sheet('Gatherings');
      sh.appendRow([nextId_(sh, 'g'), title, p.date, /^\d{2}:\d{2}$/.test(p.time || '') ? p.time : '', clean_(p.where, 200), clean_(p.host, 100) || who, clean_(p.details, 2000, true), /^\d{4}-\d{2}-\d{2}$/.test(p.by || '') ? p.by : '']);
      return;
    }
    case 'bringAdd': { const item = clean_(p.item, 200); if (!item || !findRow_(sheet('Gatherings'), p.id)) return; sheet('Bring list').appendRow([String(p.id), item, p.mine === '1' ? who : '', who]); return; }
    case 'deleteGathering': {                          // the host or an organizer; its RSVPs and bring list go with it
      const sh = sheet('Gatherings'), r = findRow_(sh, p.id); if (!r) return;
      if (String(sh.getRange(r, 6).getValue() || '') !== who && me.role !== 'Organizer') throw new Error('Only the host or an organizer can delete a gathering');
      sh.deleteRow(r);
      ['RSVPs', 'Bring list'].forEach(n => { const t = ss.getSheetByName(n); if (!t || t.getLastRow() < 2) return; const v = t.getRange(2, 1, t.getLastRow() - 1, 1).getValues(); for (let i = v.length - 1; i >= 0; i--) if (String(v[i][0]) === String(p.id)) t.deleteRow(i + 2); });
      return;
    }
    case 'bringDelete': {                              // whoever added it, or an organizer
      const sh = sheet('Bring list'), r = Number(p.row);
      if (!rowMatches(sh, r, 2, p.item) || String(sh.getRange(r, 1).getValue()) !== String(p.id)) throw new Error('That item changed – refresh and try again');
      if (String(sh.getRange(r, 4).getValue() || '') !== who && me.role !== 'Organizer') throw new Error('Only the person who added it or an organizer can remove it');
      sh.deleteRow(r); return;
    }
    case 'bringClaim': {
      const sh = sheet('Bring list'), r = Number(p.row);
      if (!rowMatches(sh, r, 2, p.item) || String(sh.getRange(r, 1).getValue()) !== String(p.id)) throw new Error('That item changed – refresh and try again');
      const cur = String(sh.getRange(r, 3).getValue() || '');
      if (p.undo === '1') { if (cur === who) sh.getRange(r, 3).setValue(''); return; }
      if (cur && cur !== who) throw new Error(cur + ' is already bringing that');
      sh.getRange(r, 3).setValue(who); return;
    }
    case 'vote': {
      const sh = sheet('Polls'), r = findRow_(sh, p.id); if (!r) throw new Error('That poll was removed');
      const row = sh.getRange(r, 1, 1, 6).getValues()[0], opts = pollOptions_(row[2]), multiple = truthy_(row[5]);
      const closes = ymd_(row[3], ss.getSpreadsheetTimeZone()); if (closes && closes < today) throw new Error('This poll has closed');
      if (opts.indexOf(String(p.choice)) < 0) throw new Error('That option changed – refresh and try again');
      const vs = sheet('Votes'), v = vs.getLastRow() > 1 ? vs.getRange(2, 1, vs.getLastRow() - 1, 3).getValues() : [];
      const mineIdx = []; v.forEach((x, i) => { if (String(x[0]) === String(p.id) && String(x[1]) === who) mineIdx.push(i); });
      const same = mineIdx.find(i => String(v[i][2]) === String(p.choice));
      if (same !== undefined) { vs.deleteRow(same + 2); return; }             // tap again to take a vote back
      if (!multiple) for (let k = mineIdx.length - 1; k >= 0; k--) vs.deleteRow(mineIdx[k] + 2);
      vs.appendRow([String(p.id), who, String(p.choice), new Date()]); return;
    }
    case 'addPoll': {
      const q = clean_(p.question, 300), opts = pollOptions_(p.options);
      if (!q || opts.length < 2) throw new Error('A poll needs a question and at least two options');
      const sh = sheet('Polls');
      sh.appendRow([nextId_(sh, 'p'), q, opts.map(o => clean_(o, 120)).join('\n'), /^\d{4}-\d{2}-\d{2}$/.test(p.closes || '') ? p.closes : '', who, p.multiple === '1']); return;
    }
    case 'addRecipe': {
      const name = clean_(p.name, 200); if (!name) throw new Error('A recipe needs a name');
      sheet('Recipes').appendRow([name, clean_(p.from, 100) || who, clean_(p.category, 60), clean_(p.ingredients, 5000, true), clean_(p.steps, 10000, true), /^https?:\/\//.test(p.link || '') ? clean_(p.link, 500) : '', who]); return;
    }
    case 'marketPost': {
      const what = clean_(p.what, 200); if (!what) throw new Error('Say what you\'re giving away or need help with');
      const sh = sheet('Marketplace');
      sh.appendRow([nextId_(sh, 'm'), new Date(), who, p.type === 'Need help' ? 'Need help' : 'Giving away', what, clean_(p.details, 2000, true), clean_(p.region, 60), 'Open', '', new Date()]); return;
    }
    case 'marketTake': case 'marketDone': case 'marketReopen': case 'marketDelete': {
      const sh = sheet('Marketplace'), r = findRow_(sh, p.id); if (!r) throw new Error('That post was removed');
      const row = sh.getRange(r, 1, 1, 10).getValues()[0], mine = String(row[2]) === who, organizer = me.role === 'Organizer';
      if (A === 'marketTake') {
        if (String(row[7]) !== 'Open') throw new Error((row[8] ? row[8] + ' already' : 'Someone already') + (row[3] === 'Need help' ? ' offered to help' : ' claimed it'));
        if (mine) throw new Error('That\'s your own post');
        sh.getRange(r, 8, 1, 3).setValues([['Taken', who, new Date()]]); return;
      }
      if (A === 'marketReopen') { if (!mine && !organizer && String(row[8]) !== who) throw new Error('Only the person who posted it can change it'); sh.getRange(r, 8, 1, 3).setValues([['Open', '', new Date()]]); return; }
      if (!mine && !organizer) throw new Error('Only the person who posted it can change it');
      if (A === 'marketDone') { sh.getRange(r, 8).setValue('Done'); sh.getRange(r, 10).setValue(new Date()); return; }
      sh.deleteRow(r); return;
    }
    case 'storyPost': {
      const title = clean_(p.title, 200), text = clean_(p.story, 20000, true); if (!title || !text) throw new Error('A story needs a title and the story');
      const sh = sheet('Stories');
      sh.appendRow([nextId_(sh, 's'), new Date(), who, title, text, clean_(p.about, 200), clean_(p.when, 60), /^https?:\/\//.test(p.photo || '') ? clean_(p.photo, 500) : '']); return;
    }
    case 'storyDelete': {
      const sh = sheet('Stories'), r = findRow_(sh, p.id); if (!r) return;
      if (String(sh.getRange(r, 3).getValue()) !== who && me.role !== 'Organizer') throw new Error('Only the person who posted it can delete it');
      sh.deleteRow(r); return;
    }
    case 'deleteEvent': { const sh = sheet('Events'), r = findRow_(sh, p.id); if (r) sh.deleteRow(r); return; }
    case 'addShop': { const item = clean_(p.item, 120); if (!item) return; sheet('Shopping').appendRow([item, clean_(p.qty, 20), who, false, '', clean_(p.store, 60)]); return; }
    case 'toggleShop': { const sh = sheet('Shopping'), r = Number(p.row); if (rowMatches(sh, r, 1, p.item)) { sh.getRange(r, 4).setValue(p.got === '1'); sh.getRange(r, 5).setValue(p.got === '1' ? new Date() : ''); } return; }
    case 'clearShop': { const sh = sheet('Shopping'), v = sh.getDataRange().getValues(); for (let i = v.length - 1; i >= 1; i--) if (truthy_(v[i][3])) sh.deleteRow(i + 1); return; }
    case 'addMeal': { if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !clean_(p.what, 200)) throw new Error('Meal needs a date and a dish'); sheet('Meals').appendRow([p.date, clean_(p.meal, 20) || 'Dinner', clean_(p.what, 200), clean_(p.cook, 60)]); return; }
    case 'toggleRoutine': {
      const sh = sheet('Routine log'), name = String(p.name), w = String(p.rwho || ''), v = sh.getDataRange().getValues();
      for (let i = v.length - 1; i >= 1; i--) if (ymd_(v[i][0], tz) === today && String(v[i][1]) === name && String(v[i][2] || '') === w) { sh.deleteRow(i + 1); return; }
      sh.appendRow([today, clean_(name, 200), clean_(w, 60), new Date()]); return;
    }
    case 'upkeepDone': { const sh = sheet('Upkeep'), r = Number(p.row); if (rowMatches(sh, r, 1, p.item)) sh.getRange(r, 3).setValue(today); return; }
    case 'billPaid': { const sh = sheet('Bills'), r = Number(p.row); if (rowMatches(sh, r, 1, p.bill)) sh.getRange(r, 6).setValue(p.undo === '1' ? '' : today); return; }
    case 'goalAdd': {
      const sh = sheet('Goals'), r = Number(p.row), amt = Number(String(p.amount).replace(/[$,\s]/g, ''));
      if (isNaN(amt)) throw new Error('Enter an amount');
      if (rowMatches(sh, r, 1, p.goal)) sh.getRange(r, 3).setValue((num_(sh.getRange(r, 3).getValue()) || 0) + amt); return;
    }
    case 'tripItem': { const sh = sheet('Trip list'), r = Number(p.row); if (rowMatches(sh, r, 2, p.item)) sh.getRange(r, 5).setValue(p.done === '1'); return; }
    case 'addTripItem': { const item = clean_(p.item, 200); if (!item) return; sheet('Trip list').appendRow([clean_(p.trip, 100), item, p.type === 'Packing' ? 'Packing' : 'Before you go', clean_(p.for, 60), false]); return; }
    case 'addTrip': { if (!clean_(p.trip, 100) || !/^\d{4}-\d{2}-\d{2}$/.test(p.start)) throw new Error('Trip needs a name and a start date'); sheet('Trips').appendRow([clean_(p.trip, 100), p.start, /^\d{4}-\d{2}-\d{2}$/.test(p.end) ? p.end : p.start, clean_(p.where, 100)]); return; }
    case 'addIdea': { const idea = clean_(p.idea, 200); if (!idea) return; sheet('Date ideas').appendRow([idea, clean_(p.cost, 10), false, 'Added by ' + who]); return; }
    case 'ideaTried': { const sh = sheet('Date ideas'), r = Number(p.row); if (rowMatches(sh, r, 1, p.idea)) sh.getRange(r, 3).setValue(p.tried === '1'); return; }
    case 'nextTurn': { const props = PropertiesService.getScriptProperties(); props.setProperty('DATE_TURN', String(Number(props.getProperty('DATE_TURN') || 0) + 1)); return; }
    case 'logNumber': {
      const v = Number(String(p.value).replace(/[$,\s]/g, '')); if (isNaN(v) || !clean_(p.name, 100)) throw new Error('Enter a number');
      sheet('Number log').appendRow([today, clean_(p.name, 100), v]); return;
    }
    case 'addNote': { const text = clean_(p.text, 1000); if (!text) return; sheet('Notes').appendRow([new Date(), who, text, p.pin === '1']); return; }
    case 'pinNote': { const sh = sheet('Notes'), r = Number(p.row); if (rowMatches(sh, r, 3, p.text)) sh.getRange(r, 4).setValue(p.pin === '1'); return; }
    case 'deleteNote': { const sh = sheet('Notes'), r = Number(p.row); if (rowMatches(sh, r, 3, p.text)) sh.deleteRow(r); return; }
    case 'followup': { const sh = sheet('Follow-ups'), r = findRow_(sh, p.id), st = { sent: 'Sent', skip: 'Skipped', open: 'Open' }[p.status]; if (r && st) { sh.getRange(r, 11).setValue(st); sh.getRange(r, 12).setValue(st === 'Open' ? '' : new Date()); } return; }
    case 'editFollowup': { const sh = sheet('Follow-ups'), r = findRow_(sh, p.id); if (r) { sh.getRange(r, 6).setValue(clean_(p.to, 200)); sh.getRange(r, 8).setValue(clean_(p.subject, 300)); sh.getRange(r, 9).setValue(clean_(p.message, 5000, true)); } return; }
    case 'addFollowup': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.due) || !clean_(p.person, 100)) throw new Error('Follow-up needs a name and a date');
      const sh = sheet('Follow-ups');
      sh.appendRow([nextId_(sh, 'f'), p.due, clean_(p.person, 100), clean_(p.topic, 200), ['Email', 'Text', 'Call', 'Other'].indexOf(p.channel) >= 0 ? p.channel : 'Email',
                    clean_(p.to, 200), clean_(p.phone, 40), clean_(p.subject, 300), clean_(p.message, 5000, true), '', 'Open', '']);
      return;
    }
    case 'setInventory': { const sh = sheet('Inventory'), r = Number(p.row), v = Number(p.onHand); if (rowMatches(sh, r, 1, p.item) && !isNaN(v)) sh.getRange(r, 2).setValue(Math.max(0, v)); return; }
  }
  throw new Error('Unknown action');
}

/* ============================================================
   Family edition: sign-in codes, directory, gatherings, polls, recipes
   ============================================================ */
function codeSignIn_(ss) { return /code/i.test(setting_(ss, 'Sign in with')); }
function codeOnly_(ss) { return /only/i.test(setting_(ss, 'Sign in with')) && codeSignIn_(ss); }
function sessionDays_(ss) { const v = setting_(ss, 'Ask for the code again every'); const n = Number(String(v).replace(/[^\d.]/g, '')); return v === '' ? 60 : (isNaN(n) ? 60 : Math.max(0, Math.min(3650, n))); }
/** Signed with the person's key and code: a new link or a new code for that person signs their devices out. */
function sessionSig_(r, issued) {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('FEED_SECRET'); if (!secret) { secret = newKey_(); props.setProperty('FEED_SECRET', secret); }
  return Utilities.computeHmacSha256Signature('session|' + r[5] + '|' + String(r[8]).trim() + '|' + issued, secret).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('').slice(0, 32);
}

/** Public: what the sign-in screen needs before anyone is signed in. Reveals nothing about people. */
function signInInfo() {
  const ss = SpreadsheetApp.getActive(), cfg = config_(ss);
  return { code: codeSignIn_(ss), codeOnly: codeOnly_(ss), name: cfg.name, look: cfg.look, logo: logo_(ss), version: VERSION };
}

/** Public: first name + 4-digit code → that person's key. 5 wrong tries locks that name for 15 minutes; 25 wrong tries in an hour locks code sign-in for everyone for an hour. */
function signIn(name, code) {
  const ss = SpreadsheetApp.getActive();
  if (!codeSignIn_(ss)) throw new Error('Sign-in with a code is turned off. Ask the organizer for your link.');
  if (PropertiesService.getScriptProperties().getProperty('SHEET_ID') !== ss.getId()) throw new Error('This dashboard isn\'t set up yet.');
  const cache = CacheService.getScriptCache(), n = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
  if (!n || !/^\d{4}$/.test(String(code || '').trim())) throw new Error('Type your first name and your 4-digit code.');
  const k1 = 'pin_' + Utilities.base64EncodeWebSafe(n).slice(0, 80), k2 = 'pin_all';
  if (Number(cache.get(k2) || 0) >= 25) throw new Error('Too many wrong codes. Sign-in with a code is paused for an hour.');
  if (Number(cache.get(k1) || 0) >= 5) throw new Error('Too many wrong codes for that name. Try again in 15 minutes.');
  peopleOk_(ss);
  const people = rows_(ss, 'People').filter(r => r[0] && truthy_(r[7]));
  const first = r => String(r[0]).trim().toLowerCase().split(/\s+/)[0];
  let match = people.filter(r => String(r[0]).trim().toLowerCase().replace(/\s+/g, ' ') === n);
  if (!match.length) match = people.filter(r => first(r) === n);
  const hit = match.find(r => String(r[8]).trim() === String(code).trim());
  if (!hit || !hit[5]) {
    cache.put(k1, String(Number(cache.get(k1) || 0) + 1), 900);
    cache.put(k2, String(Number(cache.get(k2) || 0) + 1), 3600);
    throw new Error(match.length > 1 ? 'More than one person has that first name – type your full name.' : 'That name and code don\'t match.');
  }
  cache.remove(k1);
  const issued = String(Date.now());
  return 'S.' + feedToken_(String(hit[5])) + '.' + issued + '.' + sessionSig_(hit, issued);
}

function directory_(ss, tz, today) {
  const ppl = {}; rows_(ss, 'People').forEach(r => { if (r[0]) ppl[String(r[0]).toLowerCase()] = String(r[3] || ''); });
  return rows_(ss, 'Directory').filter(r => r[0]).map(r => {
    const b = ymd_(r[5], tz);
    let next = '';
    if (b) { const y = Number(today.slice(0, 4)); next = y + b.slice(4); if (next < today) next = (y + 1) + b.slice(4); }
    return { name: String(r[0]), household: String(r[1] || ''), phone: String(r[2] || ''), email: String(r[3] || ''), address: String(r[4] || ''),
             birthday: b ? b.slice(5) : '', nextBirthday: next, days: next ? daysBetween_(today, next) : null, notes: String(r[6] || ''), color: ppl[String(r[0]).toLowerCase()] || '' };
  }).sort((a, b) => (a.household || '~').localeCompare(b.household || '~') || a.name.localeCompare(b.name));
}

function gatherings_(ss, tz, today, me) {
  const rs = rows_(ss, 'RSVPs'), br = [];
  const sh = ss.getSheetByName('Bring list');
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach((r, i) => { if (r[0] && r[1]) br.push({ row: i + 2, id: String(r[0]), item: String(r[1]), who: String(r[2] || ''), by: String(r[3] || '') }); });
  return rows_(ss, 'Gatherings').filter(r => r[0] && r[1] && ymd_(r[2], tz)).map(r => {
    const id = String(r[0]), date = ymd_(r[2], tz), time = hhmm_(r[3], tz);
    const rsvps = rs.filter(x => String(x[0]) === id && x[1]).map(x => ({ who: String(x[1]), answer: String(x[2] || ''), count: Number(x[3]) || 0, note: String(x[4] || '') }));
    const mine = rsvps.find(x => x.who === me.name) || null;
    return { id, title: String(r[1]), date, time, start: time ? atLocal_(date, time, tz).toISOString() : '', where: String(r[4] || ''), host: String(r[5] || ''), details: String(r[6] || ''),
             by: ymd_(r[7], tz), days: daysBetween_(today, date), rsvps, mine, headcount: rsvps.filter(x => x.answer === 'Yes').reduce((n, x) => n + Math.max(1, x.count), 0),
             bring: br.filter(b => b.id === id) };
  }).filter(g => g.days >= -1).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

function pollOptions_(v) { return String(v || '').split(/\r?\n|;/).map(x => x.trim()).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, 20); }
function polls_(ss, tz, today, me) {
  const votes = rows_(ss, 'Votes');
  return rows_(ss, 'Polls').filter(r => r[0] && r[1]).map(r => {
    const id = String(r[0]), opts = pollOptions_(r[2]), closes = ymd_(r[3], tz), vs = votes.filter(v => String(v[0]) === id);
    return { id, question: String(r[1]), closes, open: !closes || closes >= today, by: String(r[4] || ''), multiple: truthy_(r[5]),
             options: opts.map(o => ({ text: o, voters: vs.filter(v => String(v[2]) === o).map(v => String(v[1])) })),
             mine: vs.filter(v => String(v[1]) === me.name).map(v => String(v[2])), voters: vs.map(v => String(v[1])).filter((x, i, a) => a.indexOf(x) === i).length };
  }).filter(p => p.open || daysBetween_(p.closes, today) <= 14).reverse();
}

function market_(ss, tz, today) {
  const dir = {}; rows_(ss, 'Directory').forEach(r => { if (r[0]) dir[String(r[0]).toLowerCase()] = String(r[2] || ''); });
  return rows_(ss, 'Marketplace').filter(r => r[0] && r[4]).map(r => ({
    id: String(r[0]), posted: toMs_(r[1]) ? new Date(toMs_(r[1])).toISOString() : '', from: String(r[2] || ''), type: String(r[3]) === 'Need help' ? 'Need help' : 'Giving away',
    what: String(r[4]), details: String(r[5] || ''), region: String(r[6] || ''), status: ['Open', 'Taken', 'Done'].indexOf(String(r[7])) >= 0 ? String(r[7]) : 'Open', taker: String(r[8] || ''),
    phone: dir[String(r[2] || '').toLowerCase()] || '', updated: toMs_(r[9]) || toMs_(r[1]) || 0,
  })).filter(m => m.status !== 'Done' || Date.now() - m.updated < 14 * 864e5)       // finished posts fall off after two weeks
    .sort((a, b) => (a.status === 'Done') - (b.status === 'Done') || String(b.posted).localeCompare(String(a.posted)));
}

function stories_(ss) {
  return rows_(ss, 'Stories').filter(r => r[0] && r[3] && r[4]).map(r => ({
    id: String(r[0]), posted: toMs_(r[1]) ? new Date(toMs_(r[1])).toISOString() : '', from: String(r[2] || ''), title: String(r[3]), story: String(r[4]),
    about: String(r[5] || ''), when: String(r[6] || ''), photo: String(r[7] || ''),
  })).reverse();
}

function recipes_(ss) {
  return rows_(ss, 'Recipes').filter(r => r[0]).map((r, i) => ({ name: String(r[0]), from: String(r[1] || ''), category: String(r[2] || ''), ingredients: String(r[3] || ''),
    steps: String(r[4] || ''), link: String(r[5] || ''), id: 'r' + (i + 2) })).sort((a, b) => (a.category || '~').localeCompare(b.category || '~') || a.name.localeCompare(b.name));
}

function familyExamples_(name, d) {
  switch (name) {
    case 'People': return [['Grandma', 'Grandma & Grandpa', 'Organizer', PALETTE[0], '', '', '', true], ['Uncle Joe', 'Joe & Ana', 'Member', PALETTE[1], '', '', '', true], ['Cousin Mia', 'Joe & Ana', 'Member', PALETTE[2], '', '', '', true]];
    case 'Directory': return [['Grandma', 'Grandma & Grandpa', '(555) 010-0100', 'grandma@example.com', '12 Oak St, Springfield', '1950-03-14', 'Example – replace with your family'],
                              ['Uncle Joe', 'Joe & Ana', '(555) 010-0200', '', '48 Pine Ave, Springfield', '1975-' + d(25).slice(5), ''], ['Cousin Mia', 'Joe & Ana', '', '', '', '2010-' + d(70).slice(5), '']];
    case 'Gatherings': return [['g01', 'Family dinner (example)', d(10), '17:00', "Grandma's house", 'Grandma', 'Bring a side or a dessert. Kids welcome!', d(7)]];
    case 'Bring list': return [['g01', 'Paper plates', '', 'Grandma'], ['g01', 'Dessert', 'Uncle Joe', 'Uncle Joe']];
    case 'Polls': return [['p01', 'Which weekend for the reunion? (example)', 'June 6–7\nJune 13–14\nJune 20–21', d(14), 'Grandma', true]];
    case 'Marketplace': return [['m01', new Date(), 'Uncle Joe', 'Giving away', 'Crib and changing table (example)', 'Good condition. Pick up in Springfield.', 'Texas', 'Open', '', new Date()],
                                ['m02', new Date(), 'Cousin Mia', 'Need help', 'Help moving a couch on Saturday (example)', 'Two people, about an hour. Pizza provided!', 'Colorado', 'Open', '', new Date()]];
    case 'Stories': return [['s01', new Date(), 'Grandma', 'How we met (example)', 'It was the summer of 1969 at the county fair…', 'Grandma & Grandpa', '1969', '']];
    case 'Recipes': return [["Grandma's tamales (example)", 'Grandma', 'Holidays', '4 cups masa harina\n1 cup lard\n…', '1. Soak the husks.\n2. …', '', 'Grandma']];
    case 'To-dos': return [['t01', 'Holidays', 'Book the community hall', false, 1, '', 'Grandma'], ['t02', 'Reunion', 'Order T-shirts', false, 2, '', '']];
    case 'Notes': return [[new Date(), 'Dashboard', 'Welcome to the family dashboard! Post news and reminders here. Pin the important ones.', true]];
    case 'Links': return [['Photos', 'Shared family photo album', 'https://photos.google.com', true, 1]];
    case 'Dates': return [['Grandma & Grandpa\'s anniversary', '1972-' + d(40).slice(5), 'Anniversary', true]];
    case 'Events': return [['ev01', d(5), '19:00', '20:00', 'Family video call (example)', 'Video call', '', 'Monthly', '', '', 'Dashboard']];
  }
  return null;
}

/* ============================================================
   Dashboard calendar: Events tab, outside iCal links, subscription feeds
   ============================================================ */
function isGoogleTarget_(v) { v = String(v || '').trim(); return !!v && !/^app$/i.test(v); }

function webUrl_(ss) {
  const typed = setting_(ss, 'App web address').trim();
  if (!/^https:\/\/script\.google\.com\/.*\/exec\/?$/.test(typed)) return '';
  // Workspace accounts get /a/<domain>/ in the URL, which locks out anyone outside the domain. Strip it.
  return typed.replace(/\/a\/[^/]+\/macros\//, '/macros/').replace(/\/$/, '');
}

/** A per-person token for calendar links. Separate from the app key, so a leaked calendar link can't open the app. */
function feedToken_(key) {
  if (!key) return '';
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('FEED_SECRET');
  if (!secret) { secret = newKey_(); props.setProperty('FEED_SECRET', secret); }
  return Utilities.computeHmacSha256Signature(String(key), secret).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('').slice(0, 28);
}
function feedPerson_(ss, token) {
  if (!token || PropertiesService.getScriptProperties().getProperty('SHEET_ID') !== ss.getId()) return null;
  const r = rows_(ss, 'People').find(x => x[0] && x[5] && truthy_(x[7]) && feedToken_(String(x[5])) === token);
  return r ? { name: String(r[0]) } : null;
}

function calInfo_(ss, cfg, me) {
  const url = webUrl_(ss), app = !isGoogleTarget_(cfg.addTo);
  return {
    addTo: app ? 'app' : 'google', google: cfg.google, addButtons: cfg.addButtons,
    feeds: cfg.feeds && url ? { all: url + '?feed=' + me.feed, mine: url + '?feed=' + me.feed + '&mine=1' } : null,
    needsUrl: cfg.feeds && !url,
    ics: cfg.addButtons && url ? url + '?ics=' + me.feed : '',
    outside: rows_(ss, 'Outside calendars').filter(r => r[0] && r[1] && truthy_(r[4])).map(r => String(r[0])),
  };
}

/* ---------- Times ---------- */
function atLocal_(ymd, hhmm, tz) { return Utilities.parseDate(ymd + ' ' + (hhmm || '00:00'), tz, 'yyyy-MM-dd HH:mm'); }
/** "18:30", "6:30 pm", "6pm", or a time cell → "HH:mm". "" if blank or not a time. */
function hhmm_(v, tz) {
  if (v instanceof Date) return isNaN(v) ? '' : Utilities.formatDate(v, tz, 'HH:mm');
  const m = String(v || '').trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?$/);
  if (!m) return '';
  let h = Number(m[1]); const mi = Number(m[2] || 0), ap = m[3];
  if (ap) { if (h === 12) h = 0; if (ap[0] === 'p') h += 12; }
  return h < 24 && mi < 60 ? pad_(h) + ':' + pad_(mi) : '';
}
function dow_(ymd) { return parseYmd_(ymd).getDay(); }

/* ---------- Events tab ---------- */
function eventRowValues_(p, who) {
  const t = v => /^\d{2}:\d{2}$/.test(String(v || '')) ? String(v) : '';
  const until = /^\d{4}-\d{2}-\d{2}$/.test(p.until || '') ? p.until : '';
  return ['', p.date, t(p.time), t(p.time) ? t(p.end) : '', clean_(p.title, 200), clean_(p.where, 200), clean_(p.who, 200),
          REPEATS.indexOf(String(p.repeats || '')) > 0 ? String(p.repeats) : '', until, clean_(p.notes, 2000, true), who];
}

/** Every day a repeating Events row lands on, between from and to (yyyy-MM-dd, inclusive). */
function occurrences_(first, repeats, until, from, to) {
  const last = until && until < to ? until : to, out = [];
  if (first > last) return out;
  if (!repeats) return first >= from ? [first] : [];
  const step = { 'Daily': 1, 'Weekdays': 1, 'Weekly': 7, 'Every 2 weeks': 14 }[repeats];
  if (step) {
    const skip = Math.max(0, Math.floor(daysBetween_(first, from) / step) - 1);
    for (let d = addDays_(first, skip * step), n = 0; d <= last && n < 1000; d = addDays_(d, step), n++)
      if (d >= from && d >= first && (repeats !== 'Weekdays' || (dow_(d) > 0 && dow_(d) < 6))) out.push(d);
    return out;
  }
  const [fy, fm, fd] = first.split('-').map(Number);
  const months = repeats === 'Yearly' ? 12 : 1;
  const startIdx = fy * 12 + fm - 1, fromIdx = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7)) - 1;
  let idx = startIdx + Math.max(0, Math.floor((fromIdx - startIdx) / months) - 1) * months;
  for (let n = 0; n < 400; n++, idx += months) {
    const y = Math.floor(idx / 12), m = idx % 12 + 1;
    const dim = new Date(y, m, 0).getDate();
    if (fd > dim) continue;                         // e.g. the 31st in a 30-day month: skip, like phone calendars do
    const d = y + '-' + pad_(m) + '-' + pad_(fd);
    if (d > last) break;
    if (d >= from && d >= first) out.push(d);
  }
  return out;
}

/** The Events tab, expanded into single events that overlap [start, end). */
function appEvents_(ss, tz, start, end) {
  const sh = ss.getSheetByName('Events');
  if (!sh || sh.getLastRow() < 2) return [];
  const colors = {}; rows_(ss, 'People').forEach(r => { if (r[0]) colors[String(r[0]).toLowerCase()] = String(r[3] || ''); });
  const everyone = /^(both|everyone|all|family|us)$/i;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 11).getValues();
  const from = addDays_(Utilities.formatDate(start, tz, 'yyyy-MM-dd'), -1), to = Utilities.formatDate(end, tz, 'yyyy-MM-dd');
  const out = [];
  rows.forEach((r, i) => {
    const title = String(r[4] || '').trim(), first = ymd_(r[1], tz);
    if (!title || !first) return;
    let id = String(r[0] || '').trim();
    if (!id) { id = nextId_(sh, 'ev'); sh.getRange(i + 2, 1).setValue(id); }      // rows typed straight into the sheet
    const st = hhmm_(r[2], tz), en = hhmm_(r[3], tz), repeats = REPEATS.indexOf(String(r[7]).trim()) > 0 ? String(r[7]).trim() : '';
    const who = splitList_(r[6]).filter(n => !everyone.test(n));
    occurrences_(first, repeats, ymd_(r[8], tz), from, to).forEach(d => {
      let s, e;
      if (!st) { s = parseYmd_(d); e = parseYmd_(addDays_(d, 1)); if (d < addDays_(from, 1) || d >= to) return; }
      else {
        s = atLocal_(d, st, tz);
        e = en ? atLocal_(en > st ? d : addDays_(d, 1), en, tz) : new Date(s.getTime() + 36e5);
        if (e <= start || s >= end) return;
      }
      out.push({
        id: safeId_('a_' + id + '_' + d), key: id, src: 'app', title, cal: 'Dashboard',
        color: (who[0] && colors[who[0].toLowerCase()]) || '', who,
        start: st ? s.toISOString() : d, end: st ? e.toISOString() : addDays_(d, 1), allDay: !st,
        location: String(r[5] || ''), notes: String(r[9] || ''),
        series: { date: first, time: st, end: en, repeats, until: ymd_(r[8], tz), who: String(r[6] || '') },
      });
    });
  });
  return out;
}

function gatheringEvents_(ss, tz, start, end) {
  if (!config_(ss).features['Gatherings']) return [];
  return rows_(ss, 'Gatherings').filter(r => r[0] && r[1] && ymd_(r[2], tz)).map(r => {
    const d = ymd_(r[2], tz), t = hhmm_(r[3], tz), s = t ? atLocal_(d, t, tz) : parseYmd_(d), e = t ? new Date(s.getTime() + 3 * 36e5) : parseYmd_(addDays_(d, 1));
    return { id: safeId_('g_' + r[0]), src: 'gathering', gid: String(r[0]), title: String(r[1]), cal: 'Gathering', color: '', who: [], start: t ? s.toISOString() : d, end: t ? e.toISOString() : addDays_(d, 1), allDay: !t, location: String(r[4] || ''), notes: String(r[6] || '') };
  }).filter(e => (e.allDay ? parseYmd_(e.end) : new Date(e.end)) > start && (e.allDay ? parseYmd_(e.start) : new Date(e.start)) < end);
}

/* ---------- Outside calendars (iCal links) ---------- */
function outsideEvents_(ss, tz, start, end, warn) {
  const out = [];
  rows_(ss, 'Outside calendars').forEach(r => {
    const name = String(r[0] || '').trim(), link = String(r[1] || '').trim();
    if (!name || !link || !truthy_(r[4])) return;
    try {
      icsInstances_(link, tz).forEach(e => {
        const s = e.allDay ? parseYmd_(e.start) : new Date(e.start), en = e.allDay ? parseYmd_(e.end) : new Date(e.end);
        if (en <= start || s >= end) return;
        out.push({ id: safeId_('o_' + e.uid.slice(0, 80) + '_' + e.start), src: 'outside', title: e.title || '(no title)', cal: name,
                   color: String(r[3] || '') || '#8D6E63', who: r[2] ? [String(r[2])] : [], start: e.start, end: e.end, allDay: e.allDay, location: e.location || '' });
      });
    } catch (err) { warn.push('Outside calendar "' + name + '": ' + err.message); }
  });
  return out;
}

/** Fetches an iCal link (cached 20 minutes) and returns its events from yesterday to ~4 months out. */
function icsInstances_(link, tz) {
  const url = link.replace(/^webcal:/i, 'https:');
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const key = 'oc_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, url + today).map(b => ((b + 256) % 256).toString(16)).join('');
  const cache = CacheService.getScriptCache(), hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) throw new Error('the link answered ' + res.getResponseCode() + ' (is it a public or secret iCal link?)');
  const text = res.getContentText();
  if (text.indexOf('BEGIN:VCALENDAR') < 0) throw new Error('that link isn\'t an iCal calendar (it should end in .ics, or start with webcal://)');
  const list = parseIcs_(text, tz, atLocal_(addDays_(today, -1), '00:00', tz).getTime(), atLocal_(addDays_(today, 125), '00:00', tz).getTime());
  const json = JSON.stringify(list);
  if (json.length < 95000) cache.put(key, json, 1200);
  return list;
}

const WIN_TZ_ = { 'eastern standard time': 'America/New_York', 'central standard time': 'America/Chicago', 'mountain standard time': 'America/Denver',
  'us mountain standard time': 'America/Phoenix', 'pacific standard time': 'America/Los_Angeles', 'alaskan standard time': 'America/Anchorage',
  'hawaiian standard time': 'Pacific/Honolulu', 'sa pacific standard time': 'America/Bogota', 'gmt standard time': 'Europe/London',
  'w. europe standard time': 'Europe/Berlin', 'romance standard time': 'Europe/Paris', 'central europe standard time': 'Europe/Budapest',
  'tokyo standard time': 'Asia/Tokyo', 'china standard time': 'Asia/Shanghai', 'india standard time': 'Asia/Kolkata', 'utc': 'UTC', 'coordinated universal time': 'UTC' };

/** Turns iCal text into single events between fromMs and toMs. Handles all-day, time zones, repeats (RRULE), skipped (EXDATE) and moved (RECURRENCE-ID) events. */
function parseIcs_(text, defTz, fromMs, toMs) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  let calTz = defTz, cur = null, skip = 0;
  const evs = [];
  lines.forEach(line => {
    if (/^BEGIN:VEVENT$/i.test(line)) { cur = { EXDATE: [] }; return; }
    if (/^END:VEVENT$/i.test(line)) { if (cur) evs.push(cur); cur = null; return; }
    if (/^BEGIN:/i.test(line)) { if (cur) skip++; return; }
    if (/^END:/i.test(line)) { if (cur && skip) skip--; return; }
    let q = false, i = 0;
    for (; i < line.length; i++) { const c = line[i]; if (c === '"') q = !q; else if (c === ':' && !q) break; }
    if (i >= line.length) return;
    const head = line.slice(0, i).split(';'), name = head[0].toUpperCase(), value = line.slice(i + 1), params = {};
    head.slice(1).forEach(x => { const j = x.indexOf('='); if (j > 0) params[x.slice(0, j).toUpperCase()] = x.slice(j + 1).replace(/^"|"$/g, ''); });
    if (!cur) { if (name === 'X-WR-TIMEZONE') calTz = zoneName_(value, defTz); return; }
    if (skip) return;
    if (name === 'EXDATE') value.split(',').forEach(v => cur.EXDATE.push({ v, p: params }));
    else if (!(name in cur)) cur[name] = { v: value, p: params };
  });
  const unesc = s => String(s || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');
  const when = (prop) => {                          // → { allDay, y, m, d, hh, mi, ss, zone }
    const v = prop.v.trim(), m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
    if (!m) return null;
    const allDay = !m[4] || /^DATE$/i.test(prop.p.VALUE || '');
    return { allDay, y: +m[1], m: +m[2], d: +m[3], hh: +(m[4] || 0), mi: +(m[5] || 0), ss: +(m[6] || 0), zone: m[7] ? 'UTC' : zoneName_(prop.p.TZID, calTz) };
  };
  const ymdOfParts = (y, m, d) => { const x = new Date(Date.UTC(y, m - 1, d)); return x.getUTCFullYear() + '-' + pad_(x.getUTCMonth() + 1) + '-' + pad_(x.getUTCDate()); };
  const msOf = (w, ymd) => w.zone === 'UTC' ? Date.parse(ymd + 'T' + pad_(w.hh) + ':' + pad_(w.mi) + ':' + pad_(w.ss) + 'Z')
                                             : Utilities.parseDate(ymd + ' ' + pad_(w.hh) + ':' + pad_(w.mi) + ':' + pad_(w.ss), w.zone, 'yyyy-MM-dd HH:mm:ss').getTime();
  const keyOf = (w) => { const ymd = ymdOfParts(w.y, w.m, w.d); return w.allDay ? ymd : String(msOf(w, ymd)); };
  const durMs = s => { const m = String(s || '').match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/); if (!m) return 0; return ((+m[2] || 0) * 7 * 864e5 + (+m[3] || 0) * 864e5 + (+m[4] || 0) * 36e5 + (+m[5] || 0) * 6e4 + (+m[6] || 0) * 1e3) * (m[1] === '-' ? -1 : 1); };

  const moved = {};                                 // UID → keys of single occurrences replaced by their own VEVENT
  evs.forEach(e => { if (e['RECURRENCE-ID'] && e.UID) { const w = when(e['RECURRENCE-ID']); if (w) (moved[e.UID.v] = moved[e.UID.v] || {})[keyOf(w)] = 1; } });
  const out = [];
  evs.forEach(e => {
    if (!e.DTSTART || (e.STATUS && /CANCELLED/i.test(e.STATUS.v))) return;
    const w = when(e.DTSTART); if (!w) return;
    const uid = e.UID ? e.UID.v : (e.SUMMARY ? e.SUMMARY.v : '') + keyOf(w);
    const ex = {}; e.EXDATE.forEach(x => { const xw = when(x); if (xw) { xw.allDay = w.allDay; if (!x.p.TZID && xw.zone !== 'UTC') xw.zone = w.zone; ex[keyOf(xw)] = 1; } });
    const skipKeys = e['RECURRENCE-ID'] ? {} : (moved[uid] || {});
    const startYmd = ymdOfParts(w.y, w.m, w.d);
    let lenDays = 1, lenMs = 36e5;
    if (e.DTEND) { const ew = when(e.DTEND); if (ew) { const eYmd = ymdOfParts(ew.y, ew.m, ew.d); if (w.allDay) lenDays = Math.max(1, daysBetween_(startYmd, eYmd)); else lenMs = Math.max(0, msOf(ew, eYmd) - msOf(w, startYmd)); } }
    else if (e.DURATION) { const d = durMs(e.DURATION.v); if (w.allDay) lenDays = Math.max(1, Math.round(d / 864e5)); else lenMs = d; }
    else if (!w.allDay) lenMs = 0;
    const emit = ymd => {
      const k = w.allDay ? ymd : String(msOf(w, ymd));
      if (ex[k] || skipKeys[k]) return;
      if (w.allDay) {
        const endYmd = addDays_(ymd, lenDays), s = atLocal_(ymd, '00:00', defTz).getTime(), en = atLocal_(endYmd, '00:00', defTz).getTime();
        if (en <= fromMs || s >= toMs) return;
        out.push({ uid, title: unesc(e.SUMMARY && e.SUMMARY.v), location: unesc(e.LOCATION && e.LOCATION.v), allDay: true, start: ymd, end: endYmd });
      } else {
        const s = Number(k), en = s + lenMs;
        if (en < fromMs || s >= toMs) return;
        out.push({ uid, title: unesc(e.SUMMARY && e.SUMMARY.v), location: unesc(e.LOCATION && e.LOCATION.v), allDay: false, start: new Date(s).toISOString(), end: new Date(en).toISOString() });
      }
    };
    if (!e.RRULE || e['RECURRENCE-ID']) { emit(startYmd); return; }
    rrule_(e.RRULE.v, w, startYmd, fromMs, toMs, (ymd) => msOf(w, ymd), when).forEach(emit);
  });
  return out;
}

function zoneName_(tzid, fallback) {
  if (!tzid) return fallback;
  const t = String(tzid).trim(), win = WIN_TZ_[t.toLowerCase()];
  if (win) return win;
  const m = t.match(/([A-Za-z]+\/[A-Za-z_\-]+(?:\/[A-Za-z_\-]+)?)$/);
  return m ? m[1] : (/^(utc|gmt|z)$/i.test(t) ? 'UTC' : fallback);
}

/** Expands an RRULE into yyyy-MM-dd days (in the event's own time zone), up to toMs. Covers DAILY, WEEKLY, MONTHLY, YEARLY with INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH. */
function rrule_(rule, w, startYmd, fromMs, toMs, msAt, when) {
  const R = {}; rule.split(';').forEach(x => { const j = x.indexOf('='); if (j > 0) R[x.slice(0, j).toUpperCase()] = x.slice(j + 1).toUpperCase(); });
  const freq = R.FREQ, step = Math.max(1, Number(R.INTERVAL) || 1), count = Number(R.COUNT) || 0;
  let untilMs = Infinity;
  if (R.UNTIL) { const uw = when({ v: R.UNTIL, p: {} }); if (uw) { if (uw.allDay || w.allDay) untilMs = Date.parse(uw.y + '-' + pad_(uw.m) + '-' + pad_(uw.d) + 'T23:59:59Z') + 14 * 36e5; else untilMs = uw.zone === 'UTC' ? Date.parse(uw.y + '-' + pad_(uw.m) + '-' + pad_(uw.d) + 'T' + pad_(uw.hh) + ':' + pad_(uw.mi) + ':' + pad_(uw.ss) + 'Z') : msAt(uw.y + '-' + pad_(uw.m) + '-' + pad_(uw.d)); } }
  const DOW = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  const byday = (R.BYDAY || '').split(',').filter(Boolean).map(x => { const m = x.match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/); return m ? { n: m[1] ? Number(m[1]) : 0, d: DOW[m[2]] } : null; }).filter(Boolean);
  const bymd = (R.BYMONTHDAY || '').split(',').filter(Boolean).map(Number);
  const bymonth = (R.BYMONTH || '').split(',').filter(Boolean).map(Number).sort((a, b) => a - b);
  const out = []; let n = 0, done = false;
  const take = ymd => {
    if (done || ymd < startYmd) return;
    const ms = msAt(ymd);
    if (ms > untilMs || ms >= toMs) { done = true; return; }
    n++; out.push(ymd);
    if (count && n >= count) done = true;
  };
  const dayOfMonth = (y, m) => {                    // candidate days in month m of year y
    const dim = new Date(Date.UTC(y, m, 0)).getUTCDate(), list = [];
    if (bymd.length) bymd.forEach(d => { const dd = d > 0 ? d : dim + d + 1; if (dd >= 1 && dd <= dim) list.push(dd); });
    else if (byday.length) byday.forEach(b => {
      const all = []; for (let d = 1; d <= dim; d++) if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === b.d) all.push(d);
      if (!b.n) all.forEach(d => list.push(d)); else { const d = b.n > 0 ? all[b.n - 1] : all[all.length + b.n]; if (d) list.push(d); }
    });
    else if (w.d <= dim) list.push(w.d);
    return list.sort((a, b) => a - b).map(d => y + '-' + pad_(m) + '-' + pad_(d));
  };
  const jump = !count;                              // without COUNT, skip ahead to near today instead of walking from the first date
  const todayYmd = Utilities.formatDate(new Date(fromMs - 3 * 864e5), 'UTC', 'yyyy-MM-dd');   // "near the window start"
  if (freq === 'DAILY') {
    let d = startYmd; if (jump && d < todayYmd) d = addDays_(d, Math.floor(daysBetween_(d, todayYmd) / step) * step);
    for (let i = 0; i < 2000 && !done; i++, d = addDays_(d, step)) if (!byday.length || byday.some(b => b.d === dow_(d))) take(d);
  } else if (freq === 'WEEKLY') {
    const days = byday.length ? byday.map(b => b.d) : [dow_(startYmd)];
    let wk = addDays_(startYmd, -((dow_(startYmd) + 6) % 7));                 // Monday of the first week
    if (jump && wk < todayYmd) wk = addDays_(wk, Math.max(0, Math.floor(daysBetween_(wk, todayYmd) / (7 * step)) - 1) * 7 * step);
    for (let i = 0; i < 1000 && !done; i++, wk = addDays_(wk, 7 * step))
      days.map(d => addDays_(wk, (d + 6) % 7)).sort().forEach(take);
  } else if (freq === 'MONTHLY' || freq === 'YEARLY') {
    const months = freq === 'YEARLY' ? 12 * step : step;
    let idx = w.y * 12 + w.m - 1;
    const tIdx = Number(todayYmd.slice(0, 4)) * 12 + Number(todayYmd.slice(5, 7)) - 1;
    if (jump && idx < tIdx) idx += Math.max(0, Math.floor((tIdx - idx) / months) - 1) * months;
    for (let i = 0; i < 600 && !done; i++, idx += months) {
      const y = Math.floor(idx / 12);
      const ms = freq === 'YEARLY' ? (bymonth.length ? bymonth : [w.m]) : [idx % 12 + 1];
      ms.forEach(m => dayOfMonth(y, m).forEach(take));
    }
  } else take(startYmd);
  return out;
}

/* ---------- Subscription feed + "add to my calendar" file ---------- */
function icsText_(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function icsFold_(line) {                           // iCal lines max 75 bytes; continuation lines start with a space
  const out = []; let cur = '', bytes = 0;
  for (const ch of line) {
    const b = ch.codePointAt(0) < 0x80 ? 1 : ch.codePointAt(0) < 0x800 ? 2 : ch.codePointAt(0) < 0x10000 ? 3 : 4;
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
function icsStamp_(d) { return Utilities.formatDate(d, 'UTC', "yyyyMMdd'T'HHmmss'Z'"); }
function icsEvent_(uid, title, allDay, start, end, where, desc) {
  const L = ['BEGIN:VEVENT', 'UID:' + uid, 'DTSTAMP:' + icsStamp_(new Date())];
  if (allDay) L.push('DTSTART;VALUE=DATE:' + start.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + end.replace(/-/g, ''));
  else L.push('DTSTART:' + icsStamp_(new Date(start)), 'DTEND:' + icsStamp_(new Date(end)));
  L.push('SUMMARY:' + icsText_(title));
  if (where) L.push('LOCATION:' + icsText_(where));
  if (desc) L.push('DESCRIPTION:' + icsText_(desc));
  L.push('END:VEVENT');
  return L;
}
function icsCalendar_(name, events) {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dashboard//Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
          'X-WR-CALNAME:' + icsText_(name), 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H']
    .concat(events.reduce((a, e) => a.concat(e), []), ['END:VCALENDAR']).map(icsFold_).join('\r\n') + '\r\n';
}
function icsOutput_(text) { return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.ICAL); }

function feedResponse_(token, mineOnly) {
  const ss = SpreadsheetApp.getActive(), name = setting_(ss, 'Dashboard name') || 'Dashboard';
  const cfg = config_(ss), person = cfg.feeds ? feedPerson_(ss, token) : null;
  if (!person) return icsOutput_(icsCalendar_(name + ' (this link no longer works)', []));
  const cache = CacheService.getScriptCache(), ck = 'feed_' + token + (mineOnly ? '_m' : '');
  const hit = cache.get(ck); if (hit) return icsOutput_(hit);
  const tz = ss.getSpreadsheetTimeZone(), now = new Date();
  const evs = appEvents_(ss, tz, new Date(now.getTime() - 60 * 864e5), new Date(now.getTime() + 400 * 864e5))
    .filter(e => !mineOnly || !e.who.length || e.who.some(n => n.toLowerCase() === person.name.toLowerCase()));
  const tag = ss.getId().slice(0, 10);
  const text = icsCalendar_(name + (mineOnly ? ' – ' + person.name : ''), evs.map(e =>
    icsEvent_(e.id + '@' + tag, e.title, e.allDay, e.start, e.end, e.location, [e.who.length ? 'For: ' + e.who.join(', ') : '', e.notes].filter(Boolean).join('\n'))));
  if (text.length < 95000) cache.put(ck, text, 300);
  return icsOutput_(text);
}

function eventFileResponse_(token, q) {
  const ss = SpreadsheetApp.getActive();
  if (!feedPerson_(ss, token)) return ContentService.createTextOutput('This link no longer works.');
  const allDay = q.a === '1', title = String(q.t || 'Event').slice(0, 200);
  const okDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s), okTime = s => !isNaN(Date.parse(s));
  const s = String(q.s || ''), e = String(q.e || '');
  if (allDay ? !okDay(s) : !okTime(s)) return ContentService.createTextOutput('This event link is incomplete.');
  const end = allDay ? (okDay(e) && e > s ? e : addDays_(s, 1)) : (okTime(e) ? e : new Date(Date.parse(s) + 36e5).toISOString());
  const text = icsCalendar_(title, [icsEvent_('copy-' + Date.now() + '@dashboard', title, allDay, s, end, String(q.l || '').slice(0, 200), String(q.n || '').slice(0, 1000))]);
  return icsOutput_(text).downloadAsFile((title.replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'event') + '.ics');
}

/* ============================================================
   Helpers
   ============================================================ */
function ui_() { return SpreadsheetApp.getUi(); }
function putSetting_(ss, label, value) { const sh = ss.getSheetByName('Settings'); if (!sh) return; const i = colValues_(sh, 1).indexOf(label); if (i >= 1) sh.getRange(i + 1, 2).setValue(value); }
function setting_(ss, label) { const r = rows_(ss, 'Settings').find(x => String(x[0]).trim() === label); return r ? String(r[1]).trim() : ''; }
/* Each tab is read once per request (reading a sheet is the slow part). memoReset_() after any write. */
let MEMO_ = {}, MEMO_ON_ = false;           // only switched on while answering the app (never during setup or a save)
function memoReset_(on) { MEMO_ = {}; MEMO_ON_ = !!on; }
function rows_(ss, name) {
  const k = 'rows:' + name; if (MEMO_ON_ && MEMO_[k]) return MEMO_[k];
  const sh = ss.getSheetByName(name);
  const v = (!sh || sh.getLastRow() < 2) ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  if (MEMO_ON_) MEMO_[k] = v;
  return v;
}
function colValues_(sh, col) { return sh.getLastRow() ? sh.getRange(1, col, sh.getLastRow(), 1).getValues().flat().map(String) : []; }
function header_(sh, n) { sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#eeeeee'); sh.setFrozenRows(1); }
function move_(ss, name, pos) { const s = ss.getSheetByName(name); if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(Math.min(pos, ss.getSheets().length)); } }
function splitList_(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); }
function truthy_(v) { return v === true || /^(true|yes|y|x|1)$/i.test(String(v).trim()); }
function num_(v) { if (v === '' || v === null || v === undefined) return null; const n = Number(String(v).replace(/[$,\s%]/g, '')); return isNaN(n) ? null : n; }
function toMs_(v) { if (v instanceof Date) return v.getTime(); const n = Number(v); return n > 1e11 ? n : 0; }
function pad_(n) { return ('0' + n).slice(-2); }
function ymdOf_(d) { return d.getFullYear() + '-' + pad_(d.getMonth() + 1) + '-' + pad_(d.getDate()); }
function parseYmd_(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays_(s, n) { const d = parseYmd_(s); d.setDate(d.getDate() + n); return ymdOf_(d); }
function daysBetween_(a, b) { return Math.round((parseYmd_(b) - parseYmd_(a)) / 864e5); }
function ymd_(v, tz) {
  if (v instanceof Date) return isNaN(v) ? '' : Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? m[3] + '-' + pad_(m[1]) + '-' + pad_(m[2]) : '';
}
function colIndex_(c) { const s = String(c).trim().toUpperCase(); if (/^\d+$/.test(s)) return Number(s); return s.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) || 1; }
function clean_(v, max, multiline) { let t = String(v == null ? '' : v).slice(0, max); if (!multiline) t = t.replace(/[\r\n]+/g, ' '); t = t.trim(); return /^[=+\-@]/.test(t) ? "'" + t : t; }
function esc_(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function nextId_(sh, prefix) {
  let n = 0;
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat().forEach(id => { const m = String(id).match(new RegExp('^' + prefix + '(\\d+)$')); if (m) n = Math.max(n, Number(m[1])); });
  return prefix + pad_(n + 1);
}
function findRow_(sh, id) {
  if (!sh || !id) return 0;
  const ids = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
  for (let i = 1; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 1;
  return 0;
}
function safeId_(s) { return String(s).replace(/[^A-Za-z0-9_\-.~:@+]/g, '-').slice(0, 190); }

/** Run from the editor to check everything works (as the first person on the People tab). */
function test() {
  const ss = SpreadsheetApp.getActive(), r = rows_(ss, 'People')[0];
  Logger.log(JSON.stringify(api(r && r[5], {}), null, 2));
}
/* ============================================================
   v3: the phone app (GitHub-hosted) talks to this script through doPost.
   The same functions also work from the page Apps Script serves (google.script.run).
   ============================================================ */
const PUBLIC_FNS_ = { api: 1, signIn: 1, signInInfo: 1, chat: 1, chatSearch: 1, chatPhoto: 1, chatTicket: 1, chatPush: 1 };
function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (_) { return json_({ error: 'bad request' }); }
  const fn = String(body.fn || '');
  if (!PUBLIC_FNS_[fn]) return json_({ error: 'unknown' });
  const F = { api, signIn, signInInfo, chat, chatSearch, chatPhoto, chatTicket, chatPush };
  try { return json_({ ok: true, result: F[fn].apply(null, Array.isArray(body.args) ? body.args : []) }); }
  catch (err) { return json_({ error: String(err && err.message || err) }); }
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ============================================================
   Messages (family chat)
   Chat IDs are random and not secret; keys stay private.
   Channels: Organizers make them; anyone (not Viewers) can start a group or a private message.
   ============================================================ */
function ensureChatIds_(ss) {
  const sh = ss.getSheetByName('People'); if (!sh) return false;
  if (sh.getLastColumn() < TABS.People.length) buildTab_(ss, 'People');
  const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues() : [];
  const used = {}; v.forEach(r => { if (r[9]) used[String(r[9])] = 1; });
  let n = 0;
  v.forEach((r, i) => { if (!r[0] || r[9]) return; let id; do { id = 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 9); } while (used[id]); used[id] = 1; sh.getRange(i + 2, 10).setValue(id); n++; });
  if (n) memoReset_(MEMO_ON_);
  return n > 0;
}
/** me with a chat ID (makes IDs for anyone missing one – e.g. a person added after setup). */
function chatMe_(ss, me) {
  if (me.id) return me;
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try { memoReset_(false); ensureChatIds_(ss); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
  const r = rows_(ss, 'People').find(x => String(x[0]) === me.name);
  return Object.assign({}, me, { id: r ? String(r[9] || '') : '' });
}
function chatPeople_(ss) { return rows_(ss, 'People').filter(r => r[0] && r[9]); }
const isOrg_ = me => me.role === 'Organizer';
const chatSees_ = (me, who) => /organi[sz]er/i.test(String(who || '')) ? isOrg_(me) : true;
function msgRows_(ss) { return rows_(ss, 'Messages').slice(-3000); }
function isoOf_(v) { const ms = toMs_(v); return ms ? new Date(ms).toISOString() : ''; }

/** Conversations this person can see, newest first, with unread counts and the last message. DMs are 'dm-<id>-<id>'. */
function channels_(ss, me) {
  const ppl = chatPeople_(ss), byId = {}; ppl.forEach(r => { byId[String(r[9])] = String(r[0]); });
  const reads = {}; rows_(ss, 'Chat reads').forEach(r => { if (String(r[0]) === me.id) reads[String(r[1])] = toMs_(r[2]); });
  const msgs = msgRows_(ss);
  const list = rows_(ss, 'Channels').filter(r => r[0] && r[1]).map(r => ({ id: String(r[0]), name: String(r[1]), kind: String(r[2] || 'channel'), members: String(r[3] || '').split(',').filter(Boolean), who: String(r[4] || 'Everyone') }))
    .filter(c => c.kind === 'channel' ? chatSees_(me, c.who) : c.members.indexOf(me.id) >= 0);
  const dms = {}; msgs.forEach(m => { const c = String(m[1]); if (/^dm-/.test(c) && c.split('-').indexOf(me.id) > 0) dms[c] = 1; });
  Object.keys(dms).forEach(c => { if (!list.some(x => x.id === c)) { const other = c.split('-').slice(1).find(x => x !== me.id) || me.id; list.push({ id: c, name: byId[other] || 'Former member', kind: 'dm', members: c.split('-').slice(1), who: '' }); } });
  const by = {}; msgs.forEach(m => { const c = String(m[1]); (by[c] = by[c] || []).push(m); });
  return list.map(c => {
    const ms = by[c.id] || [], last = ms[ms.length - 1], seen = reads[c.id] || 0;
    return { id: c.id, name: c.name, kind: c.kind, who: c.who,
      members: c.kind === 'channel' ? [] : c.members.map(x => byId[x]).filter(Boolean),
      memberIds: c.kind === 'group' ? c.members.filter(x => byId[x]) : [],
      unread: ms.filter(m => toMs_(m[4]) > seen && String(m[2]) !== me.id).length,
      last: last ? { from: String(last[3]), text: String(last[5]).slice(0, 80) || (last[6] && last[6] !== 'expired' ? '📷 Photo' : ''), at: isoOf_(last[4]) } : null };
  }).sort((a, b) => String((b.last || {}).at || '').localeCompare(String((a.last || {}).at || '')) || (a.kind === 'channel' ? -1 : 1));
}
function chatAuth_(key) {
  memoReset_(false);
  const ss = SpreadsheetApp.getActive(), me0 = whoIs_(ss, key); if (!me0) throw new Error('unauthorized');
  if (!config_(ss).features['Messages']) throw new Error('Messages are turned off for this dashboard');
  if (!ss.getSheetByName('Messages')) throw new Error('The Messages tabs are missing. Ask the organizer to run Dashboard › 1. Set up.');
  const me = chatMe_(ss, me0); if (!me.id) throw new Error('You need a chat ID – ask the organizer to run Dashboard › 1. Set up.');
  touch_(ss, me);
  return { ss, me };
}
function canSee_(ss, me, channel) {
  if (channels_(ss, me).some(c => c.id === channel)) return true;
  if (!/^dm-/.test(channel)) return false;           // a brand-new private message: both people must be active
  const ids = channel.split('-').slice(1), act = rows_(ss, 'People').filter(r => r[0] && r[9] && truthy_(r[7])).map(r => String(r[9]));
  return ids.length === 2 && ids[0] !== ids[1] && ids.indexOf(me.id) >= 0 && ids.every(x => act.indexOf(x) >= 0) && channel === 'dm-' + ids.slice().sort().join('-');
}

/** Opens a conversation (and marks it read). Optionally sends a message (text and/or one photo), or toggles a ✓✓ read mark. */
function chat(key, channel, text, photo, opt) {
  opt = opt || {};
  const { ss, me } = chatAuth_(key);
  channel = String(channel || '');
  if (!canSee_(ss, me, channel)) throw new Error('You can\'t see that conversation');
  const sending = !!((text !== undefined && text !== null && String(text).trim()) || photo);
  if ((sending || opt.ack) && me.role === 'Viewer') throw new Error('This sign-in is view-only');
  const all0 = msgRows_(ss);
  const replyTo = sending && opt.replyTo && all0.some(m => String(m[0]) === String(opt.replyTo) && String(m[1]) === channel) ? String(opt.replyTo) : '';
  try { cleanPhotos_(ss); } catch (e) {}
  const pid = photo ? savePhoto_(photo, channel) : '';   // the Drive upload happens before the lock, so it never holds anyone else up
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    if (sending) ss.getSheetByName('Messages').appendRow(['m' + Utilities.getUuid().replace(/-/g, '').slice(0, 11), channel, me.id, me.name, new Date(), clean_(text || '', 2000, true), pid, replyTo, '']);
    if (opt.ack) {                                     // the one reaction: "read" – toggles; not on your own messages
      const sh = ss.getSheetByName('Messages'), last = sh.getLastRow(), from = Math.max(2, last - 2999);
      const v = last >= 2 ? sh.getRange(from, 1, last - from + 1, 9).getValues() : [], i = v.findIndex(m => String(m[0]) === String(opt.ack) && String(m[1]) === channel);
      if (i >= 0 && String(v[i][2]) !== me.id) {
        const cur = String(v[i][8] || '').split(',').filter(Boolean), at = cur.indexOf(me.id);
        if (at >= 0) cur.splice(at, 1); else cur.push(me.id);
        sh.getRange(from + i, 9).setValue(cur.join(','));
      }
    }
    const rs = ss.getSheetByName('Chat reads'), rv = rs.getLastRow() > 1 ? rs.getRange(2, 1, rs.getLastRow() - 1, 2).getValues() : [], i = rv.findIndex(r => String(r[0]) === me.id && String(r[1]) === channel);
    if (i >= 0) rs.getRange(i + 2, 3).setValue(new Date()); else rs.appendRow([me.id, channel, new Date()]);
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
  memoReset_(false);
  if (sending) { try { pushChat_(ss, me, channel, String(text || '').trim(), !!pid); } catch (e) {} }
  const ppl = chatPeople_(ss), byId = {}; ppl.forEach(r => { byId[String(r[9])] = String(r[0]); });
  const all = msgRows_(ss).filter(m => String(m[1]) === channel);
  let from = Math.max(0, all.length - 150);
  if (opt.find) { const f = all.findIndex(m => String(m[0]) === String(opt.find)); if (f >= 0 && f < from) from = Math.max(0, f - 20, all.length - 400); }
  const snip = m => ({ id: String(m[0]), from: String(m[3]), text: String(m[5]).slice(0, 90), photo: m[6] && m[6] !== 'expired' ? 1 : 0 });
  const messages = all.slice(from).map(m => { const ph = String(m[6] || ''), rt = String(m[7] || ''), acks = String(m[8] || '').split(',').filter(x => byId[x]);
    const orig = rt ? all.find(x => String(x[0]) === rt) : null;
    return { id: String(m[0]), fromId: String(m[2]), from: String(m[3]), at: isoOf_(m[4]), text: String(m[5]), photo: ph && ph !== 'expired' ? 1 : 0, expired: ph === 'expired' ? 1 : 0,
      reply: rt ? (orig ? snip(orig) : { id: rt, from: '', text: 'Older message', photo: 0 }) : null, acks: acks.map(x => byId[x]), ackMine: acks.indexOf(me.id) >= 0 ? 1 : 0 }; });
  const active = {}; ppl.filter(r => truthy_(r[7])).forEach(r => { active[String(r[9])] = 1; });
  const seen = rows_(ss, 'Chat reads').filter(r => String(r[1]) === channel && String(r[0]) !== me.id && active[String(r[0])]).map(r => ({ name: byId[String(r[0])], at: isoOf_(r[2]) }));
  return { ok: true, channel, me: me.id, messages, seen, more: from > 0 ? 1 : 0, channels: channels_(ss, me), active: activeMap_(ss, me) };
}
/** Search the recent messages (last 3,000) in every conversation this person can see. */
function chatSearch(key, q) {
  const { ss, me } = chatAuth_(key);
  q = String(q || '').trim().toLowerCase(); if (q.length < 2) return { ok: true, results: [] };
  const ch = {}; channels_(ss, me).forEach(c => { ch[c.id] = c; });
  const results = msgRows_(ss).filter(m => ch[String(m[1])] && (String(m[5]).toLowerCase().indexOf(q) >= 0 || String(m[3]).toLowerCase().indexOf(q) === 0))
    .slice(-60).reverse().map(m => { const c = ch[String(m[1])]; return { id: String(m[0]), channel: c.id, name: c.name, kind: c.kind, from: String(m[3]), at: isoOf_(m[4]), text: String(m[5]).slice(0, 160) || (m[6] ? '📷 Photo' : '') }; });
  return { ok: true, results };
}
/** A message's photo, only for people who can see that conversation. */
function chatPhoto(key, id) {
  const { ss, me } = chatAuth_(key);
  const m = msgRows_(ss).find(x => String(x[0]) === String(id)); if (!m) throw new Error('That message is gone');
  if (!canSee_(ss, me, String(m[1]))) throw new Error('You can\'t see that conversation');
  const ph = String(m[6] || ''); if (!ph || ph === 'expired') throw new Error('That photo has expired');
  const b = DriveApp.getFileById(ph).getBlob();
  return { ok: true, id: String(id), mime: b.getContentType(), data: Utilities.base64Encode(b.getBytes()) };
}
/** Chat actions that change the conversation list (they come through api(), so the whole screen refreshes). */
function chatAct_(ss, p, me0) {
  const me = chatMe_(ss, me0), sh = ss.getSheetByName('Channels');
  if (!sh) throw new Error('The Messages tabs are missing. Ask the organizer to run Dashboard › 1. Set up.');
  const ids = rows_(ss, 'People').filter(r => r[0] && r[9] && truthy_(r[7])).map(r => String(r[9]));
  switch (p.action) {
    case 'newChannel': {
      const kind = p.kind === 'group' ? 'group' : 'channel';
      if (kind === 'channel' && !isOrg_(me)) throw new Error('Only organizers can make channels – start a group instead');
      const name = clean_(p.name, 40); if (!name) throw new Error('Give it a name');
      let members = String(p.members || '').split(',').filter((x, i, a) => ids.indexOf(x) >= 0 && a.indexOf(x) === i);
      if (kind === 'group') { if (members.indexOf(me.id) < 0) members.push(me.id); if (members.length < 2) throw new Error('Pick at least one other person'); } else members = [];
      sh.appendRow(['c' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), name, kind, members.join(','), kind === 'channel' && /organi/i.test(p.who || '') ? 'Organizers' : 'Everyone', me.name, new Date()]); return;
    }
    case 'editChannel': {
      const r = findRow_(sh, p.id); if (!r) throw new Error('That conversation was removed');
      const row = sh.getRange(r, 1, 1, 5).getValues()[0], kind = String(row[2] || 'channel');
      if (kind === 'channel') { if (!isOrg_(me)) throw new Error('Only organizers can edit channels'); }
      else if (String(row[3] || '').split(',').indexOf(me.id) < 0) throw new Error('Only people in this group can edit it');
      const name = clean_(p.name, 40); if (!name) throw new Error('Give it a name');
      let members = null;
      if (kind === 'group' && p.members !== undefined) {
        members = String(p.members || '').split(',').filter((x, i, a) => ids.indexOf(x) >= 0 && a.indexOf(x) === i);
        if (members.length < 2) throw new Error('A group needs at least two people');
      }
      sh.getRange(r, 2).setValue(name);
      if (members) sh.getRange(r, 4).setValue(members.join(','));
      if (kind === 'channel' && p.who !== undefined) sh.getRange(r, 5).setValue(/organi/i.test(p.who || '') ? 'Organizers' : 'Everyone');
      return;
    }
    case 'deleteMessage': {                            // your own message, or any message if you're an organizer
      const ms = ss.getSheetByName('Messages'), r = findRow_(ms, p.id); if (!r) return;
      if (String(ms.getRange(r, 3).getValue()) !== me.id && !isOrg_(me)) throw new Error('You can only delete your own messages');
      const ph = String(ms.getRange(r, 7).getValue() || ''); if (ph && ph !== 'expired') { try { DriveApp.getFileById(ph).setTrashed(true); } catch (e) {} }
      ms.deleteRow(r); return;
    }
  }
}

/* ----- chat photos: one per message, kept in a private Drive folder, deleted after the set number of days ----- */
function photoFolder_() {
  const pr = PropertiesService.getScriptProperties(), id = pr.getProperty('PHOTO_FOLDER');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const f = DriveApp.createFolder((setting_(SpreadsheetApp.getActive(), 'Dashboard name') || 'Dashboard') + ' – chat photos');
  f.setDescription('Photos sent in the dashboard\'s Messages. Deleted automatically (Settings › Delete chat photos after).');
  pr.setProperty('PHOTO_FOLDER', f.getId()); return f;
}
function savePhoto_(dataUrl, channel) {
  const m = String(dataUrl).match(/^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/); if (!m) throw new Error('That photo couldn\'t be read – try another');
  const bytes = Utilities.base64Decode(m[3]); if (bytes.length > 5 * 1024 * 1024) throw new Error('That photo is too big');
  const name = 'chat ' + channel + ' ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HHmmss') + '.' + (m[2] === 'jpeg' ? 'jpg' : m[2]);
  return photoFolder_().createFile(Utilities.newBlob(bytes, m[1], name)).getId();
}
/** Once a day (checked when someone opens Messages): delete photos older than the setting and mark their messages. */
function cleanPhotos_(ss) {
  const tz = ss.getSpreadsheetTimeZone(), today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'), pr = PropertiesService.getScriptProperties();
  if (pr.getProperty('PHOTO_CLEANED') === today) return; pr.setProperty('PHOTO_CLEANED', today);
  const days = Number(setting_(ss, 'Delete chat photos after (days)')) || 60, cut = Date.now() - days * 864e5;
  const sh = ss.getSheetByName('Messages'); if (!sh || sh.getLastRow() < 2) return;
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
  v.forEach((r, i) => { const ph = String(r[6] || ''); if (ph && ph !== 'expired' && toMs_(r[4]) && toMs_(r[4]) < cut) { try { DriveApp.getFileById(ph).setTrashed(true); } catch (e) {} sh.getRange(i + 2, 7).setValue('expired'); } });
  if (pr.getProperty('PHOTO_FOLDER')) { try { const it = photoFolder_().getFiles(); while (it.hasNext()) { const f = it.next(); if (f.getDateCreated().getTime() < cut) f.setTrashed(true); } } catch (e) {} }
}

/* ============================================================
   Phone notifications. The sheet decides who gets what; a Cloudflare Worker does the sending
   (the same Worker the Peregrine app uses can be shared).
   People › Notifications: msg=all | direct | off   (direct = private messages, groups and @mentions)
   ============================================================ */
function pushPrefs_(r) { const s = String(r && r[10] || ''), m = s.match(/msg=(all|direct|off)/); return { msg: m ? m[1] : 'all', active: !/active=0/.test(s) }; }
function pushInfo_(ss, me) {
  const key = setting_(ss, 'Push public key'), ready = !!(setting_(ss, 'Push service address') && key);
  const r = rows_(ss, 'People').find(x => String(x[0]) === me.name);
  const devices = ready && me.id && ss.getSheetByName('Push') ? rows_(ss, 'Push').filter(x => String(x[0]) === me.id).map(x => String(x[2])) : [];
  return { key, ready, devices, prefs: pushPrefs_(r) };
}
function pushAct_(ss, p, me0) {
  const me = chatMe_(ss, me0);
  if (!ss.getSheetByName('Push')) buildTab_(ss, 'Push');
  const sh = ss.getSheetByName('Push');
  switch (p.action) {
    case 'pushSub': {
      let sub; try { sub = JSON.parse(String(p.sub || '')); } catch (e) {}
      if (!sub || !/^https:\/\//.test(String(sub.endpoint || '')) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) throw new Error('This phone didn\'t give a usable notification address');
      const v = rows_(ss, 'Push'), i = v.findIndex(r => String(r[2]) === sub.endpoint);
      const row = [me.id, me.name, sub.endpoint, JSON.stringify(sub.keys), clean_(p.device, 60), new Date(), i >= 0 ? v[i][6] : ''];
      if (i >= 0) sh.getRange(i + 2, 1, 1, 7).setValues([row]); else sh.appendRow(row);
      return;
    }
    case 'pushUnsub': {
      const v = rows_(ss, 'Push');
      for (let i = v.length - 1; i >= 0; i--) if (String(v[i][2]) === String(p.endpoint || '') && String(v[i][0]) === me.id) sh.deleteRow(i + 2);
      return;
    }
    case 'pushPrefs': {
      const ps = ss.getSheetByName('People'), v = rows_(ss, 'People'), i = v.findIndex(r => String(r[0]) === me.name); if (i < 0) return;
      const P = pushPrefs_(v[i]);
      if (/^(all|direct|off)$/.test(String(p.msg || ''))) P.msg = String(p.msg);
      if (p.active === '1' || p.active === '0') P.active = p.active === '1';
      ps.getRange(i + 2, 11).setValue('msg=' + P.msg + ';active=' + (P.active ? 1 : 0));
      return;
    }
    case 'pushTest': {
      SpreadsheetApp.flush(); memoReset_(false);
      const r = push_(ss, [{ uid: me.id, kind: 'test', title: 'Notifications are on', body: 'This is how family messages will show up.', url: '?go=chat', tag: 'test' }]);
      if (r.off) throw new Error('Notifications aren\'t set up yet (Settings › Push service address).');
      if (!r.sent) throw new Error('The test didn\'t reach this phone. Turn notifications off and on again.');
      return;
    }
  }
}
/** items: [{uid, kind, direct, title, body, url, tag}]. Returns { sent, failed }. */
function push_(ss, items) {
  const addr = setting_(ss, 'Push service address'), secret = setting_(ss, 'Push service secret');
  if (!addr || !secret) return { sent: 0, failed: 0, off: true };
  const sh = ss.getSheetByName('Push'); if (!sh || !items || !items.length) return { sent: 0, failed: 0 };
  const subs = rows_(ss, 'Push'), people = rows_(ss, 'People'), out = [], rows = [];
  items.forEach(it => {
    const u = people.find(r => String(r[9]) === it.uid); if (!u || !truthy_(u[7])) return;
    const P = pushPrefs_(u);
    if (it.kind === 'msg' && (P.msg === 'off' || (P.msg === 'direct' && !it.direct))) return;
    subs.forEach((s, i) => { if (String(s[0]) !== it.uid) return; let keys; try { keys = JSON.parse(String(s[3])); } catch (e) { return; }
      out.push({ sub: { endpoint: String(s[2]), keys }, data: { title: String(it.title).slice(0, 120), body: String(it.body || '').slice(0, 240), url: it.url || '', tag: it.tag || '' }, urgency: 'high' }); rows.push(i); });
  });
  if (!out.length) return { sent: 0, failed: 0, none: true };
  const res = UrlFetchApp.fetch(addr, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ secret, pushes: out }), muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('The notification service answered ' + res.getResponseCode() + ' – check Settings › Push service address and secret');
  const r = JSON.parse(res.getContentText()).results || [];
  const dead = [], now = new Date(); let sent = 0;
  r.forEach(x => { const row = rows[x.i]; if (x.status >= 200 && x.status < 300) { sent++; sh.getRange(row + 2, 7).setValue(now); } else if (x.status === 404 || x.status === 410) dead.push(row); });
  dead.filter((x, i, a) => a.indexOf(x) === i).sort((a, b) => b - a).forEach(row => sh.deleteRow(row + 2));   // phones that turned notifications off or reinstalled
  return { sent, failed: r.length - sent - dead.length, expired: dead.length };
}
/** True if the text @mentions this person by full name, or by first name when no one else active shares it. */
function mentions_(text, name, people) {
  if (!text || !name || text.indexOf('@') < 0) return false;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), firstN = name.split(' ')[0];
  if (new RegExp('@' + esc(name) + '(?![\\w])', 'i').test(text)) return true;
  const dup = people.filter(r => r[0] && truthy_(r[7]) && String(r[0]).split(' ')[0].toLowerCase() === firstN.toLowerCase()).length > 1;
  return !dup && new RegExp('@' + esc(firstN) + '(?![\\w])', 'i').test(text);
}
/** A new message → everyone else in that conversation. A private message, a group or an @mention counts as "direct". */
function pushChat_(ss, me, channel, text, photo) {
  const c = channels_(ss, me).find(x => x.id === channel) || (/^dm-/.test(channel) ? { id: channel, kind: 'dm', name: me.name, who: '' } : null); if (!c) return;
  const people = rows_(ss, 'People').filter(r => r[0] && r[9] && truthy_(r[7]) && String(r[9]) !== me.id);
  const ids = c.kind === 'dm' ? channel.split('-').slice(1).filter(x => x !== me.id) : c.kind === 'group' ? (c.memberIds || []).filter(x => x !== me.id)
    : people.filter(r => chatSees_({ role: String(r[2]) }, c.who)).map(r => String(r[9]));
  const direct = c.kind !== 'channel', who = me.name.split(' ')[0], all = rows_(ss, 'People');
  push_(ss, ids.map(uid => { const r = people.find(x => String(x[9]) === uid), m = !direct && r && mentions_(text, String(r[0]), all);
    return { uid, kind: 'msg', direct: direct || m, title: m ? who + ' mentioned you in # ' + c.name : c.kind === 'dm' ? me.name : c.kind === 'group' ? who + ' · ' + c.name : '# ' + c.name + ' · ' + who,
      body: text ? text.slice(0, 200) : '📷 Photo', url: '?go=chat:' + channel, tag: 'chat-' + channel }; }));
}

/* ============================================================
   "Last active": kept in the script cache (cheap, every request) and written to People › Last active at most every 10 minutes.
   Anyone can hide theirs (My view › Show when I'm active); you always see your own.
   ============================================================ */
function touch_(ss, me) {
  if (!me || !me.id) return;
  try {
    const c = CacheService.getScriptCache(), now = Date.now();
    if (now - Number(c.get('seen_' + me.id) || 0) < 30000) return;
    c.put('seen_' + me.id, String(now), 21600);
    if (now - Number(c.get('seenp_' + me.id) || 0) < 600000) return;
    c.put('seenp_' + me.id, String(now), 21600);
    const sh = ss.getSheetByName('People'); if (sh.getLastColumn() < TABS.People.length) buildTab_(ss, 'People');
    const i = colValues_(sh, 1).indexOf(me.name); if (i >= 1) sh.getRange(i + 1, 12).setValue(new Date(now));
  } catch (e) {}
}
function activeMap_(ss, me) {
  const live = rows_(ss, 'People').filter(r => r[0] && r[9] && truthy_(r[7])), out = {};
  let c = {}; try { c = CacheService.getScriptCache().getAll(live.map(r => 'seen_' + r[9])); } catch (e) {}
  live.forEach(r => { const id = String(r[9]); if (id !== me.id && !pushPrefs_(r).active) return; const ms = Math.max(Number(c['seen_' + id] || 0), toMs_(r[11])); if (ms) out[id] = ms; });
  return out;
}

/* ============================================================
   The code finds each column by its position. If someone drags a column on the People tab
   to a new place, sign-in and setup would read (and write) the wrong columns – so:
   every request checks the order and stops with a clear message, and Setup puts the columns back.
   ============================================================ */
function peopleOk_(ss) {
  const sh = ss.getSheetByName('People'); if (!sh || !sh.getLastColumn()) return;
  const want = TABS.People, have = sh.getRange(1, 1, 1, Math.min(sh.getLastColumn(), want.length)).getValues()[0].map(x => String(x).trim());
  if (have.some((h, i) => h !== want[i]) && have.some(h => want.indexOf(h) >= 0 && want.indexOf(h) !== have.indexOf(h)))
    throw new Error('The People tab\'s columns have been moved, so names and codes can\'t be checked. Ask the organizer to run Dashboard › 1. Set up – it puts them back.');
}
/** Puts the tab's known columns back in their standard order (by header name); unknown extra columns go after them. */
function fixColumns_(ss, name) {
  const sh = ss.getSheetByName(name), want = TABS[name]; if (!sh || sh.getLastRow() < 1) return false;
  const nc = sh.getLastColumn(), nr = sh.getLastRow(), v = sh.getRange(1, 1, nr, nc).getValues(), head = v[0].map(x => String(x).trim());
  if (want.every((h, i) => i >= nc || head[i] === h || head[i] === '')) return false;   // already right (or only missing new columns)
  const order = want.map(h => head.indexOf(h)), extra = head.map((h, i) => i).filter(i => order.indexOf(i) < 0);
  const cols = order.concat(extra);
  sh.getRange(1, 1, nr, Math.max(nc, cols.length)).setValues(v.map(r => cols.map((j, k) => j < 0 ? (k < want.length && r === v[0] ? want[k] : '') : r[j])));
  return true;
}

/* ============================================================
   Live Messages (v3.4): the team-chat Cloudflare Worker holds conversations; this sheet vouches for who's who.
   chatTicket – a signed 24-hour chat pass for the signed-in person (and keeps the service's list of people current)
   chatPush   – the service asks for notifications; this sheet knows everyone's settings and phones
   ============================================================ */
function chatLive_(ss) { return !!(setting_(ss, 'Chat service address') && setting_(ss, 'Chat service secret')); }
function b64u_(bytes) { return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ''); }
// UTF-8 on both sides: Google's default text encoding differs from Cloudflare's for anything beyond plain letters (dashes, accents, emoji).
function chatSign_(secret, text) { return b64u_(Utilities.computeHmacSha256Signature(String(text), String(secret), Utilities.Charset.UTF_8)); }
function chatTierOf_(role) { return role === 'Organizer' ? 2 : 1; }
function chatRoster_(ss) {
  const ppl = rows_(ss, 'People').filter(r => r[0] && r[9]);
  const seed = ss.getSheetByName('Channels') ? rows_(ss, 'Channels').filter(r => r[0] && r[1]).map(r => ({ id: String(r[0]), name: String(r[1]), kind: String(r[2] || 'channel'), members: String(r[3] || ''), who: /organi/i.test(String(r[4] || '')) ? 'Organizers' : 'Everyone', by: String(r[5] || '') })) : [];
  return { space: 'family', relay: setting_(ss, 'App web address'), photoDays: Number(setting_(ss, 'Delete chat photos after (days)')) || 60,
    rules: { makeChannel: 2, editChannel: 2, deleteAny: 2, deleteOwn: true, whoLabels: { 0: 'Everyone', 2: 'Organizers' }, channelHint: 'Only organizers can make channels – start a group instead' },
    people: ppl.map(r => ({ id: String(r[9]), name: String(r[0]), tier: chatTierOf_(String(r[2])), ro: String(r[2]) === 'Viewer', active: truthy_(r[7]) })), channels: seed };
}
function chatPost_(ss, path, obj) {
  const url = setting_(ss, 'Chat service address').replace(/\/+$/, '') + '/s/family/' + path, body = JSON.stringify(obj);
  const res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json; charset=utf-8', payload: Utilities.newBlob(body).getBytes(), headers: { 'x-sig': chatSign_(setting_(ss, 'Chat service secret'), body) }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('The chat service answered ' + res.getResponseCode() + ' – check Settings › Chat service address and secret');
  return JSON.parse(res.getContentText());
}
function chatSyncRoster_(ss, force) {
  const r = chatRoster_(ss), c = CacheService.getScriptCache();
  const h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(r.people) + JSON.stringify(r.rules) + r.relay));
  if (!force && c.get('chatRoster') === h) return;
  chatPost_(ss, 'roster', r); c.put('chatRoster', h, 21600);
}
function chatTicket(key) {
  memoReset_(false);
  const ss = SpreadsheetApp.getActive(), me0 = whoIs_(ss, key); if (!me0) throw new Error('unauthorized');
  if (!chatLive_(ss)) throw new Error('Live chat isn\'t set up (Settings › Chat service address)');
  const me = chatMe_(ss, me0); if (!me.id) throw new Error('You need a chat ID – ask the organizer to run Dashboard › 1. Set up.');
  touch_(ss, me); chatSyncRoster_(ss);
  const exp = Math.floor(Date.now() / 1000) + 86400, body = b64u_(Utilities.newBlob(JSON.stringify({ s: 'family', u: me.id, n: me.name, t: chatTierOf_(me.role), ro: me.role === 'Viewer', e: exp })).getBytes());
  return { ok: true, url: setting_(ss, 'Chat service address').replace(/\/+$/, ''), space: 'family', ticket: body + '.' + chatSign_(setting_(ss, 'Chat service secret'), body), exp };
}
/** Called by the chat service after a message: notify the people it lists (their settings and @mentions apply). */
function chatPush(payload, sig) {
  const ss = SpreadsheetApp.getActive(), secret = setting_(ss, 'Chat service secret');
  if (!secret || !payload || chatSign_(secret, String(payload)) !== String(sig || '')) throw new Error('bad signature');
  const p = JSON.parse(payload); if (Math.abs(Date.now() - Number(p.at || 0)) > 300000) throw new Error('too old');
  memoReset_(false);
  const all = rows_(ss, 'People'), byId = {}; all.forEach(r => { if (r[9]) byId[String(r[9])] = String(r[0]); });
  const direct = p.kind !== 'channel', who = String(p.from && p.from.name || '').split(' ')[0], text = String(p.text || '');
  push_(ss, (p.to || []).filter(uid => byId[uid]).map(uid => { const m = !direct && mentions_(text, byId[uid], all);
    return { uid, kind: 'msg', direct: direct || m, title: m ? who + ' mentioned you in # ' + p.name : direct ? (p.kind === 'group' ? who + ' · ' + p.name : String(p.from.name)) : '# ' + p.name + ' · ' + who,
      body: text ? text.slice(0, 200) : '📷 Photo', url: '?go=chat:' + p.ch, tag: 'chat-' + p.ch }; }));
  return { ok: true };
}
