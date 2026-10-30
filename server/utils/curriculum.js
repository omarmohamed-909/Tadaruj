export function validateCurriculum(body, lectures) {
  if (!body || !Array.isArray(body.units) || body.units.length > 100 || !Array.isArray(body.unassignedLectureIds) ||
      !Number.isSafeInteger(body.revision) || body.revision < 0) return null;
  const units = [];
  const unitIds = new Set();
  for (const unit of body.units) {
    if (!unit || typeof unit.title !== "string" || !unit.title.trim() || unit.title.trim().length > 100 || !Array.isArray(unit.lectureIds)) return null;
    if (unit._id && (typeof unit._id !== "string" || !/^[a-f0-9]{24}$/i.test(unit._id) || unitIds.has(unit._id))) return null;
    if (unit._id) unitIds.add(unit._id);
    units.push({ ...(unit._id ? { _id: unit._id } : {}), title: unit.title.trim(), lectureIds: unit.lectureIds });
  }
  const ordered = [...body.unassignedLectureIds, ...units.flatMap(unit => unit.lectureIds)];
  const expected = new Set(lectures.map(String));
  if (ordered.length !== expected.size || new Set(ordered).size !== ordered.length ||
      ordered.some(id => typeof id !== "string" || !expected.has(id))) return null;
  return { units, lectures: ordered };
}

export function canonicalLectureOrder(lectures, units = []) {
  const existing = new Set(lectures.map(String));
  const assigned = units.flatMap(unit => unit.lectureIds.map(String)).filter(id => existing.has(id));
  const assignedSet = new Set(assigned);
  return [...lectures.filter(id => !assignedSet.has(String(id))), ...assigned];
}
