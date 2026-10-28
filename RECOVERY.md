# Backup and recovery

Use this procedure for the platform's dedicated database and media account. CI's synthetic recovery drill verifies the database-tools path; it is not a backup of platform data and does not establish production recovery guarantees.

## Decide the recovery target

Record how much recent activity can be lost (the recovery point objective) and how long recovery may take (the recovery time objective). Choose the backup frequency and retention around those targets. If the database provider offers managed snapshots or point-in-time recovery on your plan, configure and test it for this platform. Keep copies outside the running application host and restrict access to the backup owner.

Database backups include personal data, password hashes, enrollments, progress, and audit records. Encrypt them, keep credentials separately, and do not upload them as GitHub Actions artifacts. The repository ignores `backups/`, BSON files, and archive files as an additional safeguard.

## Consistent database backups

MongoDB documents two ways to obtain a consistent replica-set dump while data changes: capture the oplog with a full dump, or stop all writes during a database-scoped dump. `--oplog` cannot be combined with `--db` or collection filtering. Use the provider's backup facilities for sharded deployments rather than assuming this procedure applies.

For a **database-scoped maintenance backup**, first stop every writer, including API instances, jobs, and administrative tools. Use MongoDB Database Tools matching the supported source/restore versions. Keep the source URI and any credentials in a protected Database Tools config file outside the checkout; do not put them into command history or commit them.

```sh
mongodump --config /secure/path/source-tools.yml --db YOUR_DATABASE --archive=/secure/backups/tadaruj-YYYYMMDD.archive.gz --gzip
```

This command is a template, not executed by the application. Resume writes only after the dump succeeds. For a no-downtime self-managed replica-set backup, use a full `mongodump --oplog` and the corresponding `mongorestore --oplogReplay` workflow from the MongoDB documentation, with the required permissions and a separate restore environment. Do not combine that workflow with the namespace remapping example below.

## Restore into a separate environment first

Provision an isolated restore database/cluster with a different application secret and no production email or payment credentials. Confirm that the target database is empty and its name differs from the source. For the database-scoped archive above:

```sh
mongorestore --config /secure/path/restore-tools.yml --archive=/secure/backups/tadaruj-YYYYMMDD.archive.gz --gzip --nsInclude='SOURCE_DATABASE.*' --nsFrom='SOURCE_DATABASE.*' --nsTo='NEW_EMPTY_RESTORE_DATABASE.*'
```

Do not add `--drop` or aim this command at the active platform database. Verify collection counts, unique indexes, instructor/course ownership, approved purchases, progress, and audit records. Then run the application against this restored database with outgoing email disabled and test that an approved student can still access their lesson and saved progress. Record the actual restore time and the newest recovered activity.

Cloudinary assets are external to MongoDB. Preserve the corresponding media account and its provider backup/version settings; restored URLs and asset IDs are useful only while those assets remain available. Test at least one protected video and attachment after restoring. Keep production secrets in the hosting provider's secret store and record a private configuration recovery procedure.

## What CI verifies

[.github/scripts/check-recovery.sh](.github/scripts/check-recovery.sh) creates a new, randomly named database inside the job's disposable MongoDB container. It seeds synthetic student, course, approved enrollment, and completed progress documents, plus a unique email index. With no concurrent writes, it runs a real compressed `mongodump`, restores into another empty random database without dropping anything, and compares documents and the index. The archive stays inside the disposable container and is not uploaded.

This catches broken backup tooling and namespace remapping. It does not verify production credentials, scheduling, encryption, retention, off-site storage, media recovery, oplog replay, or production data size. A real restore drill remains part of release operations once hosting is configured.

References: [MongoDB backup consistency](https://www.mongodb.com/docs/v8.0/tutorial/backup-and-restore-tools/), [mongodump options](https://www.mongodb.com/docs/database-tools/mongodump/), [mongorestore options](https://www.mongodb.com/docs/database-tools/mongorestore/).
