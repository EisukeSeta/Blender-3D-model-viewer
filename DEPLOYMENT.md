# AWS S3デプロイガイド

このドキュメントでは、3D ViewerをAWS S3にデプロイする方法を説明します。

## 🚀 クイックデプロイ

### 自動デプロイ（推奨）

```powershell
.\deploy.ps1
```

このスクリプトは以下を自動実行します:
1. プロジェクトのビルド (`npm run build`)
2. S3へのアップロード (`aws s3 sync`)

### 手動デプロイ

#### ステップ1: ビルド
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
npm run build
```

#### ステップ2: S3にアップロード
```powershell
aws s3 sync ./dist/ s3://www.seta.mydns.jp/3D-viewer/ --delete
```

## 📁 デプロイ先

- **S3バケット**: `www.seta.mydns.jp`
- **パス**: `/3D-viewer/`
- **アクセスURL**: `http://www.seta.mydns.jp/3D-viewer/`

## ⚙️ 設定詳細

### Vite設定 (`vite.config.js`)

```javascript
export default defineConfig({
    base: '/3D-viewer/',  // S3サブフォルダ用のベースパス
    // ...
});
```

この設定により、すべてのアセットパスが `/3D-viewer/assets/...` として生成されます。

### ビルド出力

```
dist/
├── index.html          # メインHTMLファイル
└── assets/
    ├── index-*.css     # スタイルシート
    ├── index-*.js      # JavaScriptバンドル
    └── index-*.js.map  # ソースマップ
```

## 🔐 S3バケット設定

### 1. 静的ウェブサイトホスティング

- **有効化**: はい
- **インデックスドキュメント**: `index.html` (ルート用)
- **エラードキュメント**: `error.html` (オプション)

### 2. バケットポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::www.seta.mydns.jp/3D-viewer/*"
    }
  ]
}
```

### 3. CORS設定（3Dモデルファイル用）

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

## 🌐 アクセス方法

### ルートページからのリンク

```html
<!-- 絶対パス -->
<a href="/3D-viewer/">3D Model Viewer</a>

<!-- 相対パス -->
<a href="3D-viewer/">3D Model Viewer</a>
```

### 直接アクセス

- S3エンドポイント: `http://www.seta.mydns.jp.s3-website-<region>.amazonaws.com/3D-viewer/`
- カスタムドメイン: `http://www.seta.mydns.jp/3D-viewer/`

## 📝 Content-Type設定

S3は通常、ファイル拡張子から自動的にContent-Typeを設定しますが、3Dモデルファイルの場合は以下を推奨:

| 拡張子 | Content-Type |
|--------|--------------|
| `.glb` | `model/gltf-binary` |
| `.gltf` | `model/gltf+json` |
| `.stl` | `model/stl` |
| `.obj` | `text/plain` |
| `.fbx` | `application/octet-stream` |

## 🔄 更新フロー

1. コードを修正
2. `.\deploy.ps1` を実行
3. ブラウザでハードリロード（Ctrl+Shift+R）

## ⚠️ トラブルシューティング

### アセットが読み込めない

**症状**: CSSやJavaScriptが404エラー

**解決策**:
1. `vite.config.js`の`base`設定を確認
2. 再ビルド後、S3に再アップロード

### 3Dモデルが表示されない

**症状**: モデルファイルが読み込めない

**解決策**:
1. S3バケットのCORS設定を確認
2. ファイルのContent-Typeを確認
3. ブラウザのコンソールでエラーを確認

### キャッシュ問題

**症状**: 更新が反映されない

**解決策**:
1. ブラウザでハードリロード（Ctrl+Shift+R）
2. CloudFront使用時はキャッシュを無効化

## 🚀 高度な設定

### CloudFront + S3

より高速な配信とHTTPS対応のため、CloudFrontの使用を推奨:

1. CloudFrontディストリビューションを作成
2. オリジンをS3バケットに設定
3. カスタムドメインを設定（オプション）
4. SSL証明書を設定（AWS Certificate Manager）

### GitHub Actionsでの自動デプロイ

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to S3

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: jakejarvis/s3-sync-action@master
        with:
          args: --delete
        env:
          AWS_S3_BUCKET: www.seta.mydns.jp
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: 'ap-northeast-1'
          SOURCE_DIR: 'dist'
          DEST_DIR: '3D-viewer'
```

## 📊 コスト見積もり

S3静的ホスティングは非常に低コストです:

- **ストレージ**: ~3.2MB → 月額 $0.01未満
- **リクエスト**: 1,000リクエスト → $0.0004
- **データ転送**: 1GB → $0.09

通常の個人利用では**月額$1未満**で運用可能です。

---

**デプロイ成功をお祈りします! 🎉**
