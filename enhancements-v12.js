(function () {
  'use strict';

  const DAY = 86400000;
  let attempts = 0;

  function boot() {
    attempts += 1;
    if (!window.DASHBOARD_DATA_V2 || typeof state === 'undefined' || typeof cube === 'undefined' ||
        typeof renderKpis !== 'function' || !document.querySelector('#skuMulti')) {
      if (attempts < 160) window.setTimeout(boot, 50);
      return;
    }
    if (document.documentElement.dataset.businessDiagnostics === 'ready') return;
    document.documentElement.dataset.businessDiagnostics = 'ready';

    state.compareMode = new URLSearchParams(location.search).get('compare') === 'period' ? 'period' : 'yoy';
    installPanel();
    installComparisonToggle();
    const previousRenderKpis = renderKpis;
    renderKpis = function (list) {
      previousRenderKpis(list);
      renderBusinessAnalysis(list || []);
    };
    renderBusinessAnalysis(typeof rows === 'function' ? rows() : []);
  }

  function renderFeeRatio(list) {
    const grid = document.querySelector('#kpiGrid');
    if (!grid || !state.start || !state.end) return;
    const current = sum(list);
    const currentRate = current.gmv > 0 ? current.spend / current.gmv : 0;
    const previous = sum(scopedRows(previousYear(state.start), previousYear(state.end)));
    const previousRate = previous.gmv > 0 ? previous.spend / previous.gmv : null;
    const delta = previousRate == null ? null : currentRate - previousRate;
    const deltaText = delta == null ? '同比数据不足' : '同比 ' + (delta >= 0 ? '+' : '') + (delta * 100).toFixed(1) + ' 个百分点';
    const tone = delta == null ? '' : delta <= 0 ? 'up' : 'down';
    grid.insertAdjacentHTML('beforeend', '<article class="kpi-card fee-ratio-card"><div class="kpi-top"><span>费比</span><i class="kpi-icon">%</i></div><strong>' + (currentRate * 100).toFixed(1) + '%</strong><span class="delta ' + tone + '">' + deltaText + '</span></article>');
  }
  function installComparisonToggle() {
    if (document.querySelector('#comparisonMode')) return;
    const host = document.querySelector('.date-command');
    if (!host) return;
    const wrap = document.createElement('div');
    wrap.id = 'comparisonMode';
    wrap.className = 'comparison-mode';
    wrap.innerHTML = '<span>比较口径</span><div><button type="button" data-mode="yoy">同比</button><button type="button" data-mode="period">环比（上月同期）</button></div>';
    host.appendChild(wrap);
    wrap.querySelectorAll('button').forEach(function (button) {
      button.onclick = function () { state.compareMode = button.dataset.mode; renderAll(); };
    });
  }

  function compareLabel() { return state.compareMode === 'period' ? '环比' : '同比'; }
  function comparePeriodLabel() { return state.compareMode === 'period' ? '上月同期' : '去年同期'; }
  function addDays(iso, days) {
    const date = new Date(iso + 'T00:00:00');
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
  function previousMonth(iso) {
    const parts = iso.split('-').map(Number), year = parts[1] === 1 ? parts[0] - 1 : parts[0], month = parts[1] === 1 ? 12 : parts[1] - 1;
    const day = Math.min(parts[2], new Date(year, month, 0).getDate());
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }
  function comparisonPeriod(start, end) {
    if (state.compareMode !== 'period') return { start: previousYear(start), end: previousYear(end) };
    return { start: previousMonth(start), end: previousMonth(end) };
  }
  function syncComparisonState() {
    const url = new URL(location.href);
    url.searchParams.set('compare', state.compareMode === 'period' ? 'period' : 'yoy');
    history.replaceState(null, '', url);
    document.querySelectorAll('#comparisonMode button').forEach(function (button) {
      button.classList.toggle('active', button.dataset.mode === state.compareMode);
    });
  }
  function updateFeeComparison(current, previous) {
    const card = Array.from(document.querySelectorAll('#kpiGrid .kpi-card')).find(function (item) {
      const label = item.querySelector('.kpi-top span'); return label && label.textContent.trim() === '费比';
    });
    if (!card) return;
    const currentRate = current.gmv > 0 ? current.spend / current.gmv : null;
    const previousRate = previous.gmv > 0 ? previous.spend / previous.gmv : null;
    const delta = currentRate == null || previousRate == null ? null : currentRate - previousRate;
    const sub = card.querySelector('.delta');
    if (!sub) return;
    sub.textContent = delta == null ? compareLabel() + '数据不足' : compareLabel() + ' ' + (delta >= 0 ? '+' : '') + (delta * 100).toFixed(1) + ' 个百分点';
    sub.className = 'delta ' + (delta == null ? '' : delta <= 0 ? 'up' : 'down');
  }
  function installPanel() {
    if (document.querySelector('#businessDiagnostics')) return;
    const banner = document.querySelector('.insight-banner');
    if (!banner) return;
    const section = document.createElement('section');
    section.id = 'businessDiagnostics';
    section.className = 'panel business-diagnostics';
    section.innerHTML = [
      '<div class="diagnostics-head">',
      '  <div><span class="section-kicker">自动业务诊断</span><h3>当前值得关注</h3></div>',
      '  <span class="diagnostics-scope" id="diagnosticsScope"></span>',
      '</div>',
      '<div class="diagnostics-summary" id="diagnosticsSummary"></div>',
      '<div class="attention-list" id="attentionList"></div>',
      '<p class="diagnostics-note" id="diagnosticsNote"></p>'
    ].join('');
    banner.insertAdjacentElement('afterend', section);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function num(value) { return Number(value) || 0; }
  function ratio(current, previous) { return previous > 0 ? current / previous - 1 : null; }
  function roi(item) { return num(item.spend) > 0 ? num(item.adRevenue) / num(item.spend) : 0; }
  function conversion(item) { return num(item.visitors) > 0 ? num(item.orders) / num(item.visitors) : 0; }
  function dateText(value) { return String(value || '').replace(/-/g, '.'); }
  function signedPct(value) {
    if (value == null || !isFinite(value)) return '数据不足';
    return (value >= 0 ? '+' : '') + (value * 100).toFixed(1) + '%';
  }
  function signedPoint(value) {
    if (value == null || !isFinite(value)) return '数据不足';
    return (value >= 0 ? '+' : '') + (value * 100).toFixed(1) + '个百分点';
  }
  function moneyShort(value) {
    const n = num(value);
    if (Math.abs(n) >= 100000000) return '¥' + (n / 100000000).toFixed(2) + '亿';
    if (Math.abs(n) >= 10000) return '¥' + (n / 10000).toFixed(1) + '万';
    return '¥' + Math.round(n).toLocaleString('zh-CN');
  }
  function previousYear(iso) {
    const parts = iso.split('-').map(Number);
    const targetYear = parts[0] - 1;
    const lastDay = new Date(targetYear, parts[1], 0).getDate();
    return [targetYear, String(parts[1]).padStart(2, '0'), String(Math.min(parts[2], lastDay)).padStart(2, '0')].join('-');
  }

  function scopedRows(start, end) {
    const selectedLines = Array.isArray(state.lines) ? state.lines : [];
    const selectedSkus = Array.isArray(state.skus) ? state.skus : [];
    return (cube.dailySku || []).filter(function (row) {
      if (row.date < start || row.date > end) return false;
      if (state.shop && state.shop !== 'all' && row.shop !== state.shop) return false;
      if (selectedLines.length && selectedLines.indexOf(row.line) < 0) return false;
      if (selectedSkus.length && selectedSkus.indexOf(row.sku) < 0) return false;
      return true;
    });
  }

  function sum(list) {
    return list.reduce(function (out, row) {
      out.gmv += num(row.gmv);
      out.orders += num(row.orders);
      out.visitors += num(row.visitors);
      out.spend += num(row.spend);
      out.adRevenue += num(row.adRevenue);
      return out;
    }, { gmv: 0, orders: 0, visitors: 0, spend: 0, adRevenue: 0 });
  }

  function groupSku(list) {
    const map = new Map();
    list.forEach(function (row) {
      const key = String(row.sku || row.name || '未命名SKU');
      if (!map.has(key)) map.set(key, {
        sku: key, name: row.name || key, line: row.line || '未分类',
        gmv: 0, orders: 0, visitors: 0, spend: 0, adRevenue: 0
      });
      const item = map.get(key);
      item.gmv += num(row.gmv);
      item.orders += num(row.orders);
      item.visitors += num(row.visitors);
      item.spend += num(row.spend);
      item.adRevenue += num(row.adRevenue);
    });
    return map;
  }

  function scopeLabel() {
    const lines = Array.isArray(state.lines) ? state.lines : [];
    const skus = Array.isArray(state.skus) ? state.skus : [];
    if (skus.length) return '已选 ' + skus.length + ' 个 SKU';
    if (lines.length) return '已选 ' + lines.length + ' 个类目';
    return state.shop && state.shop !== 'all' ? state.shop + ' · 全部类目' : '总体业务';
  }

  function updateBanner(current, previous, days) {
    const title = document.querySelector('.insight-banner h2, .insight-banner h3');
    const body = title && title.nextElementSibling;
    if (!title || !body) return;
    const allCategories = !(state.lines || []).length && !(state.skus || []).length;
    const prefix = allCategories ? '总体业务' : '当前筛选';
    const gmvChange = ratio(current.gmv, previous.gmv);
    const currentRoi = roi(current);
    const previousRoi = roi(previous);
    title.textContent = prefix + ' GMV ' + moneyShort(current.gmv) + '，' + compareLabel() + ' ' + signedPct(gmvChange);
    body.textContent = '成交 ' + Math.round(current.orders).toLocaleString('zh-CN') + ' 单 · 访客 ' +
      Math.round(current.visitors).toLocaleString('zh-CN') + ' · 转化率 ' + (conversion(current) * 100).toFixed(2) +
      '% · 投放 ' + moneyShort(current.spend) + ' · ROI ' + currentRoi.toFixed(2) +
      (previous.spend > 0 ? '（' + comparePeriodLabel() + ' ' + previousRoi.toFixed(2) + '）' : '') + '。';
  }

  function buildAlerts(currentRows, previousRows) {
    const currentMap = groupSku(currentRows);
    const previousMap = groupSku(previousRows);
    const alerts = [];
    const keys = new Set(Array.from(currentMap.keys()).concat(Array.from(previousMap.keys())));

    keys.forEach(function (key) {
      const cur = currentMap.get(key) || { sku: key, name: previousMap.get(key).name, line: previousMap.get(key).line, gmv: 0, orders: 0, visitors: 0, spend: 0, adRevenue: 0 };
      const prev = previousMap.get(key) || { gmv: 0, orders: 0, visitors: 0, spend: 0, adRevenue: 0 };
      const gmvChange = ratio(cur.gmv, prev.gmv);
      const visitorChange = ratio(cur.visitors, prev.visitors);
      const spendChange = ratio(cur.spend, prev.spend);
      const convDelta = conversion(cur) - conversion(prev);
      const curRoi = roi(cur);
      const prevRoi = roi(prev);
      const label = cur.name || key;

      if (prev.gmv >= 5000 && gmvChange != null && gmvChange <= -0.25) {
        const drivers = [];
        if (visitorChange != null && visitorChange <= -0.12) drivers.push('访客' + signedPct(visitorChange));
        if (prev.visitors > 0 && convDelta <= -0.01) drivers.push('转化率' + signedPoint(convDelta));
        alerts.push({
          severity: gmvChange <= -0.4 ? 'danger' : 'warning',
          score: Math.max(0, prev.gmv - cur.gmv) + (gmvChange <= -0.4 ? 100000 : 0),
          title: label + ' 销售明显下滑',
          body: 'GMV ' + compareLabel() + '下降 ' + Math.abs(gmvChange * 100).toFixed(1) + '%' +
            (drivers.length ? '，同时出现' + drivers.join('、') : '，建议检查流量来源、价格和转化链路') + '。',
          meta: cur.line + ' · 当前 ' + moneyShort(cur.gmv)
        });
      }

      if (cur.spend >= 1000 && prev.spend >= 500 && spendChange != null && spendChange >= 0.3 && (gmvChange == null || gmvChange < 0.1)) {
        alerts.push({
          severity: (curRoi < prevRoi * 0.7 || curRoi < 1.3) ? 'danger' : 'warning',
          score: cur.spend * spendChange + 60000,
          title: label + ' 投放效率承压',
          body: '花费' + compareLabel() + '上涨 ' + (spendChange * 100).toFixed(1) + '%，但 GMV ' +
            (gmvChange == null ? '缺少可比增长' : (gmvChange >= 0 ? '仅增长 ' : '下降 ') + Math.abs(gmvChange * 100).toFixed(1) + '%') +
            '；ROI 从 ' + prevRoi.toFixed(2) + ' 变为 ' + curRoi.toFixed(2) + '。',
          meta: cur.line + ' · 当前花费 ' + moneyShort(cur.spend)
        });
      } else if (cur.spend >= 1500 && curRoi > 0 && curRoi < 1.5) {
        alerts.push({
          severity: curRoi < 1 ? 'danger' : 'warning',
          score: cur.spend + 30000,
          title: label + ' ROI 低于关注线',
          body: '当前 ROI 为 ' + curRoi.toFixed(2) + '，建议复核关键词、人群与低效计划。',
          meta: cur.line + ' · 当前花费 ' + moneyShort(cur.spend)
        });
      }
    });

    const selectedLines = Array.isArray(state.lines) ? state.lines : [];
    const selectedSkus = Array.isArray(state.skus) ? state.skus : [];
    const skuLines = new Map();
    (cube.dailySku || []).forEach(function (row) { if (!skuLines.has(String(row.sku))) skuLines.set(String(row.sku), row.line); });
    (base.inventory || []).forEach(function (item) {
      const sku = String(item.sku || '');
      const line = item.line || skuLines.get(sku) || '';
      if (selectedLines.length && selectedLines.indexOf(line) < 0) return;
      if (selectedSkus.length && selectedSkus.indexOf(sku) < 0) return;
      if (num(item.replenish) > 0) {
        alerts.push({ severity: 'danger', score: num(item.replenish) * 1000 + 80000,
          title: (item.name || sku) + ' 存在补货需求',
          body: '建议补货 ' + Math.round(num(item.replenish)).toLocaleString('zh-CN') + ' 件，需关注断货风险。',
          meta: line || '库存预警' });
      } else if (num(item.days) >= 120) {
        alerts.push({ severity: 'warning', score: num(item.days) * 100,
          title: (item.name || sku) + ' 库存周转偏慢',
          body: '当前库存周转约 ' + Math.round(num(item.days)) + ' 天，建议检查促销节奏与采购计划。',
          meta: line || '库存预警' });
      }
    });

    const deduped = new Map();
    alerts.forEach(function (alert) {
      const key = alert.title + '|' + alert.body;
      if (!deduped.has(key) || deduped.get(key).score < alert.score) deduped.set(key, alert);
    });
    return Array.from(deduped.values()).sort(function (a, b) {
      const rank = { danger: 2, warning: 1 };
      return (rank[b.severity] - rank[a.severity]) || (b.score - a.score);
    }).slice(0, 6);
  }

  function renderBusinessAnalysis(currentRows) {
    if (!document.querySelector('#businessDiagnostics')) installPanel();
    const start = state.start;
    const end = state.end;
    if (!start || !end) return;
    const days = Math.max(1, Math.round((new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00')) / DAY) + 1);
    const period = comparisonPeriod(start, end);
    const previousStart = period.start;
    const previousEnd = period.end;
    const previousRows = scopedRows(previousStart, previousEnd);
    const current = sum(currentRows);
    const previous = sum(previousRows);
    const alerts = buildAlerts(currentRows, previousRows);
    const summary = document.querySelector('#diagnosticsSummary');
    const list = document.querySelector('#attentionList');
    const scope = document.querySelector('#diagnosticsScope');
    const note = document.querySelector('#diagnosticsNote');
    if (!summary || !list) return;

    updateBanner(current, previous, days);
    updateFeeComparison(current, previous);
    syncComparisonState();
    scope.textContent = scopeLabel() + ' · ' + dateText(start) + '—' + dateText(end);
    const gmvChange = ratio(current.gmv, previous.gmv);
    const spendChange = ratio(current.spend, previous.spend);
    const roiChange = previous.spend > 0 ? roi(current) - roi(previous) : null;
    const dangerCount = alerts.filter(function (item) { return item.severity === 'danger'; }).length;
    summary.innerHTML = [
      summaryCard('总体 GMV', moneyShort(current.gmv), compareLabel() + ' ' + signedPct(gmvChange), gmvChange),
      summaryCard('投放与 ROI', moneyShort(current.spend) + ' / ' + roi(current).toFixed(2), '花费 ' + signedPct(spendChange) + (roiChange == null ? '' : ' · ROI ' + (roiChange >= 0 ? '+' : '') + roiChange.toFixed(2)), roiChange),
      summaryCard('识别问题', String(alerts.length) + ' 项', dangerCount ? dangerCount + ' 项需优先处理' : '暂无高优先级风险', dangerCount ? -1 : 1)
    ].join('');

    if (!alerts.length) {
      list.innerHTML = '<div class="attention-empty"><span>✓</span><div><strong>当前未识别到明显异常</strong><p>系统已检查销售、流量、转化、投放效率和库存信号。</p></div></div>';
    } else {
      list.innerHTML = alerts.map(function (item) {
        return '<article class="attention-item ' + item.severity + '">' +
          '<span class="attention-icon">' + (item.severity === 'danger' ? '!' : '△') + '</span>' +
          '<div><div class="attention-title"><strong>' + esc(item.title) + '</strong><span>' + (item.severity === 'danger' ? '优先处理' : '建议关注') + '</span></div>' +
          '<p>' + esc(item.body) + '</p><small>' + esc(item.meta) + '</small></div></article>';
      }).join('');
    }
    note.textContent = '诊断口径：' + dateText(start) + '—' + dateText(end) + ' ' + compareLabel() + ' ' +
      dateText(previousStart) + '—' + dateText(previousEnd) + '；规则基于当前筛选范围自动计算，库存采用 ' +
      dateText((base.meta && base.meta.inventoryDate) || (base.meta && base.meta.maxDate) || end) + ' 快照。';
  }

  function summaryCard(label, value, sub, signal) {
    const tone = signal == null ? '' : signal < 0 ? 'down' : signal > 0 ? 'up' : '';
    return '<div class="diagnostic-card"><span>' + esc(label) + '</span><strong>' + esc(value) + '</strong><small class="' + tone + '">' + esc(sub) + '</small></div>';
  }

  boot();
})();
