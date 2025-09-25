create-gallery service

This service contains the standalone `createGalleryFunction` Python Lambda.

How to build (recommended: WSL/Docker/CI)

- Use WSL or a Linux CI runner to pip install PyMuPDF into the `python/` directory or build a Lambda Layer / container image.
- Example (WSL):
  python3.9 -m venv venv
  source venv/bin/activate
  pip install --target=python -r requirements.txt

Packaging & deploy
- Use `./scripts/deploy.ps1` to create `.serverless/createGalleryFunction.zip` locally. Then either use the AWS CLI or the Serverless Framework to update the function or deploy the stack.

Notes
- Do NOT commit compiled .so files into the repo. Use `.gitignore` to avoid tracking build artifacts.

Additional build & deploy notes (migrated from the projects docs)

Quick build steps (WSL recommended)
- cd to `backend/create-gallery`
- Create a Python 3.9 venv and install into the `python/` target directory:
  - python3.9 -m venv venv
  - source venv/bin/activate
  - pip install --target=python -r requirements.txt

Prepare the ZIP for deployment (local test)
- From `backend/create-gallery` you can create the deployment zip:
  ```powershell
  Remove-Item -Force .serverless\createGalleryFunction.zip -ErrorAction SilentlyContinue
  Compress-Archive -Path lambda_function.py, requirements.txt, python\* -DestinationPath .serverless\createGalleryFunction.zip -Force
  ```

Deploy options
- Quick: Use the existing PowerShell helper to upload only the lambda code (low risk):
  - From repository root: `backend/projects/scripts/deploy_create_gallery.ps1 -FunctionName mylg-v12-create-gallery-dev -Region us-west-2`
  - Or run the `backend/create-gallery/scripts/deploy.ps1` to create the zip and then upload via AWS CLI.
- Full stack: Run `npx serverless deploy` from `backend/create-gallery` to deploy the small CloudFormation stack for this service.

Troubleshooting
- If your Lambda logs show ImportError for PyMuPDF, ensure you built the native wheels in a Linux environment that matches AWS Lambda (glibc/x86_64). Use WSL or a Linux CI runner.
- Prefer CI-driven builds (GitHub Actions or AWS CodeBuild) to produce the zip or publish a Lambda Layer so developers on Windows don't need to produce .so files locally.

