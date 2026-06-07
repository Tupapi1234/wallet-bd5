@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
npx.cmd -y create-next-app@latest ./ --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
npm.cmd install zustand firebase lucide-react
echo "Setup Complete!"
