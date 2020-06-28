# hackerrank-jp
HackerRank日本語コンテストまとめ

## APIについて
外部からアクセスできるAPIを作りました

### /contest
- method: GET
- 概要：DBに入ったコンテストを全部取得する

### /insert
- method: POST
- 概要：コンテストのURL（ "https://www.hackerrank.com/" 以下の部分）とwriterをJSONで投げると、/fetchContest APIを呼び出した後、DBにコンテスト情報を追加する

### /fetchContest
- method: POST
- 概要：HackerRankのコンテストトップページをJSONで投げると、HackerRankのサイトをスクレイピングしてコンテスト名とコンテスト日時とコンテスト時間を取得する
