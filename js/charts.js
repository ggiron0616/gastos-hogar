/* Gráficos (Chart.js) — estilo "Verde Hogar": grandes, colores vivos y cifras visibles sobre el gráfico */
const Charts = (() => {
  const live = {};
  Chart.defaults.font.family = '"Segoe UI", system-ui, sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#6B7A78';
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.animation = { duration: 900, easing: 'easeOutQuart' };

  /* ---- utilidades ---- */
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (h, t, to) => '#' + rgb(h).map(v => Math.round(v + (to - v) * t).toString(16).padStart(2, '0')).join('');
  const lighten = (h, t) => mix(h, t, 255);
  const alpha = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; };
  const isLight = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) > 165; };
  const money0 = v => '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money2 = v => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const tip = {
    backgroundColor: 'rgba(9,40,37,.95)', borderColor: 'rgba(255,255,255,.14)', borderWidth: 1,
    titleFont: { family: 'Georgia, serif', size: 14, weight: '700' }, bodyFont: { size: 13 }, titleColor: '#fff', bodyColor: '#E7F3EF',
    padding: { x: 14, y: 11 }, cornerRadius: 12, caretSize: 7, caretPadding: 8, bodySpacing: 6, titleMarginBottom: 8,
    usePointStyle: true, boxWidth: 9, boxHeight: 9, boxPadding: 5,
  };
  const grid = { color: 'rgba(18,64,60,.09)', borderDash: [3, 5], drawTicks: false };
  const yAxis = { beginAtZero: true, grid, border: { display: false }, ticks: { callback: money0, maxTicksLimit: 6, padding: 10, color: '#8A9694', font: { size: 11 } } };
  const xAxis = { grid: { display: false }, border: { display: false }, ticks: { padding: 6, color: '#6B7A78', font: { weight: '600' } } };
  const legend = { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 9, boxHeight: 9, padding: 18, font: { size: 12, weight: '600' }, color: '#3D4E4C' } };

  /* ---- plugins de dibujo ---- */
  // Brillo suave bajo las líneas (datasets con la propiedad glow)
  const glow = {
    id: 'glow',
    beforeDatasetDraw(chart, args) { const d = chart.data.datasets[args.index]; if (!d.glow) return; const c = chart.ctx; c.save(); c.shadowColor = d.glow; c.shadowBlur = 18; c.shadowOffsetY = 8; },
    afterDatasetDraw(chart, args) { if (chart.data.datasets[args.index].glow) chart.ctx.restore(); },
  };
  const pill = (c, area, x, y, text, bg, fg = '#fff') => {
    c.save(); c.font = '700 13px "Segoe UI", sans-serif';
    const w = c.measureText(text).width + 18, h = 26, px = Math.max(area.left, Math.min(area.right - w, x - w / 2)), py = y - h / 2;
    c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
    c.fillStyle = bg; c.beginPath(); c.roundRect(px, py, w, h, 13); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, px + w / 2, py + h / 2 + 1);
    c.restore();
  };
  const hGradient = (chart, stops) => { const a = chart.chartArea; if (!a) return stops[0][1]; const g = chart.ctx.createLinearGradient(a.left, 0, a.right, 0); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; };
  const vGradient = (chart, top, bottom) => { const a = chart.chartArea; if (!a) return top; const g = chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); g.addColorStop(0, top); g.addColorStop(1, bottom); return g; };

  // Porcentaje dentro de cada porción del anillo
  const sliceLabels = {
    id: 'sliceLabels',
    afterDatasetsDraw(chart) {
      const rows = chart.options.plugins.sliceLabels && chart.options.plugins.sliceLabels.rows; if (!rows) return;
      const data = chart.data.datasets[0].data, total = data.reduce((a, b) => a + b, 0), sel = chart.options.plugins.sliceLabels.selected, c = chart.ctx;
      c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach((arc, i) => {
        const pct = total ? data[i] / total * 100 : 0; if (pct < 4.5 || (sel && rows[i].id !== sel)) return;
        const p = arc.tooltipPosition();
        c.font = `800 ${pct > 12 ? 16 : 13}px "Segoe UI", sans-serif`;
        const light = isLight(rows[i].color); c.fillStyle = light ? '#1C2B2A' : '#fff';
        if (!light) { c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 4; }
        c.fillText(Math.round(pct) + '%', p.x, p.y + 1); c.shadowColor = 'transparent';
      });
      c.restore();
    },
  };
  // Etiquetas de valor en el ritmo del mes: hoy vs. mismo día del mes anterior
  const endLabels = {
    id: 'endLabels',
    afterDatasetsDraw(chart) {
      const o = chart.options.plugins.endLabels; if (!o) return; const c = chart.ctx, a = chart.chartArea;
      const mc = chart.getDatasetMeta(0), mp = chart.getDatasetMeta(1), pc = mc.data[o.idx], pp = mp.data[o.idx]; if (!pc) return;
      const vc = chart.data.datasets[0].data[o.idx], vp = chart.data.datasets[1].data[o.idx];
      const prevBelow = pp && pp.y > pc.y;
      pill(c, a, pc.x, pc.y - 24, money0(vc), '#0B7B7C');
      if (pp && vp != null) {
        c.save(); c.fillStyle = '#fff'; c.strokeStyle = '#FF9F1C'; c.lineWidth = 3; c.beginPath(); c.arc(pp.x, pp.y, 6, 0, 7); c.fill(); c.stroke(); c.restore();
        pill(c, a, pp.x, prevBelow ? pp.y + 26 : pp.y - 26, 'mes ant. ' + money0(vp), '#FF9F1C', '#3A2300');
      }
    },
  };
  // Totales sobre cada barra y cifras dentro de los tramos grandes
  const barLabels = {
    id: 'barLabels',
    afterDatasetsDraw(chart) {
      const c = chart.ctx, sets = chart.data.datasets, n = chart.data.labels.length, compact = chart.width < 520;
      const fmtTot = v => compact ? '$' + (v / 1000).toFixed(1) + 'k' : money0(v);
      c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
      sets.forEach((ds, di) => chart.getDatasetMeta(di).data.forEach((bar, i) => {
        const v = ds.data[i], h = Math.abs(bar.base - bar.y); if (!v || h < 20 || bar.width < 50) return;
        const col = ds._color || '#888', light = isLight(col);
        c.font = '700 11px "Segoe UI", sans-serif'; c.fillStyle = light ? '#1C2B2A' : '#fff';
        if (!light) { c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 3; }
        c.fillText(money0(v), bar.x, (bar.y + bar.base) / 2 + 1); c.shadowColor = 'transparent';
      }));
      for (let i = 0; i < n; i++) {
        let tot = 0, top = Infinity, x = 0;
        sets.forEach((ds, di) => { const v = ds.data[i]; if (v) { tot += v; const b = chart.getDatasetMeta(di).data[i]; top = Math.min(top, b.y); x = b.x; } });
        if (!tot) continue;
        c.font = `800 ${compact ? 12 : 14}px Georgia, serif`; c.fillStyle = '#12403C'; c.fillText(fmtTot(tot), x, top - 12);
      }
      c.restore();
    },
  };

  function make(id, config) {
    if (live[id]) live[id].destroy();
    const el = document.getElementById(id);
    if (!el) return null;
    config.plugins = [...(config.plugins || []), glow];
    live[id] = new Chart(el, config);
    return live[id];
  }
  function destroyAll() { Object.keys(live).forEach(k => { live[k].destroy(); delete live[k]; }); }

  /* ---- Anillo por categoría: grande, grueso, con % dentro ---- */
  function donut(id, rows, { onPick, selected, animate = true, labels = true } = {}) {
    return make(id, {
      type: 'doughnut',
      plugins: labels ? [sliceLabels] : [],
      data: { labels: rows.map(r => r.name), datasets: [{
        data: rows.map(r => r.value),
        backgroundColor: ctx => {
          const r = rows[ctx.dataIndex]; if (!r) return '#ccc';
          const dim = selected && r.id !== selected;
          const a = ctx.chart.chartArea; if (!a) return r.color;
          const g = ctx.chart.ctx.createLinearGradient(a.left, a.top, a.right, a.bottom);
          g.addColorStop(0, dim ? alpha(lighten(r.color, .3), .3) : lighten(r.color, .22)); g.addColorStop(1, dim ? alpha(r.color, .3) : r.color);
          return g;
        },
        borderWidth: 0, spacing: 2, borderRadius: 6, hoverOffset: 14,
        offset: rows.map(r => r.id === selected ? 16 : 0),
      }] },
      options: {
        animation: animate ? { animateRotate: true, animateScale: true, duration: 1100 } : false,
        maintainAspectRatio: false, cutout: labels ? '58%' : '70%', layout: { padding: 16 },
        plugins: { sliceLabels: { rows, selected }, tooltip: { ...tip, callbacks: { label: c => ` ${c.label}: ${money2(c.parsed)}` } } },
        onClick: (e, els) => { if (els.length && onPick) onPick(rows[els[0].index].id); },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
      },
    });
  }

  /* ---- Tendencia mensual (sin cambios de diseño) ---- */
  function trend(id, months, totals, budget, animate = true) {
    const last = totals.length - 1;
    return make(id, {
      type: 'line',
      data: { labels: months.map(monthShort), datasets: [
        { label: 'Gastado', data: totals, borderWidth: 4, tension: .38, fill: true, glow: 'rgba(22,160,150,.45)',
          borderColor: ctx => hGradient(ctx.chart, [[0, '#19B8D4'], [.55, '#12C48B'], [1, '#0B9C86']]),
          backgroundColor: ctx => vGradient(ctx.chart, 'rgba(18,196,139,.38)', 'rgba(25,184,212,0)'),
          pointBackgroundColor: '#fff', pointBorderColor: '#12A585', pointBorderWidth: 3,
          pointRadius: totals.map((_, i) => i === last ? 8 : 5), pointHoverRadius: 10, pointHitRadius: 20 },
        { label: 'Presupuesto', data: months.map(() => budget), borderColor: '#FF5A4D', borderDash: [2, 7], borderCapStyle: 'round', borderWidth: 2.5, pointRadius: 0, pointHitRadius: 0, fill: false },
      ] },
      options: {
        animation: animate ? undefined : false,
        maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, layout: { padding: { top: 10, right: 12 } },
        scales: { x: xAxis, y: yAxis },
        plugins: { legend, tooltip: { ...tip, callbacks: { label: c => ` ${c.dataset.label}: ${money2(c.parsed.y)}` } } },
      },
    });
  }

  /* ---- Categorías por mes: barras anchas con totales y cifras ---- */
  function stacked(id, months, series) {
    return make(id, {
      type: 'bar',
      plugins: [barLabels],
      data: { labels: months.map(monthShort), datasets: series.map(s => ({
        label: s.name, data: s.data, _color: s.color, borderColor: '#fff', borderWidth: 1.5, borderRadius: 6, borderSkipped: false, maxBarThickness: 74,
        backgroundColor: ctx => vGradient(ctx.chart, lighten(s.color, .18), s.color),
      })) },
      options: {
        maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, layout: { padding: { top: 24 } },
        scales: { x: { ...xAxis, stacked: true, ticks: { ...xAxis.ticks, maxRotation: 0, autoSkip: false, font: ctx => ({ weight: '700', size: ctx.chart.width < 520 ? 11 : 13 }) } }, y: { ...yAxis, stacked: true, grace: '4%' } },
        plugins: { legend: { ...legend, labels: { ...legend.labels, padding: 12, font: { size: 11, weight: '600' } } }, tooltip: { ...tip, itemSort: (a, b) => b.parsed.y - a.parsed.y, callbacks: { label: c => c.parsed.y > 0 ? ` ${c.dataset.label}: ${money2(c.parsed.y)}` : null } } },
      },
    });
  }

  /* ---- Ritmo del mes: línea gruesa, relleno vivo y etiquetas de valor ---- */
  function cumulative(id, labels, cur, prev, curLabel, prevLabel) {
    const lastIdx = cur.reduce((a, v, i) => v != null ? i : a, -1);
    return make(id, {
      type: 'line',
      plugins: [endLabels],
      data: { labels, datasets: [
        { label: curLabel, data: cur, borderWidth: 5, tension: .3, fill: true, spanGaps: false, glow: 'rgba(47,123,255,.45)',
          borderColor: ctx => hGradient(ctx.chart, [[0, '#2F7BFF'], [.6, '#19B8D4'], [1, '#12C48B']]),
          backgroundColor: ctx => vGradient(ctx.chart, 'rgba(47,123,255,.42)', 'rgba(18,196,139,.02)'),
          pointBackgroundColor: '#fff', pointBorderColor: '#0B7B7C', pointBorderWidth: 4, pointRadius: cur.map((_, i) => i === lastIdx ? 9 : 0), pointHoverRadius: 9, pointHitRadius: 14 },
        { label: prevLabel, data: prev, borderColor: '#FF9F1C', borderWidth: 3, borderDash: [9, 7], borderCapStyle: 'round', tension: .3, pointRadius: 0, pointHoverRadius: 7, fill: false },
      ] },
      options: {
        maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, layout: { padding: { top: 44, right: 22 } },
        scales: { x: { ...xAxis, ticks: { ...xAxis.ticks, maxTicksLimit: 10 }, title: { display: true, text: 'Día del mes', color: '#8A9694', font: { size: 11 } } }, y: yAxis },
        plugins: { endLabels: { idx: lastIdx }, legend, tooltip: { ...tip, callbacks: { title: i => 'Día ' + i[0].label, label: c => c.parsed.y == null ? null : ` ${c.dataset.label}: ${money2(c.parsed.y)}` } } },
      },
    });
  }

  return { donut, trend, stacked, cumulative, destroyAll };
})();
