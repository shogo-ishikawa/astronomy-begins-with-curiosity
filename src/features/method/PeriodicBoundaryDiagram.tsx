export function PeriodicBoundaryDiagram() {
  return (
    <figure className="boundary-figure">
      <svg
        viewBox="0 0 460 180"
        role="img"
        aria-labelledby="boundary-title boundary-desc"
      >
        <title id="boundary-title">周期境界条件の模式図</title>
        <desc id="boundary-desc">
          四角い計算領域の右端から出た粒子が、同じ高さの左端から入り直す。
        </desc>
        <rect x="80" y="25" width="300" height="120" rx="8" />
        <path d="M285 85 H420" />
        <path d="M408 74 l14 11 -14 11" />
        <path d="M40 85 H135" />
        <path d="M52 74 L38 85 l14 11" />
        <circle cx="330" cy="85" r="8" />
        <circle cx="105" cy="85" r="8" />
        <text x="230" y="168" textAnchor="middle">
          右から出る → 左から入る
        </text>
      </svg>
      <figcaption>
        模式図：粒子は境界で消えず、反対側から計算領域へ入ります。
      </figcaption>
      <p className="text-alternative">
        <strong>テキスト代替：</strong>
        右向きに進む粒子が箱の右端を越えると、同じ高さの左端から右向きに入り直します。
      </p>
    </figure>
  );
}
