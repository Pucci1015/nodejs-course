// 練習問題1 の模範解答

export const openWithOwner = `
  SELECT t.title, u.name
  FROM tasks AS t
  JOIN users AS u ON u.id = t.user_id
  WHERE t.status <> 'done'
  ORDER BY t.id
`;

export const usersWithoutTasks = `
  SELECT u.name
  FROM users AS u
  LEFT JOIN tasks AS t ON t.user_id = u.id
  WHERE t.id IS NULL
`;

export const tagsOfTask4 = `
  SELECT g.name
  FROM task_tags AS tt
  JOIN tags AS g ON g.id = tt.tag_id
  WHERE tt.task_id = 4
  ORDER BY g.name
`;
