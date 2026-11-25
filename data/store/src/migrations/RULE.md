# The database's form changes only by adding a migration, never by editing one.

Each numbered SQL file changes the database's form once, in order; `meta/` holds drizzle-kit's record of the tables after each one. A change to the tables is a new migration from `npm run db:generate --workspace=@repo/host-store`, never an edit to one already here.
