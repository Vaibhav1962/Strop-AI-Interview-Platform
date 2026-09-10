Design the complete frontend UI/UX for a browser-based AI Interview Intelligence & Personalized Training System.

The product is a full interview preparation and mock interview platform for candidates. It allows users to upload a resume and target job description, analyze the match between them, conduct realistic adaptive interviews using voice or coding modes, evaluate answers with evidence from transcripts/code, and track improvement across multiple interview sessions.

Design the frontend as a complete, production-ready web application. Cover all screens, user flows, states, interactions, components, dashboards, forms, modals, feedback views, empty states, loading states, error states, confirmation states, and responsive behavior needed for the features below.

Do not omit screens simply because a feature is backend-driven. The frontend should provide an appropriate interface for initiating the feature, displaying its results, showing its current state, and handling success/failure/loading conditions.

Do not assume a simple chatbot interface. This is a complete interview intelligence and training platform with persistent candidate data, analytics, interview sessions, coding rounds, explainable scoring, and personalized training.

The application should include the following areas and functionality:

1. Authentication and account setup

Create the complete authentication flow:

* Landing page
* Sign up
* Log in
* Google OAuth option
* Forgot password
* Reset password
* Email verification state
* Authentication errors
* Loading states
* Logout confirmation
* First-time onboarding
* Candidate profile setup

The onboarding flow should collect or introduce:

* Candidate information
* Resume
* Target job role
* Target company, if applicable
* Job description
* Preferred interview types
* Experience level
* Relevant skills
* Interview preparation goals

2. Main candidate dashboard

Create a central dashboard that gives the candidate an overview of their preparation.

Include:

* Overall interview readiness indicator
* Resume-JD alignment percentage
* Overall interview performance
* Average interview score
* Technical performance
* Behavioral performance
* Communication performance
* Recent interview sessions
* Improvement over time
* Weak areas
* Strong areas
* Skills requiring practice
* Recommended next actions
* Recommended interview/training session
* Knowledge graph summary
* Resume claims that have not yet been verified
* Recent achievements or milestones
* Quick actions to start an interview, coding round, upload/update resume, analyze a new job description, and review previous feedback

The dashboard should support candidates returning after multiple sessions and should clearly communicate progression rather than treating every interview independently.

3. Resume management

Create the complete resume workflow.

Include:

* Resume upload screen
* PDF/DOCX upload
* Drag-and-drop upload
* File validation
* Upload progress
* Parsing/loading state
* Parsing success
* Parsing failure
* Replace/update resume
* Resume preview
* Structured resume information
* Education
* Work experience
* Skills
* Projects
* Certifications if present
* Achievements
* Quantifiable claims
* Resume claims that can later be tested during interviews

Allow the candidate to inspect the extracted information and identify whether the parsed information is correct.

Include editing/confirmation states for extracted resume information.

4. Job description management

Create the complete job description workflow.

Support:

* Pasting a job description
* Uploading a job description
* File upload states
* Parsing/loading states
* Parsing success/failure
* Job title
* Company
* Required skills
* Responsibilities
* Qualifications
* Preferred qualifications
* Technologies
* Experience requirements
* Other extracted requirements

Allow the candidate to review the structured job description information.

5. Resume-JD matching

Create a dedicated resume-to-job analysis experience.

Show:

* Overall alignment percentage
* Matching skills
* Missing skills
* Strong matches
* Partial matches
* Skill gaps
* Job requirements covered by resume
* Job requirements not supported by resume
* Relevant resume evidence
* Visual gap analysis
* Skill comparison
* Recommendations for preparation

The frontend should support both a high-level summary and detailed drill-down into individual skills and requirements.

Include loading, processing, no-match, partial-result, and error states.

6. Interview setup

Create an interview configuration flow.

The candidate should be able to start a new interview and configure:

* Interview type
* Technical interview
* Behavioral interview
* Project-based interview
* Situational interview
* Mixed interview
* Coding interview
* Interview difficulty
* Number of questions or approximate duration
* Target job
* Resume/JD context
* Areas to focus on
* Weak skills to practice
* Previously untested resume claims
* Interview mode
* Standard mode
* Strict mode
* Panel mode if enabled

Show an interview preparation/briefing screen before the interview begins.

7. Voice interview interface

Create the complete real-time voice interview experience.

The candidate should be able to:

* Start the interview
* Hear the AI interviewer
* Speak through the browser microphone
* See when the AI is speaking
* See when the candidate is speaking
* See listening/processing states
* See the current question
* View elapsed interview time
* See question number/progress
* Mute/unmute microphone
* Pause where appropriate
* End the interview
* Recover from microphone or connection errors

The interface should visually communicate real-time states such as:

* AI speaking
* Candidate speaking
* Listening
* Processing
* Generating next question
* Waiting for candidate
* Connection lost
* Reconnecting
* Microphone permission required
* Interview completed

Show the current question and relevant contextual information without turning the interface into a generic text chat.

Support transcript visibility where appropriate.

8. Adaptive interview behavior

The UI should represent an interview that changes based on candidate performance.

Include states for:

* Follow-up question
* Deeper technical question
* Easier follow-up
* Topic transition
* Weak-area drill-down
* Previously unexplored topic
* Resume claim verification
* Strong answer leading to a deeper question
* Vague answer leading to clarification

The candidate should understand where they are in the interview without exposing internal algorithmic logic unnecessarily.

9. Live transcript

Create a transcript interface associated with an interview.

Include:

* AI questions
* Candidate answers
* Timestamps
* Current speaking state
* Finalized transcript
* Transcript search or navigation if useful
* Question-by-question segmentation

The transcript should later connect directly to evidence used in scoring.

10. Interview completion

Create the end-of-interview experience.

Include:

* Interview completed state
* Processing/analyzing state
* Score generation state
* Summary
* Overall score
* High-level strengths
* Key weaknesses
* Recommended next steps
* Option to view detailed report
* Option to retry/practice weak areas
* Option to start another interview

11. Evidence-grounded answer scoring

Create detailed scoring interfaces for every interview answer.

Each answer can receive scores from 0–10 for:

* Relevance
* Technical correctness
* Communication clarity
* Use of evidence
* STAR structure for behavioral questions

Display:

* Individual score
* Overall answer score
* Explanation
* Exact transcript evidence supporting the score
* Highlighted evidence inside the transcript
* Improvement suggestions
* What the candidate did well
* What was missing
* What a stronger answer could have demonstrated

For technical answers, evidence should connect directly to the candidate's actual response.

For behavioral answers, show STAR-related evaluation.

Avoid presenting scores as unexplained numbers. The interface should make it clear that scores are supported by specific evidence from the candidate's response.

12. Interview report

Create a comprehensive post-interview report.

Include:

* Overall performance
* Score breakdown
* Technical performance
* Behavioral performance
* Communication
* Evidence usage
* STAR performance where applicable
* Question-by-question results
* Strongest answers
* Weakest answers
* Detailed evidence
* Improvement suggestions
* Topics covered
* Topics not covered
* Skills demonstrated
* Skills requiring further practice
* Resume claims tested
* Resume claims verified
* Resume claims remaining unverified
* Recommended next interview

Allow navigation from summary metrics into detailed question-level analysis.

13. Progress and analytics

Create a dedicated progress/analytics area tracking performance across sessions.

Include:

* Overall score trend
* Technical score trend
* Behavioral score trend
* Communication score trend
* Relevance trend
* Evidence usage trend
* STAR performance trend
* Skill-level progress
* Interview history
* Number of interviews completed
* Practice frequency
* Improvement between sessions
* Weak areas over time
* Strong areas over time
* Recently improved skills
* Skills that remain weak
* Interview performance by interview type

Support different time ranges and filtering where appropriate.

The analytics should clearly communicate longitudinal improvement.

14. Interview history

Create a history page containing all previous sessions.

Each session should show:

* Date
* Target role/job
* Interview type
* Duration
* Overall score
* Key strengths
* Key weaknesses
* Completion status

Allow users to open an individual session and view its complete report and transcript.

Include search/filter/sort states where useful.

15. Personalized training recommendations

Create a personalized training section based on interview history, weak areas, resume-JD gaps, and the candidate knowledge model.

Recommendations can include:

* Practice a specific skill
* Retry a weak interview question
* Practice a behavioral answer
* Verify an untested resume claim
* Practice coding
* Improve communication
* Practice a weak technical topic
* Run a targeted mock interview

Each recommendation should communicate why it was suggested.

16. Candidate knowledge graph

Create a user-facing knowledge/skill intelligence section.

The system maintains persistent knowledge about the candidate across sessions.

Represent:

* Skills
* Technologies
* Projects
* Resume claims
* Interview topics

Each item can have states such as:

* Demonstrated
* Weak
* Unverified

Allow the candidate to inspect a skill or claim and see:

* Source from resume
* Interviews where it was tested
* Evidence supporting the status
* Related questions
* Current strength
* Areas requiring verification/practice

Create an understandable visualization and detailed view for the knowledge graph rather than exposing raw JSON or implementation details.

17. Resume credibility / verification

Create a section showing claims from the resume that have or have not been validated through interviews.

Include:

* Verified claims
* Weakly demonstrated claims
* Unverified claims
* Claims requiring further questioning
* Evidence from previous interviews
* Related skills
* Recommended questions to validate a claim

This should connect with the personalized training experience.

18. Coding interview mode

Create a full browser-based coding interview interface.

Include:

* Problem statement
* Problem requirements
* Constraints
* Examples
* Input/output description
* Coding language selection
* Monaco-style code editor
* Syntax highlighting
* Code execution controls
* Run code
* Submit solution
* Test cases
* Test results
* Compilation errors
* Runtime errors
* Timeouts
* Output
* Hidden test case status where appropriate
* Execution/loading states

The AI interviewer should be represented within the coding interview experience and may:

* Ask questions
* Ask the candidate to explain their approach
* Ask about complexity
* Give hints when appropriate
* Ask follow-up questions
* Evaluate the candidate's reasoning

The candidate's code state should be represented as part of the interview session.

19. Coding interview scoring

Create post-coding evaluation interfaces.

Score:

* Correctness
* Problem-solving approach
* Time complexity
* Space complexity
* Communication of thought process
* Code quality

Show:

* Score breakdown
* Code evidence
* Relevant code snippets
* Failed test cases
* Successful test cases
* Explanation of issues
* Suggested improvements
* Better approach where appropriate
* Interviewer feedback

Connect coding results with the candidate's overall progress.

20. Strict interview mode

If enabled, represent a high-pressure interview experience.

The UI should support:

* Visible time limits
* Question countdowns
* Interruptions
* Indicators when the candidate is rambling
* Repeated-point warnings
* Time-limit warnings
* Handling-pressure evaluation

The final report should include a handling-pressure score.

21. Panel interview mode

If enabled, create a multi-interviewer experience.

Represent different interviewer roles such as:

* Technical Lead
* HR
* Product Manager

Each interviewer should have a distinct identity and area of questioning.

Show:

* Current interviewer
* Current interviewer role
* Transition between interviewers
* Questions from different interviewers
* Individual interviewer scores
* Final combined score

The final report should support both interviewer-level and aggregate analysis.

22. Speech analytics

Create an optional speech analytics section based only on measurable delivery metrics.

Include:

* Words per minute
* Filler word count
* Pause duration
* Pitch variation
* Speaking duration
* Listening/response timing

Provide factual insights and improvement recommendations.

Do not include emotion detection, confidence detection, body-language analysis, or camera-based analysis.

23. Hinglish / code-switching support

The interview interface should support candidates naturally mixing English and Hindi.

Represent:

* Transcript containing mixed-language speech
* Appropriate transcription state
* Feedback delivered in English
* No unnecessary warning or negative treatment for language switching

24. Settings and profile

Create a complete settings area.

Include:

* Profile information
* Account settings
* Resume management
* Job preferences
* Interview preferences
* Language preferences
* Notification preferences
* Microphone permissions/status
* Privacy settings
* Data/session settings
* Account deletion
* Logout

25. Navigation and application structure

Create a complete navigation system connecting all major product areas:

* Dashboard
* Resume
* Job Description
* Match Analysis
* Interviews
* Coding Practice
* Progress/Analytics
* Knowledge/Skills
* Training/Recommendations
* Interview History
* Profile
* Settings

The navigation should adapt appropriately for different screen sizes.

26. Global UI states

Design reusable states and components for:

* Loading
* Skeleton loading
* Empty data
* First-time user
* Processing
* Success
* Error
* Network failure
* WebSocket disconnection
* Reconnection
* File upload failure
* Unsupported file
* Microphone permission denied
* Browser microphone unavailable
* Interview interrupted
* Session expired
* Unauthorized access
* No interview history
* No analytics data
* No matching skills
* Parsing failed
* Scoring in progress

27. Notifications and feedback

Include a system for:

* Success notifications
* Errors
* Warnings
* Informational messages
* Interview completion notifications
* Resume parsing completion
* Analysis completion
* Recommended practice notifications

28. Responsive design

Design the application for:

* Desktop
* Laptop
* Tablet
* Mobile

Pay particular attention to responsive behavior for:

* Dashboard
* Interview interface
* Coding interface
* Analytics
* Transcript
* Reports
* Tables
* Charts
* Resume/JD analysis

The coding interview and real-time voice interview interfaces should remain usable on smaller screens.

29. Reusable component system

Create all reusable frontend components necessary for implementation, including:

* Buttons
* Inputs
* Textareas
* Dropdowns
* Selectors
* Tabs
* Cards
* Tables
* Charts
* Progress indicators
* Score indicators
* Badges
* Tags
* Tooltips
* Modals
* Dialogs
* Side panels
* Drawers
* File upload components
* Audio/microphone states
* Transcript components
* Code editor area
* Question cards
* Evidence highlights
* Skill indicators
* Knowledge graph elements
* Interviewer indicators
* Timers
* Toast notifications
* Pagination/filter controls where required

Components should be designed consistently so they can be implemented as reusable frontend components.

30. Data-driven frontend behavior

Design interfaces assuming all major information comes from APIs and WebSocket connections.

The UI should therefore include appropriate states for:

* Data loading
* Partial data
* Real-time updates
* Connection status
* Background processing
* API errors
* Empty responses
* Stale data
* Successful updates

The frontend should be structured so that real backend data can later replace mock data without redesigning the interface.

31. Overall product completeness

The final Figma design should feel like a complete SaaS product rather than a collection of isolated screens.

Create connected user journeys for:

* New user → onboarding → resume upload → JD upload → resume-JD analysis → first interview → interview report → personalized training
* Returning user → dashboard → recommended practice → interview → scoring → progress update
* Resume claim → knowledge graph → targeted interview question → evidence → verified/weak/unverified status
* Coding practice → problem → coding → execution → AI interaction → submission → coding evaluation → progress
* Multiple interviews → historical reports → longitudinal analytics → personalized recommendations

Include all necessary screens, states, dialogs, interactions, and supporting UI required to make these journeys complete.

Do not decide the product's visual theme, color palette, typography, component placement, spacing system, or overall visual style based on this prompt. Make those design decisions yourself based on the product, usability, information density, and professional quality expected from a modern AI-powered interview platform.

Prioritize usability, clarity of information, explainability of AI-generated feedback, accessibility, responsive behavior, and a polished production-ready experience.
