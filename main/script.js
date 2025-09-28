/* ---------- Utility & port of Python logic into JS ---------- */

let users = {};

fetch("users.txt")
  .then(res => res.text())
  .then(text => {
    text.split("\n").forEach(line => {
      const [u, p] = line.trim().split(":");
      if (u && p) users[u] = p;
    });
  })
  .catch(err => console.error("Nepodarilo sa načítať users.txt", err));

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById('loginOverlay');
  const userInput = document.getElementById('loginUser');
  const passInput = document.getElementById('loginPass');
  const loginBtn = document.getElementById('loginBtn');
  const msg = document.getElementById('loginMsg');
  const loggedUser = document.getElementById('loggedUser');

  // Nastav tu svoje prihlasovacie údaje:
  const correctUser = "admin";
  const correctPass = "1234";

  loginBtn.addEventListener("click", checkLogin);
  passInput.addEventListener("keydown", e => { if (e.key === "Enter") checkLogin(); });

  function checkLogin() {
    const u = userInput.value.trim();
    const p = passInput.value;

    if (users[u] && users[u] === p) {
      overlay.style.display = "none";
      loggedUser.textContent = `Logged in as: ${u}`;
      loggedUser.style.display = "inline-block";
    } else {
      msg.textContent = "Wrong username or password!";
    }
  }

});


/* Poisson sampler (Knuth) */
function samplePoisson(lambda) {
  if (lambda <= 0) return 0;
  // For larger lambda, use approximation (normal) for performance
  if (lambda > 50) {
    // approximate by normal with mean=lambda and var=lambda
    const std = Math.sqrt(lambda);
    let x = Math.round(randomNormal(lambda, std));
    return Math.max(0, x);
  }
  let L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  while (p > L) {
    k++;
    p *= Math.random();
    // safety
    if (k > 1000) break;
  }
  return Math.max(0, k - 1);
}
function randomNormal(mu=0, sigma=1) {
  // Box-Muller
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return mu + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
function updatePickOptions() {
    const homeTeam = document.getElementById('homeSelect').value;
    const awayTeam = document.getElementById('awaySelect').value;
    const pickSelect = document.getElementById('pick');
    pickSelect.options[0].text = `${homeTeam}`;
    pickSelect.options[1].text = 'Draw';
    pickSelect.options[2].text = `${awayTeam}`;
}


/* clamp helper */
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

/* parse teams from input text (Python-like parser) */
function parseTeams(text) {
  const blocks = text.trim().split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const teams = {};
  for (const blk of blocks) {
    const lines = blk.split(/\n/).map(l=>l.trim()).filter(Boolean);
    let name = null;
    const data = {};
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx+1).trim();
      if (key.toLowerCase() === 'team') { name = val; }
      else {
        // parse int fallback to 0
        const n = parseInt(val, 10);
        data[key] = isNaN(n) ? 0 : n;
      }
    }
    if (name) {
      teams[name] = data;
    }
  }
  return teams;
}

/* serialize teams to text like original */
function teamsToText(teams) {
  return Object.entries(teams).map(([name, data]) => {
    let out = `Team: ${name}\n`;
    for (const k in data) out += `${k}: ${data[k]}\n`;
    return out;
  }).join('\n');
}

/* ELO-based odds calculation (port of vypocitaj_kurzy) */
function calcOdds(st1, st2) {
  const elo1 = (st1.elo !== undefined) ? st1.elo : 1000;
  const elo2 = (st2.elo !== undefined) ? st2.elo : 1000;
  // ZNÍŽENIE vplyvu ELO rozdielu: namiesto 400 použijeme 650
  const EA = 1 / (1 + Math.pow(10, (elo2 - elo1)/650));
  const EB = 1 / (1 + Math.pow(10, (elo1 - elo2)/650));
  let k1 = clamp(round2(1 / EA), 1.01, 150);
  let k2 = clamp(round2(1 / EB), 1.01, 150);
  // Home advantage: only if home team is not much weaker
  let HOME_ADV_PERC = 0.12;
  if (elo1 < elo2 * 0.5) HOME_ADV_PERC = 0.02; // 2% advantage for very weak home team
  k1 = round2(k1 * (1 - HOME_ADV_PERC));
  k2 = round2(k2 * (1 + HOME_ADV_PERC));
  // Ensure odds cannot go below 1.00
  k1 = Math.max(k1, 1.01);
  k2 = Math.max(k2, 1.01);
  const kX = round2(((k1 + k2) / 1.7)+1);
  return { home: k1, draw: kX, away: k2 };
}
function round2(n){ return Math.round(n*100)/100; }

/* expected goals heuristic (port expecting log base 1.25) */
function expectedGoals(elo1, elo2) {
  const max_goly = 29;
  const min_goly = 0.8;
  const ratio = (elo1 + 1) / (elo2 + 1);
  // log base 1.25 -> Math.log(ratio)/Math.log(1.25)
  let g1 = Math.log(Math.max(1e-8, ratio)) / Math.log(1.25);
  let g2 = Math.log(Math.max(1e-8, 1/ratio)) / Math.log(1.25);
  // ZVÝŠENIE OČAKÁVANÝCH GÓLOV
  g1 *= 2.6;
  g2 *= 2.1;
  g1 = clamp(g1, min_goly, max_goly);
  g2 = clamp(g2, min_goly, max_goly);
  return [g1, g2];
}

/* minute sampling without replacement */
function sampleMinutes(count, totalMinutes) {
  const pool = Array.from({length: totalMinutes}, (_, i) => i+1);
  const out = [];
  count = Math.max(0, Math.min(count, pool.length));
  for (let i=0;i<count;i++){
    const idx = Math.floor(Math.random()*pool.length);
    out.push(pool.splice(idx,1)[0]);
  }
  out.sort((a,b)=>a-b);
  return out;
}

/* ---------- App state & helpers ---------- */
let TEAMS = {};
const LS_KEY = 'sim_teams_v1';
const LS_BAL = 'sim_balance_v1';

function saveTeamsToStorage(){ localStorage.setItem(LS_KEY, JSON.stringify(TEAMS)); }
function loadTeamsFromStorage(){ 
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) TEAMS = JSON.parse(raw);
  } catch(e){}
}
function saveBalance(b){ localStorage.setItem(LS_BAL, String(b)); }
function loadBalance(){ const b = parseFloat(localStorage.getItem(LS_BAL)); return isNaN(b)?10000:b; }

function populateSelects(){
  const home = document.getElementById('homeSelect');
  const away = document.getElementById('awaySelect');
  home.innerHTML=''; away.innerHTML='';
  Object.keys(TEAMS).forEach(name=>{
    const o1 = document.createElement('option'); o1.value = name; o1.textContent = name;
    const o2 = document.createElement('option'); o2.value = name; o2.textContent = name;
    home.appendChild(o1); away.appendChild(o2);
  });
}

function showMessage(status, lostOrWon, balance, isWin) {
  const box = document.getElementById('messageBox');
  const inner = box.querySelector('.innerBox');

  inner.classList.remove('win', 'loss');
  inner.classList.add(isWin ? 'win' : 'loss');

  document.getElementById('line1').textContent = status;
  document.getElementById('line2').textContent = lostOrWon;
  document.getElementById('line3').textContent = `Balance: ${balance} €`;

  // zmeníme text v spodnom riadku
  box.querySelector('.hint').textContent = "Press any key to continue";

  box.classList.add('show');
  box.style.display = 'flex';
  box.focus();

  function keyHandler(e) {
    // zachytí ľubovoľnú klávesu
    box.classList.remove('show');
    box.classList.add('hide');
    setTimeout(() => {
      box.style.display = 'none';
      box.classList.remove('hide');
    }, 600);

    document.removeEventListener('keydown', keyHandler);
  }

  document.addEventListener('keydown', keyHandler);
}



/* ---------- Default teams sample ---------- */
const defaultText = `
Team: MŠK Žilina 
elo: 999
goals_scored: 12 
goals_conceded: 4
yellow: 73       
red: 8
win: 5
draw: 1
loss: 0

Team: FK Železiarne Podbrezová
elo: 987
goals_scored: 12
goals_conceded: 6
yellow: 73
red: 8
win: 4
draw: 1
loss: 1

Team: FC Spartak Trnava
elo: 980
goals_scored: 11
goals_conceded: 4
yellow: 73
red: 8
win: 4
draw: 0
loss: 2

Team: MFK Ružomberok
elo: 967
goals_scored: 13
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 2
loss: 1

Team: FC Petržalka
elo: 960
goals_scored: 13
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 2
loss: 1

Team: ŠK Slovan Bratislava
elo: 955
goals_scored: 16
goals_conceded: 6
yellow: 73
red: 8
win: 3
draw: 1
loss: 2

Team: FC TATRAN Prešov
elo: 945
goals_scored: 8
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 0
loss: 3

Team: MFK Dukla Banská Bystrica
elo: 938
goals_scored: 7
goals_conceded: 10
yellow: 73
red: 8
win: 2
draw: 2
loss: 2

Team: FK DAC 1904 Dunajská Streda
elo: 935
goals_scored: 10
goals_conceded: 7
yellow: 73
red: 8
win: 2
draw: 1
loss: 3

Team: MFK Zemplín Michalovce
elo: 920
goals_scored: 9
goals_conceded: 10
yellow: 73
red: 8
win: 2
draw: 1
loss: 3

Team: FC KOŠICE
elo: 917
goals_scored: 6
goals_conceded: 10
yellow: 73
red: 8
win: 2
draw: 1
loss: 3

Team: AS Trenčín
elo: 914
goals_scored: 13
goals_conceded: 14
yellow: 73
red: 8
win: 2
draw: 0
loss: 4

Team: MŠK FOMAT Martin
elo: 911
goals_scored: 6
goals_conceded: 11
yellow: 73
red: 8
win: 0
draw: 2
loss: 4

Team: FK POHRONIE Žiar nad Hronom
elo: 900
goals_scored: 3
goals_conceded: 30
yellow: 73
red: 8
win: 0
draw: 0
loss: 6

Team: FK Poprad
elo: 499
goals_scored: 13
goals_conceded: 2
yellow: 73
red: 8
win: 5
draw: 1
loss: 0

Team: MFK Skalica
elo: 499
goals_scored: 25
goals_conceded: 3
yellow: 73
red: 8
win: 6
draw: 1
loss: 0

Team: FC ViOn Zlaté Moravce
elo: 495
goals_scored: 19
goals_conceded: 9
yellow: 73
red: 8
win: 5
draw: 1
loss: 1

Team: FK Nitra
elo: 490
goals_scored: 17
goals_conceded: 14
yellow: 73
red: 8
win: 3
draw: 2
loss: 2

Team: MFK Dukla Banská Bystrica B
elo: 490
goals_scored: 95
goals_conceded: 0
yellow: 73
red: 8
win: 7
draw: 0
loss: 0

Team: FK Spartak Dubnica nad Váhom
elo: 487
goals_scored: 21
goals_conceded: 7
yellow: 73
red: 8
win: 3
draw: 2
loss: 1

Team: MFK Zvolen
elo: 485
goals_scored: 13
goals_conceded: 4
yellow: 73
red: 8
win: 5
draw: 0
loss: 1

Team: MŠK Tesla Stropkov
elo: 481
goals_scored: 11
goals_conceded: 7
yellow: 73
red: 8
win: 4
draw: 1
loss: 1

Team: MŠK Púchov
elo: 481
goals_scored: 7
goals_conceded: 3
yellow: 73
red: 8
win: 3
draw: 2
loss: 1

Team: MŠK NOVOHRAD Lučenec
elo: 480
goals_scored: 17
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 1
loss: 2

Team: FC ŠTK 1914 Šamorín
elo: 480
goals_scored: 16
goals_conceded: 23
yellow: 73
red: 8
win: 3
draw: 1
loss: 3

Team: MFK Tatran Liptovský Mikuláš
elo: 477
goals_scored: 17
goals_conceded: 5
yellow: 73
red: 8
win: 3
draw: 3
loss: 0

Team: FK Humenné
elo: 474
goals_scored: 15
goals_conceded: 12
yellow: 73
red: 8
win: 4
draw: 1
loss: 1

Team: SLAVOJ TREBIŠOV
elo: 470
goals_scored: 13
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 2
loss: 2

Team: FK Dúbravka
elo: 470
goals_scored: 14
goals_conceded: 19
yellow: 73
red: 8
win: 2
draw: 3
loss: 2

Team: FK Spišská Nová Ves
elo: 468
goals_scored: 11
goals_conceded: 11
yellow: 73
red: 8
win: 3
draw: 1
loss: 2

Team: OK Častkovce
elo: 466
goals_scored: 17
goals_conceded: 22
yellow: 73
red: 8
win: 3
draw: 0
loss: 4

Team: FKM Karlova Ves Bratislava
elo: 460
goals_scored: 9
goals_conceded: 8
yellow: 73
red: 8
win: 3
draw: 0
loss: 3

Team: MŠK Námestovo
elo: 454
goals_scored: 16
goals_conceded: 11
yellow: 73
red: 8
win: 3
draw: 1
loss: 2

Team: MFK Snina
elo: 449
goals_scored: 10
goals_conceded: 18
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: SDM Domino
elo: 449
goals_scored: 20
goals_conceded: 16
yellow: 73
red: 8
win: 2
draw: 2
loss: 2

Team: KFC Komárno futbal
elo: 447
goals_scored: 12
goals_conceded: 15
yellow: 73
red: 8
win: 2
draw: 2
loss: 2

Team: FK Senica
elo: 445
goals_scored: 12
goals_conceded: 12
yellow: 73
red: 8
win: 1
draw: 4
loss: 2

Team: FK Inter Bratislava
elo: 441
goals_scored: 15
goals_conceded: 17
yellow: 73
red: 8
win: 2
draw: 1
loss: 3

Team: FK Lokomotíva Trnava
elo: 438
goals_scored: 12
goals_conceded: 16
yellow: 73
red: 8
win: 2
draw: 0
loss: 5

Team: MFK Dolný Kubín
elo: 437
goals_scored: 4
goals_conceded: 12
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: FC LOKOMOTÍVA KOŠICE
elo: 430
goals_scored: 6
goals_conceded: 16
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: MŠK Senec
elo: 428
goals_scored: 4
goals_conceded: 11
yellow: 73
red: 8
win: 0
draw: 3
loss: 4



Team: MFK Vranov nad Topľou
elo: 421
goals_scored: 4
goals_conceded: 10
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: MŠK Považská Bystrica
elo: 419
goals_scored: 2
goals_conceded: 27
yellow: 73
red: 8
win: 1
draw: 0
loss: 6

Team: FK GALAKTIK
elo: 416
goals_scored: 8
goals_conceded: 19
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: Partizán Bardejov BŠK
elo: 409
goals_scored: 5
goals_conceded: 16
yellow: 73
red: 8
win: 0
draw: 2
loss: 4

Team: MŠK Kysucké Nové Mesto
elo: 226
goals_scored: 44
goals_conceded: 4
yellow: 73
red: 8
win: 8
draw: 0
loss: 0

Team: TJ Tatran Krásno nad Kysucou
elo: 222
goals_scored: 32
goals_conceded: 4
yellow: 73
red: 8
win: 6
draw: 0
loss: 1

Team: MFK Bytča
elo: 210
goals_scored: 16
goals_conceded: 9
yellow: 73
red: 8
win: 4
draw: 0
loss: 2

Team: FK ATTACK Vrútky
elo: 182
goals_scored: 23
goals_conceded: 12
yellow: 73
red: 8
win: 5
draw: 0
loss: 3

Team: ŠK Prameň Kováčová
elo: 174
goals_scored: 24
goals_conceded: 20
yellow: 73
red: 8
win: 4
draw: 1
loss: 3

Team: FK Čadca
elo: 160
goals_scored: 20
goals_conceded: 27
yellow: 73
red: 8
win: 4
draw: 0
loss: 4

Team: FA UNITED NKLG
elo: 155
goals_scored: 20
goals_conceded: 27
yellow: 73
red: 8
win: 2
draw: 2
loss: 4

Team: MFK Detva
elo: 143
goals_scored: 14
goals_conceded: 22
yellow: 73
red: 8
win: 3
draw: 0
loss: 5

Team: FK BREZNO
elo: 141
goals_scored: 22
goals_conceded: 33
yellow: 73
red: 8
win: 3
draw: 2
loss: 3

Team: MFK Nová Baňa
elo: 130
goals_scored: 13
goals_conceded: 31
yellow: 73
red: 8
win: 4
draw: 0
loss: 4


Team: MŠK Rimavská Sobota
elo: 127
goals_scored: 15
goals_conceded: 18
yellow: 73
red: 8
win: 2
draw: 1
loss: 4

Team: OFK Hôrky
elo: 120
goals_scored: 14
goals_conceded: 36
yellow: 73
red: 8
win: 2
draw: 1
loss: 5

Team: Oravan Oravská Jasenica
elo: 111
goals_scored: 17
goals_conceded: 20
yellow: 73
red: 8
win: 2
draw: 0
loss: 6

Team: TJ JEDNOTA Bánová
elo: 107
goals_scored: 10
goals_conceded: 43
yellow: 73
red: 8
win: 1
draw: 1
loss: 5

Team: ŠK SÁSOVÁ
elo: 41
goals_scored: 2
goals_conceded: 75
yellow: 73
red: 8
win: 0
draw: 0
loss: 8
`;

/* ---------- Main simulation logic (port of simuluj_zapas) ---------- */
function simulateMatch(homeName, awayName, speed = 0, onMinute=null) {
  const st1 = TEAMS[homeName];
  const st2 = TEAMS[awayName];
  if (!st1 || !st2) throw new Error('Teams do not exist');

  // expected goals
  let [exp_g1, exp_g2] = expectedGoals(st1.elo||1000, st2.elo||1000);

  // small home advantage +15%
  exp_g1 *= 1.15;

  // sample goals by Poisson
  let g1 = samplePoisson(exp_g1);
  let g2 = samplePoisson(exp_g2);
  // 1.8% šanca na prekvapenie: outsider vyhrá, skóre sa nastaví na výhru outsidera
  if (Math.random() < 0.018 && st1.elo !== st2.elo) {
    if (st1.elo > st2.elo) {
      // Home is favorite, force away win
      g2 = Math.max(g1 + 1, g2 + 1); // outsider gets at least one more than favorite
      g1 = Math.min(g1, g2 - 1); // favorite loses
    } else {
      // Away is favorite, force home win
      g1 = Math.max(g2 + 1, g1 + 1);
      g2 = Math.min(g2, g1 - 1);
    }
  }

  // cards
  // Očakávané žlté a červené karty s rozptylom
  const exp_yellow1 = 1.5 + (Math.random()-0.5)*1.5;
  const exp_yellow2 = 2.5 + (Math.random()-0.5)*1.5;
  const yellow1 = samplePoisson(Math.max(0.5, exp_yellow1));
  const yellow2 = samplePoisson(Math.max(0.5, exp_yellow2));
  const exp_red1 = 0.10 + (Math.random()-0.5)*0.05;
  const exp_red2 = 0.12 + (Math.random()-0.5)*0.09;
  const red1 = samplePoisson(Math.max(0, exp_red1));
  const red2 = samplePoisson(Math.max(0, exp_red2));

  const nadstaveny = randInt(1,8);
  const totalM = 90 + nadstaveny;

  function buildEvents() {
    const events = [];
    for (const m of sampleMinutes(g1, totalM)) events.push([m, `⚽ Goal! ${homeName} scored.`]);
    for (const m of sampleMinutes(g2, totalM)) events.push([m, `⚽ Goal! ${awayName} scored.`]);
    for (const m of sampleMinutes(yellow1, totalM)) events.push([m, `🟨 Yellow card for ${homeName}`]);
    for (const m of sampleMinutes(yellow2, totalM)) events.push([m, `🟨 Yellow card for ${awayName}`]);
    for (const m of sampleMinutes(red1, totalM)) events.push([m, `🟥 Red card for ${homeName}`]);
    for (const m of sampleMinutes(red2, totalM)) events.push([m, `🟥 Red card for ${awayName}`]);
    events.sort((a,b)=> a[0]-b[0]);
    return events;
  }
  const events = buildEvents();

  // Stats derivation similar to python
  const strely1 = randInt(4,8) + g1*randInt(2,4);
  const strely2 = randInt(4,8) + g2*randInt(2,4);
  const naBranu1 = randInt(Math.max(g1,0), g1 + randInt(1,6));
  const naBranu2 = randInt(Math.max(g2,0), g2 + randInt(1,4));
  const drzanie1 = (st1.elo > st2.elo) ? randInt(51,75) : randInt(25,49);
  const drzanie2 = 100 - drzanie1;
  const rohy1 = randInt(1,5) + g1;
  const rohy2 = randInt(1,5) + g2;
  const offs1 = randInt(0,3);
  const offs2 = randInt(0,3);
  const fauly1 = randInt(5,12) + yellow1;
  const fauly2 = randInt(7,14) + yellow2;

  // We will animate minute-by-minute if speed>0, otherwise render instantly
  let minute = 0;
  let playInterval = null;

  function renderMinute(m) {
    if (onMinute) onMinute(m, events.filter(e=>e[0]===m).map(e=>e[1]));
  }

  if (speed > 0) {
    return new Promise(resolve=>{
      playInterval = setInterval(()=>{
        minute++;
        renderMinute(minute);
        if (minute >= totalM) {
          clearInterval(playInterval);
          finalize();
        }
      }, speed);
      // safety: if speed small 0 might be immediate
    });
  } else {
    // instant
    for (let m=1;m<=totalM;m++) renderMinute(m);
    return Promise.resolve(finalize());
  }

  function finalize() {
    // update stats in TEAMS
    if (!TEAMS[homeName].win) { // ensure keys exist
      TEAMS[homeName].win = TEAMS[homeName].win || 0;
      TEAMS[homeName].draw = TEAMS[homeName].draw || 0;
      TEAMS[homeName].loss = TEAMS[homeName].loss || 0;
    }
    if (!TEAMS[awayName].win) {
      TEAMS[awayName].win = TEAMS[awayName].win || 0;
      TEAMS[awayName].draw = TEAMS[awayName].draw || 0;
      TEAMS[awayName].loss = TEAMS[awayName].loss || 0;
    }

    if (g1 > g2) {
      TEAMS[homeName].win += 1;
      TEAMS[awayName].loss += 1;
    } else if (g2 > g1) {
      TEAMS[awayName].win += 1;
      TEAMS[homeName].loss += 1;
    } else {
      TEAMS[homeName].draw += 1;
      TEAMS[awayName].draw += 1;
    }

    TEAMS[homeName].goals_scored = (TEAMS[homeName].goals_scored||0) + g1;
    TEAMS[homeName].goals_conceded = (TEAMS[homeName].goals_conceded||0) + g2;
    TEAMS[homeName].yellow = (TEAMS[homeName].yellow||0) + yellow1;
    TEAMS[homeName].red = (TEAMS[homeName].red||0) + red1;

    TEAMS[awayName].goals_scored = (TEAMS[awayName].goals_scored||0) + g2;
    TEAMS[awayName].goals_conceded = (TEAMS[awayName].goals_conceded||0) + g1;
    TEAMS[awayName].yellow = (TEAMS[awayName].yellow||0) + yellow2;
    TEAMS[awayName].red = (TEAMS[awayName].red||0) + red2;

    // prepare result object
    const vys = {
      vysledok: `${homeName} ${g1} - ${g2} ${awayName}`,
      skutocny_tip: g1>g2 ? '1' : g2>g1 ? '2' : 'X',
      statistiky: {
        [homeName]: {
          goly: g1, strely: strely1, "shots on target": naBranu1, "possession": drzanie1,
          rohy: rohy1, offsides: offs1, fauly: fauly1, žlté: yellow1, červené: red1
        },
        [awayName]: {
          goly: g2, strely: strely2, "shots on target": naBranu2, "possession": drzanie2,
          rohy: rohy2, offsides: offs2, fauly: fauly2, žlté: yellow2, červené: red2
        }
      },
      events,
      nadstaveny: nadstaveny
    };
    saveTeamsToStorage();
    return vys;
  }
}

/* helpers */
function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

let selectedPick = null;  // "1", "X", "2"

// Update pick options when team selection changes
document.getElementById('homeSelect').addEventListener('change', updatePickOptions);
document.getElementById('awaySelect').addEventListener('change', updatePickOptions);

document.getElementById('computeOdds').addEventListener('click', () => {
  const h = document.getElementById('homeSelect').value;
  const a = document.getElementById('awaySelect').value;
  if (!h || !a || h === a) return alert('Vyber dva rôzne tímy.');

  const odds = calcOdds(TEAMS[h], TEAMS[a]);
  window.__lastOdds = odds;
  window.__lastTeams = { home: h, away: a };

  // Nastav texty tlačidiel
  document.getElementById('oddsArea').textContent = 'Select your bet:';
  btnHome.textContent = `${h} (${odds.home})`;
  btnDraw.textContent = `Draw (${odds.draw})`;
  btnAway.textContent = `${a} (${odds.away})`;

  // Aktivuj tlačidlá
  [btnHome, btnDraw, btnAway].forEach(b => b.disabled = false);

  document.getElementById('betArea').hidden = false;
});

const btnHome = document.getElementById('btnHome');
const btnDraw = document.getElementById('btnDraw');
const btnAway = document.getElementById('btnAway');

const buttons = document.querySelectorAll('#oddsButtons button');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    // najprv všetkým vynulujeme farbu
    buttons.forEach(b => b.style.backgroundColor = '');
    // kliknutému nastavíme zelenú
    btn.style.backgroundColor = 'green';
  });
});


btnHome.addEventListener('click', () => { selectedPick = '1'; highlight(btnHome); });
btnDraw.addEventListener('click', () => { selectedPick = 'X'; highlight(btnDraw); });
btnAway.addEventListener('click', () => { selectedPick = '2'; highlight(btnAway); });


document.getElementById('placeBet').addEventListener('click', async () => {
  if (!selectedPick) return alert('Najprv klikni na kurz.');
  const pick = selectedPick;
  let stake = parseFloat(document.getElementById('stake').value);
  if (isNaN(stake) || stake < 0.5) return alert('Enter bet, min - 0.5 €');
  if (stake > 10000) return alert('Maximal bet is 10000 €');
  let balance = loadBalance();
  if (stake > balance) return alert('insufficient funds.');

  // lock UI
  document.getElementById('placeBet').disabled = true;
  document.getElementById('computeOdds').disabled = true;
  document.getElementById('playArea').innerHTML = 'Simulating...';
  document.getElementById('resultArea').textContent = 'Simulating...';

  const speed = parseInt(document.getElementById('speed').value, 10);
  const rounds = Math.max(1, Math.min(100, parseInt(document.getElementById('rounds').value,10) || 1));

  // run rounds sequentially
  let homeWins = 0, awayWins = 0, draws = 0, totalGoalsHome = 0, totalGoalsAway = 0;
  let totalYellowHome = 0, totalYellowAway = 0, totalRedHome = 0, totalRedAway = 0;
  for (let r=0;r<rounds;r++){
    // simulate one match
    const home = window.__lastTeams.home;
    const away = window.__lastTeams.away;
    const playArea = document.getElementById('playArea');
    playArea.innerHTML = '';
    let currentEvents = [];
    // callback for minutes
    const onMinute = (m, evs) => {
      const line = document.createElement('div');
      line.textContent = (m>90 ? `90+${m-90}` : `${m}. min`) + ' — ' + (evs.length ? evs.join(' | ') : '');
      playArea.appendChild(line);
      playArea.scrollTop = playArea.scrollHeight;
    };

    const res = await simulateAndRender(home, away, speed, onMinute);
    // Tally results for summary
    const g1 = res.statistiky[home].goly;
    const g2 = res.statistiky[away].goly;
    totalGoalsHome += g1;
    totalGoalsAway += g2;
    totalYellowHome += res.statistiky[home]["zlte karty"] || res.statistiky[home]["žlté"] || 0;
    totalYellowAway += res.statistiky[away]["zlte karty"] || res.statistiky[away]["žlté"] || 0;
    totalRedHome += res.statistiky[home]["cervene karty"] || res.statistiky[home]["červené"] || 0;
    totalRedAway += res.statistiky[away]["cervene karty"] || res.statistiky[away]["červené"] || 0;
    if (g1 > g2) homeWins++;
    else if (g2 > g1) awayWins++;
    else draws++;
    // Show result
    document.getElementById('resultArea').innerHTML = `
      <div><strong>${res.vysledok}</strong></div>
      <div style="margin-top:6px">
        <div><em>Statistics</em></div>
        <table class="statstable">
          <thead><tr><th>Team</th><th>Goals</th><th>Shots</th><th>On target</th><th>🟨</th><th>🟥</th><th>Possession</th></tr></thead>
          <tbody>
            <tr><td>${Object.keys(res.statistiky)[0]}</td><td>${res.statistiky[Object.keys(res.statistiky)[0]].goly}</td><td>${res.statistiky[Object.keys(res.statistiky)[0]].strely}</td><td>${res.statistiky[Object.keys(res.statistiky)[0]]["strely na bránu"]}</td><td>${res.statistiky[Object.keys(res.statistiky)[0]]["zlte karty"]}</td><td>${res.statistiky[Object.keys(res.statistiky)[0]]["cervene karty"]}</td><td>${res.statistiky[Object.keys(res.statistiky)[0]]["držanie lopty"]}%</td></tr>
            <tr><td>${Object.keys(res.statistiky)[1]}</td><td>${res.statistiky[Object.keys(res.statistiky)[1]].goly}</td><td>${res.statistiky[Object.keys(res.statistiky)[1]].strely}</td><td>${res.statistiky[Object.keys(res.statistiky)[1]]["strely na bránu"]}</td><td>${res.statistiky[Object.keys(res.statistiky)[1]]["zlte karty"]}</td><td>${res.statistiky[Object.keys(res.statistiky)[1]]["cervene karty"]}</td><td>${res.statistiky[Object.keys(res.statistiky)[1]]["držanie lopty"]}%</td></tr>
          </tbody>
        </table>
      </div>
    `;

    // compute payout
    const odds = window.__lastOdds;
    const outcome = res.skutocny_tip;
    const usedOdd = outcome === '1' ? odds.home : outcome === '2' ? odds.away : odds.draw;
    if (pick === outcome) {
      const win = Math.round(stake * (usedOdd - 1) * 100)/100;
      balance = Math.round((balance + win)*100)/100;
      showMessage("Congratulations!", `You won ${win} €`, balance, true);
    } else {
      balance = Math.round((balance - stake)*100)/100;
      showMessage("Unfortunately.", `You lost ${stake} €`, balance, false);
    }


    saveBalance(balance);
    document.getElementById('balance').textContent = balance.toFixed(2);
  }
  // After all rounds, show summary
  if (rounds > 1) {
    const summary = `<div style='margin-top:10px'><strong>Summary (${rounds} matches):</strong><br>
      ${window.__lastTeams.home}: ${homeWins} wins<br>
      ${window.__lastTeams.away}: ${awayWins} wins<br>
      Draws: ${draws} draws<br><br>
      ⚽: ${window.__lastTeams.home} ${totalGoalsHome} - ${totalGoalsAway} ${window.__lastTeams.away}<br>
      🟨: ${window.__lastTeams.home} ${totalYellowHome} - ${totalYellowAway} ${window.__lastTeams.away}<br>
      🟥: ${window.__lastTeams.home} ${totalRedHome} - ${totalRedAway} ${window.__lastTeams.away}
    </div>`;
    document.getElementById('resultArea').innerHTML += summary;
  }

  document.getElementById('placeBet').disabled = false;
  document.getElementById('computeOdds').disabled = false;
});

/* wrapper to use simulateMatch and handle animation result (simulateMatch returns Promise) */
function simulateAndRender(home, away, speed, onMinute) {
  return new Promise(resolve=>{
    // our simulateMatch either resolves instantly (speed==0) with vys or for animated it resolves undefined; adjust implementation:
    // modify simulateMatch to call onMinute and then return result synchronously for speed==0 or asynchronously via finalize for animated.
    // In our current simulateMatch implementation, if speed>0 it never resolves a value — changed behavior: we will implement simulateAndRender custom here.

    // to keep code simple: run simulation logic here (separately from simulateMatch)
    const st1 = TEAMS[home], st2 = TEAMS[away];
    let [exp_g1, exp_g2] = expectedGoals(st1.elo||1000, st2.elo||1000);
    exp_g1 *= 1.1;
    let g1 = samplePoisson(exp_g1);
    let g2 = samplePoisson(exp_g2);
    // 1.8% šanca na prekvapenie: outsider vyhrá, skóre sa nastaví na výhru outsidera
    if (Math.random() < 0.018 && st1.elo !== st2.elo) {
      if (st1.elo > st2.elo) {
        // Home is favorite, force away win
        g2 = Math.max(g1 + 1, g2 + 1);
        g1 = Math.min(g1, g2 - 1);
      } else {
        // Away is favorite, force home win
        g1 = Math.max(g2 + 1, g1 + 1);
        g2 = Math.min(g2, g1 - 1);
      }
    }
    const yellow1 = randInt(0,4);
    const yellow2 = randInt(0,5);
    const red1 = (Math.random() < 0.01) ? 1 : 0;
    const red2 = (Math.random() < 0.02) ? 1 : 0;
    const nadst = randInt(1,8);
    const totalM = 90 + nadst;

    // build events
    const evs = [];
    for (const m of sampleMinutes(g1, totalM)) evs.push([m, `⚽ Goal! ${home} scored.`]);
    for (const m of sampleMinutes(g2, totalM)) evs.push([m, `⚽ Goal! ${away} scored.`]);
    for (const m of sampleMinutes(yellow1, totalM)) evs.push([m, `🟨 Yellow card for ${home}`]);
    for (const m of sampleMinutes(yellow2, totalM)) evs.push([m, `🟨 Yellow card for ${away}`]);
    for (const m of sampleMinutes(red1, totalM)) evs.push([m, `🟥 Red card for ${home}`]);
    for (const m of sampleMinutes(red2, totalM)) evs.push([m, `🟥 Red card for ${away}`]);
    evs.sort((a,b)=>a[0]-b[0]);

    // derived stats
    const strely1 = randInt(4,8) + g1*randInt(2,4);
    const strely2 = randInt(4,8) + g2*randInt(2,4);
    const naBrana1 = randInt(Math.max(g1,0), g1 + randInt(1,6));
    const naBrana2 = randInt(Math.max(g2,0), g2 + randInt(1,4));
    const drz1 = (st1.elo > st2.elo) ? randInt(51,75) : randInt(25,49);
    const drz2 = 100 - drz1;
    const rohy1 = randInt(1,5) + g1;
    const rohy2 = randInt(1,5) + g2;
    const offs1 = randInt(0,3);
    const offs2 = randInt(0,3);
    const fauly1 = randInt(5,12) + yellow1;
    const fauly2 = randInt(7,14) + yellow2;

    // animate or instant
    const playArea = document.getElementById('playArea');
    playArea.innerHTML = '';
    if (speed > 0) {
      let m = 0;
      const t = setInterval(()=>{
        m++;
        const line = document.createElement('div');
        line.textContent = (m>90 ? `90+${m-90}` : `${m}. min`) + ' — ' + (evs.filter(e=>e[0]===m).map(e=>e[1]).join(' | ') || '');
        playArea.appendChild(line);
        playArea.scrollTop = playArea.scrollHeight;
        if (m >= totalM) {
          clearInterval(t);
          finalize();
        }
      }, speed);
    } else {
      for (let m=1;m<=totalM;m++){
        const line = document.createElement('div');
        line.textContent = (m>90 ? `90+${m-90}` : `${m}. min`) + ' — ' + (evs.filter(e=>e[0]===m).map(e=>e[1]).join(' | ') || '');
        playArea.appendChild(line);
      }
      finalize();
    }

    function finalize(){
      // update TEAMS
      st1.win = st1.win || 0; st1.draw = st1.draw || 0; st1.loss = st1.loss || 0;
      st2.win = st2.win || 0; st2.draw = st2.draw || 0; st2.loss = st2.loss || 0;
      if (g1 > g2) { st1.win++; st2.loss++; }
      else if (g2 > g1) { st2.win++; st1.loss++; }
      else { st1.draw++; st2.draw++; }
      st1.goals_scored = (st1.goals_scored||0) + g1;
      st1.goals_conceded = (st1.goals_conceded||0) + g2;
      st1.yellow = (st1.yellow||0) + yellow1;
      st1.red = (st1.red||0) + red1;
      st2.goals_scored = (st2.goals_scored||0) + g2;
      st2.goals_conceded = (st2.goals_conceded||0) + g1;
      st2.yellow = (st2.yellow||0) + yellow2;
      st2.red = (st2.red||0) + red2;
      saveTeamsToStorage();

      const res = {
        vysledok: `${home} ${g1} - ${g2} ${away}`,
        skutocny_tip: g1>g2 ? '1' : g2>g1 ? '2' : 'X',
        statistiky: {
          [home]: { goly:g1, strely:strely1, "strely na bránu":naBrana1, "zlte karty":yellow1, "cervene karty":red1, "držanie lopty":drz1, rohy:rohy1, offsides:offs1, fauly:fauly1, žlté:yellow1, červené:red1 },
          [away]: { goly:g2, strely:strely2, "strely na bránu":naBrana2, "zlte karty":yellow2, "cervene karty":red2, "držanie lopty":drz2, rohy:rohy2, offsides:offs2, fauly:fauly2, žlté:yellow2, červené:red2 }
        },
        events: evs,
        nadstaveny: nadst
      };
      resolve(res);
    }
  });
}

const resetBtn = document.getElementById('resetBtn');
const homeSel = document.getElementById('homeSelect');
const awaySel = document.getElementById('awaySelect');
const stakeInput = document.getElementById('stake');
const oddsArea = document.getElementById('oddsArea');
const betArea = document.getElementById('betArea');
const oddsButtons = document.querySelectorAll('#oddsButtons button');
const playArea = document.getElementById('playArea');
const resultArea = document.getElementById('resultArea');

resetBtn.addEventListener('click', () => {
  // Reset team selects
  homeSel.selectedIndex = 0;
  awaySel.selectedIndex = 0;
  homeSel.style.backgroundColor = '';
  awaySel.style.backgroundColor = '';

  // Reset odds buttons
  oddsButtons.forEach(b => {
    if (b.id === 'btnHome') b.textContent = 'Home';
    if (b.id === 'btnDraw') b.textContent = 'Draw';
    if (b.id === 'btnAway') b.textContent = 'Away';
    b.style.backgroundColor = '';
    b.disabled = true;
  });

  // Reset bet input
  stakeInput.value = '';

  // Reset odds area and bet area
  oddsArea.textContent = 'Odds will appear after calculation';
  betArea.hidden = true;

  // Reset play area
  if (playArea) playArea.innerHTML = '';

  // Keep the placeholder text in resultArea
  if (resultArea) resultArea.textContent = 'Final score will appear here';

  // Reset variables
  window.selectedPick = null;
  window.__lastOdds = null;
  window.__lastTeams = null;
});


/* ---------- Init ---------- */
(function init(){
  TEAMS = parseTeams(defaultText);
  saveTeamsToStorage();
  populateSelects();
  loadTeamsFromStorage();
  const bal = loadBalance();
  document.getElementById('balance').textContent = bal.toFixed(2);
  document.getElementById('betArea').hidden = Object.keys(TEAMS).length < 2;
})();