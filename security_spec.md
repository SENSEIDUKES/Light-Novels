# Security Spec

## 1. Data Invariants
- A StoryWorld cannot exist without a valid userId that matches the authenticated user.
- A StoryWorld's ID must match the document `{storyId}` path.
- The `userId` property must be immutable - ownership cannot be transferred.

## 2. The "Dirty Dozen" Payloads
1. Unauthorized user attempting to read another user's story.
2. Unauthenticated user trying to read a story.
3. User attempting to create a story where `userId` is set to someone else.
4. User attempting to create a story missing the `createdAt` property.
5. User attempting to update the `userId` of an existing story.
6. User attempting to inject a 10MB string into the `title` field.
7. User attempting to add a 'isAdmin' property during update.
8. Unauthenticated user trying to update a story.
9. Unauthenticated user trying to delete a story.
10. User attempting to delete another user's story.
11. User querying for stories where `userId` is not theirs.
12. User attempting to create a story with an invalid character as document ID (e.g. "path/traversal").

## 3. Test Runner
See `firestore.rules.test.ts`.
