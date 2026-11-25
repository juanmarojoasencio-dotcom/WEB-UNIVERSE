/*
# Clean chats and messages for official launch

Removes all seed/test data from chats and messages tables so the app
starts with a completely clean state. Users will see empty states
until they naturally create conversations.

Idempotent: safe to run multiple times.
*/

DELETE FROM messages;
DELETE FROM chats;
