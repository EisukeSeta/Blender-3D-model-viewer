# GitHub Actions 自動デプロイ設定ガイド

このガイドでは、GitHub ActionsでS3への自動デプロイを設定する方法を説明します。

## 🚀 概要

mainブランチにpushすると、自動的に以下が実行されます:

1. ✅ コードのチェックアウト
2. ✅ Node.js環境のセットアップ
3. ✅ 依存関係のインストール
4. ✅ プロジェクトのビルド
5. ✅ S3へのデプロイ
6. ✅ (オプション) CloudFrontキャッシュの無効化

## 📋 セットアップ手順

### ステップ1: AWS IAMユーザーの作成

1. **AWS Management Console**にログイン
2. **IAM** → **ユーザー** → **ユーザーを追加**
3. ユーザー名: `github-actions-3d-viewer` (任意)
4. アクセスキータイプ: **アクセスキー - プログラムによるアクセス**
5. **次へ: アクセス許可**

### ステップ2: IAMポリシーの設定

以下のポリシーをアタッチまたは作成:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::www.seta.mydns.jp/3D-viewer/*",
        "arn:aws:s3:::www.seta.mydns.jp"
      ]
    }
  ]
}
```

**CloudFront使用時は追加**:
```json
{
  "Effect": "Allow",
  "Action": [
    "cloudfront:CreateInvalidation"
  ],
  "Resource": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
}
```

### ステップ3: アクセスキーの取得

1. IAMユーザー作成完了時に表示される:
   - **アクセスキーID**
   - **シークレットアクセスキー**
2. **必ず安全に保存してください**（再表示できません）

### ステップ4: GitHub Secretsの設定

1. GitHubリポジトリを開く: `https://github.com/EisukeSeta/Blender-3D-model-viewer`
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**をクリック

以下のシークレットを追加:

#### 必須シークレット

| Name | Value |
|------|-------|
| `AWS_ACCESS_KEY_ID` | IAMユーザーのアクセスキーID |
| `AWS_SECRET_ACCESS_KEY` | IAMユーザーのシークレットアクセスキー |

#### オプション（CloudFront使用時）

| Name | Value |
|------|-------|
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFrontディストリビューションID |

### ステップ5: ワークフローファイルの確認

`.github/workflows/deploy.yml` が作成されていることを確認:

```yaml
name: Deploy to S3

on:
  push:
    branches:
      - main
  workflow_dispatch:  # 手動実行も可能
```

### ステップ6: 動作確認

1. コードを修正
2. コミット & プッシュ:
   ```bash
   git add .
   git commit -m "test: GitHub Actions自動デプロイのテスト"
   git push origin main
   ```
3. GitHubリポジトリの **Actions** タブで実行状況を確認

## 🔍 ワークフローの確認方法

### GitHub Actionsページ

1. リポジトリページで **Actions** タブをクリック
2. 最新のワークフロー実行を確認
3. 各ステップの詳細ログを表示可能

### 実行状態

- 🟢 **Success** - デプロイ成功
- 🔴 **Failure** - エラー発生（ログを確認）
- 🟡 **In Progress** - 実行中

## 🛠️ トラブルシューティング

### エラー: "Error: Credentials could not be loaded"

**原因**: AWS認証情報が正しく設定されていない

**解決策**:
1. GitHub Secretsの設定を確認
2. `AWS_ACCESS_KEY_ID`と`AWS_SECRET_ACCESS_KEY`が正しいか確認
3. シークレット名のスペルミスがないか確認

### エラー: "Access Denied"

**原因**: IAMユーザーに必要な権限がない

**解決策**:
1. IAMポリシーを確認
2. S3バケットへのアクセス権限があるか確認
3. バケット名が正しいか確認

### エラー: "npm ci failed"

**原因**: package-lock.jsonが最新でない

**解決策**:
```bash
npm install
git add package-lock.json
git commit -m "chore: update package-lock.json"
git push
```

### ビルドは成功するがデプロイされない

**原因**: S3 syncコマンドが失敗している

**解決策**:
1. Actionsログでエラーメッセージを確認
2. S3バケット名が正しいか確認
3. リージョン設定が正しいか確認（`ap-northeast-1`）

## 🎯 手動実行

緊急時や確認のため、手動でワークフローを実行できます:

1. GitHubリポジトリの **Actions** タブ
2. **Deploy to S3** ワークフローを選択
3. **Run workflow** → **Run workflow**

## 📊 デプロイフロー

```
コード修正
    ↓
git push origin main
    ↓
GitHub Actions起動
    ↓
Node.js環境セットアップ
    ↓
npm ci (依存関係インストール)
    ↓
npm run build (Viteビルド)
    ↓
AWS認証
    ↓
S3へsync (dist/ → s3://www.seta.mydns.jp/3D-viewer/)
    ↓
(オプション) CloudFrontキャッシュ無効化
    ↓
✅ デプロイ完了
    ↓
🌐 https://www.seta.mydns.jp/3D-viewer/ に反映
```

## ⚙️ カスタマイズ

### CloudFrontキャッシュ無効化を有効にする

`.github/workflows/deploy.yml`の以下の行を変更:

```yaml
- name: Invalidate CloudFront cache (optional)
  if: true  # falseからtrueに変更
  run: |
    aws cloudfront create-invalidation \
      --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
      --paths "/3D-viewer/*"
```

そして、GitHub Secretsに`CLOUDFRONT_DISTRIBUTION_ID`を追加。

### デプロイブランチを変更

```yaml
on:
  push:
    branches:
      - main
      - production  # 追加のブランチ
```

### Node.jsバージョンを変更

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'  # バージョンを変更
```

## 💰 コスト

GitHub Actionsの無料枠:
- **パブリックリポジトリ**: 無制限
- **プライベートリポジトリ**: 月2,000分

通常のデプロイは1-2分程度なので、月100回以上デプロイしても無料枠内です。

## 🔐 セキュリティのベストプラクティス

1. ✅ **最小権限の原則**: IAMユーザーに必要最小限の権限のみ付与
2. ✅ **シークレットの管理**: アクセスキーをコードにコミットしない
3. ✅ **定期的なローテーション**: アクセスキーを定期的に更新
4. ✅ **監査ログ**: CloudTrailでAPIコールを監視

## 📝 次のステップ

1. ✅ GitHub Secretsを設定
2. ✅ テストプッシュで動作確認
3. ✅ Actionsタブでログを確認
4. ✅ 本番デプロイ開始！

---

**自動デプロイで開発を加速しましょう! 🚀**
