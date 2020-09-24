#!/bin/sh
echo "uninstalling helper-bot..."
echo "stopping service..."
sudo systemctl stop helper-bot.service
echo "disabling service..."
sudo systemctl disable helper-bot.service
echo "removing service..."
sudo rm /lib/systemd/system/helper-bot.service
echo "successfully uninstalled helper-bot."
