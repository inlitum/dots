#!/usr/bin/env bash

# Manage the state of the N-Squared VPN

state_text=$(ip addr show dev wg0 2>&1)
option="enable\ndisable"

if [[ "${state_text}" == *"does not exist"* ]]; then
    option="enable"
else 
    option="disable"
fi

option=`echo -e "${option}" | rofi -l 2 -dmenu -window-title vpn `
case $option in
    enable)
        sudo wg-quick up wg0
	;;
    disable)
	sudo wg-quick down wg0
	;;
esac
