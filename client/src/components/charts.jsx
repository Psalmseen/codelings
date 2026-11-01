import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Single-series charts drawn as SVG. Colours come from --viz-* (index.css), so they follow the theme.
// Specs: bars <= 24px with a 4px rounded data-end, 2px lines, hairline solid grid, text in ink colours.

const BAR_MAX = 24;
const AXIS_W = 36;
const AXIS_H = 22;

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** Rounds the top of the axis up to a clean number (1, 2, 5 × 10ⁿ). */
function niceMax(value) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * power >= value);
  return step * power;
}

/** Y position of `value` in a chart of `height`: one scale shared by gridlines, bars and lines. */
const valueY = (value, max, height) => AXIS_H / 2 + (height - AXIS_H * 1.5) * (1 - value / max);

export const compact = (n) => (n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n));

/** Floating readout: value first (strong), label second. */
function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="glass-strong pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl px-3 py-2 text-sm whitespace-nowrap"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="font-black text-ink">{tip.value}</p>
      <p className="text-xs font-bold text-ink-muted">{tip.label}</p>
    </div>
  );
}

/** Column path with a rounded top and a square base. */
function columnPath(x, y, w, h) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function YAxis({ max, height, width, format }) {
  return [0, max / 2, max].map((tick) => {
    const y = valueY(tick, max, height);
    return (
      <g key={tick}>
        <line x1={AXIS_W} x2={width} y1={y} y2={y} stroke="var(--tint)" strokeOpacity={tick === 0 ? 0.25 : 0.1} strokeWidth={1} />
        <text x={AXIS_W - 6} y={y} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--ink-faint)" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {format(tick)}
        </text>
      </g>
    );
  });
}

/** Vertical bars, one per item: `data` = [{ label, value, tip? }]. */
export function ColumnChart({ data, height = 180, format = compact, label = (d) => d.label }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const plotW = Math.max(0, width - AXIS_W);
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(BAR_MAX, band - 2)); // at least the 2px gap between neighbours
  const plotH = height - AXIS_H;
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 44)))); // thin labels so they never collide

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img">
          <YAxis max={max} height={height} width={width} format={format} />
          {data.map((d, i) => {
            const x = AXIS_W + i * band + (band - barW) / 2;
            const y = valueY(d.value, max, height);
            const h = valueY(0, max, height) - y;
            const hovered = tip?.index === i;
            return (
              <g key={i}>
                {h > 0 && <path d={columnPath(x, y, barW, h)} fill="var(--viz-1)" opacity={tip && !hovered ? 0.55 : 1} />}
                {i % every === 0 && (
                  <text x={i === 0 ? x : x + barW / 2} y={height - 4} textAnchor={i === 0 ? 'start' : 'middle'} fontSize="11" fill="var(--ink-faint)">
                    {label(d)}
                  </text>
                )}
                {/* The whole column band is the hover target, not just the painted bar */}
                <rect
                  x={AXIS_W + i * band}
                  y={0}
                  width={band}
                  height={plotH}
                  fill="transparent"
                  tabIndex={0}
                  onPointerEnter={() => setTip({ index: i, x: x + barW / 2, y: Math.min(y, plotH - 10), value: format(d.value), label: d.tip ?? d.label })}
                  onFocus={() => setTip({ index: i, x: x + barW / 2, y: Math.min(y, plotH - 10), value: format(d.value), label: d.tip ?? d.label })}
                  onBlur={() => setTip(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

/** Line + soft area for a trend: `data` = [{ label, value, tip? }]. The last value is labelled. */
export function LineChart({ data, height = 180, format = compact, label = (d) => d.label }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const plotW = Math.max(0, width - AXIS_W - 8 - 44); // room for the end label
  const step = data.length > 1 ? plotW / (data.length - 1) : 0;
  const pointAt = (d, i) => [AXIS_W + 8 + i * step, valueY(d.value, max, height)];
  const points = data.map(pointAt);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join('');
  const baseY = valueY(0, max, height);
  const area = points.length ? `${line}L${points.at(-1)[0]},${baseY}L${points[0][0]},${baseY}Z` : '';
  const every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(plotW / 52))));
  const [endX, endY] = points.at(-1) ?? [0, 0];

  // The crosshair snaps to the nearest x; readers aim at a date, not at a 2px line
  function onMove(e) {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const i = Math.max(0, Math.min(data.length - 1, Math.round((x - AXIS_W - 8) / (step || 1))));
    setHover(i);
  }

  const tip = hover !== null && points[hover] && { x: points[hover][0], y: points[hover][1], value: format(data[hover].value), label: data[hover].tip ?? data[hover].label };

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
      {width > 0 && data.length > 0 && (
        <svg width={width} height={height} role="img" onPointerMove={onMove}>
          <YAxis max={max} height={height} width={width} format={format} />
          <path d={area} fill="var(--viz-1)" opacity={0.1} />
          <path d={line} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {tip && <line x1={tip.x} x2={tip.x} y1={AXIS_H / 2} y2={baseY} stroke="var(--tint)" strokeOpacity={0.3} strokeWidth={1} />}
          {data.map((d, i) =>
            i % every === 0 ? (
              <text key={i} x={points[i][0]} y={height - 4} textAnchor={i === 0 ? 'start' : 'middle'} fontSize="11" fill="var(--ink-faint)">
                {label(d)}
              </text>
            ) : null
          )}
          <circle cx={endX} cy={endY} r={4} fill="var(--viz-1)" stroke="var(--surface)" strokeWidth={2} />
          <text x={endX + 8} y={endY} dy="0.32em" fontSize="12" fontWeight="800" fill="var(--ink-2)">
            {format(data.at(-1).value)}
          </text>
          {tip && <circle cx={tip.x} cy={tip.y} r={4} fill="var(--viz-1)" stroke="var(--surface)" strokeWidth={2} />}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

/** Horizontal bars with the value at the tip: `items` = [{ label, value, max?, display?, sub? }]. */
export function BarList({ items, max: fixedMax, format = (v) => v }) {
  const max = fixedMax ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} title={`${item.label}: ${item.display ?? format(item.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-bold text-ink-2">{item.label}</span>
            <span className="shrink-0 font-black text-ink" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {item.display ?? format(item.value)}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-tint/10">
            <div className="h-full rounded-r-[4px] bg-viz-1" style={{ width: `${Math.max(0, Math.min(100, (item.value / max) * 100))}%` }} />
          </div>
          {item.sub && <p className="mt-1 text-xs font-semibold text-ink-faint">{item.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

const HEAT_LEVELS = ['color-mix(in srgb, var(--tint) 8%, transparent)', 'var(--viz-heat-1)', 'var(--viz-heat-2)', 'var(--viz-heat-3)', 'var(--viz-heat-4)'];
const CELL = 12;
const GAP = 2;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/** Calendar heatmap of minutes per day: `days` = [{ date: 'YYYY-MM-DD', minutes, xp, lessons }]. */
export function CalendarHeatmap({ days }) {
  const [tip, setTip] = useState(null);
  const scroller = useRef(null);
  useEffect(() => {
    scroller.current.scrollLeft = scroller.current.scrollWidth; // most recent weeks first on narrow screens
  }, []);
  const level = (m) => (m <= 0 ? 0 : m < 10 ? 1 : m < 20 ? 2 : m < 40 ? 3 : 4);
  const offset = (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7; // first column starts on Monday
  const weeks = Math.ceil((days.length + offset) / 7);
  const left = 28;
  const top = 16;
  const months = [];
  days.forEach((d, i) => {
    const col = Math.floor((i + offset) / 7);
    const month = new Date(`${d.date}T00:00:00Z`).toLocaleString(undefined, { month: 'short', timeZone: 'UTC' });
    if (d.date.endsWith('-01') || i === 0) months.push({ col, month });
  });

  return (
    <div className="relative" onPointerLeave={() => setTip(null)}>
      <div ref={scroller} className="overflow-x-auto pb-1">
        <svg width={left + weeks * (CELL + GAP)} height={top + 7 * (CELL + GAP)} role="img">
          {months
            .filter((m, i) => i === 0 || m.col - months[i - 1].col >= 3)
            .map((m) => (
              <text key={`${m.col}-${m.month}`} x={left + m.col * (CELL + GAP)} y={10} fontSize="10" fill="var(--ink-faint)">
                {m.month}
              </text>
            ))}
          {DAY_LABELS.map((d, row) =>
            d ? (
              <text key={d} x={0} y={top + row * (CELL + GAP) + CELL - 2} fontSize="10" fill="var(--ink-faint)">
                {d}
              </text>
            ) : null
          )}
          {days.map((d, i) => {
            const col = Math.floor((i + offset) / 7);
            const row = (i + offset) % 7;
            const x = left + col * (CELL + GAP);
            const y = top + row * (CELL + GAP);
            const show = () =>
              setTip({
                date: d.date,
                x: x + CELL / 2,
                y,
                value: d.minutes ? `${d.minutes} min · ${d.lessons} lesson${d.lessons === 1 ? '' : 's'} · ${d.xp} XP` : 'No activity',
                label: new Date(`${d.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }),
              });
            return (
              <rect
                key={d.date}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={3}
                fill={HEAT_LEVELS[level(d.minutes)]}
                stroke={tip?.date === d.date ? 'var(--ink)' : 'none'}
                tabIndex={0}
                onPointerEnter={show}
                onFocus={show}
                onBlur={() => setTip(null)}
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-xs font-bold text-ink-faint">
        Less
        {HEAT_LEVELS.map((color) => (
          <span key={color} className="size-3 rounded-[3px]" style={{ background: color }} />
        ))}
        More
      </div>
      <Tooltip tip={tip} />
    </div>
  );
}

/** Card with a title and a Chart / Table switch, so every value is reachable without hovering. */
export function ChartCard({ title, subtitle, table, children, className = '' }) {
  const [view, setView] = useState('chart');
  return (
    <section className={`card ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-ink">{title}</h3>
          {subtitle && <p className="text-sm font-semibold text-ink-muted">{subtitle}</p>}
        </div>
        {table && (
          <div className="flex shrink-0 rounded-xl bg-tint/5 p-0.5 text-xs font-extrabold">
            {['chart', 'table'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`cursor-pointer rounded-lg px-2.5 py-1 capitalize transition ${view === v ? 'bg-tint/15 text-ink' : 'text-ink-muted hover:text-ink'}`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
      {view === 'chart' || !table ? children : <DataTable columns={table.columns} rows={table.rows} />}
    </section>
  );
}

export function DataTable({ columns, rows, empty = 'No data yet' }) {
  if (!rows.length) return <p className="py-4 text-center text-sm font-bold text-ink-faint">{empty}</p>;
  return (
    <div className="max-h-80 overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-surface/90 backdrop-blur">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={`px-2 py-2 font-extrabold text-ink-muted ${i ? 'text-right' : ''}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-tint/5">
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((value, i) => (
                <td key={i} className={`px-2 py-1.5 font-semibold text-ink-2 ${i ? 'text-right' : ''}`} style={i ? { fontVariantNumeric: 'tabular-nums' } : undefined}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Headline number: label, value, optional note. */
export function StatTile({ label, value, note }) {
  return (
    <div className="card p-4">
      <p className="text-sm font-bold text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink">{value ?? '–'}</p>
      {note && <p className="mt-0.5 text-xs font-semibold text-ink-faint">{note}</p>}
    </div>
  );
}
