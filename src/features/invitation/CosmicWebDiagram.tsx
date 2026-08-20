import { cosmicWebModel } from "../../visualization/cosmicWebModel";
export function CosmicWebDiagram({
  onGlossary,
}: {
  onGlossary: (id: string) => void;
}) {
  const { early, late, filaments, nodes, voids } = cosmicWebModel;
  return (
    <figure className="cosmic-figure">
      <span className="diagram-label">
        模式図（シミュレーション結果・定量図ではありません）
      </span>
      <svg
        viewBox="0 0 650 255"
        role="img"
        aria-labelledby="cosmic-title cosmic-desc"
      >
        <title id="cosmic-title">
          同じ大きさの領域で比べた初期宇宙と現在に近い宇宙の物質密度の模式図
        </title>
        <desc id="cosmic-desc">
          両側には同数の96個の決定論的なトレーサ粒子がある。左は小さな密度ゆらぎを持つほぼ一様な分布。右は背景密度場と淡いウォール、太さの異なる曲線状フィラメント、その交点のノード、付近の高密度なノット、物質が少ないが空ではない複数のボイドを示す。形態を理解する模式図で、実際のシミュレーション結果や定量図ではない。
        </desc>
        <defs>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <radialGradient id="density">
            <stop stopColor="#587b86" stopOpacity=".25" />
            <stop offset="1" stopColor="#15213a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform="translate(15 48)">
          <text x="90" y="-18" textAnchor="middle">
            初期宇宙
          </text>
          <rect width="180" height="145" rx="9" className="region" />
          <path
            className="early-field"
            d="M5 65 Q42 48 80 67 T175 60 V140 H5Z"
          />
          {early.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} className="tracer" />
          ))}
          <text x="90" y="166" textAnchor="middle" className="figure-note">
            ほぼ一様 + 小さな密度ゆらぎ
          </text>
        </g>
        <g className="time-arrow">
          <path d="M220 120h85" />
          <path d="M292 108l14 12-14 12" />
          <text x="262" y="95" textAnchor="middle">
            宇宙の時間発展
          </text>
        </g>
        <g transform="translate(340 48)">
          <text x="140" y="-18" textAnchor="middle">
            現在に近い宇宙
          </text>
          <rect width="280" height="145" rx="9" className="region" />
          <g transform="scale(1.52 .91)">
            <ellipse cx="92" cy="76" rx="72" ry="45" className="wall" />
            <ellipse cx="120" cy="89" rx="60" ry="38" fill="url(#density)" />
            {voids.map((v, i) => (
              <ellipse key={i} {...v} className="void" />
            ))}
            {filaments.map((f) => (
              <g key={f.id}>
                <path
                  d={f.path}
                  className="filament-outer"
                  style={{ strokeWidth: f.width }}
                />
                <path
                  d={f.path}
                  className="filament-core"
                  style={{ strokeWidth: Math.max(2, f.width * 0.28) }}
                />
              </g>
            ))}
            {late.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.r}
                className="tracer late"
              />
            ))}
            {nodes.map(([x, y], i) => (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={i === 1 || i === 4 ? 10 : 7}
                  className="knot-halo"
                />
                <circle cx={x} cy={y} r="3.2" className="node" />
              </g>
            ))}
          </g>
          <text x="140" y="166" textAnchor="middle" className="figure-note">
            同数の粒子がつくる密度分布
          </text>
        </g>
      </svg>
      <div className="diagram-legend" aria-label="大規模構造の用語凡例">
        {[
          ["filament", "フィラメント"],
          ["node", "ノード"],
          ["knot", "ノット"],
          ["void", "ボイド"],
        ].map(([id, label]) => (
          <button key={id} onClick={() => onGlossary(id)}>
            <span aria-hidden="true" className={`legend-${id}`}></span>
            {label}
          </button>
        ))}
      </div>
      <figcaption>
        同じ大きさ・同じ縮尺の領域に同数のトレーサ粒子を描いた、形態を理解するための模式図です。ボイドも完全な空ではありません。実際のシミュレーション結果や定量図ではありません。
      </figcaption>
      <details>
        <summary>図のテキスト代替</summary>
        <p>
          初期側は小さな偏りを含むほぼ一様な96粒子です。現在側も同じ96粒子ですが、幅と密度勾配を持つ曲線状フィラメント、その交点のノード、ノード付近の高密度なノット、淡い面状構造、周囲より粒子の少ない三つのボイドに分布しています。
        </p>
      </details>
    </figure>
  );
}
