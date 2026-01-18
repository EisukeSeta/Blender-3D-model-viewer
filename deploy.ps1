# 3D Viewer - S3デプロイスクリプト
# 使用方法: .\deploy.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  3D Viewer - S3デプロイスクリプト" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ステップ1: ビルド
Write-Host "[1/2] プロジェクトをビルド中..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ビルドに失敗しました" -ForegroundColor Red
    exit 1
}

Write-Host "✅ ビルド完了" -ForegroundColor Green
Write-Host ""

# ステップ2: S3にアップロード
Write-Host "[2/2] S3にアップロード中..." -ForegroundColor Yellow
aws s3 sync ./dist/ s3://www.seta.mydns.jp/3D-viewer/ --delete

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ アップロードに失敗しました" -ForegroundColor Red
    exit 1
}

Write-Host "✅ アップロード完了" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  デプロイ成功! 🎉" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "アクセスURL: http://www.seta.mydns.jp/3D-viewer/" -ForegroundColor Cyan
Write-Host ""
