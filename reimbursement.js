/* Browser and Node share this report builder. No network or storage writes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./ledger'), require('exceljs'));
  else root.MeowReports = factory(root.MeowLedger, root.ExcelJS);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (L, ExcelJS) {
  'use strict';
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  function rowsFor(book, year, group) {
    return book.transactions.filter(r => r.type === 'expense' && r.date.slice(0, 4) === String(year) && L.reportClass(r).group === group)
      .slice().sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }
  function summary(book, year) {
    const result = {};
    for (const group of ['general', 'drinks']) {
      const rows = rowsFor(book, year, group), amount = rows.reduce((total, row) => total + row.amount, 0);
      result[group] = { count: rows.length, amount, amountText: L.money(amount) };
    }
    result.incomeCount = book.transactions.filter(r => r.type === 'income' && r.date.slice(0, 4) === String(year)).length;
    return result;
  }
  function createWorkbook(book, year, group) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !L.reportGroupNames[group]) throw Error('请选择有效的导出年份与报销单');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '喵喵账本'; workbook.subject = '公账' + L.reportGroupNames[group] + '报销单';
    workbook.calcProperties.fullCalcOnLoad = true;
    const all = rowsFor(book, year, group), lastColumn = 'F', columnCount = 6;
    const amountColumns = group === 'general' ? { food: 'C', supplies: 'D', other: 'E', parttime: 'F' } : { food: 'C', supplies: 'D', other: 'E' };
    const amountLastColumn = group === 'general' ? 'F' : 'E';
    const border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } };
    for (let month = 1; month <= 12; month++) for (const half of [0, 1]) {
      const halfName = half ? '下' : '上', sheet = workbook.addWorksheet(month + '月' + halfName, { properties: { tabColor: { argb: 'FF7E8DAE' } }, views: [{ state: 'frozen', ySplit: 2, showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      sheet.columns = Array.from({ length: columnCount }, () => ({ width: 8.26 }));
      sheet.properties.defaultRowHeight = 14.1;
      sheet.mergeCells('A1:' + lastColumn + '1');
      sheet.getCell('A1').value = year + '年' + month + '月' + (group === 'drinks' ? '酒水' : '') + halfName + '半月报销单';
      sheet.addRow(['日期', '事项', '食材', '耗材', '其他', group === 'drinks' ? '规格 / 数量' : '兼职']);
      const rows = all.filter(r => Number(r.date.slice(5, 7)) === month && (Number(r.date.slice(8)) > 15 ? 1 : 0) === half);
      const totals = { food: 0, supplies: 0, other: 0, parttime: 0 };
      for (const row of rows) {
        const kind = L.reportClass(row), values = [new Date(row.date + 'T00:00:00Z'), row.note || L.category(row.category).name, null, null, null, null];
        values[{ food: 2, supplies: 3, other: 4, parttime: 5 }[kind.column]] = row.amount / 100;
        if (group === 'drinks') values[5] = row.spec || '';
        else if (row.spec) values[1] += ' ' + row.spec;
        totals[kind.column] += row.amount;
        const added = sheet.addRow(values);
        added.getCell(1).numFmt = 'yyyy"年"m"月"d"日"';
      }
      const dataEnd = sheet.rowCount;
      // Two blank lines match the supplied reimbursement template, without demo entries.
      sheet.addRow(Array(columnCount).fill(null)); sheet.addRow(Array(columnCount).fill(null));
      const subtotal = sheet.addRow([null, '合计：']);
      for (const [key, letter] of Object.entries(amountColumns)) {
        subtotal.getCell(letter).value = { formula: dataEnd >= 3 ? 'ROUND(SUM(' + letter + '3:' + letter + dataEnd + '),2)' : '0', result: totals[key] / 100 };
      }
      const total = sheet.addRow([null, '报销总额：']);
      sheet.mergeCells('C' + total.number + ':' + amountLastColumn + total.number);
      total.getCell(3).value = { formula: 'ROUND(SUM(C' + subtotal.number + ':' + amountLastColumn + subtotal.number + '),2)', result: (totals.food + totals.supplies + totals.other + totals.parttime) / 100 };
      for (let r = 1; r <= sheet.rowCount; r++) {
        const line = sheet.getRow(r); line.height = 14.1;
        for (let c = 1; c <= columnCount; c++) {
          const cell = line.getCell(c);
          cell.font = { name: '宋体', size: r === 1 ? 11 : 10, bold: r === 2 || r >= subtotal.number, color: { argb: 'FF000000' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
          cell.border = border;
          if (r > 2 && c >= 3 && (c <= 5 || group === 'general' && c === 6)) cell.numFmt = '0.00';
        }
      }
      sheet.pageSetup.printArea = 'A1:' + lastColumn + sheet.rowCount;
      sheet.pageSetup.printTitlesRow = '1:2';
      sheet.pageSetup.margins = { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 };
    }
    // Open at the first period containing records, keeping all 24 tabs in calendar order.
    const first = all[0];
    const activeTab = first ? (Number(first.date.slice(5, 7)) - 1) * 2 + (Number(first.date.slice(8)) > 15 ? 1 : 0) : 0;
    workbook.views = [{ activeTab }];
    return workbook;
  }
  async function build(book, year, group) {
    const workbook = createWorkbook(book, year, group), data = await workbook.xlsx.writeBuffer();
    return { filename: year + '年公账' + L.reportGroupNames[group] + '报销单.xlsx', mimeType, data };
  }
  return { rowsFor, summary, createWorkbook, build, mimeType };
});
