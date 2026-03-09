#!/bin/bash

# Script to fix Netlify 404 / MIME Type errors by flushing CDN cache and triggering a clean remote build.
# Reference: docs/netlify-404-postmortem.md

# Exit on error
set -e

SITE_ID="a140a4ca-7c11-4f0b-bd4a-da062630ec4e"

echo "🚀 Starting Netlify 404 Fix Process..."

# 1. Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Error: netlify-cli is not installed. Please run 'npm install -g netlify-cli'."
    exit 1
fi

# 2. Check login status
echo "🔍 Checking Netlify login status..."
if ! netlify status &> /dev/null; then
    echo "❌ Error: You are not logged into Netlify CLI. Please run 'netlify login' first."
    exit 1
fi

# 3. Get the latest successful deploy ID
echo "📡 Fetching latest successful deploy..."
DEPLOY_ID=$(netlify api listSiteDeploys --data "{\"site_id\": \"$SITE_ID\"}" | grep -B 5 '"state": "ready"' | grep '"id":' | head -n 1 | sed 's/.*"id": "\(.*\)".*/\1/')

if [ -z "$DEPLOY_ID" ]; then
    echo "❌ Error: Could not find a successful (ready) deploy to restore."
    exit 1
fi

echo "✅ Found successful deploy ID: $DEPLOY_ID"

# 4. Restore the deploy to force CDN invalidation
echo "🔄 Restoring deploy $DEPLOY_ID to flush CDN cache..."
netlify api restoreSiteDeploy --data "{\"site_id\": \"$SITE_ID\", \"deploy_id\": \"$DEPLOY_ID\"}" > /dev/null

echo "✅ CDN flush triggered via deploy restore."

# 5. Trigger a fresh build with clear_cache
echo "🏗️ Triggering a fresh remote build with clear_cache=true..."
netlify api createSiteBuild --data "{\"site_id\": \"$SITE_ID\", \"clear_cache\": true}" > /dev/null

echo "✅ Fresh build triggered."
echo ""
echo "🎉 Recovery process initiated!"
echo "--------------------------------------------------"
echo "Next steps:"
echo "1. Monitor the build progress at: https://app.netlify.com/sites/manthanby/deploys"
echo "2. Once the build is 'ready', check https://manthanby.netlify.app in an incognito window."
echo "3. If the issue persists, wait 5-10 minutes for global CDN propagation."
echo "--------------------------------------------------"
