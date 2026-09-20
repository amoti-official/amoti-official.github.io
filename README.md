# GOURMET OS — デプロイ手順

グルメ系インフルエンサー向けの案件・インサイト管理ツール。**静的サイト（サーバー不要）**なので、
このフォルダの中身をそのまま配信するだけで本番公開できます。

## 中身

| ファイル | 役割 |
|---|---|
| `index.html` | アプリ本体（HTML/CSS/JSを1ファイルに内包） |
| `manifest.webmanifest` | ホーム画面に追加したときのアプリ名・アイコン |
| `sw.js` | Service Worker（オフライン対応・更新はネットワーク優先） |
| `icon-*.png` | アプリアイコン（192 / 512 / maskable / Apple touch） |
| `vercel.json` / `netlify.toml` | 各ホスト用の設定（キャッシュ制御） |
| `.nojekyll` | GitHub Pages 用 |

## デプロイ手順（好きなホストを1つ選ぶ）

### A. Vercel（推奨・最速）
```bash
npm i -g vercel
cd gourmet-os-site
vercel --prod
```
または https://vercel.com/new にこのフォルダをドラッグ&ドロップ。

### B. Netlify
https://app.netlify.com/drop にこのフォルダをドラッグ&ドロップ。
または `npm i -g netlify-cli && netlify deploy --prod --dir .`

### C. Cloudflare Pages
ダッシュボード → Pages → 「アップロード」でこのフォルダを選択。
ビルドコマンドは空、出力ディレクトリは `/`。

### D. GitHub Pages
```bash
cd gourmet-os-site
git init && git add -A && git commit -m "deploy gourmet os"
git branch -M main && git remote add origin <your-repo-url> && git push -u origin main
```
リポジトリの Settings → Pages → Branch: `main` / `/ (root)` を選択。

> Service Worker は **HTTPS か localhost でのみ**動きます。上記ホストはすべてHTTPSなので問題ありません。
> `file://` で直接開いた場合はオフラインキャッシュだけが無効になり、他の機能はそのまま動きます。

## スマホへの入れ方（公開後）

- **iPhone**：Safari でURLを開く → 共有 → 「ホーム画面に追加」
- **Android**：Chrome でURLを開く → メニュー → 「アプリをインストール」

ホーム画面から起動するとURLバーが消え、全画面のアプリとして動作します。一度開けばオフラインでも起動できます。

## データの保存場所（重要）

データは **各端末のブラウザ内（localStorage）** に保存されます。サーバーには一切送信されません。

| 特徴 | 内容 |
|---|---|
| 長所 | 完全プライベート。クライアント名や報酬額を外部に出さずに運用できる |
| 短所 | **PCとスマホでデータが別々になる**。ブラウザの履歴削除で消える |

現在はアプリ内「06 データ管理」から **JSON書き出し／読み込み** で端末間を移行します。

## 分析はGensparkで行う（このツールの使い方）

アプリ内「06 データ管理」またはヘッダーの「＋分析に出す」から **分析ブリーフ（Markdown）** を生成し、
Gensparkのチャットに貼り付けて「この内容を分析して」と送ります。アカウント別／形式別／媒体別／タグ別／曜日時間帯の集計は
生成時点で計算済みなので、貼り付けるだけで単価の妥当性や投稿の型の分析が通ります。

| 渡し方 | 用途 |
|---|---|
| 分析ブリーフをコピー | 集計済みのMarkdown。通常はこれ |
| JSONをコピー | 生データを渡して別の切り口で見たいとき |

## 次のフェーズ（クラウド同期を入れる場合）

PC・スマホで同じデータを使うには、バックエンドが必要です。推奨は **Supabase**（Postgres + 認証 + 行レベルセキュリティ）。

1. Supabase プロジェクト作成 → `users` / `accounts` / `campaigns` / `posts` の4テーブルを作成（`user_id` に RLS）
2. アプリ側にログイン画面（メールリンク or Google）を追加
3. `localStorage` を読み書きしている `load()` / `save()` の2関数だけをAPI呼び出しに差し替え
   → 画面ロジックは変更不要（データ層が分離されているため）

現状のアプリは `load()` / `save()` に保存処理を集約してあるので、同期対応はこの2関数の置き換えで完結します。
