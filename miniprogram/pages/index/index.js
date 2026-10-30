const L = require('../../utils/ledger');
Page({
  data: { tab: 'home', statusBar: 24, month: L.today().slice(0,7), filter: 'all', query: '', vm: {}, categories: [], editor: false, budgetEditor: false, form: {}, budgetInput: '', storageError: false, today: L.today(), version: '1.0.4', account: 'personal', accountName: '个人消费' },
  onLoad() {
    try { const info = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync(); this.setData({ statusBar: info.statusBarHeight || 24 }); } catch (_) {}
    try {
      const value = wx.getStorageSync(L.KEY);
      this.workspace = L.normalizeWorkspace(value);
      if (value && value.version === 1) wx.setStorageSync(L.KEY, this.workspace);
    } catch (error) {
      this.workspace = L.emptyWorkspace(); this.setData({ storageError: true });
      wx.showModal({ title: '暂时无法读取账本', content: '请重新打开应用后再试。现有缓存不会被覆盖。', showCancel: false });
    }
    this.refresh();
  },
  onShow() {
    if (!this.book) return;
    this.setData({ tab: 'home', editor: false, budgetEditor: false, form: {}, month: L.today().slice(0,7), filter: 'all', query: '' });
    this.refresh();
  },
  refresh() {
    const account = this.workspace.activeAccount;
    this.book = this.workspace.accounts[account];
    this.setData({ account, accountName: L.accountNames[account], vm: L.summary(this.book, this.data.month, this.data.filter, this.data.query), today: L.today() });
  },
  commit(book) {
    if (this.data.storageError) { wx.showToast({ title: '请重新打开应用后再试', icon: 'none' }); return false; }
    try {
      const accounts = Object.assign({}, this.workspace.accounts, { [this.data.account]: L.normalize(book) });
      const next = L.normalizeWorkspace(Object.assign({}, this.workspace, { accounts }));
      wx.setStorageSync(L.KEY, next); this.workspace = next; this.refresh(); return true;
    }
    catch (_) { wx.showToast({ title: '保存失败，请检查设备存储空间', icon: 'none' }); return false; }
  },
  switchAccount(e) {
    const account = e.currentTarget.dataset.account;
    if (!Object.prototype.hasOwnProperty.call(L.accountNames, account) || account === this.data.account || this.data.editor || this.data.budgetEditor) return;
    if (this.data.storageError) { wx.showToast({ title: '请重新打开应用后再试', icon: 'none' }); return; }
    const next = Object.assign({}, this.workspace, { activeAccount: account });
    try { wx.setStorageSync(L.KEY, next); }
    catch (_) { wx.showToast({ title: '切换失败，请检查设备存储空间', icon: 'none' }); return; }
    this.workspace = next;
    this.setData({ filter: 'all', query: '', form: {} }); this.refresh();
    wx.pageScrollTo({ scrollTop: 0, duration: 150 });
  },
  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab, filter: 'all', query: '' }); this.refresh(); wx.pageScrollTo({ scrollTop: 0, duration: 150 }); },
  allBills() { this.setData({ tab: 'bills', filter: 'all', query: '' }); this.refresh(); wx.pageScrollTo({ scrollTop: 0, duration: 150 }); },
  changeMonth(e) { this.setData({ month: e.detail.value.slice(0,7) }); this.refresh(); },
  previousMonth() { this.setData({ month: L.shiftMonth(this.data.month, -1) }); this.refresh(); },
  nextMonth() { this.setData({ month: L.shiftMonth(this.data.month, 1) }); this.refresh(); },
  setFilter(e) { this.setData({ filter: e.currentTarget.dataset.filter }); this.refresh(); },
  search(e) { this.setData({ query: e.detail.value }); this.refresh(); },
  addEntry() { this.setData({ editor: true, form: { id: '', type: 'expense', category: 'food', amount: '', note: '', date: L.today() }, categories: L.categories.filter(c => c.type === 'expense') }); },
  editEntry(e) {
    const r = this.book.transactions.find(t => t.id === e.currentTarget.dataset.id); if (!r) return;
    this.setData({ editor: true, form: Object.assign({}, r, { amount: (r.amount / 100).toFixed(2) }), categories: L.categories.filter(c => c.type === r.type) });
  },
  closeEditor() { this.setData({ editor: false, budgetEditor: false }); },
  noop() {},
  setType(e) { const type = e.currentTarget.dataset.type; if (type === this.data.form.type) return; const categories = L.categories.filter(c => c.type === type); this.setData({ 'form.type': type, 'form.category': categories[0].id, categories }); },
  setCategory(e) { this.setData({ 'form.category': e.currentTarget.dataset.id }); },
  inputAmount(e) { this.setData({ 'form.amount': e.detail.value }); },
  inputNote(e) { this.setData({ 'form.note': e.detail.value }); },
  inputDate(e) { this.setData({ 'form.date': e.detail.value }); },
  saveEntry() {
    if (!this.data.editor) return;
    let candidate;
    try { candidate = L.saveEntry(this.book, this.data.form); }
    catch (e) { wx.showToast({ title: e.message, icon: 'none' }); return; }
    const finish = book => { if (this.commit(book)) { if (typeof wx.hideKeyboard === 'function') wx.hideKeyboard(); this.setData({ editor: false, budgetEditor: false, tab: 'stats', month: this.data.form.date.slice(0,7), query: '', filter: 'all', form: {} }); this.refresh(); wx.pageScrollTo({ scrollTop: 0, duration: 150 }); wx.showToast({ title: '记好啦，喵～', icon: 'success' }); } };
    finish(candidate);
  },
  deleteEntry() { wx.showModal({ title: '删除这笔记录？', content: '删除后无法恢复，统计数据会同步更新。', confirmText: '删除', confirmColor: '#c16b58', success: result => { if (result.confirm && this.commit(Object.assign({}, this.book, { transactions: this.book.transactions.filter(t => t.id !== this.data.form.id) }))) { this.setData({ editor: false }); wx.showToast({ title: '已删除', icon: 'success' }); } } }); },
  openBudget() { this.setData({ budgetEditor: true, budgetInput: (this.book.budget / 100).toFixed(2) }); },
  inputBudget(e) { this.setData({ budgetInput: e.detail.value }); },
  saveBudget() { try { const value = String(this.data.budgetInput).trim(); const budget = /^0+(\.0{1,2})?$/.test(value) ? 0 : L.parseAmount(value); if (this.commit(Object.assign({}, this.book, { budget }))) { this.setData({ budgetEditor: false }); wx.showToast({ title: '预算已更新', icon: 'success' }); } } catch (e) { wx.showToast({ title: e.message, icon: 'none' }); } },
  clearBook() { wx.showModal({ title: '清空' + this.data.accountName + '账单？', content: '当前账本的全部收支记录将删除，月预算会保留。此操作无法恢复，建议先导出当前账本。另一个账本不受影响。', confirmText: '确认清空', confirmColor: '#c16b58', success: result => { if (result.confirm && this.commit(Object.assign(L.empty(), { budget: this.book.budget }))) wx.showToast({ title: '当前账本已清空', icon: 'success' }); } }); },
  exportBook() {
    const filename = 'meow-ledger-' + this.data.account + '-' + L.today() + '.csv';
    const filePath = wx.env.USER_DATA_PATH + '/' + filename;
    wx.getFileSystemManager().writeFile({ filePath, data: L.csv(this.book, this.data.accountName), encoding: 'utf8', success: () => {
      if (typeof wx.shareFileMessage === 'function') wx.shareFileMessage({ filePath, fileName: filename, fail: e => { if (!/cancel/.test(e.errMsg || '')) wx.showToast({ title: '请重试或检查存储空间', icon: 'none' }); } });
      else wx.setClipboardData({ data: L.csv(this.book, this.data.accountName), success: () => wx.showToast({ title: '账单已复制，可粘贴到表格', icon: 'none' }) });
    }, fail: () => wx.showToast({ title: '导出失败，请检查存储空间', icon: 'none' }) });
  },
  showPrivacy() { wx.showModal({ title: '给你安心的小账本', content: '个人消费与公账分别记账、统计和设置预算，均仅保存在当前设备的 iOS 本地缓存中。公账是本机独立账本，不提供多人共享。不上传服务器，也不读取微信支付账单。清除缓存、卸载应用或更换设备可能导致数据丢失，记得分别导出两个账本。', showCancel: false, confirmText: '知道啦', confirmColor: '#65744d' }); },
  onShareAppMessage() { return { title: '喵喵账本｜把生活记成喜欢的样子', path: '/pages/index/index' }; }
});
