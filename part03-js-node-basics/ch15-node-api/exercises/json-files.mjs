// 練習問題1: fs/promises で、JSON のファイルを読み書きする関数を3つ作ってください。
// 要件は README と json-files.test.mjs にあります。確かめ方: node --test json-files.test.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

// file を読んで JSON.parse した値を返す。ファイルが無い（ENOENT）ときは fallback を返す。
// それ以外の失敗（JSON として読めない、フォルダだった など）は、そのまま投げる
export async function readJson(file, fallback) {
  // ここを書く
}

// data を JSON にして file に書く（2文字の字下げ、最後に改行）。file のあるフォルダが無ければ作る
export async function writeJson(file, data) {
  // ここを書く
}

// dir の中の、名前が .md で終わる「ファイル」の名前を、名前の順に並べた配列で返す（フォルダは入れない）
export async function listMarkdown(dir) {
  // ここを書く
}
