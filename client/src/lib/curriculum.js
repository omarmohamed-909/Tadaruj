export function groupCurriculum(lectures = [], units = []) {
  const assigned = new Set();
  const byId = new Map(lectures.map((lecture, index) => [lecture._id, { lecture, index }]));
  const groups = units.map(unit => ({
    id: unit._id,
    title: unit.title,
    lessons: (unit.lectureIds || []).flatMap(id => {
      if (!byId.has(id) || assigned.has(id)) return [];
      assigned.add(id);
      return [byId.get(id)];
    }),
  }));
  const general = lectures.flatMap((lecture, index) => assigned.has(lecture._id) ? [] : [{ lecture, index }]);
  return [...(general.length ? [{ id: "general", title: "", lessons: general }] : []), ...groups];
}
