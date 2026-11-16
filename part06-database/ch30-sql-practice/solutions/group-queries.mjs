// 練習問題2 の模範解答

export const countByUser = `
  SELECT u.name, count(*) AS n
  FROM users AS u
  JOIN tasks AS t ON t.user_id = u.id
  GROUP BY u.id
  ORDER BY u.id
`;

export const minutesByUser = `
  SELECT u.name, coalesce(sum(t.minutes), 0) AS minutes
  FROM users AS u
  LEFT JOIN tasks AS t ON t.user_id = u.id AND t.status <> 'done'
  GROUP BY u.id
  ORDER BY u.id
`;

export const popularTags = `
  SELECT g.name, count(*) AS n
  FROM tags AS g
  JOIN task_tags AS tt ON tt.tag_id = g.id
  GROUP BY g.id
  HAVING count(*) >= 2
  ORDER BY n DESC, g.name
`;
