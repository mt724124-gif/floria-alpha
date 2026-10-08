# Floria 1.0 Phase 0：データ保護・バックアップ

対象：`mt724124-gif/floria-alpha`、mainの `fe221ba86f02ad487540da8d4138bf70106cbce3`。
作業前にorigin/mainとAGENTS.mdを確認。Phase 0実装時点では未コミットでした。今回、残っていた変更を再レビュー・再テストし、`feature/phase-0-data-protection`からmain向けPRとして提出します。mainへの直接push・merge・本番デプロイは行いません。
本番環境のlocalStorageを使用せず、メモリStorageとjsdomのテスト用データで検証しました。

## 1. 変更ファイル

| ファイル | 変更内容 |
| --- | --- |
| src/App.jsx | 起動時の検証、読込/保存エラー時の操作停止、退避、復元後のstate更新 |
| src/SetPage.jsx | 既存の緑系UIにデータ管理セクションを追加 |
| src/utils/storage.js（新規） | 保存キー一覧、構造検証、バックアップ/退避/復元、ロールバック、ダウンロード |
| src/components/DataManagement.jsx（新規） | ファイル選択、概要、置換確認、実行/キャンセル、保護画面 |
| package.json / package-lock.json | npm test、開発用Vitest/jsdomを追加 |
| vitest.config.js（新規） | jsdomとReactの最小テスト構成 |
| tests/fixtures.js（新規） | 本番データを使わない共通フィクスチャ |
| tests/storage.test.js（新規） | 保存境界・バックアップ・復元・失敗時の検証 |
| tests/App.test.jsx（新規） | App/設定/保護画面の接続、確認前の無書込、失敗時の停止 |
| tests/App.real.test.jsx（新規） | 実際のToday/設定画面の表示と復元後の反映 |
| docs/phase-0-data-protection.md（新規） | この報告、形式・互換性・制約・手動確認手順 |

## 2. 調査した保存キーとバックアップ内容

本体の保存形式とキーは変更していません。バックアップ専用のラッパーをファイルにのみ追加します。

| キー | 内容/既存形式 |
| --- | --- |
| todo-app-data-v1 | appDataのJSON。tasks、longTasks、dailyRecords、workLogs、timerSessions、categories、settings、aiLongTaskDrafts等 |
| todo-app-long-tasks-v1 | 旧長期タスクのJSON配列 |
| todo-app-long-task-categories-v1 | 長期カテゴリのJSON配列 |
| todo-app-ai-destinations-v1 | AI送信先のJSON配列 |
| todo-app-selected-ai-destination-id-v1 | 選択先IDの文字列（JSONではない） |
| todo-app-ai-request-history-v1 | AI依頼履歴のJSON配列。fixedRequestsはid/textのオブジェクト配列 |
| todo-app-ai-fixed-instructions-v1 | 固定指示のJSON配列 |
| last-category | 最後のカテゴリの文字列 |
| last-has-planned-time | `true` / `false` の文字列 |

9キーすべてを対象とします。その他のオリジン内キーは読み書きしません。キーが存在しない場合はnullを記録します。文字列をそのまま保持するので、JSONの外にある選択IDや設定も往復できます。

通常バックアップ：

```json
{
  "format": "floria-backup",
  "version": 1,
  "exportedAt": "2026-10-08T04:00:00.000Z",
  "storage": {
    "todo-app-data-v1": "{\"tasks\":[]}",
    "todo-app-long-tasks-v1": null,
    "todo-app-long-task-categories-v1": null,
    "todo-app-ai-destinations-v1": null,
    "todo-app-selected-ai-destination-id-v1": null,
    "todo-app-ai-request-history-v1": null,
    "todo-app-ai-fixed-instructions-v1": null,
    "last-category": null,
    "last-has-planned-time": null
  }
}
```

ファイル名は `Floria-backup-YYYY-MM-DDTHH-MM-SS-sssZ.json`。日時はUTCです。作成は保存データを書き換えません。最新React stateが保存済み本体と異なる場合は、最新stateの本体JSONをファイルに含めます。保存済み本体が同じ状態を表す場合は元のraw JSONを保持します。関連8キーは保存済みのraw値を保持し、作成処理はlocalStorageを書き換えません。

破損時の退避は `format: floria-recovery`。元の文字列を解析せず保持し、読めなかったキーはunreadableKeysに記載します。通常保存に失敗した場合は、まだ保存できていないappDataをunsavedAppDataとして別に含めます。壊れた文字列をそのまま再導入しないため、この退避形式は自動復元対象ではありません。

## 3. 修正前のリスクと修正内容

### 読込失敗を初期化として扱っていた

修正前（App.jsxの抜粋）：

```js
function loadSavedData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (error) {
    console.error("保存データの読み込みに失敗しました", error);
    return null;
  }
}

const [appData, setAppData] = useState(createInitialAppData);
useEffect(() => {
  saveData(appData);
}, [appData]);
```

失敗時のnullはcreateInitialAppDataで空の初期値になり、初回effectで保存される可能性がありました。

修正後（App.jsxの抜粋）：

```js
const [initialStorage] = useState(() => loadStorage(browserStorage));
const [appData, setAppData] = useState(initialStorage.data);
const [storageError, setStorageError] = useState(initialStorage.error);
const lastSavedData = useRef(initialStorage.data);

useEffect(() => {
  if (storageError || !appData || appData === lastSavedData.current) return;
  try {
    saveAppData(browserStorage, appData);
    lastSavedData.current = appData;
  } catch (error) {
    // 外部保存の失敗を即座に画面へ反映するためのstate更新。
    setRecoverySnapshot(captureStorage(browserStorage));
    setStorageError(`保存に失敗しました。${error.message}`);
  }
}, [appData, storageError]);

if (storageError || !appData) {
  return <DataRecovery error={storageError} onExport={exportRecovery} onRestore={restoreData} />;
}
```

loadStorageは不正時にdata:nullとエラーを返します。通常画面・ナビゲーションをマウントしないので、Todayの空データ操作やAI/Calendarの初期値保存も開始されません。正常な初回読込は保存処理だけを理由に再保存しません。以降の通常操作は従来の本体JSONで保存します。

### 旧長期キーによる削除済みデータの復活

修正前：本体longTasksの配列長が0なら旧キーを読み込みました。

修正後：本体にlongTasksが存在するなら、空配列でも本体を優先します。本体に項目がない旧形式/旧キーだけのデータは、メモリ上で従来フィールドを補完します。元の保存を削除・自動移行しません。

### 復元途中の不整合

以前は復元機能がありませんでした。新規実装では以下を行います。

1. JSON、バックアップversion、全9キー、各値と入れ子構造を検証。
2. 短期/長期/日別記録/作業記録/タイマー記録/保存項目数をプレビュー。
3. 現在のデータを先にバックアップできるボタンを提示。
4. 置換確認チェックと実行ボタンの操作後にのみ書込。
5. 実行直前にも検証し、現在の全raw値をメモリへ退避。
6. 補助キー→本体キーの順に同期的に置換。nullは明示的なキー除去。
7. 全キーの書込結果を検証。途中で失敗したら触ったキーを逆順で戻し、全キーを照合。
8. 戻せない場合は通常操作を止め、復元前スナップショットを退避可能にする。
9. 成功後はAppのstateと画面状態を更新し、Todayへ移動。AI/Calendarの個別設定は次回マウント時に復元したキーから読む。

内容の自動混合はしません。無関係なlocalStorageキーは保持します。

## 4. 互換性と検証方針

- 本体は従来のappData JSON、キーはtodo-app-data-v1のままです。
- tasksは必須配列。追加世代のlongTasks/dailyRecords等が省略された旧本体は、メモリ上のデフォルトで補います。存在するフィールドの型が不正なら拒否します。
- 旧単一タスク形式のdailyPlansは変換せず保持します。
- 不明な追加フィールド、持ち越し情報、タイマー情報も削除しません。意味的な整合性をPhase 0で勝手に修正しません。
- 裸の旧appData JSONファイルも明示的な復元として受け付けます。この形式に含まれない関連設定は置換時に解除される旨をプレビューします。
- 退避ファイル、未来version、欠落キー、未知キー、不正な本体/補助データは復元前に拒否します。
- 関連設定だけが破損している場合も起動を保護します。元データは残し、初期設定への自動リセットはしません。

## 5. 自動テスト結果

`npm test`：3ファイル、62件すべて成功。

| 指定ケース | 検証 |
| --- | --- |
| 1 正常保存読込 | 全9キー、未知フィールドを保持、読込時の無書込 |
| 2 データなし | 初期表示可能、操作前は本体キーを作成しない |
| 3 JSON破損 | 壊れたJSON/空文字/null/配列を保持、通常画面なし、StrictModeでも無書込 |
| 4 必須フィールド不正 | tasks型、入れ子dailyPlans/dailyRecords、カテゴリ・設定等の不正を拒否 |
| 5 バックアップ作成 | 全9キー、version/exportedAt、日時付き名前、UTF-8 Blob、非破壊 |
| 6 復元 | 全キー置換、本体state反映、実Todayのタスク表示 |
| 7 不正バックアップ | JSON/形式/version/欠落キー/未知キー/補助設定の不正を拒否 |
| 8 途中失敗 | setItem/removeItem例外、書込後例外、ロールバック成功/失敗、操作停止と退避 |
| 9 旧形式 | 追加フィールド省略、旧キーのみ、旧単一dailyPlan、裸appData JSON |
| 10 互換性 | 元の保存キー/本体JSON/追加フィールド/関連設定を維持 |

追加検証：最終確認前の無書込、ファイル拒否/キャンセル、アクセス拒否、保存容量超過、未保存stateの退避、バックアップ前後の同一性。

`npm run build`：成功（Vite v8.0.11）。
変更ファイルのESLint：SetPage.jsxの既存の未使用Settings import（no-unused-vars）1件で失敗。origin/mainにも同じimportがあることを確認しました。Appと新規実装/テストのESLintは成功し、新規指摘はありません。全体lintは既存の114 errors / 14 warningsが残ります（診断時115 / 14。置き換えた初期化処理内の重複キー1件が消えたため）。データ保護と無関係な既存指摘は修正していません。
Appの外部保存失敗時に即座に操作を停止するstate更新には、理由付きの1行限定lint抑制を使用しています。

初回PR提出前の再検証でも62件のテストとビルドが成功し、git diff --checkも成功しました。読込失敗時の上書き停止、全9キーの包含、置換前の退避、復元失敗時の復帰、旧形式互換、復元後のstate反映をコードとテストで再確認しました。追加修正を要する重大な問題は見つかりませんでした。今回は実装コードを変更せず、この検証記録のみ追記しています。

## 6. 手動確認が必要な操作

本番ではなく、別のテスト用オリジンとダミーデータで行ってください。

- iPhone Safariとホーム画面PWA：設定からJSONを作成し、「ファイル」へ保存できるか。
- 保存したJSONを選択し、概要・置換確認・キャンセル・復元成功の表示を確認。
- AI設定/長期カテゴリの復元値が各画面で表示されるか。
- 壊れた本体/補助JSONで保護画面となり、退避ファイルに元文字列があるか。
- スマホ幅で概要・長いファイル名・エラー文が読めるか。
- ストレージへのアクセス拒否や容量不足時の表示。

jsdomは実ブラウザのファイル保存先、PWAのストレージ分離、タッチ操作までは再現しません。

## 7. 既存機能への影響・副作用・制約

Today/Calendar/LongTaskDetail/Review/Timer/AI/WeeklyのソースとdailyRecordsの更新関数は変更していません。通常の操作・集計ロジック・緑系デザインを維持します。設定画面にはデータ管理を追加し、読込/保存エラー時だけ専用保護画面へ切り替えます。

復元の成功時は意図的にTodayへ戻し、画面選択・モーダル・AIモード等の一時状態をリセットします。復元時点の保存データと表示を揃えるためです。

通常の起動時に保存済みJSONを再書込しないようにしたため、初期データ補完だけでは本体キーを作りません。最初の通常更新で従来形式を保存します。Todayの既存派生タスク同期など、実際にappDataを変更する処理は引き続き動きます。

localStorageに複数キーのトランザクションAPIはありません。同期置換・書込後検証・例外時のロールバックで失敗を抑えますが、ブラウザ強制終了、OS停止、他タブ同時更新、継続的なストレージ障害では完全な原子性を保証できません。復元前のJSONバックアップを保存する手順を用意しています。ロールバック失敗時のスナップショットはメモリにあるため、その場で退避する必要があります。

既存AI/Calendar等の個別設定保存にあるエラー処理は変更していません。Phase 0では起動時の全キー検証とApp本体保存失敗の保護を実装しています。

## 8. 次のPhase

最優先はReviewPageの元日再編集による延期先実績の削除と、LongTaskDetailの保存による延期履歴/関連情報の欠落です。これらの既知問題は今回修正していません。
その後、日付移動/ID一意性/AI重複配置、日別・週間の集計、タイマー保存重複・日付跨ぎを順に扱います。

## git diffの要約

既存変更はAppの保存境界と設定ページの接続、テスト用依存だけです。データ保護・復元処理は新規utils/componentへ分離しました。appDataの構造とlocalStorageキーは維持し、バックアップ用のformat/versionはファイル内にのみ導入しました。Phase 1の不具合修正は含みません。


## PR #3追加レビュー（2026-10-08）

最新main、PRブランチ、AGENTS.mdを再確認。追加レビュー前のPR headはa921904811a2217d4de6d1d1f09ab2b3a242aeee。以下の再現テストを作成し、修正前に失敗することを確認してから共通保存処理だけを修正しました。

### 1. 保存effect前の操作結果がバックアップに入らない

元コード：

```js
if (appData != null && snapshot.values[STORAGE_KEY] === null) {
  validateAppData(appData);
  snapshot.values[STORAGE_KEY] = JSON.stringify(appData);
}
```

既存の本体キーがあると、Reactの最新stateより古い保存値だけをファイルへ含めていました。React commit後のlayout effectでバックアップを呼ぶテストでは、Appの通常保存effect前のバックアップから追加タスクが欠落しました。このテストは保存待ちの境界を意図的に作るもので、通常の設定ボタンクリックすべてで発生するという意味ではありません。

修正コード：

```js
if (appData != null) {
  const raw = JSON.stringify(appData);
  validateAppData(JSON.parse(raw));
  if (snapshot.values[STORAGE_KEY] === null ||
      JSON.stringify(dataFromValues(snapshot.values)) !== raw) {
    snapshot.values[STORAGE_KEY] = raw;
  }
}
```

最新stateを本体の候補とし、既に同じ状態ならraw JSONを保持します。変更されるのはバックアップ用のメモリ内スナップショットだけです。追加・編集・完了・削除・長期更新・振り返り再編集の保存待ちを検証し、復元後にも最新値が残ることを確認しました。関連キーや元の保存値は変更しません。

### 2. 既存入力処理との時間値の互換性

実LongTaskDetailの小タスク時間欄に-0.5時間を入力すると、saveDraftとserializeDailyRowsはestimatedMinutes:-30を生成します。旧保存はそのままJSONへ書き込みましたが、Phase 0の非負チェックは読込を拒否しました。未設定などの文字入力ではNaNが生成され、旧保存ではJSON.stringifyによりnullになりましたが、Phase 0はJSON化前に検証して保存を拒否しました。

負数や文字入力が正しい時間指定という意味ではありません。今回は既存データを新たな入力ルールで拒否しないための互換性対応で、入力画面の仕様変更や値の補正は行いません。

元コード：

```js
if (number != null && (!Number.isFinite(Number(number)) || Number(number) < 0)) fail(`${path}.${key}`);
validateAppData(data);
storage.setItem(STORAGE_KEY, JSON.stringify(data));
```

修正コード：

```js
if (number != null && !Number.isFinite(Number(number))) fail(`${path}.${key}`);
const raw = JSON.stringify(data);
validateAppData(JSON.parse(raw));
storage.setItem(STORAGE_KEY, raw);
```

有限の既存数値は符号を理由に拒否せず保持します。保存とバックアップは従来と同じJSON化後の値を検証します。tasks必須、配列/オブジェクト、日付、文字列/booleanなどの構造検証は維持し、不正構造の保存・バックアップが元の保存値を変更しない回帰テストも追加しました。

### 実際の生成処理を使った検証

- TodoModalのsubmit出力と、dailyRecordsのupdateDailyRecordTask/confirmDailyRecordが生成する記録。
- LongTaskModalのhandleSave出力。
- LongTaskDetailのsaveDraft/serializeDailyRows出力（0.5、-0.5、未設定の時間入力）。
- 実AIPageでサンプルJSONを取り込み、実AppのnormalizeLongTasksFromAIを経て保存した長期計画とAI設定。
- AppのsaveTimerResultToAppDataで生成したtasks/workLogs/timerSessions/dailyRecords。タイマー画面はテスト用callbackに置き換え、計測結果の保存処理自体は実コードを実行しました。

データはテスト専用で、本番localStorageは使用していません。今回の検証は上記の生成形式と旧形式フィクスチャについての確認であり、過去のあらゆる保存データの正常動作を保証するものではありません。

### 追加レビュー後の結果・差分

- npm test：5ファイル、79件成功（追加17件）。
- npm run build：成功。
- 今回変更したstorage.jsと追加2テストファイルのESLint：成功。
- git diff --check、UTF-8確認：成功。
- 変更：src/utils/storage.js、tests/phase0-review.test.jsx、tests/producer-compatibility.test.jsx、この報告のみ。
- UI、appData構造、localStorageキー、Today/Calendar/Review/Timer/AI/Weeklyの実装は変更なし。
- mainへのmerge・本番デプロイは行いません。既存のSetPage未使用import等のlint指摘も今回の範囲外として維持します。
