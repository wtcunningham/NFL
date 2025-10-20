# 🏈 NFL Project – Development Progress

## 📋 Overview
This project follows a structured development pipeline designed to ensure clarity, consistency, and scalability throughout the build and deployment process.

---

## 🧭 Summary of Progress

`[x]` Requirements Documentation -> [x] Local Build -> [x] Github Hosted -> [] AWS Amplify Integrated -> [] Public URL Available

| Stage | Description | Status |
|:------|:-------------|:--------|
| 1 | [Requirements Documentation](https://github.com/wtcunningham/NFL/blob/main/app_requirements_draft_v_1.md) | ✅ Completed |
| 2 | [Local Build](http://localhost:5173/) | ✅ Completed |
| 3 | [GitHub Hosted](https://github.com/wtcunningham/NFL) | ✅ Completed |
| 4 | AWS Amplify Integrated | 🚧 Next Step |
| 5 | Public URL Available | ⏳ Pending |

---

## ⚙️ Development Pipeline

### 1. **Requirements Documentation** ✅ *Completed*
All functional and technical requirements have been gathered, reviewed, and finalized in the requirements document.
This serves as the foundation for the entire build process and ensures alignment between design and implementation.

---

### 2. **Local Build** ✅ *Completed*
The initial local environment has been successfully configured and tested.
All dependencies have been verified, and the application builds and runs correctly on the local machine.

---

### 3. **GitHub Hosted** ✅ *Completed*
The source code is now hosted in a GitHub repository for version control, collaboration, and continuous tracking.
This stage ensures that updates, commits, and documentation are properly maintained.

---

### 4. **AWS Amplify Integrated** 🚧 *In Progress / Next Step*
The next milestone is to integrate the GitHub repository with **AWS Amplify**.
This will enable automatic deployment from GitHub to a cloud-hosted environment.
Once integrated, updates to the `main` or designated branch will trigger rebuilds and redeployments automatically.

**Tasks to complete this step:**
- Connect GitHub repo to AWS Amplify.
- Configure build settings (`amplify.yml`).
- Verify environment variables and deployment scripts.
- Test continuous deployment workflow.

---

### 5. **Public URL Available** ⏳ *Pending*
After successful Amplify integration and deployment, a **public URL** will be available for live access and testing.

**Expected outcome:**
- Public URL accessible via AWS Amplify hosting.
- Application automatically updated on each GitHub push.

---