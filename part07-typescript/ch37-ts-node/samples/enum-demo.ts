// 1.2節: enum と引数のプロパティを使ったファイル。node では動かないが、tsx なら動く（この教材では書かない書き方）
enum Level {
  Low,
  High,
}

class Job {
  constructor(public name: string, public level: Level) {}
}

const job = new Job('洗濯', Level.High);
console.log(job.name, job.level, Level[job.level]);
