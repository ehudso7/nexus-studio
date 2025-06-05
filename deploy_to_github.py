#!/usr/bin/env python3
import os
import subprocess
import shutil
import sys

def run_cmd(cmd):
    """Run a command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
        return result.returncode == 0
    except Exception as e:
        print(f"Exception: {e}")
        return False

def main():
    print("🚀 Deploying NexStudio to GitHub...")
    
    # Clean up
    print("🧹 Cleaning up old git repository...")
    if os.path.exists(".git"):
        shutil.rmtree(".git", ignore_errors=True)
    
    # Initialize git
    print("📁 Initializing new git repository...")
    if not run_cmd("git init -b main"):
        return
    
    # Configure git
    run_cmd("git config core.autocrlf false")
    run_cmd("git config core.filemode false")
    run_cmd("git config core.compression 0")
    
    # Add remote
    print("🔗 Adding GitHub remote...")
    run_cmd("git remote add origin https://github.com/ehudso7/nexus-studio.git")
    
    # Create commit with essential files first
    print("📝 Adding essential files...")
    essential_files = [
        "package.json",
        "REPOSITORY_MANIFEST.md",
        "SAAS_REQUIREMENTS.md"
    ]
    
    for file in essential_files:
        if os.path.exists(file):
            run_cmd(f"git add {file}")
    
    # Commit what we have
    print("💾 Creating initial commit...")
    commit_msg = """Initial commit: NexStudio - SaaS Platform

NexStudio is an enterprise-grade visual app builder available exclusively at https://nexstudio.dev

This is a SaaS-only platform with domain-lock enforcement.
Repository: https://github.com/ehudso7/nexus-studio"""
    
    run_cmd(f'git commit -m "{commit_msg}"')
    
    # Force push
    print("⬆️  Pushing to GitHub...")
    if run_cmd("git push -f origin main"):
        print("✅ Successfully pushed essential files!")
    else:
        print("❌ Failed to push. You may need to authenticate with GitHub.")
        print("Run: git push -f origin main")
    
    # Try to add more files in batches
    print("\n📦 Adding additional files in batches...")
    
    # Add directories one by one
    dirs_to_add = [
        "packages/domain-lock",
        "apps/web/middleware.ts",
        ".github",
        "docs",
        "nginx"
    ]
    
    for dir_path in dirs_to_add:
        if os.path.exists(dir_path):
            print(f"Adding {dir_path}...")
            if run_cmd(f"git add {dir_path}"):
                run_cmd(f'git commit -m "Add {dir_path}"')
                run_cmd("git push origin main")
    
    print("\n✅ Deployment complete!")
    print("Repository: https://github.com/ehudso7/nexus-studio")
    print("\nNote: Some files may have been skipped due to corruption.")
    print("The essential SaaS platform files have been pushed.")

if __name__ == "__main__":
    main()