const express = require('express'), http = require('http'), fs = require('fs'), crypto = require('crypto');
const { Server } = require('socket.io');
const app = express(), srv = http.createServer(app), io = new Server(srv, { maxHttpBufferSize: 1e6 });

// ---------- tiny JSON "database" ----------
const FILE = process.env.DATA_FILE || 'data.json';
let db = { users: {}, groups: {}, msgs: {} };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
let timer;
const save = () => { clearTimeout(timer); timer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(db), () => {}), 500); };

// ---------- helpers ----------
const ok = s => typeof s === 'string';
const cleanName = s => ok(s) ? s.trim().slice(0, 24) : '';
const cleanIcon = s => ok(s) && /^data:image\/(png|jpeg|webp|gif);base64,/.test(s) && s.length < 80000 ? s : '';
const pub = u => ({ id: u.id, name: u.name, icon: u.icon });
const online = new Map();
const newId = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let id;
  do { id = Array.from(crypto.randomBytes(6), b => A[b % A.length]).join(''); } while (db.users[id]);
  return id;
};

function stateFor(u) {
  const ids = new Set([u.id, ...u.friends]);
  const groups = Object.values(db.groups).filter(g => g.members.includes(u.id));
  groups.forEach(g => g.members.forEach(m => ids.add(m)));
  const users = {};
  ids.forEach(i => { if (db.users[i]) users[i] = { ...pub(db.users[i]), online: online.has(i) }; });
  return { me: pub(u), friends: u.friends, users, groups };
}
const push = ids => [...ids].forEach(i => db.users[i] && io.to('u:' + i).emit('state', stateFor(db.users[i])));
const reach = u => Object.keys(stateFor(u).users);

// ---------- sockets ----------
io.on('connection', s => {
  let me = null;
  const login = u => {
    me = u; s.join('u:' + u.id);
    const first = !online.has(u.id);
    online.set(u.id, (online.get(u.id) || 0) + 1);
    if (first) push(reach(u).filter(i => i !== u.id));
    return stateFor(u);
  };
  // returns the member ids of a chat the current user may access, or null
  const people = c => {
    if (!me || !ok(c)) return null;
    if (c.startsWith('dm:')) {
      const p = c.slice(3).split('-');
      return p.length === 2 && p.includes(me.id) && me.friends.includes(p.find(x => x !== me.id)) ? p : null;
    }
    const g = c.startsWith('g:') && db.groups[c.slice(2)];
    return g && g.members.includes(me.id) ? g.members : null;
  };

  s.on('register', (d, cb) => {
    const name = cleanName(d && d.name);
    if (!name) return cb({ error: 'Choose a name.' });
    const u = { id: newId(), token: crypto.randomBytes(16).toString('hex'), name, icon: cleanIcon(d.icon), friends: [] };
    db.users[u.id] = u; save();
    cb({ token: u.token, state: login(u) });
  });

  s.on('login', (t, cb) => {
    const u = Object.values(db.users).find(x => x.token === t);
    if (!u) return cb({ error: 'Account not found.' });
    cb({ state: login(u) });
  });

  s.on('profile', d => {
    if (!me || !d) return;
    const n = cleanName(d.name); if (n) me.name = n;
    if (d.icon !== undefined) me.icon = cleanIcon(d.icon);
    save(); push(reach(me));
  });

  s.on('addFriend', (id, cb) => {
    if (!me) return;
    id = ok(id) ? id.trim().toUpperCase() : '';
    const f = db.users[id];
    if (!f) return cb({ error: 'No user with that ID.' });
    if (f === me) return cb({ error: 'That is your own ID.' });
    if (me.friends.includes(id)) return cb({ error: 'You are already friends.' });
    me.friends.push(id); f.friends.push(me.id); save(); push([me.id, id]);
    cb({ id });
  });

  s.on('createGroup', (d, cb) => {
    if (!me || !d) return;
    const name = cleanName(d.name);
    if (!name) return cb({ error: 'Name the group.' });
    const picked = (Array.isArray(d.members) ? d.members : []).filter(x => me.friends.includes(x));
    const members = [...new Set([me.id, ...picked])];
    const g = { id: crypto.randomBytes(4).toString('hex'), name, icon: cleanIcon(d.icon), members };
    db.groups[g.id] = g; save(); push(members);
    cb({ id: g.id });
  });

  s.on('history', (c, cb) => cb(people(c) ? db.msgs[c] || [] : []));

  s.on('send', d => {
    const p = d && people(d.chat);
    if (!p) return;
    const text = ok(d.text) ? d.text.trim().slice(0, 1000) : '';
    const gif = ok(d.gif) && /^https:\/\/\S{1,500}$/.test(d.gif) ? d.gif : '';
    if (!text && !gif) return;
    const m = { id: crypto.randomBytes(6).toString('hex'), chat: d.chat, from: me.id, text, gif, ts: Date.now() };
    const list = db.msgs[d.chat] = db.msgs[d.chat] || [];
    list.push(m); if (list.length > 300) list.shift();
    save(); p.forEach(i => io.to('u:' + i).emit('msg', m));
  });

  s.on('disconnect', () => {
    if (!me) return;
    const n = (online.get(me.id) || 1) - 1;
    if (n) online.set(me.id, n); else { online.delete(me.id); push(reach(me)); }
  });
});

// ---------- GIF search (Giphy). Set GIPHY_KEY in your environment ----------
app.get('/api/gifs', async (req, res) => {
  const key = process.env.GIPHY_KEY;
  if (!key) return res.json({ error: 'nokey' });
  try {
    const q = String(req.query.q || '').slice(0, 60);
    const base = q ? `search?q=${encodeURIComponent(q)}&` : 'trending?';
    const j = await (await fetch(`https://api.giphy.com/v1/gifs/${base}limit=24&rating=pg-13&api_key=${key}`)).json();
    res.json({ gifs: j.data.map(g => ({ url: g.images.fixed_height.url, preview: g.images.fixed_height_small.url })) });
  } catch { res.json({ gifs: [] }); }
});

app.use(express.static('public'));
srv.listen(process.env.PORT || 3000, () => console.log('Huddle running'));
