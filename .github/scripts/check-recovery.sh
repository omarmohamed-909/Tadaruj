#!/usr/bin/env bash
set -euo pipefail

# Only synthetic fixtures inside the job's disposable MongoDB container.
source_db="tadaruj_test_$(openssl rand -hex 12)"
restore_db="tadaruj_test_$(openssl rand -hex 12)"
docker exec --env SOURCE_DB="$source_db" --env RESTORE_DB="$restore_db" tadaruj-test-mongo \
  mongosh --quiet --port 27028 --eval '
  const source = process.env.SOURCE_DB, target = process.env.RESTORE_DB;
  if (![source,target].every(name => /^tadaruj_test_[a-f0-9]{24}$/.test(name)) || source === target) throw Error("Invalid test namespace");
  for (const name of [source,target]) if (db.getSiblingDB(name).getCollectionNames().length) throw Error("Test database must be empty");
  const data = db.getSiblingDB(source), student = new ObjectId(), course = new ObjectId();
  data.users.insertOne({_id:student,email:"recovery@example.test",role:"student"});
  data.users.createIndex({email:1},{unique:true});
  data.courses.insertOne({_id:course,courseTitle:"Synthetic recovery course"});
  data.coursepurchases.insertOne({userId:student,courseId:course,status:"approved"});
  data.courseprogresses.insertOne({userId:student,courseId:course,completed:true,lectureProgress:[{viewed:true}]});
  '
# The fixtures are quiescent throughout the dump: no application writes to them.
docker exec tadaruj-test-mongo mongodump --port 27028 --db "$source_db" --archive=/tmp/tadaruj-recovery.archive --gzip
docker exec tadaruj-test-mongo mongorestore --port 27028 --archive=/tmp/tadaruj-recovery.archive --gzip \
  --nsInclude="${source_db}.*" --nsFrom="${source_db}.*" --nsTo="${restore_db}.*"
docker exec --env SOURCE_DB="$source_db" --env RESTORE_DB="$restore_db" tadaruj-test-mongo \
  mongosh --quiet --port 27028 --eval '
  const original = db.getSiblingDB(process.env.SOURCE_DB), restored = db.getSiblingDB(process.env.RESTORE_DB);
  for (const collection of ["users","courses","coursepurchases","courseprogresses"]) {
    if (restored[collection].countDocuments() !== 1 || EJSON.stringify(original[collection].findOne()) !== EJSON.stringify(restored[collection].findOne())) throw Error("Restored documents differ");
  }
  if (!restored.users.getIndexes().some(index => index.name === "email_1" && index.unique)) throw Error("Unique index was not restored");
  print("Recovery drill passed: student, course, approved enrollment, progress, and unique index restored into a separate database.");
  '
