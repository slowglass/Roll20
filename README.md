# Roll20

This repo contains my scripts that I use to run my Roll20 D&D game.
Currently they are designed just for me (hence the hard coded configutation).
If anyone stumbles upon these scripts and finds them usefull, please drop me
a line (Christopher.James.Davies@gmail.com). I am happy to work on improving the
scripts if other people are actually using them.

## Scripts
The scripts are as follows
1. Utils.js - Utilities script used by the other scripts
2. Conditions.js - Manage the conditions flags on tokens using [Custom Token Markers](https://wiki.roll20.net/Custom_Token_Markers).
3. Concentration.js - Sends a reminder to roll a Concentration check if someone concentrating is damaged. (Requires Conditions.js)
4. Debuf.js - Managed debufs on tokens (Requires Conditions.js)
5. Center.js - Centers the map on a player's token when the player is moved to looking at that map
6. Bespoke - Set of one off APIs used for various reasons

## Utilities
The utilities are as follows
1. roll20 - Script to manage uploading api scripts to roll20_dir
