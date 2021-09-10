# Change Log

Dates are in YYYY-MM-DD format


# 2021.9.10

### Features
* **Direct Messages:** Handle direct messages between users and a per-bot-user
direct messages staff/admin room.


# 2021.8.10

### Fixes
* **Messages:** Remove staff user ID from additional file attachment messages.
* **Messages:** Set parent ID on additional file attachment messages so they
always appear together in the same thread.


# 2021.8.4-1

### Fixes
* **Messages:** Fix sending multiple files again.


# 2021.8.4

### Fixes
* **Messages:** Fix edited and deleted messages not applying in the paired room.
Fix file attachments for messages with 2 or more attachments.
Delete all corresponding messages when deleting a message that originally had
multiple file attachments.


# 2021.8.2

### Features
* **Messages:** Use mongo database to store and retrieve message ID and thread
IDs instead of in-memory cache.

### Fixes
* **Messages:** Fix missing markdown from staff-to-user messages.


# 2021.7.29

### Fixes

* **Messages:** Cache handled message event IDs and do not process them a
second time if the same webhook event is received more than once.


# 2021.7.27

### Fixes

* **Messages:** Fixed deleting messages from staff in the user rooms.


# 2021.7.21-1

### Features

* **Messages:** Send new message if update operation finds no matching message
in the paired room.


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