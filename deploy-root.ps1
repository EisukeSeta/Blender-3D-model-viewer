# ルートページ - S3デプロイスクリプト
# 使用方法: .\deploy-root.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ルートページ - S3デプロイスクリプト" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootPath = "C:\Win_tools\Antigravity\www.seta.mydns.jp"
$s3Bucket = "s3://www.seta.mydns.jp/"

# ファイルの存在確認
if (-not (Test-Path "$rootPath\index.html")) {
    Write-Host "❌ index.htmlが見つかりません: $rootPath\index.html" -ForegroundColor Red
    exit 1
}

# S3にアップロード
Write-Host "S3にアップロード中..." -ForegroundColor Yellow
aws s3 cp "$rootPath\index.html" "$s3Bucket" --content-type "text/html"

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
Write-Host "アクセスURL: https://www.seta.mydns.jp/" -ForegroundColor Cyan
Write-Host ""
