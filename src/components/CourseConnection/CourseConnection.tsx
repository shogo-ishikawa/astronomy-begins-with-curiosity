import { invitationCourses } from "../../content/ja/course-links/invitation";
export function CourseConnection({
  context = "invitation",
}: {
  context?: "invitation" | "question" | "hypothesis";
}) {
  const courses =
    context === "invitation"
      ? invitationCourses
      : context === "question"
        ? [
            {
              title: "科学的方法",
              body: "問い、仮説、予想、測定、結果を区別すると、証拠が何に答えるかを確かめられます。",
            },
            {
              title: "確率・統計",
              body: "平均からのずれや標準偏差を使うと、分布の広がりを一つの数で測れます。",
            },
            {
              title: "データサイエンス",
              body: "画像は形を保ち、数値要約は比較しやすい一方、それぞれ見落とす情報があります。",
            },
          ]
        : [
            {
              title: "物理学と科学的方法",
              body: "仕組みについての仮説から、観測や計算のデータに現れる予想を導きます。",
            },
          ];
  return (
    <section className="course-section" aria-labelledby="course-title">
      <p className="eyebrow">この研究につながる授業</p>
      <h2 id="course-title">大学の学びが、宇宙を調べる道具になる</h2>
      <div className="course-grid">
        {courses.map((course) => (
          <article key={course.title}>
            <h3>{course.title}</h3>
            <p>{course.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
