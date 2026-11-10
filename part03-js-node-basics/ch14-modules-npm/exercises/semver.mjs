// 練習問題8: npm が使っている semver（セマンティック バージョニング）の判定を、自分で作ってください。
// 要件は README と semver.test.mjs にあります。npm の semver パッケージは使わずに書きます。
// 確かめ方: node --test semver.test.mjs

/** "1.2.3-beta.1+build" → { major: 1, minor: 2, patch: 3, prerelease: ['beta', 1] }。正しくなければ null */
export function parse(version) {
  // ここを書く
}

/** a < b なら -1、同じなら 0、a > b なら 1。正しくないバージョンには TypeError */
export function compare(a, b) {
  // ここを書く
}

/** version が range（"^1.2.3"、">=1.0.0 <2"、"1.x || 3.x" など）を満たすか */
export function satisfies(version, range) {
  // ここを書く
}

/** versions のうち、range を満たす一番新しいもの（無ければ null）。npm install が選ぶバージョン */
export function maxSatisfying(versions, range) {
  // ここを書く
}
