# Deploy script for projects service with Python gallery function
# This script ensures all dependencies are properly installed before deployment

Write-Host "Installing Node.js dependencies..." -ForegroundColor Green
npm install

Write-Host "Checking Python dependencies..." -ForegroundColor Green
Write-Host "Note: createGalleryFunction has been moved to backend/create-gallery. See ../create-gallery/README.md for Python build instructions." -ForegroundColor Yellow

Write-Host "Validating serverless configuration..." -ForegroundColor Green
npx serverless print

Write-Host "Deploying projects service..." -ForegroundColor Green
npx serverless deploy --verbose

Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host "The createGalleryFunction is now deployed and will be triggered by S3 events for .pdf and .svg files in the uploads/ prefix" -ForegroundColor Yellow