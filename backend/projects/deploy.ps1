# Deploy script for projects service with Python gallery function
# This script ensures all dependencies are properly installed before deployment

Write-Host "Installing Node.js dependencies..." -ForegroundColor Green
npm install

Write-Host "Checking Python dependencies..." -ForegroundColor Green
if (!(Test-Path "createGalleryFunction\requirements.txt")) {
    Write-Error "requirements.txt not found in createGalleryFunction directory"
    exit 1
}

Write-Host "Validating serverless configuration..." -ForegroundColor Green
npx serverless print

Write-Host "Deploying projects service..." -ForegroundColor Green
npx serverless deploy --verbose

Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "The createGalleryFunction is now deployed and will be triggered by S3 events for .pdf and .svg files in the uploads/ prefix" -ForegroundColor Yellow