// Completion records participation, not a qualification or a passing grade.
export function learningSummary(lectures = [], progress = [], results = []) {
  const viewed = new Set(progress.filter(item => item.viewed).map(item => String(item.lectureId)));
  const submitted = new Set(results.filter(item => item.attemptsCount > 0).map(item => String(item.lectureId)));
  const quizCompleted = Object.fromEntries(lectures.filter(item => submitted.has(String(item._id))).map(item => [String(item._id), true]));
  const finished = lectures.filter(item => viewed.has(String(item._id)) && (!item.quizQuestions?.length || submitted.has(String(item._id))));
  return {
    completed: lectures.length > 0 && finished.length === lectures.length,
    completedLessons: finished.length,
    totalLessons: lectures.length,
    percentage: lectures.length ? Math.round(finished.length / lectures.length * 100) : 0,
    quizCompleted,
  };
}
