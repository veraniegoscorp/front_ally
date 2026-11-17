# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students and teachers who want to organize their own study, review, and grading work around upcoming exams or deadlines. Each account sees only its own calendar.

## Product Purpose

Ally helps users turn an upcoming exam or delivery date into a personal weekly study plan, then manage the resulting sessions in one calendar. Success means being able to see and adjust when to work toward a deadline.

## Capabilities and Constraints

- The Django API provides JWT registration, login, and refresh, plus user-scoped CRUD for study categories, availability, goals, subtasks, and study blocks.
- The API generates or recalculates a goal's study blocks. Scheduling and availability validation remain server-owned; the frontend must not invent a plan.
- Study categories use the `pomodoro`, `continuous`, or `milestones` techniques. The API does not model a separate work-versus-study block type.
- Every user works with their own calendar; shared classroom or student-management features are not part of the current scope.
- Google OAuth is not currently exposed by the API and is deferred until backend support exists.
- The frontend is React and Vite. Its API URL is configured with `VITE_API_URL`.

## Brand Commitments

- Product name: Ally.
- The interface is Spanish-first.
- The public landing page takes visual inspiration from the cinematic, game-inspired presentation of https://nte.perfectworld.com/es/index.html without reusing its artwork or claims.

## Evidence on Hand

- The Django backend is available in the sibling `veraniegoscorp` workspace.
- The existing frontend is a React/Vite starter; it has no existing product UI or calendar.
