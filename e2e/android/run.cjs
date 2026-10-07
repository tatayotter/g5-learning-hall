// Offline play in the real Android app, driven through the WebView's debugging socket
// (Playwright's _android). Runs in .github/workflows/android-e2e.yml against a local Supabase
// and `next start`, reached from the emulator through `adb reverse` on localhost:3000/:54321.
// "No internet" = airplane mode (the app and WebView see no connection) plus removing the
// reverse ports (so nothing can actually reach the server).
//
// Covers: both players log in online; Alpha plays a main quest and a trainer battle (with a
// potion) offline; the app cold-starts offline; Alpha logs out and Bravo logs in offline with
// a PIN (a wrong one refused) and plays a quest; back online, Bravo's PIN prompt, then each
// player's play syncs to their own account. Exits non-zero on the first failed check.
const { _android } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');

const PKG = 'com.tatayotter.learninghall';
const SHOTS = process.env.SHOTS_DIR || 'e2e-android-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const sh = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
const sql = (q) => sh(`docker exec ${process.env.DB_CONTAINER} psql -U postgres -At -c "${q.replace(/"/g, '\\"')}"`);
let failed = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
};

(async () => {
  const [device] = await _android.devices();
  if (!device) throw new Error('no emulator');
  let page;
  const shot = async (name) => { try { await page.screenshot({ path: `${SHOTS}/${name}.png` }); } catch { /* best-effort */ } };
  const body = async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');
  const attach = async () => {
    const webview = await device.webView({ pkg: PKG }, { timeout: 120000 });
    page = await webview.page();
    page.on('dialog', d => d.dismiss().catch(() => {}));
  };
  const launch = async () => {
    await device.shell(`am force-stop ${PKG}`);
    await device.shell(`am start -n ${PKG}/.MainActivity`);
    await sleep(3000);
    await attach();
  };
  const online = async () => {
    await device.shell('cmd connectivity airplane-mode disable');
    sh('adb reverse tcp:3000 tcp:3000'); sh('adb reverse tcp:54321 tcp:54321');
    await sleep(4000);
  };
  const offline = async () => {
    sh('adb reverse --remove-all');
    await device.shell('cmd connectivity airplane-mode enable');
    await sleep(4000);
  };
  const dismiss = async () => {
    for (const name of [/skip/i, /got it/i, /^close$/i, /not now/i, /later/i]) {
      const b = page.getByRole('button', { name }).first();
      if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
    }
  };
  const onSplash = () => page.getByText(/Choose your hero/i).first().waitFor({ timeout: 90000 });
  const inGame = async () => {
    await page.getByRole('button', { name: 'Open navigation menu' }).waitFor({ timeout: 120000 });
    await sleep(4000); await dismiss(); await sleep(800); await dismiss();
  };
  const typePin = async (pin) => {
    await page.locator('input[type=password]').fill(pin);
    await page.locator('button[type=submit]').first().click();
  };
  const pickHero = (name) => page.locator('button', { hasText: name }).first().click();
  const logout = async () => {
    await dismiss();
    await page.getByRole('button', { name: 'Open navigation menu' }).click(); await sleep(1000);
    await page.getByRole('button', { name: /Logout/ }).first().click(); await sleep(1000);
    const alerts = (await page.locator('[role=alert]').allInnerTexts()).map(a => a.replace(/\s+/g, ' ')).filter(Boolean);
    await page.getByRole('button', { name: /^Logout$/ }).last().click();
    await onSplash(); await sleep(1500);
    return alerts;
  };
  const termReady = (id) => page.waitForFunction(id => localStorage.getItem('lh_answer_key_' + id) && localStorage.getItem('lh_term_questions_' + id), id, { timeout: 180000 });
  const queued = (kind, id) => page.evaluate(([kind, id]) => JSON.parse(localStorage.getItem(`lh_${kind}_outbox_${id}`) || '[]').length, [kind, id]);
  const playQuest = async () => {
    await page.getByText(/start quest/i).first().click();
    const ready = page.getByRole('button', { name: 'I Am Ready To Fight' });
    await ready.waitFor({ timeout: 20000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('I Am Ready To Fight') && !b.disabled), null, { timeout: 90000 });
    await ready.click();
    await page.getByRole('button', { name: 'Start Exam' }).click();
    await sleep(2000);
    await page.locator('button.qopt', { has: page.locator('.qopt-text', { hasText: /^4$/ }) }).first().click();
    await page.locator('button.qopt', { has: page.locator('.qopt-text', { hasText: /^5$/ }) }).first().click();
    await page.getByRole('button', { name: /Submit Quiz/ }).click();
    await sleep(5000);
    const text = await body();
    for (const name of [/continue/i, /back to/i, /return/i, /close/i]) {
      const b = page.getByRole('button', { name }).first();
      if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await sleep(1200); }
    }
    return text;
  };
  const playBattle = async () => {
    await page.evaluate(() => sessionStorage.setItem('activeTab', 'monster'));
    await page.reload(); await sleep(8000); await dismiss(); await sleep(800); await dismiss();
    await page.getByRole('button', { name: 'Open Curio Arena menu' }).click(); await sleep(1000);
    await page.getByText('Trainers', { exact: true }).first().click(); await sleep(2000);
    await page.locator('div.rounded-2xl', { hasText: 'Forest Scout' }).last().getByRole('button', { name: /^Battle!$/ }).first().click();
    await sleep(3000);
    let rounds = 0, itemUsed = false;
    while (rounds < 400) {
      const text = await page.evaluate(() => document.body.innerText);
      if (/Continue/.test(text) && /(Victory|Defeat|won|lost)/i.test(text)) break;
      const prompt = (text.match(/What is 2\+(\d)\?/) || [])[1];
      if (prompt) {
        const ans = String(2 + Number(prompt));
        const b = page.getByRole('button', { name: new RegExp('^[A-D]?\\s*' + ans + '$') }).first();
        if (await b.isVisible().catch(() => false)) { await b.click({ timeout: 3000 }).catch(() => {}); await sleep(1300); rounds++; continue; }
      }
      const rd = page.locator('.bintro-ready button, .bintro-ready [role=button], .bintro-ready > *').first();
      if (await rd.isVisible().catch(() => false)) { await rd.click({ timeout: 3000, force: true }).catch(() => {}); await sleep(1500); rounds++; continue; }
      if (!itemUsed && rounds >= 3) {
        const items = page.getByRole('button', { name: /^Items/ }).first();
        if (await items.isVisible().catch(() => false)) {
          await items.click({ timeout: 3000 }).catch(() => {}); await sleep(800);
          await page.getByRole('button', { name: /Health Potion/ }).first().click({ timeout: 3000 }).catch(() => {});
          itemUsed = true; await sleep(2500); rounds++; continue;
        }
      }
      const skill = page.getByRole('button', { name: /Gloom Rake/ }).first();
      if (await skill.isVisible().catch(() => false)) { await skill.click({ timeout: 3000 }).catch(() => {}); await sleep(800); rounds++; continue; }
      await sleep(600); rounds++;
    }
    const end = await body();
    await shot('05-battle-end');
    await page.getByRole('button', { name: /Continue/ }).first().click().catch(() => {});
    await sleep(2500);
    return end;
  };

  // ---- Online: both players log in once on this phone.
  await online();
  await launch();
  await onSplash();
  await shot('01-hero-select');
  await pickHero('Bravo'); await typePin('5678'); await inGame(); await termReady('playertwo');
  await logout();
  await pickHero('Alpha'); await typePin('1234'); await inGame(); await termReady('playerone');
  check(await page.evaluate(() => ['playerone', 'playertwo'].every(id => !!localStorage.getItem('lh_device_hero_' + id))), 'both players can now log in offline here');
  await shot('02-online-board');

  // ---- Offline: a main quest and a trainer battle.
  await offline();
  const questText = await playQuest();
  check(/Quest Completed/i.test(questText), 'offline main quest completes');
  check(/Saved here for now/.test(questText), 'quest result says it is saved here');
  await shot('03-quest-offline');
  const battleEnd = await playBattle();
  check(/victory/i.test(battleEnd), 'offline trainer battle won');
  check(await queued('trainer', 'playerone') === 1, 'battle waiting to save');
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('lh_offline_read_playerone_inventory') || '{"value":{}}').value.health_potion) === 2, 'potion came off the copy here');

  // ---- Cold start with no internet.
  await launch();
  await inGame();
  const banner = await body();
  check(/No internet/.test(banner), 'app opens offline from a cold start', (banner.match(/No internet[^.!]*[.!]/) || [''])[0]);
  check(/2 waiting to save/.test(banner), 'still 2 waiting after the restart');
  await shot('04-cold-start-offline');

  // ---- Switch players offline.
  const alerts = await logout();
  check(alerts.some(a => /No internet/.test(a)) && alerts.some(a => /saved to your account yet/.test(a)), 'logout warns about no internet and unsaved play');
  const splash = await body();
  check(/played here before can still log in/.test(splash) && /Bravo/.test(splash) && /2 waiting to save/.test(splash), 'offline hero list shows both, with what is waiting');
  await shot('06-offline-hero-select');
  await pickHero('Bravo'); await typePin('0000'); await sleep(3000);
  check(/Incorrect password/.test(await body()), 'wrong PIN refused offline');
  await typePin('5678'); await inGame();
  check(/Saved here for now/.test(await playQuest()), 'Bravo plays a quest offline');

  // ---- Back online: Bravo confirms the PIN, then each player's play saves to them.
  await online();
  await page.getByText(/The internet is back/).waitFor({ timeout: 60000 }).then(() => check(true, 'back online, the PIN prompt explains why'), () => check(false, 'back online, the PIN prompt explains why'));
  await shot('07-relink');
  await typePin('5678'); await inGame(); await sleep(8000);
  check(await queued('quest', 'playertwo') === 0, "Bravo's quest saved");
  await logout();
  await pickHero('Alpha'); await typePin('1234'); await inGame(); await sleep(10000);
  check(await queued('quest', 'playerone') === 0 && await queued('trainer', 'playerone') === 0, "Alpha's quest and battle saved");
  await shot('08-synced');

  const events = sql("select user_id || ':' || event_type from player_events where user_id in ('playerone','playertwo') order by id").split('\n');
  console.log('server events:', events);
  check(events.includes('playerone:main_quest_offline') && events.includes('playerone:trainer_offline') && events.includes('playertwo:main_quest_offline'), 'server has each player\'s own play');
  check(sql("select won::text || ':' || coalesce(problem, 'none') from offline_battle_logs where user_id = 'playerone'") === 'true:none', 'battle log checked clean, win counted');
  check(sql("select quantity from player_inventory where app_user_id = 'playerone' and item_key = 'health_potion'") === '2', 'potion taken off the real inventory');

  console.log(failed ? `${failed} check(s) failed` : 'All checks passed');
  process.exit(failed ? 1 : 0);
})().catch(async (e) => { console.error(e); process.exit(1); });
