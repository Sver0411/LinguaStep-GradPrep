import type { TrendPoint } from "@/lib/statistics";

export function TrendChart({
  points,
  metric,
  label,
  suffix = "项",
}: {
  points: TrendPoint[];
  metric: "activity" | "accuracy" | "learned-review" | "languages";
  label: string;
  suffix?: string;
}) {
  const values = points.map((point) =>
    metric === "activity"
      ? point.learned + point.reviewed + point.questions
      : metric === "accuracy"
        ? point.accuracy
        : metric === "learned-review"
          ? point.learned + point.reviewed
          : point.japanese + point.english + point.combined,
  );
  const max = Math.max(1, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = Math.round(total / Math.max(1, values.length));
  const hasData = points.some((point) =>
    metric === "accuracy"
      ? point.questions > 0
      : metric === "activity"
        ? point.learned + point.reviewed + point.questions > 0
        : metric === "learned-review"
          ? point.learned + point.reviewed > 0
          : point.japanese + point.english + point.combined > 0,
  );

  return (
    <article className="card trend-card">
      <div className="card-heading-row">
        <div><span className="section-kicker">TREND</span><h2>{label}</h2></div>
        <span className="count-label">日均 {average}{suffix}</span>
      </div>
      {hasData ? <div className="trend-chart" role="img" aria-label={`${label}，共 ${points.length} 天`}>
        {points.map((point, index) => {
          const value = values[index];
          return (
            <div className="trend-column" key={point.date} title={`${point.date}: ${value}${suffix}`}>
              {metric === "learned-review" ? (
                <div className="stacked-bar" style={{ height: `${Math.max(3, (value / max) * 100)}%` }}>
                  <span className="bar-learned" style={{ flex: point.learned || 0.001 }} />
                  <span className="bar-reviewed" style={{ flex: point.reviewed || 0.001 }} />
                </div>
              ) : metric === "languages" ? (
                <div className="stacked-bar" style={{ height: `${Math.max(3, (value / max) * 100)}%` }}>
                  <span className="bar-japanese" style={{ flex: point.japanese || 0.001 }} />
                  <span className="bar-english" style={{ flex: point.english || 0.001 }} />
                  <span className="bar-combined" style={{ flex: point.combined || 0.001 }} />
                </div>
              ) : (
                <span className={`single-bar ${metric}`} style={{ height: `${Math.max(3, (value / max) * 100)}%` }} />
              )}
              <small>{points.length <= 7 || index % 5 === 0 || index === points.length - 1 ? point.date.slice(5) : ""}</small>
            </div>
          );
        })}
      </div> : <div className="chart-empty" role="status">这段时间还没有可展示的记录</div>}
      <div className="chart-summary" aria-label="图表关键数字">
        {metric === "learned-review" ? (
          <><span><i className="legend learned" />新学 <b>{points.reduce((sum, point) => sum + point.learned, 0)}</b></span><span><i className="legend reviewed" />复习 <b>{points.reduce((sum, point) => sum + point.reviewed, 0)}</b></span></>
        ) : metric === "languages" ? (
          <><span><i className="legend japanese" />日语 <b>{points.reduce((sum, point) => sum + point.japanese, 0)}</b></span><span><i className="legend english" />英语 <b>{points.reduce((sum, point) => sum + point.english, 0)}</b></span><span><i className="legend combined" />对照 <b>{points.reduce((sum, point) => sum + point.combined, 0)}</b></span></>
        ) : (
          <><span>合计 <b>{total}{suffix}</b></span><span>最高 <b>{Math.max(...values)}{suffix}</b></span></>
        )}
      </div>
    </article>
  );
}

export function DistributionChart({
  title,
  values,
}: {
  title: string;
  values: { known: number; fuzzy: number; unknown: number; unlearned: number; due: number };
}) {
  const total = Math.max(
    1,
    values.known + values.fuzzy + values.unknown + values.unlearned,
  );
  const segments = [
    { key: "known", label: "认识", value: values.known },
    { key: "fuzzy", label: "模糊", value: values.fuzzy },
    { key: "unknown", label: "不认识", value: values.unknown },
    { key: "unlearned", label: "未学习", value: values.unlearned },
  ];
  return (
    <article className="card distribution-card">
      <div className="card-heading-row"><div><span className="section-kicker">MASTERY</span><h2>{title}</h2></div><span className="count-label">到期 {values.due}</span></div>
      <div className="distribution-bar" role="img" aria-label={`${title}掌握分布`}>
        {segments.filter((segment) => segment.value > 0).map((segment) => <span className={`distribution-${segment.key}`} style={{ width: `${(segment.value / total) * 100}%` }} key={segment.key} />)}
      </div>
      <div className="distribution-legend">
        {segments.map((segment) => <span key={segment.key}><i className={`legend ${segment.key}`} />{segment.label}<b>{segment.value}</b></span>)}
      </div>
    </article>
  );
}
