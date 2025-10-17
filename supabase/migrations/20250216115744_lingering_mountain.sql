-- Drop existing views if they exist
DROP VIEW IF EXISTS kudos_stats_weekly CASCADE;
DROP VIEW IF EXISTS kudos_stats_monthly CASCADE;
DROP VIEW IF EXISTS top_kudos_recipients CASCADE;

-- Create weekly stats view
CREATE VIEW kudos_stats_weekly AS
WITH kudos_counts AS (
    -- Count kudos given
    SELECT giver_id                       as user_id,
           COUNT(*)                       as kudos_given,
           0                              as kudos_received,
           date_trunc('week', created_at) as period
    FROM kudos
    WHERE created_at > CURRENT_DATE -
        INTERVAL '7 days'
        GROUP BY giver_id, date_trunc('week', created_at)
        UNION ALL

-- Count kudos received (primary recipients)
SELECT recipient_id                   as user_id,
       0                              as kudos_given,
       COUNT(*)                       as kudos_received,
       date_trunc('week', created_at) as period
FROM kudos
WHERE created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY recipient_id, date_trunc('week', created_at)

UNION ALL

-- Count kudos received (additional recipients)
SELECT kr.recipient_id                  as user_id,
       0                                as kudos_given,
       COUNT(*)                         as kudos_received,
       date_trunc('week', k.created_at) as period
FROM kudos_recipients kr
         JOIN kudos k ON k.id = kr.kudos_id
WHERE k.created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY kr.recipient_id, date_trunc('week', k.created_at)
    )
SELECT u.id                                                                       as user_id,
       u.name,
       COALESCE(SUM(kc.kudos_given), 0)                                           as kudos_given,
       COALESCE(SUM(kc.kudos_received), 0)                                        as kudos_received,
       COALESCE(SUM(kc.kudos_given), 0) + COALESCE(SUM(kc.kudos_received), 0) * 3 as total_points,
       MAX(kc.period)                                                             as period
FROM users u
         LEFT JOIN kudos_counts kc ON u.id = kc.user_id
GROUP BY u.id, u.name
HAVING COALESCE(SUM(kc.kudos_given), 0) + COALESCE(SUM(kc.kudos_received), 0) > 0
ORDER BY total_points DESC;

-- Create monthly stats view
CREATE VIEW kudos_stats_monthly AS
WITH kudos_counts AS (
    -- Count kudos given
    SELECT giver_id                        as user_id,
           COUNT(*)                        as kudos_given,
           0                               as kudos_received,
           date_trunc('month', created_at) as period
    FROM kudos
    WHERE created_at > CURRENT_DATE -
        INTERVAL '30 days'
        GROUP BY giver_id, date_trunc('month', created_at)
        UNION ALL

-- Count kudos received (primary recipients)
SELECT recipient_id                    as user_id,
       0                               as kudos_given,
       COUNT(*)                        as kudos_received,
       date_trunc('month', created_at) as period
FROM kudos
WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY recipient_id, date_trunc('month', created_at)

UNION ALL

-- Count kudos received (additional recipients)
SELECT kr.recipient_id                   as user_id,
       0                                 as kudos_given,
       COUNT(*)                          as kudos_received,
       date_trunc('month', k.created_at) as period
FROM kudos_recipients kr
         JOIN kudos k ON k.id = kr.kudos_id
WHERE k.created_at > CURRENT_DATE - INTERVAL '30 days'
GROUP BY kr.recipient_id, date_trunc('month', k.created_at)
    )
SELECT u.id                                                                       as user_id,
       u.name,
       COALESCE(SUM(kc.kudos_given), 0)                                           as kudos_given,
       COALESCE(SUM(kc.kudos_received), 0)                                        as kudos_received,
       COALESCE(SUM(kc.kudos_given), 0) + COALESCE(SUM(kc.kudos_received), 0) * 3 as total_points,
       MAX(kc.period)                                                             as period
FROM users u
         LEFT JOIN kudos_counts kc ON u.id = kc.user_id
GROUP BY u.id, u.name
HAVING COALESCE(SUM(kc.kudos_given), 0) + COALESCE(SUM(kc.kudos_received), 0) > 0
ORDER BY total_points DESC;

-- Create top recipients view
CREATE VIEW top_kudos_recipients AS
WITH category_counts AS (SELECT k.recipient_id as user_id,
                                c.name         as category,
                                COUNT(*) as count,
    ROW_NUMBER(
) OVER (PARTITION BY k.recipient_id ORDER BY COUNT (*
) DESC
) as category_rank
    FROM kudos k
    JOIN categories c ON c.id = k.category_id
    WHERE k.created_at > CURRENT_DATE - INTERVAL '30 days'
    GROUP BY k.recipient_id, c.name
)
SELECT u.id        as user_id,
       u.name,
       cc.category as top_category,
       cc.count    as category_count
FROM users u
         JOIN category_counts cc ON u.id = cc.user_id
WHERE cc.category_rank = 1
ORDER BY cc.count DESC;

-- Grant permissions to authenticated users
GRANT SELECT ON kudos_stats_weekly TO authenticated;
GRANT SELECT ON kudos_stats_monthly TO authenticated;
GRANT SELECT ON top_kudos_recipients TO authenticated;