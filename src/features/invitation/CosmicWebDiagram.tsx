export function CosmicWebDiagram() {
  const early = [
    [25, 25],
    [55, 22],
    [88, 29],
    [120, 19],
    [150, 31],
    [35, 60],
    [67, 57],
    [99, 65],
    [135, 58],
    [161, 68],
    [24, 96],
    [59, 92],
    [92, 103],
    [124, 91],
    [157, 99],
  ];
  return (
    <figure className="cosmic-figure">
      <span className="diagram-label">
        模式図（実際の計算結果ではありません）
      </span>
      <svg
        viewBox="0 0 620 230"
        role="img"
        aria-labelledby="cosmic-title cosmic-desc"
      >
        <title id="cosmic-title">
          初期宇宙と現在に近い宇宙の物質分布を比べる模式図
        </title>
        <desc id="cosmic-desc">
          左は小さな密度のむらを持つほぼ一様な粒子分布、右はフィラメント、節、空洞を持つ網目状分布。中央の矢印は宇宙の時間発展を示す。
        </desc>
        <g transform="translate(10 35)">
          <rect width="180" height="160" rx="10" />
          <text x="90" y="-12" textAnchor="middle">
            初期宇宙
          </text>
          {early.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 5 : 3} />
          ))}
          <text x="90" y="150" textAnchor="middle" className="figure-note">
            ほぼ一様 + 小さなむら
          </text>
        </g>
        <g className="time-arrow">
          <path d="M215 115h90" />
          <path d="M292 102l15 13-15 13" />
          <text x="260" y="92" textAnchor="middle">
            宇宙の時間発展
          </text>
        </g>
        <g transform="translate(330 35)">
          <rect width="275" height="160" rx="10" />
          <text x="137" y="-12" textAnchor="middle">
            現在に近い宇宙
          </text>
          <g className="filaments">
            <path d="M10 125L70 85 125 95 170 42 250 25M70 85L50 20M125 95L180 135 265 115M170 42L125 15M170 42L230 75 265 115" />
          </g>
          {[
            [70, 85],
            [125, 95],
            [170, 42],
            [230, 75],
            [265, 115],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="8" />
              <text x={x + 10} y={y - 8}>
                節
              </text>
            </g>
          ))}
          <text x="190" y="105">
            空洞
          </text>
          <text x="35" y="112">
            フィラメント
          </text>
        </g>
      </svg>
      <figcaption>
        左は粒がほぼ均等ですが完全には同じでなく、小さな集まりの差があります。右は糸状のフィラメント、その交点の節、物質の少ない空洞が見える模式図です。これは観察のための説明図で、シミュレーションデータや定量グラフではありません。
      </figcaption>
    </figure>
  );
}
