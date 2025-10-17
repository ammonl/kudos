/*
  # Remove unused tables

  1. Changes
    - Drop the "notifications" table as it's been replaced by notification_queue
    - Drop the "leaderboard" table as points are now calculated via views
    - Drop related indexes and constraints

  2. Security
    - No changes to RLS policies needed
    - Existing kudos_stats views handle leaderboard functionality
*/

-- Drop notifications table and its dependencies
DROP TABLE IF EXISTS notifications CASCADE;

-- Drop leaderboard table and its dependencies
DROP TABLE IF EXISTS leaderboard CASCADE;