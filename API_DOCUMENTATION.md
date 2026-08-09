# DOK Live — API Documentation

> **Base URL:** `https://your-domain.com`  
> **Auth:** All protected endpoints require `Authorization: Bearer <token>` in the request header.  
> **Token types:** `admin` token (from `/login`) and `student` token (from `/login`).

---

## Table of Contents

1. [Health Check](#health-check)
2. [Authentication — `/login`](#authentication)
3. [Admin — `/admin`](#admin)
4. [DOK (Super Admin) — `/dok`](#dok)
5. [Student — `/student`](#student)
6. [Feed — `/feed`](#feed)
7. [Quiz — `/quiz`](#quiz)
8. [Assignment — `/assignment`](#assignment)
9. [Session — `/session`](#session)
10. [Topic — `/topic`](#topic)
11. [Material — `/material`](#material)
12. [Leaderboard — `/leaderBoard`](#leaderboard)
13. [Error Response Format](#error-response-format)
14. [Data Models](#data-models)

---

## Health Check

### `GET /health`

Simple liveness probe.

**Auth:** None

**Response `200`**
```
OK
```

---

## Authentication

Base path: `/login`

---

### `POST /login`

Log in as either an admin/assistant or a student. Returns a JWT token.

**Auth:** None

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

**Success `200` — Admin login**
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "<jwt>",
  "data": {
    "id": 1,
    "email": "admin@example.com",
    "group": "groupA",
    "name": "Dr. Ahmed",
    "role": "teacher"
  }
}
```

**Success `200` — Student login**
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "<jwt>",
  "data": {
    "id": 5,
    "email": "student@example.com",
    "group": "groupA",
    "name": "Ali Hassan",
    "role": "student"
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Email not found in DB | `404` | `"Email not found"` |
| Admin password wrong | `400` | `"Invalid email or password"` |
| Student password wrong | `401` | `"Wrong password"` |
| Admin not yet verified | `403` | `"Email not verified"` |
| Student not yet verified | `403` | `"Email not verified"` |
| Student banned | `403` | `"Your account is banned"` |

---

### `GET /login/me`

Returns the currently authenticated user's profile (admin or student).

**Auth:** Any valid token (`protect`)

**Success `200` — Admin**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "group": "groupA",
    "name": "Dr. Ahmed",
    "role": "teacher"
  }
}
```

**Success `200` — Student**
```json
{
  "status": "success",
  "data": {
    "id": 5,
    "group": "groupA",
    "name": "Ali Hassan",
    "role": "student",
    "assistantId": 3
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No token | `401` | `"Not authorized, no token"` |
| Invalid/expired token | `401` | `"Not authorized, token failed"` |
| Admin deleted from DB | `401` | `"Admin not found"` |
| Student deleted from DB | `401` | `"Student not found"` |

---

### `GET /login/getAllGroups`

Returns all available groups.

**Auth:** None

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "data": [
      { "groupId": 1, "groupName": "groupa" },
      { "groupId": 2, "groupName": "groupb" }
    ]
  }
}
```

---

### `POST /login/forgetPassword`

Generates a 6-digit OTP and emails it to the user.

**Auth:** None

**Request Body**
```json
{ "email": "user@example.com" }
```

**Success `200`**
```json
{
  "status": "success",
  "data": { "email": "user@example.com" }
}
```

**Error Scenarios**

| Scenario | Status | Body |
|---|---|---|
| OTP already requested for this email | `400` | `{ "status": "You have already requested an OTP" }` |
| Email sending service failure | `500` | `{ "status": "Email service unavailable. Try again later." }` |
| Email not in DB | `404` | `{ "status": "email not found" }` |

---

### `POST /login/otp`

Verifies the OTP entered by the user.

**Auth:** None

**Request Body**
```json
{ "email": "user@example.com", "otp": "123456" }
```

**Success `200`**
```json
{
  "status": "success",
  "code": "OTP_VERIFIED",
  "message": "OTP verified successfully"
}
```

**Error Scenarios**

| Scenario | Status | Code |
|---|---|---|
| OTP not found for email | `400` | `OTP_INVALID` |
| OTP expired | `400` | `OTP_EXPIRED` |

---

### `POST /login/resetPassword/:email`

Resets the password after OTP is verified.

**Auth:** None

**URL Param:** `email` — the account email

**Request Body**
```json
{ "password": "newSecurePassword" }
```

**Success `200` — Admin**
```json
{
  "status": "success",
  "code": "ADMIN_PASSWORD_UPDATED",
  "message": "Admin password updated successfully"
}
```

**Success `200` — Student**
```json
{
  "status": "success",
  "code": "STUDENT_PASSWORD_UPDATED",
  "message": "Student password updated successfully"
}
```

**Error Scenarios**

| Scenario | Status | Code |
|---|---|---|
| OTP not verified yet | `400` | `OTP_NOT_VERIFIED` |
| Email not found in admin or student tables | `404` | `USER_NOT_FOUND` |

---

## Admin

Base path: `/admin`  
All routes require an **admin token** (`adminProtect`) unless noted otherwise.

---

### `POST /admin/adminRegister`

Register a new assistant (teaching assistant). Password is hashed before storing.

**Auth:** None (public registration endpoint)

**Request Body**
```json
{
  "email": "assistant@example.com",
  "name": "Sara Ali",
  "password": "securePass123",
  "phoneNumber": "01012345678",
  "group": "GroupA"
}
```

**Success `201`**
```json
{
  "status": "success",
  "data": { "message": "Assistant created successfully" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Email already exists (admin or student table) | `400` | `"Email already exists"` |
| Phone number already exists (admin or student table) | `400` | `"Phone number already exists"` |

---

### `GET /admin/adminSSE`

Opens a Server-Sent Events (SSE) connection for real-time notifications to the admin.

**Auth:** Admin token

**Response:** `text/event-stream`  
First event on connect:
```
event: connected
data: { "message": "SSE connection established", "admin": { "id": 1, "email": "...", "name": "...", "role": "teacher", "group": "groupA" } }
```
Heartbeat every 25 seconds:
```
: ping
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No admin on request | `401` | `"Unauthorized: No admin found"` |
| Invalid token | `401` | `"Not authorized, token failed"` |

---

### `GET /admin/pendingRegistrations`

Returns all unverified students in the admin's group awaiting approval.

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "message": "Pending registration from students",
  "data": {
    "count": 2,
    "data": [
      {
        "id": 10,
        "name": "Ahmed Samir",
        "email": "ahmed@example.com",
        "group": "groupa",
        "phoneNumber": "01099999999",
        "semester": "jun"
      }
    ]
  }
}
```

---

### `GET /admin/getpendingCount`

Returns the count of pending student registrations for the admin's group.

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "message": "Pending registration count",
  "data": { "count": 5 }
}
```

---

### `PATCH /admin/verifyStudent/:studentEmail`

Approves a pending student registration. Clears rejection and registration records.

**Auth:** Admin token  
**URL Param:** `studentEmail`

**Success `200`**
```json
{
  "status": "success",
  "message": "Student Ahmed Samir verified successfully",
  "data": { "studentEmail": "ahmed@example.com" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Student email not found | `404` | `"student not found"` |
| Student belongs to different group | `403` | `"You are not allowed to access this student"` |
| Student already verified | `400` | `"Student already verified"` |

---

### `PATCH /admin/rejectStudent/:studentEmail`

Rejects a pending student. Once all admins in the group reject, the student record is deleted.

**Auth:** Admin token  
**URL Param:** `studentEmail`

**Success `200`**
```json
{
  "status": "success",
  "message": "Student Ahmed Samir rejected successfully",
  "data": { "id": 10, "studentEmail": "ahmed@example.com" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Student not found | `404` | `"student not found"` |
| Student in different group | `403` | `"You are not allowed to access this student"` |
| Student already verified | `400` | `"Student already verified"` |
| Admin already rejected this student | `404` | `"Can not reject student twice"` |

---

### `GET /admin/checkStudentInGroup`

Returns all verified, active students assigned to the admin's group.

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "message": "Students in group groupa",
  "data": {
    "data": [
      { "id": 10, "name": "Ahmed Samir", "email": "ahmed@example.com", "banned": false }
    ]
  }
}
```

---

### `DELETE /admin/removeStudent/:studentEmail`

Permanently deletes a student and all their registration/rejection records.

**Auth:** Admin token (must be the student's assigned assistant, or admin id = 1)  
**URL Param:** `studentEmail`

**Success `200`**
```json
{
  "status": "success",
  "message": "Student Ahmed Samir deleted successfully",
  "data": { "id": 10, "studentEmail": "ahmed@example.com" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Student not found | `404` | `"student not found"` |
| Admin is not the student's assistant (and not id=1) | `403` | `"You are not allowed to access this student"` |

---

### `PATCH /admin/banStudent/:studentEmail`

Toggles the ban status of a student (ban ↔ unban).

**Auth:** Admin token (must be student's assistant, or id=1)  
**URL Param:** `studentEmail`

**Success `200` — Banned**
```json
{
  "status": "success",
  "message": "Student Ahmed Samir banned successfully",
  "data": { "id": 10, "studentEmail": "ahmed@example.com" }
}
```

**Success `200` — Unbanned**
```json
{
  "status": "success",
  "message": "Student Ahmed Samir unbanned successfully",
  "data": { "id": 10, "studentEmail": "ahmed@example.com" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Student not found | `404` | `"student not found"` |
| Not the student's assistant | `403` | `"You are not allowed to access this student"` |

---

### `GET /admin/showMyProfile`

Returns the admin's own profile and their verified students. If admin id = 1, also returns all admins.

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "id": 3,
    "adminName": "Sara Ali",
    "adminEmail": "sara@example.com",
    "phoneNumber": "01099999999",
    "group": "groupa",
    "students": [ ... ],
    "admins": "n/a"
  }
}
```

> `admins` is populated only when the requesting admin has id = 1 (the teacher/DOK account).

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Admin record not found in DB | `404` | `"Admin not found"` |

---

### `GET /admin/showStudentProfile/:studentId`

Returns full profile details of a specific student.

**Auth:** Admin token (must be student's assistant, or id=1)  
**URL Param:** `studentId`

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "id": 10,
    "studentName": "Ahmed Samir",
    "studentEmail": "ahmed@example.com",
    "birthDate": "2005-03-15T00:00:00.000Z",
    "studentPhoneNumber": "01011111111",
    "parentPhoneNumber": "01022222222",
    "parentEmail": "parent@example.com",
    "group": "groupa",
    "semester": "jun",
    "totalScore": 85.5
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Student not found | `404` | `"student not found"` |
| Not the student's assistant | `403` | `"You are not allowed to access this student"` |

---

### `GET /admin/showUnmarkedSubmissions`

Returns all submissions (quiz and assignment) that have no score yet, for the admin's group.

**Auth:** Admin token

**Success `200` — submissions found**
```json
{
  "status": "success",
  "message": "Unmarked submissions for admin Sara Ali",
  "data": {
    "submissions": [
      {
        "id": 22,
        "studentId": 10,
        "studentName": "Ahmed Samir",
        "studentGroup": "groupa",
        "type": "assignment",
        "submittedAt": "2026-08-01T10:00:00.000Z",
        "subject": "Biology",
        "assignmentId": 5,
        "assignmentTitle": "Cell Division"
      }
    ]
  }
}
```

**Success `200` — none found**
```json
{ "status": "success", "message": "No unmarked submissions found" }
```

---

### `GET /admin/showMarkedSubmissions`

Returns all submissions that have already been scored, for the admin's group.

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "message": "Marked submissions for admin Sara Ali",
  "data": {
    "submissions": [
      {
        "id": 20,
        "studentId": 10,
        "studentName": "Ahmed Samir",
        "studentGroup": "groupa",
        "type": "quiz",
        "score": 18,
        "markedAt": "2026-07-30T12:00:00.000Z",
        "subject": "Physics",
        "quizId": 3,
        "quizTitle": "Waves Quiz"
      }
    ]
  }
}
```

**Success `200` — none found**
```json
{ "status": "success", "message": "No marked submissions found" }
```

---

### `GET /admin/showAllSubmissions`

Returns all submissions (marked and unmarked) for the admin's group.

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "message": "Unmarked submissions for admin Sara Ali",
  "data": {
    "submissions": [
      {
        "id": 22,
        "studentId": 10,
        "quizId": null,
        "assignmentId": 5,
        "submittedAt": null
      }
    ]
  }
}
```

**Success `200` — none found**
```json
{ "message": "No submissions found" }
```

---

### `GET /admin/findSubmissionById/:id`

Returns a single submission record by its ID.

**Auth:** Admin token (must belong to the same group as the submission's assistant/student)  
**URL Param:** `id` — submission ID

**Success `200`**
```json
{
  "status": "success",
  "data": { "found": { ...submissionFields } }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Submission not found | `404` | `"Submission demanded is not found"` |
| Admin not authorized to view | `403` | `"You are not allowed to view this submission"` |

---

### `PATCH /admin/markSubmission/:id`

Scores (and optionally provides a marked PDF link) for a submission. Updates the student's total score accordingly. Supports re-marking.

**Auth:** Admin token  
**URL Param:** `id` — submission ID

**Request Body**
```json
{
  "score": 18,
  "marked": "https://cdn.example.com/marked/submission22.pdf"
}
```

**Success `200`**
```json
{
  "status": "success",
  "message": "Submission marked successfully"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Submission not found | `404` | `"Submission demanded is not found"` |
| Admin not authorized | `403` | `"You are not allowed to view this submission"` |

---

### `GET /admin/createReport/:topicId`

Generates a full topic report: per-student quiz score, grade, session attendance, and assignment completion status.

**Auth:** Admin token  
**URL Param:** `topicId`

**Success `200`**
```json
{
  "topicId": 4,
  "topicName": "Photosynthesis",
  "quizTitle": "Chapter Quiz",
  "quizTotalScore": 20,
  "numberOfAssignments": 2,
  "totalSession": 4,
  "students": [
    {
      "id": 10,
      "email": "ahmed@example.com",
      "studentName": "Ahmed Samir",
      "banned": false,
      "quizScore": 16,
      "percentage": 80.0,
      "grade": "A*",
      "attended": 3,
      "assignments": [
        { "id": 5, "title": "Cell Drawing", "status": "done" },
        { "id": 6, "title": "Lab Report", "status": "missing" }
      ]
    }
  ]
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Requester is not an admin | `403` | `"Access denied. Assistants only."` |
| Topic not found | `404` | `"Topic not found or not owned by this assistant."` |
| Admin group doesn't match topic group | `403` | `"You are not authorized to access this topic."` |

---

### `GET /admin/makeReportForStudent/:studentId` or `GET /admin/makeReportForStudent/:studentId/:topicId`

Generates a weekly performance report for a specific student. If `topicId` is omitted, uses the student's latest topic.

**Auth:** Admin token (must be student's assistant)  
**URL Params:** `studentId`, optional `topicId`

**Success `200`**
```json
{
  "status": "success",
  "message": "Weekly report generated successfully",
  "data": {
    "id": 4,
    "topicTitle": "Photosynthesis",
    "studentName": "Ahmed Samir",
    "semester": "jun",
    "totalSessions": 4,
    "sessionsAttended": 3,
    "totalAssignments": 2,
    "submittedAssignments": 1,
    "quizGrade": "A",
    "quizData": { ... },
    "materials": [ ... ],
    "sessions": [ ... ]
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Student not found | `404` | `"student not found"` |
| Not the student's assistant | `403` | `"You are not allowed to access this student"` |
| Topic not found | `404` | `"Topic not found"` |
| Student not authorized for topic | `403` | `"You are not authorized to access this topic"` |

---

### `GET /admin/needsAttention`

Returns students whose total score is below the group average, flagging them as needing attention.

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "averageScore": 72.5,
    "students": [ { "studentId": 10, "studentName": "...", "totalScore": 45 } ]
  }
}
```

---

## DOK

Base path: `/dok`  
Most routes require admin id = 1 (the "teacher" / DOK super-admin account) unless noted.

---

### `POST /dok/signUp`

Creates the one and only DOK (teacher) account with id = 1. Role defaults to `teacher`, permission to `all`.

**Auth:** None

**Request Body**
```json
{
  "email": "teacher@dok.com",
  "name": "Dr. Mahmoud",
  "password": "superSecret",
  "phoneNumber": "01000000001",
  "role": "teacher",
  "permission": "all"
}
```

**Success `201`**
```json
{
  "status": "success",
  "data": { "message": "Teacher created successfully" }
}
```

> This endpoint hard-codes `adminId: 1`. Calling it again will fail with a DB unique constraint error.

---

### `DELETE /dok/rejectAssistant/:email`

Rejects and permanently deletes an unverified assistant registration.

**Auth:** Admin token, id = 1 only  
**URL Param:** `email`

**Success `200`**
```json
{
  "status": "success",
  "message": "Assistant with email sara@example.com rejected and removed from database"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Not admin id=1 | `403` | `"You are not authorized to perform this action"` |
| Assistant not found | `404` | `"Admin not found"` |

---

### `PATCH /dok/acceptAssistant/:email`

Verifies (approves) a pending assistant registration.

**Auth:** Admin token, id = 1 only  
**URL Param:** `email`

**Success `200`**
```json
{
  "status": "success",
  "message": "Assistant with email sara@example.com accepted"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Not admin id=1 | `403` | `"You are not authorized to perform this action"` |
| Assistant not found | `404` | `"Admin not found"` |

---

### `GET /dok/showPendingAssistantRegistration`

Lists all assistants who have registered but are not yet verified.

**Auth:** Admin token, id = 1 only

**Success `200`**
```json
{
  "status": "success",
  "message": "Pending registration from assistants",
  "data": {
    "data": [
      { "name": "Sara Ali", "email": "sara@example.com", "group": "groupa", "phoneNumber": "01099999999" }
    ]
  }
}
```

---

### `DELETE /dok/removeAssistant/:email`

Permanently removes an assistant account.

**Auth:** Admin token, id = 1 only  
**URL Param:** `email`

**Success `200`**
```json
{
  "status": "success",
  "message": "Assistant with email sara@example.com removed successfully"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Not admin id=1 | `403` | `"You are not authorized to perform this action"` |
| Assistant not found | `404` | `"Admin not found"` |

---

### `GET /dok/checkAssistantInGroup/:group`

Returns all assistants assigned to a given group.

**Auth:** Admin token, id = 1 only  
**URL Param:** `group`

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "data": [
      { "name": "Sara Ali", "email": "sara@example.com" }
    ]
  }
}
```

---

### `PATCH /dok/assignGroupToAssistant/:id`

Assigns or changes the group of an assistant.

**Auth:** Admin token, id = 1 only  
**URL Param:** `id` — assistant's admin ID

**Request Body**
```json
{ "group": "groupb" }
```

**Success `200`**
```json
{
  "status": "success",
  "message": "Group groupb assigned to assistant Sara Ali successfully"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Assistant not found | `404` | `"Assistant not found"` |

---

### `POST /dok/createNewGroup`

Creates a new student/assistant group.

**Auth:** Admin token, id = 1 only

**Request Body**
```json
{ "groupName": "GroupC" }
```

**Success `201`**
```json
{
  "status": "success",
  "message": "Group GroupC created successfully",
  "data": { "groupId": 3, "groupName": "groupc" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Group name already exists | `400` | `"Group name already exists"` |

---

### `PATCH /dok/updateGroup`

Renames an existing group and updates all references.

**Auth:** Admin token, id = 1 only

**Request Body**
```json
{ "groupName": "GroupA", "newName": "GroupAlpha" }
```

**Success `200`**
```json
{
  "status": "success",
  "message": "group GroupA changed to GroupAlpha"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| `groupName` does not exist | `400` | `"Group name does not exist"` |
| `newName` already exists | `400` | `"New group name already exists"` |

---

### `DELETE /dok/deleteGroup`

Deletes a group by name.

**Auth:** Admin token, id = 1 only

**Request Body**
```json
{ "groupName": "GroupC" }
```

**Success `200`**
```json
{
  "status": "success",
  "message": "Group GroupC deleted successfully"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Group does not exist | `400` | `"Group name does not exist"` |

---

### `DELETE /dok/deleteAllAssignmentsSubmission`

Deletes every assignment submission in the system.

**Auth:** Admin token, id = 1 only

**Success `200`**
```json
{
  "status": "success",
  "data": { "message": "All submissions for the assignment deleted successfully" }
}
```

---

### `DELETE /dok/deleteAllQuizSubmission`

Deletes every quiz submission in the system.

**Auth:** Admin token, id = 1 only

**Success `200`**
```json
{
  "status": "success",
  "data": { "message": "All submissions for the quiz deleted successfully" }
}
```

---

### `DELETE /dok/deleteBySemester`

**⚠️ Destructive.** Deletes ALL data for a given semester: materials, sessions, attendance, submissions, assignments, quizzes, topics, rejections, registrations, OTPs, and students.

**Auth:** Admin token, id = 1 only

**Request Body**
```json
{ "semester": "jun" }
```

Semester must be `"jun"` or `"nov"` (case-insensitive).

**Success `200`**
```json
{
  "status": "success",
  "message": "All data for semester jun deleted successfully"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Invalid semester value | `400` | `"Semester must be either 'Jun' or 'Nov'"` |

---

### `PATCH /dok/resetScore`

Resets `totalScore` to 0 for every student in the system.

**Auth:** Admin token, id = 1 only

**Success `200`**
```json
{
  "status": "success",
  "message": "Total score reset to zero for all students"
}
```

---

### `GET /dok/studentsDashboard`

Returns a dashboard summary of all students across all groups.

**Auth:** Admin token, id = 1 only

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "totalStudents": 45,
    "totalGroups": 3,
    "students": [ ... ]
  }
}
```

---

## Student

Base path: `/student`

---

### `POST /student/studentRegister`

Registers a new student. Password is hashed. Creates a pending registration record and notifies assistants via SSE.

**Auth:** None

**Request Body**
```json
{
  "studentEmail": "ahmed@example.com",
  "studentName": "Ahmed Samir",
  "password": "secure123",
  "studentPhoneNumber": "01011111111",
  "parentPhoneNumber": "01022222222",
  "parentEmail": "parent@example.com",
  "birthDate": "2005-03-15",
  "group": "GroupA",
  "semester": "jun"
}
```

**Success `201`**
```json
{
  "status": "success",
  "data": { "message": "Student registered successfully" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Email already exists (admin or student) | `400` | `"Email already exists"` |
| Phone number already exists | `400` | `"Phone number already exists"` |
| Missing phone number | `400` | `"Phone number is required"` |

---

### `GET /student/studentSSEConnection`

Opens an SSE connection for real-time notifications to the student.

**Auth:** Student token

**Response:** `text/event-stream`  
First event:
```
event: connected
data: { "message": "SSE connection established", "student": { "id": 5, "email": "...", "name": "...", "group": "groupa" } }
```
Heartbeat every 25 seconds:
```
: ping
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No student on request | `401` | `"Unauthorized: No student found"` |
| Student not in DB | `404` | `"Student not found in DB"` |

---

### `GET /student/showMyAdminProfile`

Returns the profile of the assistant assigned to the logged-in student.

**Auth:** Student token

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "id": 3,
    "adminName": "Sara Ali",
    "adminEmail": "sara@example.com",
    "PhoneNumber": "01099999999",
    "group": "groupa"
  }
}
```

---

### `GET /student/showMyProfile`

Returns the student's own profile.

**Auth:** Student token

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "id": 10,
    "studentName": "Ahmed Samir",
    "studentEmail": "ahmed@example.com",
    "birthDate": "2005-03-15T00:00:00.000Z",
    "studentPhoneNumber": "01011111111",
    "parentPhoneNumber": "01022222222",
    "parentEmail": "parent@example.com",
    "group": "groupa",
    "semester": "jun",
    "totalScore": 85.5
  }
}
```

---

### `GET /student/getMyFeed`

Returns feed posts visible to the student (from their assistant and semester). Posts older than 14 days are auto-deleted before returning.

**Auth:** Student token

**Success `200`**
```json
{
  "status": "success",
  "results": 3,
  "data": { "feeds": [ ... ] }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No feed found | `404` | `"No feed found for your assistant"` |

---

### `GET /student/showMySubmission`

Returns all the student's submissions (quizzes and assignments), enriched with title and subject info.

**Auth:** Student token

**Success `200`**
```json
{
  "status": "success",
  "message": "Submissions for student Ahmed Samir",
  "data": {
    "submissions": [
      {
        "id": 22,
        "type": "assignment",
        "name": "Cell Division",
        "subject": "Biology",
        "assistantId": 3,
        "quizId": null,
        "assignmentId": 5,
        "submittedAt": "2026-08-01T10:00:00.000Z",
        "score": null
      }
    ]
  }
}
```

**Success `200` — none found**
```json
{ "message": "No submissions found" }
```

---

### `GET /student/showSubmission/:id`

Returns the full details of a single submission.

**Auth:** Student token (must own the submission)  
**URL Param:** `id` — submission ID

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "id": 22,
    "score": null,
    "answers": "https://cdn.example.com/submission.pdf",
    "subDate": "2026-08-01T10:00:00.000Z",
    "studentId": 10,
    "assistantId": 3,
    "type": "assignment",
    "semester": "jun",
    "quizId": null,
    "assId": 5,
    "markedAt": "2026-08-01T10:00:00.000Z"
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Submission not found | `404` | `"Submission demanded is not found"` |
| Student doesn't own submission | `403` | `"You are not allowed to view this submission"` |

---

### `GET /student/showMarkedSubmission/:id`

Returns the scored submission with the marked PDF link and feedback.

**Auth:** Student token (must own the submission)  
**URL Param:** `id`

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "id": 22,
    "assistant": "Sara Ali",
    "assId": 3,
    "score": 18,
    "markedPdf": "https://cdn.example.com/marked/submission22.pdf",
    "markedAt": "2026-08-05T09:00:00.000Z",
    "feedback": "Good work!"
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Submission not found | `404` | `"Submission demanded is not found"` |
| Submission not marked yet | `400` | `"Submission not marked yet"` |
| Student doesn't own it | `403` | `"You are not allowed to view this submission"` |

---

### `GET /student/getQuizTrend`

Returns quiz score trend data for charting (score per quiz, ordered by date).

**Auth:** Student token

**Query Params (optional)**
- `from` — ISO date string (start filter)
- `to` — ISO date string (end filter)

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "points": [
      { "quizId": 3, "date": "2026-07-10T00:00:00.000Z", "week": 1, "score": 16, "totalMark": 20 }
    ],
    "chartPoints": [
      { "y": 1, "x": 16, "quizId": 3, "date": "2026-07-10T00:00:00.000Z" }
    ]
  }
}
```

---

### `GET /student/getMyWeeklyReport` or `GET /student/getMyWeeklyReport/:topicId`

Returns the student's weekly report for their latest topic (or a specific topic).

**Auth:** Student token  
**URL Param (optional):** `topicId`

**Success `200`** — See [`GET /admin/makeReportForStudent/:studentId`](#get-adminmakereportforstudentstudenttopicid) for the same response shape.

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Topic not found | `404` | `"Topic not found"` |
| Topic not for student's group | `403` | `"You are not authorized to access this topic"` |
| Internal error | `500` | `"Internal server error"` |

---

### `GET /student/getUnsubmittedAssignments`

Returns all assignments in the student's group that they have not yet submitted.

**Auth:** Student token

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "assignments": [
      {
        "assignId": 6,
        "title": "Lab Report",
        "subject": null,
        "topicId": 4,
        "endDate": "2026-09-01T00:00:00.000Z",
        "submitted": "false"
      }
    ]
  }
}
```

---

## Feed

Base path: `/feed`

---

### `GET /feed`

Returns all feed posts. Posts older than 14 days are auto-purged before returning.

**Auth:** Any valid token (`protect`)

**Success `200`**
```json
{
  "status": "success",
  "results": 4,
  "data": [
    {
      "feedId": 1,
      "text": "Session moved to Saturday",
      "dateAndTime": "2026-08-01T08:00:00.000Z",
      "semester": "jun",
      "adminId": 3
    }
  ]
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No posts exist | `404` | `"Feed is empty"` |

---

### `POST /feed/postOnFeed`

Creates a new feed post and notifies all students in the admin's group via SSE.

**Auth:** Admin token

**Request Body**
```json
{
  "text": "Quiz rescheduled to Friday!",
  "semester": "jun"
}
```

**Success `201`**
```json
{
  "status": "success",
  "data": { "message": "Post created & submitted successfully" }
}
```

---

## Quiz

Base path: `/quiz`

---

### `POST /quiz/createQuiz`

Creates a new quiz for a topic. Validates all fields and semester.

**Auth:** Admin token

**Request Body**
```json
{
  "title": "Waves & Sound",
  "mark": 20,
  "date": "2026-09-10T09:00:00.000Z",
  "semester": "jun",
  "durationInMin": 45,
  "topicId": 4
}
```

**Success `201`**
```json
{
  "status": "success",
  "data": { "message": "Quiz created successfully", "id": 7 }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Missing required fields | `400` | `"All fields are required"` |
| Mark is negative | `400` | `"Mark must be a non-negative number"` |
| Invalid date format | `400` | `"Invalid date format"` |
| Empty/missing semester | `400` | `"Semester must be a non-empty string"` |
| Semester not "jun" or "nov" | `400` | `"Semester must be either 'Jun' or 'Nov'"` |
| Duration ≤ 0 | `400` | `"Duration must be a positive number"` |

---

### `GET /quiz/getAllQuizzes`

Returns all quizzes. For students, each quiz also includes a `submitted` flag.

**Auth:** Any valid token

**Success `200`**
```json
{
  "status": "success",
  "results": 5,
  "data": {
    "quizzes": [
      {
        "quizId": 7,
        "title": "Waves & Sound",
        "mark": 20,
        "startDate": null,
        "semester": "jun",
        "durationInMin": 45,
        "topicId": 4,
        "publisher": 3,
        "submitted": false
      }
    ]
  }
}
```

> `submitted` field only present for student tokens.

---

### `GET /quiz/get_quiz_by_id/:quizId`

Returns a single quiz by ID, including a `submitted` flag for the current user.

**Auth:** Any valid token  
**URL Param:** `quizId`

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "quizData": {
      "quizId": 7,
      "title": "Waves & Sound",
      "submitted": true
    }
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Quiz not found | `404` | `"Quiz not found"` |

---

### `GET /quiz/startQuiz/:quizId`

Starts a quiz for the admin's group: sets `startDate` to now, caches the quiz, and notifies students via SSE.

**Auth:** Admin token  
**URL Param:** `quizId`

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "message": "Quiz started for group groupa and cached",
    "quiz": { ...quizFields }
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Quiz not found | `404` | `"Quiz not found"` |
| Admin's group doesn't match quiz publisher's group | `403` | `"You do not have permission to access this quiz"` |

---

### `GET /quiz/getActiveQuiz`

Returns the currently active (cached) quiz for the requesting user's group.

**Auth:** Any valid token

**Success `200`**
```json
{
  "status": "success",
  "data": { "activeQuiz": { ...quizFields } }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No active quiz in cache for group | `404` | `"No active quiz found"` |
| User group doesn't match quiz publisher's group | `403` | `"You do not have permission to access this active quiz"` |

---

### `POST /quiz/submitActiveQuiz`

Submits answers for the currently active quiz.

**Auth:** Any valid token  

**Request Body**
```json
{ "answers": "https://cdn.example.com/quiz-answers.pdf" }
```

**Success `200`**
```json
{
  "status": "success",
  "data": { "message": "Quiz submitted successfully", "id": 22 }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No active quiz in cache | `404` | `"No active quiz found"` |
| Group mismatch | `403` | `"You do not have permission to access this active quiz"` |
| Quiz time expired | `400` | `"Quiz submission time has expired"` |

> If the student has already submitted, the existing submission is **updated** (re-submit allowed).

---

### `POST /quiz/submitQuiz/:quizId`

Submits (or re-submits) answers for any quiz by ID, regardless of active status.

**Auth:** Any valid token  
**URL Param:** `quizId`

**Request Body**
```json
{ "answers": "https://cdn.example.com/quiz-answers.pdf" }
```

**Success `200` — New submission**
```json
{
  "status": "success",
  "data": { "message": "Quiz submitted successfully", "id": 22 }
}
```

**Success `200` — Re-submission**
```json
{
  "status": "success",
  "data": { "message": "Quiz resubmitted successfully", "id": 22 }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Quiz not found | `404` | `"Quiz not found"` |

---

### `PATCH /quiz/modifyQuiz/:quizId`

Updates the title and/or description of a quiz.

**Auth:** Admin token  
**URL Param:** `quizId`

**Request Body**
```json
{ "title": "Updated Title", "description": "New description" }
```

**Success `200`**
```json
{
  "status": "success",
  "data": { "message": "Quiz modified successfully" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Quiz not found | `404` | `"Quiz not found"` |
| No changes made | `404` | `"No changes made or quiz not found"` |
| Admin group mismatch | `403` | `"You do not have permission to access this quiz"` |

---

### `DELETE /quiz/deleteQuiz/:quizId`

Permanently deletes a quiz and all its submissions.

**Auth:** Admin token  
**URL Param:** `quizId`

**Success `200`**
```json
{
  "status": "success",
  "data": { "message": "Quiz deleted successfully" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Quiz not found | `404` | `"Quiz not found"` |
| Admin group mismatch | `403` | `"You do not have permission to access this quiz"` |

---

## Assignment

Base path: `/assignment`

---

### `POST /assignment/createAssignment`

Creates a new assignment. `startDate` is set automatically to now.

**Auth:** Admin token

**Request Body**
```json
{
  "title": "Cell Division Lab",
  "description": "Draw and label mitosis stages",
  "mark": 15,
  "document": "https://cdn.example.com/assignment5.pdf",
  "endDate": "2026-09-15T23:59:00.000Z",
  "semester": "jun",
  "topicId": 4
}
```

**Success `201`**
```json
{
  "status": "success",
  "data": { "message": "assignment created successfully", "id": 5 }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Missing `semester`, `topicId`, or `title` | `400` | `"All fields are required"` |
| Mark is negative | `400` | `"Mark must be a non-negative number"` |
| `document` is not a valid `.pdf` URL | `400` | `"Assignment PDF must be a valid link ending with .pdf"` |
| `endDate` is invalid | `400` | `"Invalid date format"` |
| `endDate` is in the past | `400` | `"End date must be after start date"` |
| `semester` empty/not a string | `400` | `"Semester must be a non-empty string"` |
| Semester not "jun" or "nov" | `400` | `"Semester must be either 'Jun' or 'Nov'"` |

---

### `GET /assignment/getAllAssignments`

Returns all assignments for the user's group. Each assignment includes a `state` field: `"submitted"`, `"missing"`, or `"unsubmitted"`.

**Auth:** Any valid token

**Success `200`**
```json
{
  "submitted": 1,
  "submittedLate": 0,
  "missed": 1,
  "data": {
    "assignments": [
      {
        "assignId": 5,
        "title": "Cell Division Lab",
        "endDate": "2026-09-15T23:59:00.000Z",
        "state": "unsubmitted"
      }
    ]
  }
}
```

---

### `GET /assignment/get_assignment_by_id/:assignId`

Returns a single assignment with a `submitted` flag and its topic's subject.

**Auth:** Any valid token  
**URL Param:** `assignId`

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "assignData": {
      "assignId": 5,
      "title": "Cell Division Lab",
      "submitted": false
    },
    "subject": "Biology"
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Assignment not found | `404` | `"Assignment not found"` |
| User's group doesn't match publisher's group | `403` | `"You do not have permission to view this Assignment"` |

---

### `POST /assignment/submitAssignment/:assignId`

Submits or re-submits an assignment. On re-submit, clears the previous score.

**Auth:** Student token  
**URL Param:** `assignId`

**Request Body**
```json
{ "answers": "https://cdn.example.com/student-answer5.pdf" }
```

**Success `200` — New submission**
```json
{
  "status": "success",
  "data": { "message": "Assignment submitted successfully", "id": 22 }
}
```

**Success `200` — Re-submission**
```json
{
  "status": "success",
  "data": { "message": "Assignment resubmitted successfully", "id": 22 }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Assignment not found | `404` | `"Assignment not found"` |
| Student's group doesn't match | `403` | `"You do not have permission to view this Assignment"` |

---

### `GET /assignment/getUnsubmittedAssignments`

Returns all assignments in the student's group that have no submission yet.

**Auth:** Student token

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "assignments": [
      {
        "assignId": 6,
        "title": "Lab Report",
        "subject": null,
        "topicId": 4,
        "endDate": "2026-09-01T00:00:00.000Z",
        "submitted": "false"
      }
    ]
  }
}
```

---

### `DELETE /assignment/deleteAssignment/:assignId`

Permanently deletes an assignment and its submissions.

**Auth:** Admin token (must match publisher's group)  
**URL Param:** `assignId`

**Success `200`**
```json
{
  "status": "success",
  "data": { "message": "Assignment deleted successfully" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Assignment not found | `404` | `"Assignment not found"` |
| Group mismatch | `403` | `"You do not have permission to modify/delete this Assignment"` |

---

### `PATCH /assignment/modifyAssignment/:assignId`

Updates the title and/or description of an assignment.

**Auth:** Admin token (must match publisher's group)  
**URL Param:** `assignId`

**Request Body**
```json
{ "title": "New Title", "description": "Updated instructions" }
```

**Success `200`**
```json
{
  "status": "success",
  "data": { "message": "Assignment modified successfully" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Assignment not found | `404` | `"Assignment not found"` |
| Group mismatch | `403` | `"You do not have permission to modify/delete this Assignment"` |
| No changes made | `404` | `"No changes made or assignment not found"` |

---

## Session

Base path: `/session`

---

### `POST /session/startSession`

Creates a new session for the admin's group using the group's latest topic. Caches the active session and notifies students via SSE.

**Auth:** Admin token

**Success `201`**
```json
{
  "status": "success",
  "message": "Session created successfully",
  "data": {
    "id": 11,
    "topicId": 4,
    "group": "groupa",
    "semester": "jun",
    "dateAndTime": "2026-08-09T10:00:00.000Z",
    "day": "Sunday"
  }
}
```

> No body required. Session date is set to now. The current topic is determined from the latest topic in the group.

---

### `PATCH /session/endSession`

Marks the current active session as finished and clears it from cache.

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "data": { "message": "Session ended successfully" }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No active (unfinished) session for admin's group | `404` | `"No active session found for your group"` |

---

### `POST /session/attendSession`

Records attendance for the authenticated user in the currently active session. Admins receive a confirmation without recording attendance.

**Auth:** Any valid token

**Success `200` — First-time attendance**
```json
{
  "status": "success",
  "data": { "message": "Attendance recorded successfully" }
}
```

**Success `200` — Already attended (re-attend)**
```json
{
  "status": "success",
  "data": { "message": "Re-attending this session" }
}
```

**Success `200` — Admin**
```json
{
  "status": "success",
  "data": { "message": "Admin entering session." }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No active session for user's group | `404` | `"No active session found for your group"` |

---

### `GET /session/getAllAttendanceForSession/:sessionId`

Returns all attendance records for a specific session.

**Auth:** Admin token (session must belong to admin's group)  
**URL Param:** `sessionId`

**Success `200`**
```json
{
  "status": "success",
  "results": 12,
  "data": { "attendanceRecords": [ ... ] }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Session not found | `404` | `"Session not found"` |
| Admin's group doesn't match session's group | `403` | `"You do not have permission to access this session"` |

---

### `GET /session/getAllSessions`

Returns all sessions for the requesting user's group. For students, includes personal attendance status. For admins, returns raw session data.

**Auth:** Any valid token

**Success `200`**
```json
{
  "status": "success",
  "results": 8,
  "data": { "sessions": [ ... ] }
}
```

---

### `GET /session/getActiveSession`

Returns the currently unfinished session for the admin's group (queries DB, not cache).

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "data": { "activeSession": { ...sessionFields } }
}
```

**Error Scenarios**

| Scenario | Status | Body |
|---|---|---|
| No active session found | `404` | `{ "status": "error", "message": "No active sessions were found" }` |

---

### `GET /session/getLastCreatedSession`

Returns the most recently created session for the admin's group.

**Auth:** Admin token

**Success `200`**
```json
{
  "status": "success",
  "data": { "lastSession": { ...sessionFields } }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| No sessions exist for group | (passes to error handler) | `"No sessions found for your group"` |

---

## Topic

Base path: `/topic`

---

### `POST /topic/createTopic`

Creates a new topic for the admin's group.

**Auth:** Admin token

**Request Body**
```json
{
  "topicName": "Photosynthesis",
  "semester": "jun",
  "subject": "Biology"
}
```

**Validation:** `semester` must be `"jun"` or `"nov"`. `subject` must be `"biology"`, `"physics"`, or `"chemistry"` (case-insensitive).

**Success `201`**
```json
{
  "status": "success",
  "message": "Topic created successfully",
  "data": {
    "id": 4,
    "topicName": "Photosynthesis",
    "subject": "Biology",
    "semester": "jun",
    "group": "groupa"
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Invalid semester | `400` | `"Semester must be either 'Jun' or 'Nov'"` |
| Invalid subject | `400` | `"Subject must be either 'Biology', 'Physics' or 'Chemistry'"` |

---

### `GET /topic/get_topic_by_id/:topicId`

Returns a single topic with all its quizzes, assignments, and materials.

**Auth:** Any valid token  
**URL Param:** `topicId`

**Success `200`**
```json
{
  "status": "success",
  "data": {
    "id": "4",
    "topicName": "Photosynthesis",
    "subject": "Biology",
    "semester": "jun",
    "quizzes": [ { ...quizFields, "type": "quiz" } ],
    "assignments": [ { ...assignFields, "type": "pdf" } ],
    "materials": [ { ...materialFields, "type": "pdf" } ]
  }
}
```

Material `type` values: `"pdf"`, `"url"`, `"both"`, `"unknown"`.

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Topic not found | `404` | `"Topic not found"` |
| User's group doesn't match publisher's group | `403` | `"You do not have permission to view this topic"` |

---

### `GET /topic/getAllTopics`

Returns all topics for the user's group. Admin with group `"all"` gets all topics.

**Auth:** Any valid token

**Success `200`**
```json
{
  "status": "success",
  "message": "Retrieved 3 topics for group groupa",
  "data": { "topics": [ ... ] }
}
```

---

### `PATCH /topic/updateTopic/:topicId`

Updates a topic's name, semester, and/or subject.

**Auth:** Admin token (must match publisher's group)  
**URL Param:** `topicId`

**Request Body** (all optional)
```json
{
  "topicName": "Respiration",
  "semester": "nov",
  "subject": "Biology"
}
```

**Validation:** Same rules as create (`"jun"`/`"nov"` for semester, validated subjects).

**Success `200`**
```json
{
  "status": "success",
  "message": "topic Respiration updated successfully",
  "data": {
    "id": 4,
    "topicName": "Respiration",
    "subject": "Biology",
    "semester": "nov",
    "publisher": 3,
    "group": "groupa"
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Topic not found | `404` | `"Topic not found"` |
| Admin group mismatch | `403` | `"You do not have permission to update this topic"` |
| Invalid semester/subject in body | `400` | (see create validation errors) |

---

### `DELETE /topic/deleteTopic/:topicId`

Deletes a topic and all sessions linked to it.

**Auth:** Admin token (must match publisher's group)  
**URL Param:** `topicId`

**Success `200`**
```json
{
  "status": "success",
  "message": "topic with id: 4 is deleted"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Topic not found | `404` | `"Topic not found"` |
| Admin group mismatch | `403` | `"You do not have permission to update this topic"` |

---

## Material

Base path: `/material`

---

### `POST /material/createMaterial`

Creates a new learning material linked to a topic. Requires at least `title` and `topicId`. Either `document` (PDF URL) or `link` (web URL) can be provided, or both.

**Auth:** Admin token

**Request Body**
```json
{
  "title": "Chapter 3 Notes",
  "description": "Detailed notes on photosynthesis",
  "document": "https://cdn.example.com/chapter3.pdf",
  "link": "https://youtube.com/watch?v=abc123",
  "topicId": 4
}
```

**Success `201`**
```json
{
  "status": "success",
  "message": "Material created successfully",
  "data": {
    "newMaterial": {
      "materialId": 9,
      "title": "Chapter 3 Notes",
      "description": "Detailed notes on photosynthesis",
      "document": "https://cdn.example.com/chapter3.pdf",
      "link": "https://youtube.com/watch?v=abc123",
      "topicId": 4,
      "publisher": 3,
      "uploadDate": "2026-08-09T10:00:00.000Z",
      "subject": "Biology"
    }
  }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Missing `title` or `topicId` | `400` | `"Missing required fields: title, description, document, topicId"` |
| `topicId` doesn't exist | `404` | `"Topic with id 99 not found"` |

---

### `GET /material/getAllMaterials`

Returns all materials for the user's group, with an auto-derived `type` field.

**Auth:** Any valid token

**`type` values:**
- `"pdf"` — document URL ends with `.pdf`
- `"url"` — anything else

**Success `200`**
```json
{
  "status": "success",
  "results": 6,
  "data": {
    "materials": [
      {
        "materialId": 9,
        "title": "Chapter 3 Notes",
        "type": "pdf",
        "topicId": 4,
        "publisher": 3
      }
    ]
  }
}
```

---

### `GET /material/get_material_by_id/:id`

Returns a single material by ID.

**Auth:** Any valid token (user's group must match publisher's group)  
**URL Param:** `id`

**Success `200`**
```json
{
  "status": "success",
  "data": { "found": { ...materialFields } }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Material not found | `404` | `"Material with id 99 not found"` |
| Group mismatch | `403` | `"You do not have permission to view this material"` |

---

### `GET /material/getMaterialByTopicId/:topicId`

Returns all materials belonging to a specific topic.

**Auth:** Any valid token (topic's group must match user's group)  
**URL Param:** `topicId`

**Success `200`**
```json
{
  "status": "success",
  "results": 3,
  "data": { "materials": [ ... ] }
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Topic not found | `404` | `"Topic not found"` |
| Group mismatch | `403` | `"You do not have permission to view this topic"` |
| No materials for topic | `404` | `"No materials found for topicId 4"` |

---

### `PATCH /material/updateMaterial/:id`

Updates fields of an existing material. Requires `title` and `topicId` to remain present.

**Auth:** Admin token (must match publisher's group)  
**URL Param:** `id`

**Request Body** (any updatable fields)
```json
{
  "title": "Updated Notes",
  "description": "Revised version",
  "link": "https://youtube.com/watch?v=xyz789"
}
```

**Success `200`**
```json
{
  "status": "success",
  "message": "Material updated successfully"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Material not found | `404` | `"Material with id 99 not found"` |
| Admin group mismatch | `403` | `"You do not have permission to modify this material"` |
| No rows updated | `404` | `"Material with id 9 not found or no changes made"` |

---

### `DELETE /material/deleteMaterial/:id`

Permanently deletes a material.

**Auth:** Admin token (must match publisher's group)  
**URL Param:** `id`

**Success `200`**
```json
{
  "status": "success",
  "message": "Material deleted successfully"
}
```

**Error Scenarios**

| Scenario | Status | Message |
|---|---|---|
| Material not found | `404` | `"Material with id 99 not found"` |
| Admin group mismatch | `403` | `"You do not have permission to modify this material"` |
| Nothing deleted | `404` | `"Material with id 9 not found"` |

---

## Leaderboard

Base path: `/leaderBoard`

---

### `GET /leaderBoard`

Returns a paginated leaderboard of students ordered by total score. For students, also returns their own rank and score.

**Auth:** Any valid token

**Query Params**
- `page` *(optional, default: 1)* — page number; each page returns 20 students

**Success `200` — Student token**
```json
{
  "status": "success",
  "data": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalStudents": 55
    },
    "student": {
      "score": 85.5,
      "rank": 7
    },
    "leaderboard": [
      { "studentId": 4, "studentName": "Top Student", "totalScore": 120, "group": "groupa" }
    ]
  }
}
```

**Success `200` — Admin token**
```json
{
  "status": "success",
  "data": {
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalStudents": 55
    },
    "leaderboard": [ ... ]
  }
}
```

> Admin response omits the `student` field.

---

---

## Error Response Format

All errors go through the global error handler and return:

```json
{
  "status": "Error",
  "data": { "message": "Descriptive error message here" }
}
```

**Special case — Email format validation error:**  
If Sequelize throws a `ValidationError`, the handler overrides the message to `"Invalid email format"` with status `400`.

---

### Common Auth Errors (apply to all protected endpoints)

| Scenario | Status | Message |
|---|---|---|
| Missing `Authorization` header | `401` | `"Not authorized, no token"` |
| Token is malformed or expired | `401` | `"Not authorized, token failed"` |
| Token type doesn't match endpoint (e.g., student token on admin route) | `401` | `"Not authorized as admin"` / `"Not authorized as student"` |
| User account deleted while token still valid | `401` | `"Admin not found"` / `"Student not found"` |
| Student account banned | `401` | `"Your account has been banned."` |

---

## Data Models

### Admin

| Field | Type | Notes |
|---|---|---|
| `adminId` | Integer | PK, auto-increment |
| `email` | String | Unique, valid email |
| `name` | String | — |
| `group` | String | Group name or `"all"` |
| `password` | String | Bcrypt hashed |
| `phoneNumber` | String | Unique |
| `role` | ENUM | `"assistant"` \| `"teacher"` |
| `permission` | ENUM | `"all"` \| `"limited"` |
| `verified` | Boolean | Default `false` |

### Student

| Field | Type | Notes |
|---|---|---|
| `studentId` | Integer | PK, auto-increment |
| `studentEmail` | String | Unique, valid email |
| `parentEmail` | String | Valid email |
| `studentName` | String | — |
| `password` | String | Bcrypt hashed |
| `assistantId` | String | FK → Admin |
| `group` | String | — |
| `semester` | String | — |
| `parentPhoneNumber` | String | — |
| `studentPhoneNumber` | String | Unique |
| `birthDate` | Date | — |
| `totalScore` | Float | Default `0` |
| `verified` | Boolean | Default `false` |
| `banned` | Boolean | Default `false` |

### Quiz

| Field | Type | Notes |
|---|---|---|
| `quizId` | Integer | PK |
| `title` | String | — |
| `description` | String | — |
| `mark` | Integer | Max score |
| `createdAt` | Date | — |
| `publisher` | Integer | FK → Admin |
| `startDate` | Date | Set when quiz is started |
| `semester` | String | `"jun"` \| `"nov"` |
| `durationInMin` | Integer | — |
| `topicId` | Integer | FK → Topic |

### Assignment

| Field | Type | Notes |
|---|---|---|
| `assignId` | Integer | PK |
| `publisher` | Integer | FK → Admin |
| `title` | String | — |
| `description` | Text | — |
| `mark` | Integer | Max score |
| `document` | String | PDF URL |
| `startDate` | Date | — |
| `endDate` | Date | Deadline |
| `semester` | String | `"jun"` \| `"nov"` |
| `topicId` | Integer | FK → Topic |

### Submission

| Field | Type | Notes |
|---|---|---|
| `subId` | Integer | PK |
| `score` | Float | Null until marked |
| `answers` | String | PDF URL |
| `marked` | String | Marked PDF URL |
| `subDate` | Date | Default now |
| `studentId` | Integer | FK → Student |
| `assistantId` | Integer | FK → Admin |
| `type` | ENUM | `"quiz"` \| `"assignment"` |
| `semester` | String | — |
| `quizId` | Integer | FK → Quiz |
| `assId` | Integer | FK → Assignment |
| `markedAt` | Date | — |
| `feedback` | String | — |

### Session

| Field | Type | Notes |
|---|---|---|
| `sessionId` | Integer | PK |
| `topicId` | Integer | — |
| `group` | String | — |
| `semester` | String | — |
| `dateAndTime` | Date | — |
| `finished` | Boolean | Default `false` |
| `day` | String | e.g. `"Sunday"` |

### Topic

| Field | Type | Notes |
|---|---|---|
| `topicId` | Integer | PK |
| `topicName` | String | Required |
| `group` | String | Required |
| `semester` | String | `"jun"` \| `"nov"` |
| `publisher` | Integer | FK → Admin |
| `subject` | String | `"Biology"` \| `"Physics"` \| `"Chemistry"` |

### Material

| Field | Type | Notes |
|---|---|---|
| `materialId` | Integer | PK |
| `title` | String | — |
| `description` | Text | — |
| `document` | String | PDF URL |
| `link` | String | Web URL |
| `uploadDate` | Date | — |
| `topicId` | Integer | FK → Topic |
| `publisher` | Integer | FK → Admin |

### Feed

| Field | Type | Notes |
|---|---|---|
| `feedId` | Integer | PK |
| `text` | String | Post content |
| `dateAndTime` | Date | Default now |
| `semester` | String | — |
| `adminId` | Integer | FK → Admin |

### Attendance

| Field | Type | Notes |
|---|---|---|
| `attId` | Integer | PK |
| `studentId` | Integer | FK → Student |
| `recordedAt` | Date | — |
| `sessionId` | Integer | FK → Session |

### Group

| Field | Type | Notes |
|---|---|---|
| `groupId` | Integer | PK |
| `groupName` | String | Unique |

### OTP

| Field | Type | Notes |
|---|---|---|
| `email` | String | — |
| `otp` | String | 6-digit code |
| `expiresAt` | Date | — |
| `verified` | Boolean | Default `false` |

### Registration (pending)

| Field | Type | Notes |
|---|---|---|
| `studentEmail` | String | PK |
| `group` | String | — |
| `semester` | String | — |
| `dateAndTime` | Date | — |
| `rejectionCount` | Integer | Default `0` |

---
