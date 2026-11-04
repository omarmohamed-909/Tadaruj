# Assignments and teacher feedback

## Teacher workflow

Open **Assignments** in the instructor or administrator workspace, select a course and add an assignment. Provide a title, instructions, maximum score (1–1,000 integer points), and an optional deadline in your device's local time. Drafts are private; publish when ready. Administrators can manage all courses, while instructors can manage only their own.

After the first student submission, the title, instructions, maximum score and published state are locked. The deadline and submission closure can still change. A deadline change applies to future submissions; each saved version retains its original deadline and late flag. Late work is accepted and marked late. Closing submissions blocks both first submissions and resubmissions without hiding previous work.

The review list has twelve students per page and filters for awaiting review, changes requested and graded. Open a submission to see its versions. Save an integer grade from zero to the maximum, or request resubmission with feedback. A finalized grade cannot currently be reopened or edited. Refresh submissions to retrieve changes made in another session.

## Student workflow

Open **Course assignments** from the learning page. Students with course access can read published tasks and submit a written answer, an HTTPS work link, or both. Links must not contain embedded credentials; the server never downloads them. The student must grant the teacher access at the external service. Direct file uploads are not included in this release.

Submitted work is locked until the teacher requests changes. A maximum of ten versions is retained, including previous answers, dates, feedback and grading decisions. A teacher cannot return the tenth version again. The page warns before navigating away with an unsent answer, preserves input after failed requests and offers a manual result refresh. Drafts are not persisted across browser crashes or devices.

Reviews create an in-app notification linking to the student's assignment. Email and automatic reminders are not sent. Notification delivery failure does not undo a saved review; students can still refresh their results. Arabic/English and light/dark themes use the shared interface tokens.

Assignments do not change participation-based course completion, quiz scores or certificates. Student tracking continues to report lesson and quiz activity separately.

## Data integrity and access

- Assignment listings and submission listings are paginated on the server; list responses omit answer histories.
- Students can retrieve only their own submission. The owner or an administrator can retrieve submissions for the managed course.
- Revision checks reject conflicting edits, duplicate submissions and competing grading decisions.
- MongoDB transactions serialize submissions against rubric, publication and closure changes. A replica set is required, as with enrollment confirmation.
- Each student has one submission record per assignment, protected by a unique compound index; versions are bounded to ten.
- Deleting a course through the existing permitted deletion flow also removes its assignment records and review notifications.

## API

All paths below are relative to `/api/v1/progress` and require authentication.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/assignments/:courseId` | Published assignments accessible to the current user |
| GET | `/assignments/:courseId/:assignmentId` | Assignment and the current student's submission |
| POST | `/assignments/:courseId/:assignmentId/submit` | First submission or requested revision |
| GET / POST | `/assignments/manager/:courseId` | Manager listing / creation |
| PATCH | `/assignments/manager/:courseId/:assignmentId` | Revision-checked assignment update |
| GET | `/assignments/manager/:courseId/:assignmentId/submissions` | Paginated, filtered review queue |
| GET / PATCH | `/assignments/manager/:courseId/:assignmentId/submissions/:submissionId` | Submission detail / revision-checked review |

Creation/update accepts `title`, `instructions`, `maxScore`, `dueAt`, `published`, `closed`; updates also require `revision`. Submission accepts `text`, `resourceUrl`, `revision` (zero for the first version). Review accepts `decision` (`graded` or `returned`), `score`, `feedback`, `revision`. Lists accept `page`; submission lists also accept `status` (`all`, `submitted`, `returned`, `graded`).
