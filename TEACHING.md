# Teaching tools

## Quiz settings and student results

The lesson editor includes a separate quiz settings panel. The owning instructor or an administrator can set 1–10 attempts and a pass mark from 0–100%. Existing lessons default to three attempts and a 60% pass mark. Saving settings does not reset attempt counts or remove questions; raising the limit allows the remaining attempts, while lowering it can prevent another attempt.

The API grades answers and enforces the limit atomically. Students see the current pass mark, their best percentage, remaining attempts, and their saved attempt history after reload. New history entries retain the pass mark and pass/fail decision at submission; older entries retain their original scores and are labeled as earlier results. A best score compared with the current pass mark is displayed separately from those historical decisions. Answer keys are never included in student progress responses.

Course completion remains participation-based: watch the lessons and submit attached quizzes. Passing a quiz does not issue a certificate, and changing its pass mark does not undo course completion. Timers, question banks, randomized tests, manual essay grading and assessment versions are not part of this release.

## Student progress

Open **Student progress** in the instructor or admin workspace, then choose a course. The server checks course ownership and returns twelve students per page, with stable ordering, name/email search, and all/not-started/in-progress/completed/needs-attention filters. Filters remain in the URL.

The roster includes student accounts with explicit enrollment or a completed course purchase. For free courses, students with recorded progress, quiz results or playback activity are also included. Unrelated students and instructor preview attempts are excluded. Deleted lessons and duplicate viewed records do not inflate progress. Each student card shows current completed lessons, the average of latest quiz scores, latest recorded activity, and expandable lesson/quiz details.

**Needs attention** means a latest quiz result is below its current pass mark, or the latest recorded activity is more than seven days old. This is a follow-up signal, not a diagnosis or an automatic message. Activity means saved playback or quiz submissions; it is not a comprehensive log of visits, and old viewing records without a timestamp show “Not recorded”. Search and status filtering run on the server before pagination. MongoDB joins calculate progress against current lessons; these are operational views, not precomputed analytics for unlimited-scale reporting.

## Student question inbox

Open **Questions** to see top-level student discussion posts from owned courses (all courses for administrators). Filter by course, text and open/resolved status. Listings are paginated on the server. Instructor announcements, nested replies as standalone questions, and posts for removed lessons are excluded.

Reply directly in the inbox using the existing lesson comment service and its in-app notification flow. The student sees the reply in the lesson discussion. Each inbox card previews at most three recent direct replies; **Open lesson discussion** shows the complete existing discussion, including nested replies. Mark resolved or reopen explicitly. Replying does not automatically close a question, and resolving it does not block further discussion. Students can see the resolved badge in their lesson. Failed replies retain the typed draft.

The inbox is a view of course discussions, not private messaging or an email inbox. No messages are sent to real users by the test suite.

## Endpoints and permissions

- `GET /api/v1/progress/teaching/:courseId/students`: course manager only; `page`, `q`, `status`.
- `GET /api/v1/progress/teaching/questions`: instructor/admin only, restricted to managed courses; `page`, `q`, `status`, optional `courseId`.
- `PATCH /api/v1/progress/teaching/:courseId/questions/:commentId`: course manager only; `{ resolved: boolean }`, top-level current-lesson posts only.
- `PATCH /api/v1/progress/teaching/:courseId/lecture/:lectureId/quiz-settings`: course manager only; integer `quizMaxAttempts` and `quizPassPercentage`.

Search input is escaped and capped at 120 characters. Responses contain only the student/course/discussion data needed for these views. All automated writes use isolated synthetic fixtures, with real email, Google and external media integrations disabled.
