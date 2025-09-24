# CreateGalleryFunction Deployment Guide

## Overview
The CreateGalleryFunction has been successfully integrated into the projects service serverless configuration. This Python-based Lambda function processes PDF and SVG files to create interactive galleries.

## What's Been Configured

### 1. **Serverless Integration**
- Added Python function to `backend/projects/serverless.yml`
- Configured proper IAM permissions for S3 and DynamoDB access
- Set up S3 event triggers for `.pdf` and `.svg` files in `uploads/` prefix
- Added HTTP API endpoint `/galleries/create` for manual invocation

### 2. **Dependencies**
- Added `serverless-python-requirements` plugin to handle Python dependencies
- Updated `package.json` with required dev dependencies
- PyMuPDF (fitz) dependency defined in `requirements.txt` (installed during deployment)
- Dependencies cached for faster subsequent deployments

### 3. **Environment Configuration**
- Using correct bucket: `mylg-files-v12` (via `FILE_BUCKET` env var)
- Proper DynamoDB table references
- WebSocket endpoint configuration for real-time updates

### 4. **Function Features**
- **Runtime**: Python 3.9
- **Memory**: 512MB
- **Timeout**: 300 seconds (5 minutes)
- **Triggers**: 
  - S3 events (uploads/*.pdf, uploads/*.svg)
  - HTTP API endpoint for manual creation

## Deployment Steps

### Prerequisites
1. Ensure you're in the correct directory:
   ```powershell
   cd "d:\MYLG\App\v1.2-mylg\backend\projects"
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

### Deploy
Choose one of these deployment options:

#### Option 1: Use the deployment script
```powershell
.\deploy.ps1
```

#### Option 2: Manual deployment
```powershell
npx serverless deploy --stage dev --verbose
```

## Function Behavior

### S3 Event Processing
When a PDF or SVG file is uploaded to `mylg-files-v12` bucket with `uploads/` prefix:
1. Extracts embedded images from the file
2. Uploads extracted images to S3
3. Creates updated file with clickable links
4. Saves gallery metadata to DynamoDB
5. Broadcasts real-time updates via WebSocket

### HTTP API Processing
POST `/galleries/create` with payload:
```json
{
  "projectId": "uuid",
  "galleryName": "My Gallery",
  "gallerySlug": "my-gallery",
  "galleryPassword": "optional",
  "passwordEnabled": true,
  "svgData": "base64-encoded-svg",
  "pdfData": "base64-encoded-pdf"
}
```

## Database Schema
Saves to `Galleries` table:
- `galleryId`: Primary key (UUID)
- `projectId`: Foreign key with GSI
- `name`, `slug`: Gallery identification
- `imageUrls`: Array of extracted image URLs
- `imageMap`: PDF page/position mapping
- `pageImageUrls`: Pre-rendered page images (v2 galleries)
- `passwordHash`: Optional password protection

## Security & Permissions
- JWT authorization required for HTTP endpoint
- S3 read/write permissions for file processing
- DynamoDB read/write for gallery metadata
- WebSocket API permissions for real-time updates

## Monitoring
Function logs will appear in CloudWatch under:
- Log Group: `/aws/lambda/mylg-v12-create-gallery-dev`

## Troubleshooting

### Common Issues
1. **Python dependencies**: Dependencies are installed automatically during deployment
2. **S3 permissions**: Verify bucket policies allow Lambda access  
3. **WebSocket endpoint**: Set correct WEBSOCKET_ENDPOINT in environment
4. **Memory limits**: Function may need more memory for large files
5. **Docker requirement**: Plugin uses Docker for non-Linux systems to compile dependencies

### Verification
After deployment, check:
1. Lambda function exists in AWS Console
2. S3 event notifications are configured
3. DynamoDB table permissions are correct
4. CloudWatch logs show successful deployments