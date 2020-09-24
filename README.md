# helper-bot
A Webex Teams bot that connects support staff with end users who need help,
while keeping the support staff anonymous to the users.

## Install
After cloning this repository, run `npm install` or `yarn` to install
dependencies.

## Configure
Copy the `.env.example` file to `.env` and edit it to match
your environment. You will need a Webex Teams bot token, 2 Webex Teams room IDs
(staff room and users room), and file upload path/url parameters.

## Run
Use `npm run start` or `yarn start` to start the service, and ctrl-c to stop it.

## Use
Mention the bot in a message in the users room in your Webex Teams client. Your
message will be passed to the staff room, along with any attachments. Reply to
the message in the staff room by mentioning the bot and optionally including the
end user's email in the message, which will be turned into an @mention in the 
users room. The bot will say which user sends each message in the staff room,
but will not include which staff members are replying in the user room.