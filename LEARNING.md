# Learning progress and playback

The learning dashboard at `/my-learning` shows enrolled courses, with in-progress, completed and not-started filters, twelve cards per page, recent viewing activity, and a direct link to the last lesson. Progress is calculated from the current course contents; removed lessons do not inflate it, and new lessons can make a previously completed course incomplete.

## Completion policy

- A lesson is complete when its video has been marked viewed and any attached quiz has a server-recorded submission.
- A nonempty course is complete when all its current lessons are complete. A request to mark an unfinished course complete returns 409.
- Completion means participation, **not a passing grade or a certificate**. Scores and the existing three-attempt limit are separate. This release does not invent a passing threshold for existing courses.
- Quiz completion comes from the authenticated learner's stored results, never browser-local flags. Legacy browser flags are ignored. Merely saving a playback position cannot complete a lesson.
- Playback/end events are client reports, not proctored proof that a learner watched or understood the content. Certificates or assessments with stronger integrity requirements need an explicit assessment policy first.

## Resume storage

`LearningPosition` stores the authenticated user, course, lesson, position, duration and update timestamps. The unique user/course/lesson index makes subsequent saves update the same record. The API validates course access, lesson membership, finite numeric bounds and a maximum duration of 24 hours; it does not accept a caller-supplied user identity.

The player saves about every fifteen seconds during playback, on pause/seek, and best-effort when hidden or unmounted. An abrupt close or offline device may lose the most recent interval. A visible retry state handles failed saves. A queued save checks that the account is still the same before dispatch, preventing a stale player from writing under a newly signed-in account.

The position is restored after media metadata is available; near-end positions restart from the beginning. Providers must expose a finite duration and seekable media through React Player. Streaming quality selection and adaptive encoding are not part of this release.

## API

- `GET /api/v1/progress/my-learning?page=1&status=in-progress`: current user's enrolled-course summaries, filter counts and continue card; no video URLs or quiz answers.
- `GET /api/v1/progress/:courseId`: existing protected content plus derived completion, the user's quiz summaries and saved positions.
- `PUT /api/v1/progress/:courseId/lecture/:lectureId/position`: authenticated position save with `{ position, duration }` in seconds.

The dashboard currently batches summaries across the user's enrolled courses, then filters/pages the response. It avoids one request per card but is not a database-aggregated library for very large enrollments; measure and replace the in-memory summary step before targeting enterprise-sized libraries.

No production data migration or reset is required. Stored grades are preserved. Existing `completed` flags are not used as evidence of completion in the learning UI; current lessons and saved results determine the result.
