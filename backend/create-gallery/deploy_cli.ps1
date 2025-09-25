param(
    [string]$FunctionName = "mylg-v12-create-gallery-dev",
    [string]$Region = "us-west-2"
)

Set-StrictMode -Version Latest

Write-Host "Deploy helper: build (WSL) -> upload zip -> invoke smoke test" -ForegroundColor Cyan

# Move to service root
Set-Location $PSScriptRoot\..
$serviceRoot = (Get-Location).Path

# Build using WSL when available
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "Detected WSL. Running build script inside WSL..."
    $abs = $serviceRoot
    # Convert Windows absolute path like C:\path\to -> /mnt/c/path/to for WSL
    $drive = $abs.Substring(0,1).ToLower()
    $rest = $abs.Substring(2) -replace '\\','/'
    $wslPath = "/mnt/$drive/$rest"
    & wsl bash -lc "cd '$wslPath' && ./scripts/build_wsl.sh"
    if ($LASTEXITCODE -ne 0) { Write-Error "WSL build failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }
} else {
    Write-Host "WSL not detected. Attempting to run build script directly (may fail on Windows): ./scripts/build_wsl.sh"
    bash ./scripts/build_wsl.sh
    if ($LASTEXITCODE -ne 0) { Write-Error "Build failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }
}

# Check for zip
$zipPath = Join-Path $serviceRoot ".serverless\createGalleryFunction.zip"
if (-not (Test-Path $zipPath)) { Write-Error "Zip not found at $zipPath"; exit 2 }

$zipFull = (Resolve-Path $zipPath).Path
Write-Host "Uploading $zipFull to Lambda function: $FunctionName in region $Region"

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) { Write-Error "AWS CLI not found in PATH. Install and configure AWS CLI or run this script in an environment with aws configured."; exit 3 }

aws lambda update-function-code --function-name $FunctionName --zip-file "fileb://$zipFull" --region $Region
if ($LASTEXITCODE -ne 0) { Write-Error "update-function-code failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }

Write-Host "Performing smoke invoke..."
$payload = '{"smoke":"ping"}'
aws lambda invoke --function-name $FunctionName --payload $payload out.json --cli-binary-format raw-in-base64-out --region $Region
if ($LASTEXITCODE -ne 0) { Write-Error "invoke failed with exit code $LASTEXITCODE"; exit $LASTEXITCODE }

Write-Host "---- INVOKE OUTPUT ----"
Get-Content out.json -Raw | Write-Host
Write-Host "---- END OUTPUT ----"

Write-Host "Tailing recent logs (last 2 minutes): aws logs tail /aws/lambda/$FunctionName --since 2m --limit 50"
aws logs tail /aws/lambda/$FunctionName --since 2m --limit 50 --region $Region

Write-Host "Deploy complete"
