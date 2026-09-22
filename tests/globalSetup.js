/**
 * Pin the test process timezone to IST (the product's home market).
 *
 * Must happen here, before Jest spawns its workers: Jest gives each test file a
 * sandboxed copy of `process.env`, so assigning `process.env.TZ` inside a test
 * never reaches the real process. Without this, date logic that only breaks in
 * a timezone ahead of UTC (see src/services/database.test.ts) passes on a UTC
 * CI machine and fails only for real users.
 */
module.exports = async () => {
  process.env.TZ = 'Asia/Kolkata';
};
