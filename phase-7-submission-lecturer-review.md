# Database Learning Lab — Phase 7: Submission and Lecturer Review

## Objective

Allow students to submit immutable logical snapshots of their work and lecturers to review/grade them in-browser.

## Scope

Deliver:

- submission creation
- submission versioning
- frozen ERD snapshot
- SQLite snapshot creation during submit
- lecturer submission list
- ERD review
- restore submitted SQLite into lecturer browser
- query submitted DB locally
- score
- feedback
- resubmission

## Submission Model

```text
submissions/{submissionId}
```

Fields:

- courseId
- assignmentId
- projectId
- studentUid
- version
- erdSnapshot
- sqliteSnapshotId
- submittedAt
- status
- score
- feedback

## Submission Semantics

Submission must not point only to mutable project state.
It must freeze:

- ERD
- SQLite snapshot
- timestamp
- version

Student may continue editing project after submission.
Resubmit -> new version.

## Student UX

Submit flow:

1. validate ERD
2. warn about blocking errors
3. create latest SQLite snapshot
4. freeze ERD
5. create submission
6. show confirmation

Do not mark submitted until required operations succeed.

## Lecturer Review

Lecturer can:

- filter assignment submissions
- open student
- inspect ERD
- view validation issues
- load submitted SQLite locally
- browse tables
- run SQL in browser
- enter score
- enter feedback
- mark graded

No server-side SQL.

## Grading

Manual grading first.
Fields:

- score
- feedback
- gradedAt
- gradedByUid

## Permissions

Student:

- create own submission
- read own submissions
- cannot alter score/feedback
- cannot edit frozen submission

Lecturer:

- read submissions in authorized course
- update grading fields

## Testing

Test:

- submit success
- snapshot failure prevents submission
- immutable ERD snapshot behavior
- resubmission creates version 2
- lecturer access
- student cannot grade self
- SQLite restore in reviewer mode

## Acceptance Criteria

Lecturer can inspect exactly what was submitted at that time and grade it without relying on the student's current mutable project.

## Non-Goals

Do not implement:

- automatic grading
- plagiarism detection
- AI review
- group projects

## Coding Agent Execution Prompt

Implement only Phase 7. Submission consistency is more important than speed. Avoid partial submissions. Extend Firestore rules and tests accordingly.
