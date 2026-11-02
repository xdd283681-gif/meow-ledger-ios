(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MeowLedger = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var KEY = 'meow-ledger-v1';
  var categories = [
    { id: 'food', name: '餐饮', icon: 'bowl', color: '#fff0d5', type: 'expense' },
    { id: 'coffee', name: '咖啡奶茶', icon: 'cup', color: '#eee9e2', type: 'expense' },
    { id: 'shopping', name: '购物', icon: 'bag', color: '#fbe5e1', type: 'expense' },
    { id: 'transport', name: '交通', icon: 'bus', color: '#e6eddf', type: 'expense' },
    { id: 'home', name: '居家', icon: 'home', color: '#eee7f4', type: 'expense' },
    { id: 'fun', name: '娱乐', icon: 'game', color: '#e1edf1', type: 'expense' },
    { id: 'health', name: '医疗', icon: 'heart', color: '#f9e7eb', type: 'expense' },
    { id: 'pet', name: '猫咪', icon: 'paw', color: '#fff1c9', type: 'expense' },
    { id: 'other', name: '其他', icon: 'dots', color: '#eaece5', type: 'expense' },
    { id: 'salary', name: '工资', icon: 'wallet', color: '#e6eddf', type: 'income' },
    { id: 'bonus', name: '奖金', icon: 'gift', color: '#fff0d5', type: 'income' },
    { id: 'refund', name: '退款', icon: 'return', color: '#e1edf1', type: 'income' },
    { id: 'otherIncome', name: '其他', icon: 'dots', color: '#eee7f4', type: 'income' }
  ];
  function pad(n) { return String(n).padStart(2, '0'); }
  function today(now) { var d = now || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function money(cents) { return (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function parseAmount(input) {
    var value = String(input).trim();
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) throw new Error('请输入正确金额，最多两位小数');
    var parts = value.split('.');
    var cents = Number(parts[0]) * 100 + Number(((parts[1] || '') + '00').slice(0, 2));
    if (cents <= 0 || cents > 999999999) throw new Error('金额需大于 0，且不超过 9,999,999.99');
    return cents;
  }
  function validDate(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; var d = new Date(s + 'T12:00:00'); return !isNaN(d.getTime()) && today(d) === s; }
  function category(id) { return categories.find(function (c) { return c.id === id; }) || categories[8]; }
  function empty() { return { version: 1, budget: 0, isDemo: false, transactions: [] }; }
  var accountNames = { personal: '个人消费', public: '公账' };
  var reportGroupNames = { general: '普通采购', drinks: '酒水' };
  var reportColumnNames = { food: '食材', supplies: '耗材', other: '其他' };
  function reportClass(row) {
    var text = String(row.note || '').toLowerCase();
    // Check utensils, cooking ingredients and mixed meals before beverage names.
    var notDrink = /酒杯|饮料杯|梅酒杯|水杯|杯子|纸杯|玻璃杯|酒具|开瓶器|冰桶|酒精|料酒|味醂|米酒醋|酒酿|啤酒鸭|红酒炖|聚餐|餐费|加餐|团建/.test(text);
    var isDrink = !notDrink && (/獭祭|獺祭|清酒|烧酒|燒酒|啤酒|白酒|红酒|紅酒|葡萄酒|梅酒|威士忌|伏特加|香槟|白兰地|朗姆|金酒|龙舌兰酒|酒水|日本酒|黄酒|果酒|饮料|飲料|果汁|汽水|苏打水|气泡水|矿泉水|纯净水|可乐|雪碧|椰汁|椰奶|乌龙茶|绿茶|红茶|咖啡|奶茶|sake|whisky|whiskey|vodka|beer|wine/.test(text) || row.category === 'coffee');
    var group = Object.prototype.hasOwnProperty.call(reportGroupNames, row.reportGroup) ? row.reportGroup : isDrink ? 'drinks' : 'general';
    var column;
    if (/玫瑰花|鲜花|花束|纸巾|餐巾|保鲜膜|保鲜袋|垃圾袋|一次性|手套|口罩|清洁|洗洁|消毒|抹布|百洁布|海绵/.test(text)) column = 'supplies';
    else if (/杯|跑腿|配送|运费|交通|车费|打车|保济丸|药|烤垫|疏通剂|电子秤|水晶砂|餐具|锅|盘子|碗|刀具|开瓶器|冰桶|酒具|办公|维修|电费|租金|聚餐|团建/.test(text)) column = 'other';
    else if (group === 'drinks' || /无花果|饼干|柠檬|牛油果|虾|南瓜|玉米|包菜|鸡蛋|无菌蛋|火腿|大葱|花椒油|番茄|沙拉汁|辣椒|食材|蔬菜|水果|牛肉|猪肉|鸡肉|海鲜|大米|面粉|酱油|食用油|加餐/.test(text) || ['food', 'coffee'].includes(row.category)) column = 'food';
    else column = 'other';
    if (Object.prototype.hasOwnProperty.call(reportColumnNames, row.reportColumn)) column = row.reportColumn;
    return { group: group, column: column, groupName: reportGroupNames[group], columnName: reportColumnNames[column] };
  }
  function emptyWorkspace() { return { version: 2, activeAccount: 'personal', accounts: { personal: empty(), public: empty() } }; }
  function normalizeWorkspace(value) {
    if (!value) return emptyWorkspace();
    if (value.version === 1) {
      var legacy = normalize(value), workspace = emptyWorkspace();
      // Only old books explicitly marked as demo lose their generated demo rows.
      if (legacy.isDemo) legacy = Object.assign({}, legacy, { budget: 0, transactions: legacy.transactions.filter(function (r) { return !/^demo-\d+$/.test(r.id); }) });
      workspace.accounts.personal = Object.assign({}, legacy, { isDemo: false });
      return workspace;
    }
    if (value.version !== 2 || !value.accounts || !Object.prototype.hasOwnProperty.call(accountNames, value.activeAccount)) throw new Error('账本数据格式不正确');
    var personal = normalize(value.accounts.personal), publicBook = normalize(value.accounts.public);
    if (personal.isDemo || publicBook.isDemo) throw new Error('账本标记无效');
    return { version: 2, activeAccount: value.activeAccount, accounts: { personal: personal, public: publicBook } };
  }
  function normalize(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.transactions)) throw new Error('账本数据格式不正确');
    var ids = Object.create(null);
    var rows = value.transactions.map(function (r) {
      if (!r || typeof r.id !== 'string' || !r.id || ids[r.id] || !['income', 'expense'].includes(r.type) || !Number.isSafeInteger(r.amount) || r.amount <= 0 || r.amount > 999999999 || !validDate(r.date) || !categories.some(function (c) { return c.id === r.category && c.type === r.type; })) throw new Error('账本中包含无效记录');
      ids[r.id] = true;
      var row = { id: r.id, type: r.type, category: r.category, amount: r.amount, date: r.date, note: String(r.note || '').slice(0, 40), createdAt: Number(r.createdAt) || 0 };
      if (r.spec) row.spec = String(r.spec).trim().slice(0, 80);
      if (Object.prototype.hasOwnProperty.call(reportGroupNames, r.reportGroup)) row.reportGroup = r.reportGroup;
      if (Object.prototype.hasOwnProperty.call(reportColumnNames, r.reportColumn)) row.reportColumn = r.reportColumn;
      return row;
    });
    if (!Number.isSafeInteger(value.budget) || value.budget < 0 || value.budget > 999999999) throw new Error('预算金额无效');
    return { version: 1, budget: value.budget, isDemo: !!value.isDemo, transactions: rows };
  }
  function saveEntry(state, input) {
    var amount = parseAmount(input.amount);
    if (!validDate(input.date)) throw new Error('请选择有效日期');
    var c = categories.find(function (c) { return c.id === input.category && c.type === input.type; });
    if (!c) throw new Error('请选择收支分类');
    var id = input.id || 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    if (input.id && !state.transactions.some(function (t) { return t.id === input.id; })) throw new Error('这笔记录已不存在');
    var row = { id: id, type: input.type, category: c.id, amount: amount, date: input.date, note: String(input.note || '').trim().slice(0, 40), createdAt: Date.now() };
    if (input.spec) row.spec = input.spec;
    if (input.reportGroup) row.reportGroup = input.reportGroup;
    if (input.reportColumn) row.reportColumn = input.reportColumn;
    var rows = state.transactions.filter(function (t) { return t.id !== id; });
    rows.push(row);
    return normalize(Object.assign({}, state, { transactions: rows }));
  }
  function monthLabel(month) { return month.slice(0, 4) + ' 年 ' + Number(month.slice(5)) + ' 月'; }
  function shiftMonth(month, offset) { var parts = month.split('-').map(Number), d = new Date(parts[0], parts[1] - 1 + offset, 1); return today(d).slice(0, 7); }
  function summary(state, month, filter, query, now) {
    var all = state.transactions.filter(function (r) { return r.date.slice(0, 7) === month; });
    var expense = 0, income = 0;
    all.forEach(function (r) { if (r.type === 'expense') expense += r.amount; else income += r.amount; });
    var selected = all.filter(function (r) { return (!filter || filter === 'all' || r.type === filter) && (!query || (r.note + category(r.category).name).toLowerCase().includes(query.toLowerCase())); }).sort(function (a, b) { return b.date.localeCompare(a.date) || b.createdAt - a.createdAt; });
    var groups = [];
    selected.forEach(function (r) {
      var g = groups.find(function (g) { return g.date === r.date; });
      if (!g) {
        var date = new Date(r.date + 'T12:00:00'), diff = Math.round((new Date(today(now) + 'T12:00:00') - date) / 86400000);
        g = { date: r.date, label: diff === 0 ? '今天' : diff === 1 ? '昨天' : Number(r.date.slice(5,7)) + ' 月 ' + Number(r.date.slice(8)) + ' 日', weekday: ['周日','周一','周二','周三','周四','周五','周六'][date.getDay()], expense: 0, income: 0, rows: [] }; groups.push(g);
      }
      g[r.type] += r.amount;
      g.rows.push(Object.assign({}, r, { categoryName: category(r.category).name, icon: category(r.category).icon, color: category(r.category).color, displayAmount: money(r.amount), sign: r.type === 'expense' ? '−' : '+' }));
    });
    groups.forEach(function (g) { g.expenseText = money(g.expense); g.incomeText = money(g.income); });
    var ranking = categories.filter(function (c) { return c.type === 'expense'; }).map(function (c) { var amount = all.filter(function (r) { return r.category === c.id; }).reduce(function (a,r) { return a+r.amount; },0); return Object.assign({}, c, { amount: amount, amountText: money(amount), percent: expense ? Math.round(amount / expense * 100) : 0, width: expense ? Math.max(2, amount / expense * 100) : 0 }); }).filter(function (c) { return c.amount > 0; }).sort(function (a,b) { return b.amount-a.amount; });
    var nowDate = today(now), currentMonth = nowDate.slice(0,7), days = new Date(Number(month.slice(0,4)), Number(month.slice(5)),0).getDate();
    var elapsed = month === currentMonth ? Number(nowDate.slice(8)) : month < currentMonth ? days : 0;
    var week = Array.from({length: 7},function (_,i) { var d = new Date(nowDate+'T12:00:00'); d.setDate(d.getDate()-6+i); var ds=today(d); var amount=state.transactions.filter(function(r){return r.type==='expense' && r.date===ds;}).reduce(function(a,r){return a+r.amount;},0); return { date: ds, day: Number(ds.slice(8)), amount: amount, label: ds===nowDate ? '今' : ['日','一','二','三','四','五','六'][d.getDay()] }; });
    var maximum = Math.max.apply(null,week.map(function(w){return w.amount;}).concat([1]));
    week.forEach(function(w){w.height = w.amount ? Math.max(5,Math.round(w.amount/maximum*100)) : 3; w.amountText=money(w.amount);});
    var remaining=state.budget-expense, percent=state.budget ? Math.min(100,Math.round(expense/state.budget*100)) : 0;
    return { month: month, monthLabel: monthLabel(month), expense: expense, income: income, expenseText: money(expense), incomeText: money(income), balanceText: money(income-expense), budgetText: money(state.budget), hasBudget: state.budget > 0, remainingText: money(Math.abs(remaining)), budgetPercent: percent, overBudget: state.budget > 0 && remaining<0, dailyText: money(elapsed ? Math.round(expense/elapsed):0), count: all.length, totalCount: state.transactions.length, groups: groups, recentGroups: groups.slice(0,2), ranking: ranking, week: week, isCurrentMonth: month===currentMonth, isDemo: state.isDemo, savingRate: income ? Math.round((income-expense)/income*100) : 0, activeDays: new Set(state.transactions.map(function(r){return r.date;})).size };
  }
  function csv(state, accountName) {
    var cell = function(s) { var v=String(s); if (/^[=+\-@\t\r]/.test(v)) v="'"+v; return '"'+v.replace(/"/g,'""')+'"'; };
    var isPublic = accountName === accountNames.public;
    return '\ufeff' + (accountName ? '账本,' : '') + '日期,类型,分类,金额,备注' + (isPublic ? ',规格,报销单,金额列' : '') + '\r\n' + state.transactions.slice().sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(r){var values=[r.date,r.type==='expense'?'支出':'收入',category(r.category).name,(r.amount/100).toFixed(2),r.note];if(accountName)values.unshift(accountName);if(isPublic){var kind=reportClass(r);values.push(r.spec||'',r.type==='expense'?kind.groupName:'',r.type==='expense'?kind.columnName:'');}return values.map(cell).join(',');}).join('\r\n');
  }
  return { KEY:KEY,accountNames:accountNames,reportClass:reportClass,reportGroupNames:reportGroupNames,reportColumnNames:reportColumnNames,emptyWorkspace:emptyWorkspace,normalizeWorkspace:normalizeWorkspace,categories:categories,today:today,money:money,parseAmount:parseAmount,validDate:validDate,category:category,empty:empty,normalize:normalize,saveEntry:saveEntry,summary:summary,shiftMonth:shiftMonth,csv:csv };
});
