param(
    [string]$FunctionName = "mylg-v12-create-gallery-dev",
    [string]$Region = "us-west-2",
    [switch]$UseDocker,
    [switch]$Publish,                         # also publish a new version
    [string]$Profile,                         # e.g. -Profile default
    [string]$ZipName = "createGalleryFunction.zip",
    [string]$PythonImage = "lambci/lambda:build-python3.9",
    [int]$LogsSinceMinutes = 2,
    [int]$LogsLimit = 50
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Checked {
    param([string]$Cmd, [string]$Err)
    Write-Host "» $Cmd" -ForegroundColor DarkGray
    $global:LASTEXITCODE = 0
    cmd /c $Cmd | Write-Output
    if ($LASTEXITCODE -ne 0) { throw "$Err (exit $LASTEXITCODE)" }
}

Write-Host "Deploy helper: build (WSL/Docker) -> upload zip -> wait -> smoke test -> tail logs" -ForegroundColor Cyan

# Move to service root
Set-Location $PSScriptRoot\..
$serviceRoot = (Get-Location).Path

# Ensure .serverless exists
$serverlessDir = Join-Path $serviceRoot ".serverless"
if (-not (Test-Path $serverlessDir)) { New-Item -ItemType Directory -Path $serverlessDir | Out-Null }

# Detect tools
$wslAvailable    = (Get-Command wsl -ErrorAction SilentlyContinue) -ne $null
$dockerAvailable = (Get-Command docker -ErrorAction SilentlyContinue) -ne $null
$awsAvailable    = (Get-Command aws -ErrorAction SilentlyContinue) -ne $null

if (-not $awsAvailable) { throw "AWS CLI not found in PATH. Install & configure AWS CLI v2." }

# Compose base AWS args
$awsArgs = @("--region", $Region)
if ($Profile) { $awsArgs = @("--profile", $Profile) + $awsArgs }

# Friendly suffix for messages when a profile is provided
$profileSuffix = ""
if ($Profile) { $profileSuffix = " (profile $Profile)" }

# Verify AWS identity
try {
    aws sts get-caller-identity @awsArgs | Out-Null
} catch {
    throw "AWS CLI not authenticated for region $Region$profileSuffix."
}

# Verify Lambda exists
try {
    aws lambda get-function --function-name $FunctionName @awsArgs | Out-Null
} catch {
    throw "Lambda function '$FunctionName' not found in $Region$profileSuffix."
}

# Build
if ($UseDocker -and -not $dockerAvailable) {
    throw "Docker requested via -UseDocker but 'docker' not found in PATH."
}

if ($UseDocker -or (-not $wslAvailable -and $dockerAvailable)) {
    Write-Host "Using Docker to build Linux-compatible package..."
    # Detect Lambda base images (public ECR) or lambci images and avoid apt-get there
    $isLambdaImage = ($PythonImage -like 'public.ecr.aws/lambda/python:*') -or ($PythonImage -like 'lambci/*')

    if ($isLambdaImage) {
        Write-Host "Using Lambda base image ($PythonImage) to build wheels compatible with the Lambda runtime..."
        $dockerCmd = @'
set -euo pipefail
python -m pip install --upgrade pip setuptools wheel
python -m pip install --target=python -r requirements.txt
# prune
find python -type d -name "__pycache__" -prune -exec rm -rf {} +
find python -type d -name "tests" -prune -exec rm -rf {} + || true
rm -rf package || true && mkdir -p package
cp lambda_function.py package/
cp -r python/* package/ || true
(cd package && zip -r9 ../.serverless/ZIPNAME . -x "*/__pycache__/*")
'@
    } else {
        Write-Host "Using Debian-based image ($PythonImage); installing system deps via apt-get..."
        $dockerCmd = @'
set -euo pipefail
apt-get update
apt-get install -y zip build-essential libgl1 libxrender1 libxext6 fontconfig
python3 -m pip install --upgrade pip setuptools wheel
python3 -m pip install --target=python -r requirements.txt
# prune
find python -type d -name "__pycache__" -prune -exec rm -rf {} +
find python -type d -name "tests" -prune -exec rm -rf {} + || true
rm -rf package || true && mkdir -p package
cp lambda_function.py package/
cp -r python/* package/ || true
(cd package && zip -r9 ../.serverless/ZIPNAME . -x "*/__pycache__/*")
'@
    }

    $dockerCmd = $dockerCmd.Replace('ZIPNAME', $ZipName)
    $dockerArgs = @(
        'run','--rm',
        '-v', ($serviceRoot + ':/work'),
        '-w','/work',
        $PythonImage,
        'bash','-lc',"$dockerCmd"
    )
    Write-Host "Running docker build with image $PythonImage..."
    & docker @dockerArgs
    if ($LASTEXITCODE -ne 0) { throw "Docker build failed with exit code $LASTEXITCODE" }
}
elseif ($wslAvailable) {
    Write-Host "Detected WSL. Running build script inside WSL..."
    # Convert to WSL path using wslpath for robustness
    $wslPath = & wsl wslpath -a "$(Get-Item $serviceRoot)"
    if (-not $wslPath) {
        # fallback manual conversion
        $drive = $serviceRoot.Substring(0,1).ToLower()
        $rest = $serviceRoot.Substring(2) -replace '\\','/'
        $wslPath = "/mnt/$drive/$rest"
    }
    & wsl bash -lc "cd '$wslPath' && ./scripts/build_wsl.sh '$ZipName'"
    if ($LASTEXITCODE -ne 0) { throw "WSL build failed with exit code $LASTEXITCODE" }
}
else {
    Write-Host "No WSL or Docker detected. Attempting local bash build: ./scripts/build_wsl.sh"
    & bash ./scripts/build_wsl.sh "$ZipName"
    if ($LASTEXITCODE -ne 0) { throw "Local build failed with exit code $LASTEXITCODE" }
}

# Check for zip
$zipPath = Join-Path $serverlessDir $ZipName
if (-not (Test-Path $zipPath)) { throw "Zip not found at $zipPath" }
$zipFull = (Resolve-Path $zipPath).Path

Write-Host "Uploading $zipFull to Lambda: $FunctionName ($Region)$profileSuffix"

# Update code (optionally publish)
$updateArgs = @(
    "lambda","update-function-code",
    "--function-name",$FunctionName,
    "--zip-file","fileb://$zipFull"
) + $awsArgs
if ($Publish) { $updateArgs += @("--publish") }

aws @updateArgs | Out-Null
if ($LASTEXITCODE -ne 0) { throw "update-function-code failed with exit $LASTEXITCODE" }

# Wait for update to complete
aws lambda wait function-updated --function-name $FunctionName @awsArgs

# Smoke invoke
Write-Host "Performing smoke invoke..."
$tmpPayload = Join-Path $env:TEMP "create-gallery-smoke-payload.json"
[void][System.IO.File]::WriteAllBytes($tmpPayload, [System.Text.Encoding]::UTF8.GetBytes('{"smoke":"ping"}'))

$outFile = Join-Path $env:TEMP "create-gallery-out.json"
if (Test-Path $outFile) { Remove-Item $outFile -Force -ErrorAction SilentlyContinue }

$invokeArgs = @(
    "lambda","invoke",
    "--function-name",$FunctionName,
    "--payload","file://$tmpPayload",
    $outFile,
    "--cli-binary-format","raw-in-base64-out"
) + $awsArgs

$invokeJson = aws @invokeArgs | ConvertFrom-Json
$raw = Get-Content $outFile -Raw

Write-Host "---- INVOKE META ----"
$invokeJson | Format-List | Out-String | Write-Host
Write-Host "---- INVOKE PAYLOAD ----"
Write-Host $raw
Write-Host "---- END OUTPUT ----"

# Basic status check if function returns a { statusCode: ... }
try {
    $parsed = $raw | ConvertFrom-Json
    if ($parsed.statusCode -and [int]$parsed.statusCode -ge 300) {
        Write-Warning "Smoke test returned non-success statusCode: $($parsed.statusCode)"
    }
} catch { # payload might not be JSON; that's okay
}

# Tail logs
Write-Host ("Tailing logs (last {0} minutes, limit {1})..." -f $LogsSinceMinutes, $LogsLimit)
$logsArgs = @(
    "logs","tail","/aws/lambda/$FunctionName",
    "--since","${LogsSinceMinutes}m",
    "--limit",$LogsLimit
) + $awsArgs
aws @logsArgs

# Cleanup
Remove-Item $tmpPayload -Force -ErrorAction SilentlyContinue

Write-Host "Deploy complete ✅"
