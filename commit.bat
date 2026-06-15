@echo off
git add "app/story/[id]/page.tsx" "app/write/[id]/page.tsx" "components/Providers.tsx"
git commit -m "fix: dark mode persist and isAuthor computed"
git push origin main
del commit.bat
