# 練習問題7 用: よくある形の Flask のタスク管理アプリ（わざと問題を含めてある）
# 動かし方は exercises/README.md の問題7を見てください。
#   ~/dev/ch10 で $ python exercises/flask-app.py   → http://localhost:5010/  （パスワードは secret）
# 学習用です。自分の Mac の中だけで動かしてください。
from flask import Flask, render_template_string, request, redirect, url_for, session, flash, jsonify

app = Flask(__name__)
app.secret_key = "dev"

TASKS = [{"id": 1, "title": "牛乳を買う", "done": False}]
next_id = 2

LAYOUT_TOP = """<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>タスク（Flask）</title></head><body>
{% with messages = get_flashed_messages() %}{% for m in messages %}<p style="color:#cf222e">{{ m }}</p>{% endfor %}{% endwith %}
"""

LOGIN_PAGE = LAYOUT_TOP + """
<h1>ログイン</h1>
<form method="post">
  <input name="name" placeholder="名前"> <input name="password" type="password" placeholder="パスワード">
  <button>ログイン</button>
</form>
</body></html>"""

INDEX_PAGE = LAYOUT_TOP + """
<p>{{ user }} さん</p>
<h1>タスクの一覧</h1>
<form method="post" action="{{ url_for('create') }}">
  <input name="title"> <button>追加</button>
</form>
<ul>
{% for t in tasks %}
  <li>{{ t.title|safe }} <a href="{{ url_for('delete', task_id=t.id) }}">削除</a></li>
{% endfor %}
</ul>
<script>
  // タブのタイトルに件数を出す（API から取ってくる）
  fetch("/api/tasks").then((r) => r.json()).then((tasks) => {
    document.title = `(${tasks.length}) タスク（Flask）`;
  });
</script>
</body></html>"""


@app.route("/")
def index():
    if "user" not in session:
        return redirect(url_for("login", next=request.path))
    return render_template_string(INDEX_PAGE, tasks=TASKS, user=session["user"])


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if request.form.get("password") == "secret":
            session["user"] = request.form.get("name") or "名無し"
            return redirect(request.args.get("next", "/"))
        flash("パスワードが違います")
        return redirect(url_for("login"))
    return render_template_string(LOGIN_PAGE)


@app.route("/tasks", methods=["POST"])
def create():
    global next_id
    title = request.form.get("title", "").strip()
    if not title:
        flash("タイトルを入力してください")
    else:
        TASKS.append({"id": next_id, "title": title, "done": False})
        next_id += 1
    return redirect(url_for("index"))


@app.route("/delete/<int:task_id>")
def delete(task_id):
    TASKS[:] = [t for t in TASKS if t["id"] != task_id]
    return redirect(url_for("index"))


@app.route("/api/tasks")
def api_tasks():
    resp = jsonify(TASKS)
    resp.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    resp.headers["Access-Control-Allow-Credentials"] = "true"
    return resp


if __name__ == "__main__":
    app.run(port=5010, debug=True)
