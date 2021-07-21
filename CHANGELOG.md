# Change Log

Dates are in YYYY-MM-DD format


# 2021.7.21

### Features

* **Messages:** Add support for GIFs, editing messages, and deleting messages.
Improved file attachment handling.


# 2021.2.24

### Features

* **Tokens:** Change token refresh check from every 6 hours to every 1 hour.


# 2020.11.25

### Bug Fixes

* **Tokens:** Fix refresh token bug


# 2.2.0 (2020-09-29)

### Features

* **Webhook:** Get webhook secret from mongo database on a per-user basis. This
allows multiple users to be handled from the same webhook URL, each with
different secrets.


# 2.1.1 (2020-09-28)

### Features

* **Console:** Reduce debug logging


# 2.1.0 (2020-09-28)

### Features

* **Webhook:** Validate webhook signature on webhooks


# 2.0.1 (2020-09-28)

### Features

* **Startup:** Add version number to service startup log


# 2.0.0 (2020-09-28)

### Features

* **Bot:** Major changes to bot structure - use webhooks and oauth2 integration
to mediate messages as a user instead of a bot, without the need for users to
@mention the bot to communicate in the user room. Also added support for
multiple users, each supporting multiple user/staff room sets. Store all data
in mongodb database, and refresh tokens when necessary


# 1.1.0 (2020-09-23)

### Features

* **Install/Uninstall:** Add install scripts and example linux system files


# 1.0.0 (2020-09-23)

### Features

* **Bot:** Bot can relay messages between staff and user room, 
keeping people in the staff room anonymous from the people in the user room. 
Staff messages can include user email addresses in the message and they will be
turned into @mentions when sent to the user room.

* **Threads:** Replying to messages is supported. If the service is restarted,
the bot will try to rejoin the thread on the next reply.

* **Attachments:** Attachments are supported in both directions, and in threads.