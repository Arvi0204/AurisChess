# AurisChess Evaluation Protocol and User Study Guide

This document defines the evaluation framework and protocols to measure the usability, speech recognition accuracy, system response latency, and cognitive load of the AurisChess system. It is designed to help you run participant trials and gather all necessary quantitative and qualitative metrics for your Capstone Project.

---

## 1. Move Recognition Rate (MRR) & Accuracy Protocol

The **Move Recognition Rate (MRR)** measures the percentage of voice-spoken commands that are correctly transcribed by the hybrid Whisper-large-v3-turbo pipeline and successfully mapped to the intended legal move by the application.

$$\text{MRR} = \left( \frac{\text{Number of Correctly Executed Chess Moves}}{\text{Total Spoken Move Commands Attempted}} \right) \times 100$$

### Target Benchmark
* **MRR $\ge$ 90%** under standard room noise levels (ambient office/room environment, ~40–50 dB).

### Testing Procedure
1. Recruit a participant (or test yourself). Use a standard laptop microphone at a normal sitting distance (~50-70cm).
2. Have the participant run through the **25 Move Test Suite** below. Speak in a natural tone without pausing artificially inside a coordinate (e.g., say "e4" as "ee-four", "Knight f3" as "knight-eff-three").
3. Record the result of each command (Success = 1, Failure = 0) in the test sheet.

### Standard Test Case Suite (25 Move Test)

| Test Case | Move Intent | Spoken Command Syntax | Expected Chess Move (SAN) |
|---|---|---|---|
| **1** | Pawn opening | "e4" or "e four" | `e4` |
| **2** | Pawn opening | "d4" or "d four" | `d4` |
| **3** | Knight development | "Knight f3" or "Knight eff three" | `Nf3` |
| **4** | Knight development | "Knight c3" or "Knight see three" | `Nc3` |
| **5** | Bishop development | "Bishop c4" or "Bishop see four" | `Bc4` |
| **6** | Bishop development | "Bishop e2" or "Bishop ee two" | `Be2` |
| **7** | Castling kingside | "Castle kingside" or "Short castle" | `O-O` |
| **8** | Castling queenside | "Castle queenside" or "Long castle" | `O-O-O` |
| **9** | Pawn capture | "e takes d5" or "e capture d5" | `exd5` |
| **10** | Piece capture | "Knight takes f7" or "Knight capture f7" | `Nxf7` |
| **11** | Queen move | "Queen d2" or "Queen dee two" | `Qd2` |
| **12** | Rook development | "Rook e1" or "Rook ee one" | `Re1` |
| **13** | King safety | "King h1" or "King aitch one" | `Kh1` |
| **14** | Pawn promotion (Auto-Q) | "e8" (with pawn on e7 to promote) | `e8=Q` |
| **15** | Pawn promotion (Manual) | "e8 promotes to Knight" | `e8=N` |
| **16** | Homophone check | "b4" (sounds like "bee four" or "before") | `b4` |
| **17** | Homophone check | "c3" (sounds like "see three" or "sea three") | `c3` |
| **18** | Homophone check | "h3" (sounds like "eight three" or "ate three") | `h3` |
| **19** | Piece capture | "Bishop captures on c6" | `Bxc6` |
| **20** | Blindfold query | "Where are white knights?" | *(TTS repeats locations)* |
| **21** | Blindfold query | "What was their last move?" | *(TTS repeats last move)* |
| **22** | UI voice toggle | "Toggle board" or "Blindfold" | *(Toggles board visibility)* |
| **23** | Resign confirmation | "Resign" -> "Yes" | *(Triggers game forfeit)* |
| **24** | Ambiguity check | "Rook e1" (when both rooks can move to e1) | *(TTS requests starting square)* |
| **25** | Ambiguity resolver | "Rook from a1 to e1" | `Rae1` |
### Cooperative Move Sequences for Advanced Test Cases
Since `chess.js` enforces strict legal move checking, you cannot make moves like castling or promotion from the starting position. You must progress the game to those states. You can use these short cooperative sequences during your trials:

* **Kingside Castling (White)**:
  * White plays: `1. e4`
  * Black plays: `1... e5`
  * White plays: `2. Nf3`
  * Black plays: `2... Nc6`
  * White plays: `3. Bc4`
  * Black plays: `3... Bc5`
  * White plays: `4. O-O` (Castle Kingside is now legal)
* **Queenside Castling (White)**:
  * White plays: `1. d4`, Black plays: `1... d5`
  * White plays: `2. Nc3`, Black plays: `2... Nc6`
  * White plays: `3. Bf4`, Black plays: `3... Bf5`
  * White plays: `4. Qd2`, Black plays: `4... Qd7`
  * White plays: `5. O-O-O` (Castle Queenside is now legal)
* **Fast Pawn Promotion (Both White & Black)**:
  * White plays: `1. a4`, Black plays: `1... h5`
  * White plays: `2. a5`, Black plays: `2... h4`
  * White plays: `3. a6`, Black plays: `3... h3`
  * White plays: `4. axb7`, Black plays: `4... hxg2` (Promotion is now legal for both on move 5)
  * White plays: `5. bxa8=Q` (Promotes to Queen)
  * Black plays: `5... gxh1=Q` (Promotes to Queen)

---

## 2. System Round-Trip Latency Benchmarks

Latency tracks the speed of the voice command pipeline. It is split into two metrics:

1. **System Latency (Server + Logic)**: Time from the instant the recording stops (microphone silence timer triggers stop) to the execution of the chess move and start of TTS feedback.
   $$\text{System Latency} = \text{Network/Transcription Time} + \text{Fuzzy Parsing/Validation Time}$$
   * **Target Benchmark**: $\le 1200\text{ ms}$ (90th percentile).

2. **User-Perceived Latency (End-to-End)**: Time from the instant the speaker *stops talking* to the move execution and TTS feedback. This includes the silence detection buffer.
   $$\text{User-Perceived Latency} = \text{Silence Detection Window (1200ms)} + \text{System Latency}$$
   * **Target Benchmark**: $\le 2400\text{ ms}$ (equivalent to a system latency of $\le 1200\text{ ms}$).

### Telemetry Collection (PostgreSQL & Render Cloud Persisted)
AurisChess automatically collects this telemetry silently on every voice command.
* **Storage Location**: PostgreSQL Database (persisted in the `voice_telemetry` table).

#### Setup Instruction: Supabase / PostgreSQL Table Creation
To avoid running table-creation queries on every server start, please copy and paste the following SQL script directly into your **Supabase SQL Editor** and click **Run** to create the table once:

```sql
CREATE TABLE IF NOT EXISTS voice_telemetry (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  game_session_id VARCHAR(50),
  username VARCHAR(100),
  command_index INT,
  raw_text TEXT,
  resolved_move VARCHAR(50),
  is_success BOOLEAN,
  silence_buffer_ms INT,
  network_whisper_ms INT,
  execution_ms INT,
  system_latency_ms INT,
  user_perceived_latency_ms INT
);
```

* **Accessing the Logs (Render/Production)**: Since Render's local disk resets on every deploy, all metrics are stored persistently in your Postgres database. You can instantly download the consolidated CSV log by opening this URL in your web browser:
  `https://<your-backend-render-url>/api/voice/telemetry/download?secret=auris123`
  *(Replace `<your-backend-render-url>` with your actual Render backend domain)*
* **Accessing the Logs (Local)**:
  `http://localhost:3000/api/voice/telemetry/download?secret=auris123`

* **CSV Schema**:
  ```csv
  Timestamp, GameSessionId, Username, CommandIndex, RawText, ResolvedMove, IsSuccess, SilenceBufferMs, NetworkWhisperMs, ExecutionMs, SystemLatencyMs, UserPerceivedLatencyMs
  ```

#### How it handles Multiplayer:
* **Central Database**: Telemetry from all players and game sessions accumulates in the unified database table.
* **Participant Filtering**: Filter the `Username` column in Excel or Google Sheets to isolate a specific user's moves.
* **Game Isolation**: Filter or group by `GameSessionId` to isolate and analyze a specific match. The `GameSessionId` remains unique for the duration of a single chess game and resets whenever a player starts a new match.

---

## 3. Cognitive Load Assessment (NASA-TLX)

The **NASA Task Load Index (NASA-TLX)** is a multidimensional rating scale that rates subjective workload. In your study, players will play games under two different conditions:
* **Condition A**: Traditional GUI-based gameplay (mouse clicks and drags).
* **Condition B**: Voice-first blindfold/standard gameplay (vocal commands only).

### Dimension Definitions

1. **Mental Demand (MD)**: How much mental activity was required (thinking, deciding, remembering, calculating)?
2. **Physical Demand (PD)**: How much physical activity was required (clicking, dragging, speaking, looking)?
3. **Temporal Demand (TD)**: How much time pressure did you feel due to the pace of the game?
4. **Performance (OP)**: How successful and satisfied were you with your performance? (Note: High performance = low rating, poor performance = high rating on workload scale).
5. **Effort (EF)**: How hard did you have to work (mentally and physically) to achieve your level of performance?
6. **Frustration (FR)**: How stressed, irritated, or annoyed did you feel?

---

### NASA-TLX Questionnaire
*For each scale, have the user mark a value from 0 (Low / Good) to 100 (High / Poor) in increments of 5.*

```
NASA Task Load Index Questionnaire
Participant ID: _________      Condition: [  ] GUI-Based  /  [  ] Voice-Assisted

1. Mental Demand
   How mentally demanding was the task?
   Low  |--------------------------------------------------|  High  (0 - 100)

2. Physical Demand
   How physically demanding was the task?
   Low  |--------------------------------------------------|  High  (0 - 100)

3. Temporal Demand
   How much time pressure did you feel?
   Low  |--------------------------------------------------|  High  (0 - 100)

4. Performance
   How satisfied were you with your performance?
   Good |--------------------------------------------------|  Poor  (0 - 100)

5. Effort
   How hard did you have to work to accomplish this?
   Low  |--------------------------------------------------|  High  (0 - 100)

6. Frustration
   How stressed, irritated, or annoyed did you feel?
   Low  |--------------------------------------------------|  High  (0 - 100)
```

### Raw NASA-TLX (R-TLX) Scoring Formula
Instead of performing complex pairwise weight determinations, research shows that the **Raw NASA-TLX (R-TLX)** (simple average of the 6 ratings) is highly reliable:

$$\text{R-TLX Score} = \frac{\text{MD} + \text{PD} + \text{TD} + \text{OP} + \text{EF} + \text{FR}}{6}$$

* **Evaluation**: Compare the average R-TLX score of Condition A vs. Condition B. A lower score in Condition B indicates that the voice-first design succeeded in reducing cognitive workload.

---

## 4. System Usability Scale (SUS)

The **System Usability Scale (SUS)** is an industry-standard 10-item questionnaire scored on a 5-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree). It provides a quick, global view of subjective usability.

### Target Benchmark
* **Average SUS Score $\ge$ 75** (Corresponds to a Grade A- / "Good to Excellent" usability standard).

---

### SUS Survey Sheet
*Please rate the following statements on a scale from 1 (Strongly Disagree) to 5 (Strongly Agree).*

| # | Statement | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| **1** | I think that I would like to use this system frequently. | | | | | |
| **2** | I found the system unnecessarily complex. | | | | | |
| **3** | I thought the system was easy to use. | | | | | |
| **4** | I think that I would need the support of a technical person to be able to use this system. | | | | | |
| **5** | I found the various functions in this system were well integrated. | | | | | |
| **6** | I thought there was too much inconsistency in this system. | | | | | |
| **7** | I would imagine that most people would learn to use this system very quickly. | | | | | |
| **8** | I found the system very cumbersome to use. | | | | | |
| **9** | I felt very confident using the system. | | | | | |
| **10**| I needed to learn a lot of things before I could get going with this system. | | | | | |

---

### Calculating the SUS Score

Let $x_i$ be the score (1 to 5) given by a participant for question $i$.
1. For **odd-numbered items** (1, 3, 5, 7, 9), subtract 1 from the response:
   $$v_i = x_i - 1$$
2. For **even-numbered items** (2, 4, 6, 8, 10), subtract the response value from 5:
   $$v_i = 5 - x_i$$
3. Sum the converted values ($v_1 + v_2 + \dots + v_{10}$) and multiply by **2.5**:
   $$\text{SUS Score} = \left( \sum_{i=1}^{10} v_i \right) \times 2.5$$

This yields a total score ranging from **0 to 100**.

### SUS Interpretation Table

| SUS Score Range | Grade | Adjective Rating | Usability Status |
|---|---|---|---|
| **> 80.3** | A | Excellent / Best Imaginable | Highly Acceptable |
| **74.0 – 80.2** | B | Good | Acceptable (AurisChess Target) |
| **68.0 – 73.9** | C | OK | Marginally Acceptable |
| **51.0 – 67.9** | D | Poor | Marginally Acceptable |
| **< 51.0** | F | Worst Imaginable | Unacceptable |

---

## 5. Unified Post-Test Survey (Google Forms Template)

To prevent survey fatigue and keep testing fast, you can combine the NASA-TLX and SUS assessments into a **single consolidated survey**. 

Below is the template structure to build a unified **Google Form** or print-out.

---

### Part A: Demographic & Setup
1. **Participant ID / Name**: `[Short Answer]`
2. **Self-Reported Chess Experience**: `[Multiple Choice]`
   * [ ] Beginner (Under 1000 ELO / Casual player)
   * [ ] Intermediate (1000 - 1500 ELO)
   * [ ] Advanced (Over 1500 ELO)

---

### Part B: Game Workload Assessment (NASA-TLX Grid)
*Set this up as a **Multiple Choice Grid** in Google Forms. This allows participants to rate both conditions side-by-side.*

* **Scale Columns**: `1 (Very Low / Easy / Good)` to `10 (Very High / Hard / Poor)`
* **Grid Rows**:
  * `[Mental Demand] - GUI Condition (Mouse/Clicks)`
  * `[Mental Demand] - Voice Condition (Blindfold/Spoken)`
  * `[Physical Demand] - GUI Condition (Mouse/Clicks)`
  * `[Physical Demand] - Voice Condition (Blindfold/Spoken)`
  * `[Temporal Demand] - GUI Condition (Mouse/Clicks)`
  * `[Temporal Demand] - Voice Condition (Blindfold/Spoken)`
  * `[Performance Satisfaction] - GUI Condition (Mouse/Clicks)` *(Invert score: 1=Satisfied, 10=Dissatisfied)*
  * `[Performance Satisfaction] - Voice Condition (Blindfold/Spoken)` *(Invert score: 1=Satisfied, 10=Dissatisfied)*
  * `[Effort Required] - GUI Condition (Mouse/Clicks)`
  * `[Effort Required] - Voice Condition (Blindfold/Spoken)`
  * `[Frustration Level] - GUI Condition (Mouse/Clicks)`
  * `[Frustration Level] - Voice Condition (Blindfold/Spoken)`

*Note: Multiply the resulting average of each condition's 6 rows by 10 to map the score back to the standard 0–100 NASA-TLX scale.*

---

### Part C: System Usability Assessment (SUS Grid)
*Set this up as a **Multiple Choice Grid** in Google Forms.*

* **Scale Columns**: `1 (Strongly Disagree)` to `5 (Strongly Agree)`
* **Grid Rows**:
  1. I think that I would like to use this system frequently.
  2. I found the system unnecessarily complex.
  3. I thought the system was easy to use.
  4. I think that I would need the support of a technical person to be able to use this system.
  5. I found the various functions in this system were well integrated.
  6. I thought there was too much inconsistency in this system.
  7. I would imagine that most people would learn to use this system very quickly.
  8. I found the system very cumbersome to use.
  9. I felt very confident using the system.
  10. I needed to learn a lot of things before I could get going with this system.

