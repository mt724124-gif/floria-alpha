# AGENTS.md

## 変更範囲ルール

* 指示されていない機能変更は行わない
* 指示されていないUI変更は行わない
* 指示されていないリファクタリングは行わない
* 指示されていない命名変更は行わない
* 指示されていないデータ構造変更は行わない
* 変更対象以外のファイルは可能な限り触らない

提案は自由に行ってよいが、実際のコード変更は依頼された範囲のみに限定すること。

## デバッグルール

* 原因が不明な不具合は推測で修正しない
* 関連コードを確認してから原因特定を行う
* 修正前に原因の説明を行う
* 「この下に追加してください」形式ではなく、必ず元コードと修正コードを提示する

## 事前確認が必要な変更

以下に該当する場合は実装前に確認を取ること。

* appData の構造変更
* localStorage のキー変更
* localStorage の保存形式変更
* dailyRecords 関連の変更
* longTasks 関連の変更
* TodayPage の挙動変更
* データ移行が必要になる変更

## 実装報告ルール

コード変更後は必ず以下を報告すること。

* 変更したファイル一覧
* 変更理由
* 影響範囲
* 想定される副作用
* git diff の要約

コミット・push は明示的に依頼された場合のみ行うこと。

## Floria 開発ルール

このプロジェクトは Floria の開発用リポジトリです。新しい Codex チャットで作業する場合も、以下の方針を必ず前提にしてください。

- iPhone 縦持ち専用の UI として扱う
- TodayPage を最優先で確認・保護する
- 原因が不明な場合は推測で修正しない
- コード変更前に必ず現状コードを確認する
- 修正提案時は、元コードと修正コードをセットで提示する
- コード本体を変更する場合は、影響範囲を TodayPage / appData / localStorage の流れから確認する

## 画面構成

Floria の主要ページは `src` 直下に配置されています。

### App.jsx

場所: `src/App.jsx`

アプリ全体の親コンポーネントです。

主な役割:

- `screen` state による画面切り替え
- `appData` state によるアプリ本体データの一元管理
- `localStorage` からの初期データ読み込み
- `appData` 更新時の `localStorage` 保存
- Today / Calendar / Review / Stats / AI / Timer / Settings への接続
- タイマー結果、レビュー結果、AI 生成タスクなどのページ間連携

### TodayPage

場所: `src/TodayPage.jsx`

Floria の最重要ページです。作業時は最優先で確認してください。

主な役割:

- 今日または選択日の Todo 表示
- 通常タスクの追加、編集、完了、削除、並び替え
- 長期タスクの日別予定を Todo として表示
- 作業時間や実績の入力
- `dailyRecords` との同期
- タイマー起動への入口

### CalendarPage

場所: `src/CalendarPage.jsx`

長期タスクをカレンダー上で管理する画面です。

主な役割:

- `appData.longTasks` の表示・編集
- 月表示、週表示のカレンダー
- 長期タスクの期間、日別計画、カテゴリ管理
- 長期タスクの追加、削除、並び替え
- `setAppData` 経由で `longTasks` を更新

### ReviewPage

場所: `src/ReviewPage.jsx`

指定日の振り返り画面です。

主な役割:

- `dateKey` に対応するレビュー対象の構築
- 通常タスクと長期タスクの日別タスクの統合
- 完了、未完了、延期、削除などの状態更新
- 振り返りメモの保存
- `dailyRecords` の確定・未確定管理
- 翌日への持ち越し処理

### StatsPage

場所: `src/StatsPage_day.jsx`

実績・統計表示画面です。

注意:

- ファイル名は `StatsPage_day.jsx`
- `App.jsx` では `StatsPageDay` として import されている
- export されている関数名は `StatsPage`

主な役割:

- `appData.dailyRecords` から週間統計を作成
- 集中時間、完了数、達成率などを表示
- `appData.longTasks` から長期タスク進捗を算出
- 基本的には閲覧用で、`setAppData` は受け取らない

### AIPage

場所: `src/AIPage.jsx`

AI を使った長期タスク作成・編集支援画面です。

主な役割:

- AI 向けプロンプト作成
- AI の出力 JSON 貼り付け・解析
- 長期タスク案の編集
- 選択した長期タスクを `onSaveLongTasks` 経由で `App.jsx` に渡す
- 保存後、`App.jsx` 側で `appData.longTasks` に追加し、CalendarPage へ遷移

## appData と localStorage

Floria の本体データは `App.jsx` の `appData` state に集約されています。

```jsx
const [appData, setAppData] = useState(createInitialAppData);
```

主な構造:

```js
{
  tasks: [],
  categories: [],
  workLogs: [],
  timerSessions: [],
  dailyRecords: {},
  longTasks: [],
  aiLongTaskDrafts: [],
  settings: {}
}
```

メインの保存先 localStorage key:

```js
todo-app-data-v1
```

`App.jsx` では `appData` が変わるたびに localStorage へ保存します。

```jsx
useEffect(() => {
  saveData(appData);
}, [appData]);
```

旧データ互換用の longTasks 保存 key:

```js
todo-app-long-tasks-v1
```

AIPage では、本体データとは別に AI 設定・履歴用の localStorage を使用しています。

```js
todo-app-ai-destinations-v1
todo-app-selected-ai-destination-id-v1
todo-app-ai-request-history-v1
todo-app-ai-fixed-instructions-v1
```

CalendarPage にも、長期タスクカテゴリ用のページ内 localStorage があります。

## 作業時の注意

- 修正前に対象ファイルの現状コードを確認する
- TodayPage に影響する変更は特に慎重に扱う
- `appData.tasks`, `appData.longTasks`, `appData.dailyRecords` の同期に注意する
- localStorage の key やデータ構造を変更する場合は、既存ユーザーの保存データへの影響を必ず確認する
- 原因が特定できない不具合は、推測で直さず、まず再現条件と関連コードを確認する
