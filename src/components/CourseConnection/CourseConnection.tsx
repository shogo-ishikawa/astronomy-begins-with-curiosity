import { invitationCourses } from "../../content/ja/course-links/invitation";
export function CourseConnection() {
  return (
    <section className="course-section" aria-labelledby="course-title">
      <p className="eyebrow">この研究につながる授業</p>
      <h2 id="course-title">大学の学びが、宇宙を調べる道具になる</h2>
      <div className="course-grid">
        {invitationCourses.map((course) => (
          <article key={course.title}>
            <h3>{course.title}</h3>
            <p>{course.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
