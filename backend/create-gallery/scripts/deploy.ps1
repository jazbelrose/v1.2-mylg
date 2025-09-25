param(
    [string]$FunctionName = "mylg-v12-create-gallery-dev",
    [string]$Region = "us-west-2",
    [string]$Stage = "dev"
)

Set-Location $PSScriptRoot\..\

Write-Host "Packaging create-gallery service (handler: lambda_function.lambda_handler)"

# Create .serverless zip
if(Test-Path .serverless\createGalleryFunction.zip){ Remove-Item .serverless\createGalleryFunction.zip -Force }
Compress-Archive -Path lambda_function.py, requirements.txt -DestinationPath .serverless\createGalleryFunction.zip -Force

Write-Host "ZIP created at .serverless/createGalleryFunction.zip (ready for manual upload or CI)"
