# CMS — Unit Testing & System Testing Test Cases

Use these tables exactly like your sample format.

Notes:
- **Actual Result** and **Pass/Fail** are marked **TBD** so you can fill them after running tests.
- Messages match the current API responses where they are explicit (e.g., `Invalid credentials`, `Missing token`, `Forbidden`).
- This project does **not** expose a public “Register” page; account creation happens via **Admin → Create Teacher** and **Admin → Create Student**.

---

## Unit Testing (Backend API + Key Utilities)

| TestCase | TestData | ExpectedResult | Actual Result | Pass/Fail |
|---|---|---|---|---|
| Health check returns OK | GET `/api/health` | `200` with `{ ok: true, message: "CMS server is running" }` | TBD | TBD |
| Login with valid credentials | POST `/api/auth/login` `{email: admin@campus.local, password: admin123}` | `200` with `{ ok: true, token, user }` | TBD | TBD |
| Login with wrong password | POST `/api/auth/login` `{email: admin@campus.local, password: wrong123}` | `401` with `{ ok:false, error:"Invalid credentials" }` | TBD | TBD |
| Login with unknown email | POST `/api/auth/login` `{email: notfound@x.com, password: any12345}` | `401` with `{ ok:false, error:"Invalid credentials" }` | TBD | TBD |
| Login with invalid email format (schema) | POST `/api/auth/login` `{email:"hello123.com", password:"abcdef"}` | `400` with `{ ok:false, error: <zod flatten> }` | TBD | TBD |
| Login with short password (schema) | POST `/api/auth/login` `{email:"a@b.com", password:"123"}` | `400` with `{ ok:false, error: <zod flatten> }` | TBD | TBD |
| `me` with valid token | GET `/api/auth/me` with `Authorization: Bearer <token>` | `200` with `{ ok:true, user }` | TBD | TBD |
| `me` missing token | GET `/api/auth/me` without auth header | `401` with `{ ok:false, error:"Missing token" }` | TBD | TBD |
| `me` invalid token | GET `/api/auth/me` with invalid JWT | `401` with `{ ok:false, error:"Invalid token" }` | TBD | TBD |

| Create teacher (admin) valid | POST `/api/users` admin token `{name, email, password, role:"TEACHER"}` | `201` with `{ ok:true, user }` | TBD | TBD |
| Create teacher with existing email | POST `/api/users` admin token `{email: existing}` | `409` with `{ ok:false, error:"Email already exists" }` | TBD | TBD |
| Create teacher with invalid email | POST `/api/users` admin token `{email:"bad"}` | `400` with `{ ok:false, error: <zod flatten> }` | TBD | TBD |
| Create teacher with short password | POST `/api/users` admin token `{password:"123"}` | `400` with `{ ok:false, error: <zod flatten> }` | TBD | TBD |
| Create teacher with role not TEACHER | POST `/api/users` admin token `{role:"ADMIN"}` | `400` with `{ ok:false, error:"Only TEACHER registration is allowed" }` | TBD | TBD |
| Create teacher with invalid subject assignment | POST `/api/users` admin token `{subjectAssignments:[{subjectId:9999}]}` | `400` with `{ ok:false, error:"One or more subject assignments are invalid" }` | TBD | TBD |
| Create teacher forbidden for non-admin | POST `/api/users` teacher token `{...}` | `403` with `{ ok:false, error:"Forbidden" }` | TBD | TBD |
| List users (admin) | GET `/api/users` admin token | `200` with `{ ok:true, users:[...] }` | TBD | TBD |
| List users forbidden (teacher) | GET `/api/users` teacher token | `403` with `{ ok:false, error:"Forbidden" }` | TBD | TBD |
| Update teacher valid | PUT `/api/users/:id` admin token `{name,email,password?}` | `200` with `{ ok:true, user }` | TBD | TBD |
| Update teacher invalid user id | PUT `/api/users/abc` admin token | `400` with `{ ok:false, error:"Invalid user id" }` | TBD | TBD |
| Update teacher not found | PUT `/api/users/999999` admin token | `404` with `{ ok:false, error:"User not found" }` | TBD | TBD |
| Update teacher email conflict | PUT `/api/users/:id` admin token `{email: existing}` | `409` with `{ ok:false, error:"Email already exists" }` | TBD | TBD |
| Delete teacher valid | DELETE `/api/users/:id` admin token | `200` with `{ ok:true, deletedUserId:id }` | TBD | TBD |
| Delete teacher invalid id | DELETE `/api/users/abc` admin token | `400` with `{ ok:false, error:"Invalid user id" }` | TBD | TBD |
| Delete teacher not found | DELETE `/api/users/999999` admin token | `404` with `{ ok:false, error:"User not found" }` | TBD | TBD |
| Delete own account blocked | DELETE `/api/users/<adminId>` as same admin | `400` with `{ ok:false, error:"You cannot delete your own account" }` | TBD | TBD |

| Create student (admin) valid | POST `/api/students` admin token `{firstName,lastName,rollNumber,batch,faculty,section,motherJob,fatherJob,travelTime}` | `201` with `{ ok:true, student }` | TBD | TBD |
| Create student duplicate roll same class | POST `/api/students` admin token existing `{rollNumber,batch,faculty,section}` | `409` with `{ ok:false, error:"rollNumber already exists in this class" }` | TBD | TBD |
| Create student missing required fields | POST `/api/students` admin token `{firstName:""...}` | `400` with `{ ok:false, error: <zod flatten> }` | TBD | TBD |
| Create student invalid travelTime | POST `/api/students` admin token `{travelTime: 999}` | `400` with `{ ok:false, error: <zod flatten> }` | TBD | TBD |
| List students (admin) no filter | GET `/api/students` admin token | `200` with `{ ok:true, students:[...] }` | TBD | TBD |
| List students (teacher) allowed | GET `/api/students?batch=ELEVEN&faculty=SCIENCE&section=BIO` teacher token | `200` with class students if allowed | TBD | TBD |
| List students (teacher) forbidden class | GET `/api/students?...` teacher token (class not assigned) | `403` with `{ ok:false, error:"You do not have access to this class" }` | TBD | TBD |
| List students forbidden (student) | GET `/api/students` student token | `403` with `{ ok:false, error:"Forbidden" }` | TBD | TBD |
| List students invalid class filter | GET `/api/students?batch=BAD` admin token | `400` with `{ ok:false, error:"Invalid class filter values" }` | TBD | TBD |

| Attendance summary (admin) valid | GET `/api/students/attendance-summary?batch=ELEVEN&faculty=SCIENCE&section=BIO` admin token | `200` with `{ ok:true, summary:[...] }` | TBD | TBD |
| Attendance summary invalid subjectId | GET `/api/students/attendance-summary?subjectId=abc` admin token | `400` with `{ ok:false, error:"Invalid subjectId" }` | TBD | TBD |

| Create notice ALL (admin) valid | POST `/api/notices` admin token `{title, body, scope:"ALL"}` | `201` with `{ ok:true, noticeId }` | TBD | TBD |
| Create notice CLASS missing class fields | POST `/api/notices` admin token `{scope:"CLASS"}` without batch/faculty/section | `400` with `{ ok:false, error:"batch, faculty, section are required for CLASS" }` | TBD | TBD |
| Create notice INDIVIDUAL missing recipients | POST `/api/notices` admin token `{scope:"INDIVIDUAL"}` without `recipientIds` | `400` with `{ ok:false, error:"recipientIds required for INDIVIDUAL" }` | TBD | TBD |
| Create notice missing required fields | POST `/api/notices` admin token `{title:"", body:"", scope:""}` | `400` with `{ ok:false, error:"Missing fields" }` | TBD | TBD |
| Get notices for user | GET `/api/notices` token | `200` with `{ ok:true, notices:[...] }` | TBD | TBD |
| Mark notice read valid | POST `/api/notices/:id/read` token | `200` with `{ ok:true, updated:true }` | TBD | TBD |
| Mark notice read invalid id | POST `/api/notices/abc/read` token | `400` with `{ ok:false, error:"Invalid id" }` | TBD | TBD |
| Mark notice read not found for user | POST `/api/notices/:id/read` token (id not assigned) | `404` with `{ ok:false, error:"Notice not found for user" }` | TBD | TBD |

| Create assignment (teacher) valid | POST `/api/assignments` teacher token form-data `{title,batch,faculty,section,dueDate?,attachment?}` | `201` with `{ ok:true, assignment }` | TBD | TBD |
| Create assignment forbidden (student) | POST `/api/assignments` student token | `403` with `{ ok:false, error:"Only teachers/admin can create assignments" }` | TBD | TBD |
| Create assignment missing fields | POST `/api/assignments` teacher token `{title:"", batch:""...}` | `400` with `{ ok:false, error:"title, batch, faculty, section are required" }` | TBD | TBD |
| Create assignment invalid class fields | POST `/api/assignments` teacher token `{batch:"BAD"...}` | `400` with `{ ok:false, error:"Invalid class fields" }` | TBD | TBD |
| Create assignment invalid dueDate | POST `/api/assignments` teacher token `{dueDate:"not-a-date"}` | `400` with `{ ok:false, error:"Invalid dueDate" }` | TBD | TBD |
| Get teacher assignments (teacher) | GET `/api/assignments/teacher` teacher token | `200` with own assignments list | TBD | TBD |
| Get student assignments (student) | GET `/api/assignments/student` student token | `200` with assignments for student’s class | TBD | TBD |
| Student submit assignment valid | POST `/api/assignments/:id/submission` student token form-data `{note?,attachment?}` | `201` with `{ ok:true, submission }` | TBD | TBD |
| Student submit assignment wrong class | POST `/api/assignments/:id/submission` student token (assignment for other class) | `403` with `{ ok:false, error:"Assignment is not for your class" }` | TBD | TBD |
| Student submit assignment missing student profile | POST submission student token (no student row) | `404` with `{ ok:false, error:"Student profile not found" }` | TBD | TBD |
| Teacher view submissions (own assignment) | GET `/api/assignments/:id/submissions` teacher token (creator) | `200` with `{ ok:true, submissions:[...] }` | TBD | TBD |
| Teacher view submissions (not creator) | GET `/api/assignments/:id/submissions` teacher token (not creator) | `403` with `{ ok:false, error:"Not allowed to view submissions for this assignment" }` | TBD | TBD |
| View submissions invalid assignment id | GET `/api/assignments/abc/submissions` | `400` with `{ ok:false, error:"Invalid assignment id" }` | TBD | TBD |

| Assign class teacher (admin) valid | PUT `/api/class-teacher-assignments` admin token `{teacherId,batch,faculty,section}` | `200` with `{ ok:true, assignment }` | TBD | TBD |
| Assign class teacher teacher not found | PUT `/api/class-teacher-assignments` admin token `{teacherId:9999,...}` | `404` with `{ ok:false, error:"Teacher not found" }` | TBD | TBD |
| List class teacher assignments (teacher) | GET `/api/class-teacher-assignments` teacher token | `200` only rows for that teacher | TBD | TBD |
| Delete class teacher assignment valid | DELETE `/api/class-teacher-assignments/:id` admin token | `200` with `{ ok:true, deletedAssignmentId:id }` | TBD | TBD |
| Delete class teacher assignment invalid id | DELETE `/api/class-teacher-assignments/abc` admin token | `400` with `{ ok:false, error:"Invalid assignment id" }` | TBD | TBD |

| Predict grade valid (marks exist) | POST `/api/predict-grade` token `{studentId}` | `200` with `{ ok:true, predicted_grade, confidence, prediction }` | TBD | TBD |
| Predict grade student not found | POST `/api/predict-grade` token `{studentId:999999}` | `404` with `{ ok:false, error:"Student not found" }` | TBD | TBD |
| Predict grade no marks found | POST `/api/predict-grade` token `{studentId:<id with no marks>}` | `400` with `{ ok:false, error:"No marks found for student" }` | TBD | TBD |
| Predict grade invalid studentId type | POST `/api/predict-grade` token `{studentId:"abc"}` | `400` with `{ ok:false, error: <zod flatten> }` | TBD | TBD |

---

## Unit Testing (Frontend UI + Client Helpers)

| TestCase | TestData | ExpectedResult | Actual Result | Pass/Fail |
|---|---|---|---|---|
| Login routing for ADMIN | Call `routeForRole("ADMIN")` | Returns `/admin` | TBD | TBD |
| Login routing for TEACHER | Call `routeForRole("TEACHER")` | Returns `/teacher` | TBD | TBD |
| Login routing for STUDENT | Call `routeForRole("STUDENT")` | Returns `/student` | TBD | TBD |
| Login routing unknown role | Call `routeForRole("X")` | Returns `/login` | TBD | TBD |
| API helper attaches token header | `api("/api/auth/me", { token:"t" })` | Sends `Authorization: Bearer t` | TBD | TBD |
| API helper handles network error | Simulate `fetch` reject in `api()` | Throws `Network error: cannot reach API` | TBD | TBD |
| API helper surfaces backend error | Simulate non-2xx with `{error:"Missing token"}` | `api()` throws `Missing token` | TBD | TBD |
| Login shows API error | Submit wrong creds on login form | Error text rendered (e.g., `Invalid credentials`) | TBD | TBD |
| Login shows loading state | Submit login; keep promise pending | Button shows `Signing in...` and is disabled | TBD | TBD |
| Student: marks notice read locally | Click “mark read” on a notice | UI flips notice `read=true` without full reload | TBD | TBD |
| Student: submit assignment note-only | Pick assignment, set note, no file | Submits successfully; assignment refresh shows submission present | TBD | TBD |
| Student: submit assignment with file | Attach file under 10MB + note | Submission succeeds; attachment name displayed | TBD | TBD |

---

## System Testing (End-to-End Workflows)

| TestCase | TestData | ExpectedResult | Actual Result | Pass/Fail |
|---|---|---|---|---|
| Launch backend server | `cd server` → `npm run dev` | Server starts at `http://localhost:5000` without errors | TBD | TBD |
| Launch frontend client | `cd client` → `npm run dev` | Client starts (usually `http://localhost:5173`) and loads login screen | TBD | TBD |
| Admin login success | UI Login: `admin@campus.local` / `admin123` | Redirect to `/admin` and admin workspace loads | TBD | TBD |
| Admin login failure (wrong password) | UI Login: `admin@campus.local` / `wrong123` | Error shown (from API: `Invalid credentials`) and stay on login page | TBD | TBD |
| Admin: load dashboard data | Admin dashboard open | Dashboard sections render; no crash; analytics + counts visible | TBD | TBD |
| Admin: create teacher account | Admin → Teachers → create `{name,email,password}` | Success notice “Teacher account created successfully.” and teacher appears in list | TBD | TBD |
| Admin: create teacher with existing email | Use same email again | Error displayed (API: `Email already exists`) | TBD | TBD |
| Admin: update teacher profile | Change teacher `name/email/password` | Success notice “Teacher updated successfully.” and list reflects changes | TBD | TBD |
| Admin: delete teacher | Click delete on a teacher row | Confirmation → teacher removed; success notice shown | TBD | TBD |
| Admin: block delete own admin | Attempt to delete admin account | Error shown (API: `You cannot delete your own account`) | TBD | TBD |

| Admin: create student valid | Admin → Students → create student with unique `rollNumber` in chosen class | Student created; success notice “Student created successfully.” | TBD | TBD |
| Admin: create student duplicate roll | Same `rollNumber` in same `batch/faculty/section` | Error shown (API: `rollNumber already exists in this class`) | TBD | TBD |
| Admin: filter students by class | Select class filter (batch/faculty/section) | Students table updates to only that class | TBD | TBD |
| Admin: search student by name/roll | Enter search query in student search | Filtered list shows matching rows only | TBD | TBD |

| Admin: assign class teacher | Admin → Class Teachers → choose class + teacher | Assignment saved; shown in list; teacher sees it in their portal | TBD | TBD |
| Admin: remove class teacher assignment | Delete an assignment | Assignment removed; teacher no longer sees that class in attendance options | TBD | TBD |

| Admin: view attendance summary | Admin → Attendance Summary filter class | Attendance summary table loads for selected class | TBD | TBD |
| Admin: create notice (ALL) | Admin → Notices → scope ALL, add title/body | Notice created and delivered to teachers + students | TBD | TBD |
| Admin: create notice (CLASS) | Admin → Notices → scope CLASS with batch/faculty/section | Only that class’ students + class teacher receive notice | TBD | TBD |
| Admin: view notice history | Admin → Notices history list | Past notices show recipients count + read count | TBD | TBD |

| Teacher login success | UI Login with seeded teacher credentials | Redirect to `/teacher` and teacher workspace loads | TBD | TBD |
| Teacher: sees assigned class options | Teacher dashboard | Allowed class dropdowns show only assigned classes | TBD | TBD |
| Teacher: take attendance for class | Teacher → Attendance → select class/date → mark present/absent → submit | Attendance saved; success notice; analytics/trend updates | TBD | TBD |
| Teacher: edit attendance for an already-taken date | Pick a date that is in “taken dates” list | System allows update; submission overwrites existing records | TBD | TBD |
| Teacher: add marks for student | Teacher → Marks → select student + enter G1/G2/finalGrade/activities | Marks saved; success notice | TBD | TBD |
| Teacher: run prediction for student | Teacher → Prediction → pick student → submit | Predicted grade shown (from ML service or fallback) and stored | TBD | TBD |
| Teacher: create assignment with attachment | Teacher → Assignments → upload file + submit | Assignment visible in teacher list; attachment URL works | TBD | TBD |
| Teacher: view assignment submissions | Teacher → Assignments → open submissions | Submissions list loads with student info + file links | TBD | TBD |
| Teacher: notices inbox | Teacher → Notices → mark one as read | Notice read status updates; API call succeeds | TBD | TBD |

| Student login success | Login with seeded student email + `student123` | Redirect to `/student` and dashboard loads | TBD | TBD |
| Student: load notices + assignments | Student dashboard | Notices and assignments load; counts shown | TBD | TBD |
| Student: mark notice read | Click “mark read” on a notice | Notice becomes read; stays read on refresh | TBD | TBD |
| Student: submit assignment (note only) | Choose assignment → enter note → submit | Submission saved and visible as submitted | TBD | TBD |
| Student: submit assignment (with file) | Choose assignment → attach file → submit | File upload succeeds; submission shows attachment name/link | TBD | TBD |
| Student: cannot access admin route | Manually navigate to `/admin` as student | Access blocked (not allowed/redirect depending on routing) | TBD | TBD |

| Authorization check: missing token | Open app with cleared localStorage/token | Protected pages fail gracefully and require login | TBD | TBD |
| Authorization check: expired/invalid token | Tamper token in storage and reload | API returns `Invalid token`; user forced to re-login | TBD | TBD |

---

## Quick test data you can reuse

- Admin: `admin@campus.local` / `admin123`
- Teacher (seed): `sushil.adhikari@campus.local` / `sushil123`
- Student (seed): format `firstname.lastname1@students.local` / `student123`
- Sample class filters: `ELEVEN / SCIENCE / BIO`
