(function () {
  'use strict';
  let attempts = 0;
  let keywordType = '全部';
  let keywordQuery = '';
  let keywordSort = 'revenue';

  function boot() {
    attempts += 1;
    if (!window.DASHBOARD_DATA_V2 || typeof cube === 'undefined' || typeof state === 'undefined' ||
        typeof renderDetail !== 'function' || !document.querySelector('#skuDetail')) {
      if (attempts < 160) window.setTimeout(boot, 50);
      return;
    }
    if (document.documentElement.dataset.keywordDrill === 'ready') return;
    document.documentElement.dataset.keywordDrill = 'ready';
    installPanel();
    const previousRenderDetail = renderDetail;
    renderDetail = function (list) {
      previousRenderDetail(list);
      renderKeywords();
    };
    if (state.sku) renderKeywords();
  }

  function installPanel() {
    if (document.querySelector('#keywordPerformance')) return;
    const detail = document.querySelector('#skuDetail');
    if (!detail) return;
    const section = document.createElement('section');
    section.id = 'keywordPerformance';
    section.className = 'keyword-performance';
    section.innerHTML = [
      '<div class="keyword-head">',
      ' <div><span class="section-kicker">关键词表现</span><h4>SKU × 关键词投放明细</h4><p>“访问点击”为广告点击口径，并非去重访客。</p></div>',
      ' <div class="keyword-tools"><input id="keywordSearch" type="search" placeholder="搜索关键词"><select id="keywordSort"><option value="revenue">按成交金额</option><option value="spend">按花费</option><option value="clicks">按访问点击</option><option value="roi">按 ROI</option></select></div>',
      '</div>',
      '<div class="keyword-types" id="keywordTypes"></div>',
      '<div class="keyword-summary" id="keywordSummary"></div>',
      '<div class="keyword-table-wrap"><table class="keyword-table"><thead><tr><th>关键词</th><th>分类</th><th>访问点击</th><th>花费</th><th>成交转化率</th><th>成交金额</th><th>CPC</th><th>ROI</th></tr></thead><tbody id="keywordBody"></tbody></table></div>',
      '<div class="keyword-mobile" id="keywordMobile"></div>',
      '<p class="keyword-note" id="keywordNote"></p>'
    ].join('');
    detail.appendChild(section);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }
  function n(value) { return Number(value) || 0; }
  function currency(value) { return '¥' + n(value).toLocaleString('zh-CN', { maximumFractionDigits: 1 }); }
  function percent(value) { return (n(value) * 100).toFixed(1) + '%'; }
  function metric(item, key) {
    if (key === 'roi') return item.spend > 0 ? item.revenue / item.spend : 0;
    return n(item[key]);
  }

  function aggregateKeywords() {
    const map = new Map();
    (cube.keywordSku || []).forEach(function (row) {
      if (row.sku !== state.sku || row.date < state.start || row.date > state.end) return;
      const key = row.type + '|' + row.keyword;
      if (!map.has(key)) map.set(key, { type: row.type || '其他', keyword: row.keyword || '未命名关键词', impressions: 0, clicks: 0, spend: 0, orders: 0, revenue: 0 });
      const item = map.get(key);
      item.impressions += n(row.impressions);
      item.clicks += n(row.clicks);
      item.spend += n(row.spend);
      item.orders += n(row.orders);
      item.revenue += n(row.revenue);
    });
    return Array.from(map.values());
  }

  function renderKeywords() {
    const panel = document.querySelector('#keywordPerformance');
    if (!panel || !state.sku) return;
    const all = aggregateKeywords();
    const typeOrder = ['全部', '品牌词', '成分词', '功效词', '竞品词', '行业词', '品类词', '其他'];
    const available = new Set(all.map(function (row) { return row.type; }));
    if (keywordType !== '全部' && !available.has(keywordType)) keywordType = '全部';
    const types = typeOrder.filter(function (type) { return type === '全部' || available.has(type); });
    document.querySelector('#keywordTypes').innerHTML = types.map(function (type) {
      const count = type === '全部' ? all.length : all.filter(function (row) { return row.type === type; }).length;
      return '<button type="button" data-type="' + esc(type) + '" class="' + (keywordType === type ? 'active' : '') + '">' + esc(type) + '<span>' + count + '</span></button>';
    }).join('');

    const q = keywordQuery.trim().toLowerCase();
    const filtered = all.filter(function (row) {
      return (keywordType === '全部' || row.type === keywordType) && (!q || row.keyword.toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return metric(b, keywordSort) - metric(a, keywordSort); });
    const totals = filtered.reduce(function (out, row) {
      out.clicks += row.clicks; out.spend += row.spend; out.orders += row.orders; out.revenue += row.revenue; return out;
    }, { clicks: 0, spend: 0, orders: 0, revenue: 0 });
    const conv = totals.clicks > 0 ? totals.orders / totals.clicks : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : null;
    const roi = totals.spend > 0 ? totals.revenue / totals.spend : 0;
    document.querySelector('#keywordSummary').innerHTML = [
      ['访问点击', Math.round(totals.clicks).toLocaleString('zh-CN')],
      ['花费', currency(totals.spend)],
      ['成交转化率', percent(conv)],
      ['成交金额', currency(totals.revenue)],
      ['CPC / ROI', (cpc == null ? '-' : currency(cpc)) + ' / ' + roi.toFixed(2)]
    ].map(function (item) { return '<div><small>' + item[0] + '</small><strong>' + item[1] + '</strong></div>'; }).join('');

    const visible = filtered.slice(0, 100);
    const body = document.querySelector('#keywordBody');
    const mobile = document.querySelector('#keywordMobile');
    if (!visible.length) {
      body.innerHTML = '<tr><td colspan="8" class="keyword-empty">当前 SKU 在所选日期和分类下没有关键词投放数据</td></tr>';
      mobile.innerHTML = '<div class="keyword-empty">当前 SKU 在所选日期和分类下没有关键词投放数据</div>';
    } else {
      body.innerHTML = visible.map(rowHtml).join('');
      mobile.innerHTML = visible.map(cardHtml).join('');
    }
    document.querySelector('#keywordNote').textContent = '共 ' + filtered.length + ' 个关键词' + (filtered.length > 100 ? '，当前展示前 100 个' : '') + '；成交转化率 = 总订单行 ÷ 访问点击，成交金额采用广告归因总订单金额。';

    document.querySelectorAll('#keywordTypes button').forEach(function (button) {
      button.onclick = function () { keywordType = button.dataset.type; renderKeywords(); };
    });
    const search = document.querySelector('#keywordSearch');
    search.value = keywordQuery;
    search.oninput = function () { keywordQuery = search.value; renderKeywords(); document.querySelector('#keywordSearch').focus(); };
    const sort = document.querySelector('#keywordSort');
    sort.value = keywordSort;
    sort.onchange = function () { keywordSort = sort.value; renderKeywords(); };
  }

  function rowHtml(row) {
    const conv = row.clicks > 0 ? row.orders / row.clicks : 0;
    const cpc = row.clicks > 0 ? row.spend / row.clicks : null;
    const roi = row.spend > 0 ? row.revenue / row.spend : 0;
    return '<tr><td><strong>' + esc(row.keyword) + '</strong></td><td><span class="keyword-chip">' + esc(row.type) + '</span></td><td>' + Math.round(row.clicks).toLocaleString('zh-CN') + '</td><td>' + currency(row.spend) + '</td><td>' + percent(conv) + '</td><td>' + currency(row.revenue) + '</td><td>' + (cpc == null ? '-' : currency(cpc)) + '</td><td class="' + (roi < 1.5 ? 'metric-bad' : 'metric-good') + '">' + roi.toFixed(2) + '</td></tr>';
  }

  function cardHtml(row) {
    const conv = row.clicks > 0 ? row.orders / row.clicks : 0;
    const cpc = row.clicks > 0 ? row.spend / row.clicks : null;
    const roi = row.spend > 0 ? row.revenue / row.spend : 0;
    return '<article class="keyword-card"><div><strong>' + esc(row.keyword) + '</strong><span class="keyword-chip">' + esc(row.type) + '</span></div><dl><div><dt>访问点击</dt><dd>' + Math.round(row.clicks).toLocaleString('zh-CN') + '</dd></div><div><dt>花费</dt><dd>' + currency(row.spend) + '</dd></div><div><dt>转化率</dt><dd>' + percent(conv) + '</dd></div><div><dt>成交金额</dt><dd>' + currency(row.revenue) + '</dd></div><div><dt>CPC</dt><dd>' + (cpc == null ? '-' : currency(cpc)) + '</dd></div><div><dt>ROI</dt><dd>' + roi.toFixed(2) + '</dd></div></dl></article>';
  }

  boot();
})();
