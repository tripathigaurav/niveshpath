#!/bin/bash

# निवेश Path - Push to GitHub Script
# Run this script to push your code to GitHub

set -e  # Exit on error

echo "🚀 Pushing निवेश Path to GitHub..."
echo ""

# Configure git
echo "📝 Configuring git..."
git config user.name "tripathigaurav"
git config user.email "gaurav.tripathi@netapp.com"

# Add all files
echo "📦 Staging files..."
git add .

# Create commit
echo "💾 Creating commit..."
git commit -m "Initial commit: निवेश Path Portfolio Tracker

Complete Phase 1 & 2 implementation:
- Indian & US stocks tracking with live prices
- Mutual funds with NAV updates
- Other assets management
- Global search and market ticker
- Dark/light theme with responsive design
- Full accessibility (ARIA, keyboard nav)
- Security hardening (validation, rate limiting, CORS)
- Modern UI with Groww-inspired aesthetics"

# Add remote
echo "🔗 Adding GitHub remote..."
git remote add origin https://github.com/tripathigaurav/niveshpath.git || echo "Remote already exists"

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo "🌐 View at: https://github.com/tripathigaurav/niveshpath"
