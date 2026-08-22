# Database Learning Lab — Phase 6: Courses and Assignments

## Objective

Add lecturer-created assignments and student assignment workflows.

## Scope

Deliver:

- course model
- lecturer assignment CRUD
- publish/unpublish
- due date
- learning objectives
- starter ERD optional
- starter SQL optional
- sample dataset optional
- student assignment list
- start assignment -> create project
- assignment status

## Data Model

```text
courses/{courseId}
assignments/{assignmentId}
```

Assignment fields should include:

- courseId
- title
- description
- instructions
- learningObjectives
- dueAt
- status: draft | published | archived
- starterErd
- starterSql
- sampleData
- requirements

## Lecturer UX

Lecturer can:

- create
- edit
- preview
- publish
- unpublish
- archive

Do not allow accidental destructive delete once submissions exist; archive instead.

## Student UX

Student sees:

- title
- due date
- status
- instructions
- progress
- submission state

Action:

- Start Assignment

This should create/link a student project.

## Starter Content

If starter ERD exists:

- clone it
- never edit assignment template directly

If starter SQL/sample data exists:

- offer initialization into local DB

## Permissions

Lecturer:

- manage assignments for authorized course

Student:

- read published assignments
- cannot edit assignment definition

## Testing

Test:

- assignment CRUD
- publish visibility
- student cannot read drafts unless intended
- start assignment creates project
- starter ERD clone behavior
- due date rendering
- archive behavior

## Acceptance Criteria

Lecturer can publish an assignment and a student can start it as a project without affecting the master assignment template.

## Non-Goals

Do not implement:

- submission
- grading
- auto-grading
- AI

## Coding Agent Execution Prompt

Implement only Phase 6. Preserve prior project and snapshot behavior. Keep authorization enforced in Firestore rules, not only UI.
