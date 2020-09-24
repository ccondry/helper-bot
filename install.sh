#!/bin/sh
echo "running npm install"
npm i
if [ $? -eq 0 ]; then
  echo "edit .env file first"
  vim .env
  echo "installing systemd service..."
  sudo cp systemd.service /lib/systemd/system/helper-bot.service
  sudo systemctl enable helper-bot.service
  echo "starting systemd service..."
  sudo sudo /bin/systemctl start helper-bot.service
else
  echo "npm install failed"
fi
