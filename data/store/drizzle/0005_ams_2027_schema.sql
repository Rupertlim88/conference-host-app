-- The AMS demo moved from the 106th Annual Meeting (2026) to the 107th (2027). Its schema is renamed to match,
-- keeping its tables, sign-ins, stars, notes and send runs; npm run load replaces the programme rows.
ALTER SCHEMA "ams2026" RENAME TO "ams2027";
