const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const L=require('../miniprogram/utils/ledger');
const now=new Date(2026,9,29,12);const month='2026-10';
function input(patch={}){return Object.assign({type:'expense',category:'food',amount:'0.10',date:'2026-10-29',note:'午饭'},patch);}
test('金额转换使用整数分，避免小数误差',()=>{assert.equal(L.parseAmount('0.10')+L.parseAmount('0.20'),30);assert.equal(L.parseAmount('12.3'),1230);assert.equal(L.money(128680),'1,286.80');});
test('拒绝零数、负数、科学计数、第三位小数和超限金额',()=>{for(const amount of ['0','-1','1e3','1.001','abc','10000000','Infinity','', '1.'])assert.throws(()=>L.parseAmount(amount));});
test('验证真实日历日期',()=>{assert.equal(L.validDate('2024-02-29'),true);assert.equal(L.validDate('2026-02-29'),false);assert.equal(L.validDate('2026-13-01'),false);});
test('月份前后切换支持跨年',()=>{assert.equal(L.shiftMonth('2026-01',-1),'2025-12');assert.equal(L.shiftMonth('2026-12',1),'2027-01');});
test('新增收支、编辑和统计一致',()=>{let b=L.saveEntry(L.empty(),input({amount:'32.10'}));b=L.saveEntry(b,input({amount:'8500',type:'income',category:'salary'}));b=L.saveEntry(b,input({id:b.transactions[0].id,amount:'33.20'}));const s=L.summary(b,month,'all','',now);assert.equal(s.expense,3320);assert.equal(s.income,850000);assert.equal(s.count,2);assert.equal(s.balanceText,'8,466.80');});
test('不允许错配收支类型或无效日期',()=>{assert.throws(()=>L.saveEntry(L.empty(),input({type:'income',category:'food'})));assert.throws(()=>L.saveEntry(L.empty(),input({date:'2026-02-30'})));});
test('CSV 对引号、换行和表格公式安全转义',()=>{let b=L.saveEntry(L.empty(),input({note:'=HYPERLINK("x")'}));let output=L.csv(b);assert.ok(output.startsWith('\ufeff日期,类型'));assert.ok(output.includes('"\'=HYPERLINK(""x"")"'));b=L.saveEntry(b,input({note:'a,"b"\nc'}));assert.ok(L.csv(b).includes('"a,""b""\nc"'));});
test('空账本与零预算统计无 NaN',()=>{const b=L.empty();b.budget=0;const s=L.summary(b,month,'all','',now);assert.equal(s.expenseText,'0.00');assert.equal(s.budgetPercent,0);assert.equal(s.dailyText,'0.00');assert.equal(s.groups.length,0);assert.equal(s.activeDays,0);});
test('近七天支出包含跨月日期',()=>{let b=L.saveEntry(L.empty(),input({date:'2026-09-30',amount:'66.66'}));const s=L.summary(b,month,'all','',new Date(2026,9,1,12));assert.equal(s.expense,0);assert.equal(s.week.find(w=>w.date==='2026-09-30').amount,6666);});
test('所有原生 WXML 条件和循环都使用数据绑定，避免面板恒显示',()=>{const source=fs.readFileSync(path.join(__dirname,'../miniprogram/pages/index/index.wxml'),'utf8');const attrs=Array.from(source.matchAll(/wx:(if|elif|for)="([^"]*)"/g));assert.ok(attrs.length>20);for(const[,name,value]of attrs)assert.match(value,/^\{\{[\s\S]*\}\}$/,name+' 缺少数据绑定: '+value);});
