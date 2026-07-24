import { useMemo, useState } from "react";
import type { MonthBucket } from "../../lib/financeiro-timeline";
import { formatCompactBRL, formatCurrency } from "../../lib/format";

/* ------------------------------------------------------------------ */
/*  Fluxo de caixa mensal (entradas × saídas)                          */
/*                                                                     */
/*  Cores validadas p/ daltonismo (deutan ΔE ≥ 8):                     */
/*    entradas #059669 · saídas #f43f5e                                */
/*  Previsto usa contorno tracejado (codificação secundária).          */
/* ------------------------------------------------------------------ */

const COLOR_IN = "#059669";
const COLOR_OUT = "#f43f5e";

const PAD_L = 64;
const PAD_R = 16;
const BARS_TOP = 8;
const BARS_H = 230;
const PAD_B = 34;
const H = BARS_TOP + BARS_H + PAD_B;

interface Props {
  months: MonthBucket[];
  showForecast?: boolean;
}

/** Ticks "bonitos": 4 divisões a partir do máximo. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10]
    .map((m) => m * mag)
    .find((s) => s * 4 >= max) ?? raw;
  return [0, 1, 2, 3, 4].map((i) => i * step);
}

export function TimelineChart({ months, showForecast }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (months.length === 0) return null;

    const maxBar = Math.max(
      1,
      ...months.map((m) =>
        Math.max(
          m.inflow,
          m.outflow,
          showForecast ? m.forecastIn : 0,
          showForecast ? m.forecastOut : 0
        )
      )
    );
    const ticks = niceTicks(maxBar);
    const barMax = ticks[ticks.length - 1];

    const W = Math.max(680, PAD_L + PAD_R + months.length * 68);
    const innerW = W - PAD_L - PAD_R;
    const slot = innerW / months.length;
    const barW = Math.min(22, Math.max(8, slot * 0.28));

    const base = BARS_TOP + BARS_H;
    const yBar = (v: number) => base - (v / barMax) * BARS_H;

    const cols = months.map((m, i) => ({
      m,
      i,
      cx: PAD_L + slot * i + slot / 2,
    }));

    return { W, slot, barW, cols, yBar, base, ticks };
  }, [months, showForecast]);

  if (!chart) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        Sem dados no período selecionado.
      </div>
    );
  }

  const hovered = hover !== null ? chart.cols[hover] : null;
  // Tooltip segue a coluna; vira para a esquerda na metade final.
  const tooltipLeftPct = hovered ? (hovered.cx / chart.W) * 100 : 0;
  const tooltipFlip = hovered ? hovered.cx > chart.W * 0.62 : false;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chart.W} ${H}`}
        className="min-w-full"
        role="img"
        aria-label="Fluxo de caixa mensal (entradas e saídas) — os mesmos dados estão na tabela Resumo mensal"
        onMouseLeave={() => setHover(null)}
      >
        {chart.ticks.map((t) => (
          <g key={`t-${t}`}>
            <line
              x1={PAD_L}
              x2={chart.W - PAD_R}
              y1={chart.yBar(t)}
              y2={chart.yBar(t)}
              stroke="#f1f5f9"
            />
            <text
              x={PAD_L - 8}
              y={chart.yBar(t) + 3}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatCompactBRL(t)}
            </text>
          </g>
        ))}

        {chart.cols.map((c) => {
          const dim = hover !== null && hover !== c.i;
          return (
            <g key={c.m.key} opacity={dim ? 0.4 : 1}>
              <rect
                x={c.cx - chart.barW - 1}
                y={chart.yBar(c.m.inflow)}
                width={chart.barW}
                height={Math.max(0, chart.base - chart.yBar(c.m.inflow))}
                rx={3}
                fill={COLOR_IN}
              />
              <rect
                x={c.cx + 1}
                y={chart.yBar(c.m.outflow)}
                width={chart.barW}
                height={Math.max(0, chart.base - chart.yBar(c.m.outflow))}
                rx={3}
                fill={COLOR_OUT}
              />
              {showForecast && c.m.forecastIn > 0 && (
                <rect
                  x={c.cx - chart.barW - 1}
                  y={chart.yBar(c.m.forecastIn)}
                  width={chart.barW}
                  height={Math.max(0, chart.base - chart.yBar(c.m.forecastIn))}
                  rx={3}
                  fill="none"
                  stroke={COLOR_IN}
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
              )}
              {showForecast && c.m.forecastOut > 0 && (
                <rect
                  x={c.cx + 1}
                  y={chart.yBar(c.m.forecastOut)}
                  width={chart.barW}
                  height={Math.max(0, chart.base - chart.yBar(c.m.forecastOut))}
                  rx={3}
                  fill="none"
                  stroke={COLOR_OUT}
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
              )}
              <text
                x={c.cx}
                y={H - 12}
                textAnchor="middle"
                className={
                  hover === c.i
                    ? "fill-slate-700 text-[10px] font-semibold"
                    : "fill-slate-500 text-[10px]"
                }
              >
                {c.m.label}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD_L}
          x2={chart.W - PAD_R}
          y1={chart.base}
          y2={chart.base}
          stroke="#cbd5e1"
        />

        {hovered && (
          <line
            x1={hovered.cx}
            x2={hovered.cx}
            y1={BARS_TOP}
            y2={chart.base}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            pointerEvents="none"
          />
        )}
        {chart.cols.map((c) => (
          <rect
            key={`hit-${c.m.key}`}
            x={c.cx - chart.slot / 2}
            y={0}
            width={chart.slot}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(c.i)}
          />
        ))}
      </svg>

      {/* Tooltip seguindo a coluna */}
      {hovered && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[190px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
          style={{
            left: `${tooltipLeftPct}%`,
            transform: tooltipFlip
              ? "translateX(calc(-100% - 12px))"
              : "translateX(12px)",
          }}
        >
          <p className="font-semibold text-slate-800">{hovered.m.label}</p>
          <div className="mt-1 space-y-0.5" style={{ fontVariantNumeric: "tabular-nums" }}>
            <p className="flex items-center justify-between gap-4 text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: COLOR_IN }} />
                Entradas
              </span>
              <span className="font-semibold">{formatCurrency(hovered.m.inflow)}</span>
            </p>
            <p className="flex items-center justify-between gap-4 text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: COLOR_OUT }} />
                Saídas
              </span>
              <span className="font-semibold">{formatCurrency(hovered.m.outflow)}</span>
            </p>
            <p className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1 text-slate-600">
              <span>Resultado</span>
              <span
                className={`font-semibold ${
                  hovered.m.net >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatCurrency(hovered.m.net)}
              </span>
            </p>
            {showForecast && (hovered.m.forecastIn > 0 || hovered.m.forecastOut > 0) && (
              <p className="flex items-center justify-between gap-4 text-slate-500">
                <span>Previsto</span>
                <span>
                  +{formatCompactBRL(hovered.m.forecastIn)} / −
                  {formatCompactBRL(hovered.m.forecastOut)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_IN }} />
          Entradas (realizado)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_OUT }} />
          Saídas (realizado)
        </span>
        {showForecast && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-slate-400" />
            Previsto (em aberto)
          </span>
        )}
      </div>
    </div>
  );
}
