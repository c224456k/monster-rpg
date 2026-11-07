// 接費許交易的現金（只花不賺）。
// 費許網站 https://c224456k.github.io/feixu-trading-app/ 跟這個遊戲同一個網域，
// 所以讀得到它存在 localStorage 的登入資料（Flutter shared_preferences 的 key 前面會加 "flutter."）。
// 有登入 → 商店與全滅都扣費許現金；沒登入 → 照舊用遊戲裡的錢。打贏訓練家不會把錢加回費許。
const Feixu = {
  linked: false, cash: null, base: '', key: '', token: '',
  _get(k) {
    try {
      const v = localStorage.getItem('flutter.' + k);
      if (v == null) return '';
      try { return String(JSON.parse(v)); } catch (e) { return v; }
    } catch (e) { return ''; }
  },
  init() {
    this.base = this._get('server_url').replace(/\/+$/, '');
    this.key = this._get('api_key');
    this.token = this._get('auth_token');
    this.linked = !!(this.base && this.key && this.token);
    if (this.linked) this.refresh();
  },
  async _req(method, path, body) {
    let r;
    try {
      r = await fetch(this.base + path, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-API-Key': this.key, Authorization: 'Bearer ' + this.token },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) { return { ok: false, message: '連不上費許伺服器，\n等等再試試看。' }; }
    if (r.status === 401) { this.linked = false; return { ok: false, message: '費許登入過期了，\n先改用遊戲裡的錢。' }; }
    if (!r.ok) return { ok: false, message: '費許伺服器出錯了，\n等等再試試看。' };
    const j = await r.json();
    if (typeof j.cash === 'number') this.cash = j.cash;
    return j;
  },
  refresh() { return this._req('GET', '/api/moemon/cash'); },
  buy(item, qty) { return this._req('POST', '/api/moemon/buy', { item, qty }); },
  blackout() { return this._req('POST', '/api/moemon/blackout'); },
};

function fmtMoney(n) {
  n = Math.floor(n || 0);
  return n >= 1000000 ? Math.floor(n / 10000) + '萬' : String(n);
}
