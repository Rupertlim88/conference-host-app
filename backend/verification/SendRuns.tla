------------------------------- MODULE SendRuns -------------------------------
(***************************************************************************)
(* Sending a society's programme to the conference API, and the run log    *)
(* that keeps two sends from running at once.                              *)
(*                                                                         *)
(* Code: backend/src/send.ts (sendProgramme) and                  *)
(* data/store/src/sync-log.ts (createSyncLog: start, finish,      *)
(* fail) over the table sync_runs and its partial unique index             *)
(* sync_runs_one_running (data/store/src/tables.ts).              *)
(*                                                                         *)
(* One step per SQL statement or per phase of send.ts. Time passes in      *)
(* whole minutes (Tick). Ages are counted only up to the stale threshold,  *)
(* because the code only asks whether a run is older than it. Whole-minute *)
(* ticks blur real times by up to a minute, so the model leans the unsafe  *)
(* way on both sides: a run counts as stale a minute early, and a sender   *)
(* may write for a minute past its deadline.                               *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets, Sequences, TLC

CONSTANTS
    Senders,     \* console clicks or CLI runs; each tries one send
    Deadline,    \* SEND_DEADLINE_MS in minutes (send.ts)
    StaleAfter   \* STALE_AFTER_MINUTES (sync-log.ts)

VARIABLES
    runs,        \* sync_runs rows in id order: [state, age in minutes, at most StaleAfter]
    pc,          \* where each sender is in sendProgramme
    mine,        \* the id log.start() gave each sender, 0 for none
    left         \* minutes before each sender's deadline signal aborts its API writes

vars == <<runs, pc, mine, left>>

States == {"running", "sent", "failed", "interrupted"}
Phases == {"idle", "inserting", "sending", "finishing", "done", "refused", "crashed"}

TypeOK ==
    /\ \A r \in 1..Len(runs) : runs[r].state \in States /\ runs[r].age \in 0..StaleAfter
    /\ Len(runs) <= Cardinality(Senders)
    /\ pc \in [Senders -> Phases]
    /\ mine \in [Senders -> 0..Cardinality(Senders)]
    /\ left \in [Senders -> 0..Deadline + 1]

Init ==
    /\ runs = <<>>
    /\ pc = [s \in Senders |-> "idle"]
    /\ mine = [s \in Senders |-> 0]
    /\ left = [s \in Senders |-> 0]

Running(r) == runs[r].state = "running"

(* started_at < now() - STALE_AFTER_MINUTES, a minute early. *)
Stale(r) == runs[r].age >= StaleAfter - 1

(* send.ts: the deadline signal is made before log.start(). Then start's   *)
(* first statement: update sync_runs set state = 'interrupted' where       *)
(* state = 'running' and started_at < now() - STALE_AFTER_MINUTES.         *)
MarkStale(s) ==
    /\ pc[s] = "idle"
    /\ left' = [left EXCEPT ![s] = Deadline + 1]
    /\ runs' = [r \in 1..Len(runs) |->
                  IF Running(r) /\ Stale(r) THEN [runs[r] EXCEPT !.state = "interrupted"] ELSE runs[r]]
    /\ pc' = [pc EXCEPT ![s] = "inserting"]
    /\ UNCHANGED mine

(* start's second statement: insert a running row ... on conflict do      *)
(* nothing. The partial unique index allows one running row, so while one  *)
(* exists the insert returns no row and sendProgramme refuses the send.    *)
Insert(s) ==
    /\ pc[s] = "inserting"
    /\ IF \E r \in 1..Len(runs) : Running(r)
       THEN /\ pc' = [pc EXCEPT ![s] = "refused"]
            /\ left' = [left EXCEPT ![s] = 0]
            /\ UNCHANGED <<runs, mine>>
       ELSE /\ runs' = Append(runs, [state |-> "running", age |-> 0])
            /\ mine' = [mine EXCEPT ![s] = Len(runs) + 1]
            /\ pc' = [pc EXCEPT ![s] = "sending"]
            /\ UNCHANGED left

(* syncProgramme stops writing to the API: every part answered, one        *)
(* failed, or a timeout or the deadline aborted a write.                   *)
ApiDone(s) ==
    /\ pc[s] = "sending"
    /\ pc' = [pc EXCEPT ![s] = "finishing"]
    /\ left' = [left EXCEPT ![s] = 0]
    /\ UNCHANGED <<runs, mine>>

(* log.finish or log.fail: update sync_runs set state = 'sent' or          *)
(* 'failed' where id = the sender's run and state = 'running'.             *)
Finish(s) ==
    /\ pc[s] = "finishing"
    /\ \E outcome \in {"sent", "failed"} :
          runs' = IF runs[mine[s]].state = "running"
                  THEN [runs EXCEPT ![mine[s]].state = outcome]
                  ELSE runs
    /\ pc' = [pc EXCEPT ![s] = "done"]
    /\ UNCHANGED <<mine, left>>

(* The sender stops for good: Vercel ends the function, or the machine     *)
(* running the CLI stops. Its row stays running until a later start marks  *)
(* it interrupted.                                                         *)
Crash(s) ==
    /\ pc[s] \in {"inserting", "sending", "finishing"}
    /\ pc' = [pc EXCEPT ![s] = "crashed"]
    /\ left' = [left EXCEPT ![s] = 0]
    /\ UNCHANGED <<runs, mine>>

(* A minute passes. No sender is still writing to the API after its        *)
(* deadline: the deadline signal aborts every write.                       *)
Tick ==
    /\ \A s \in Senders : pc[s] = "sending" => left[s] > 0
    /\ runs' = [r \in 1..Len(runs) |-> [runs[r] EXCEPT !.age = IF @ < StaleAfter THEN @ + 1 ELSE @]]
    /\ left' = [s \in Senders |-> IF left[s] > 0 THEN left[s] - 1 ELSE 0]
    /\ UNCHANGED <<pc, mine>>

Next ==
    \/ Tick
    \/ \E s \in Senders : MarkStale(s) \/ Insert(s) \/ ApiDone(s) \/ Finish(s) \/ Crash(s)

Spec == Init /\ [][Next]_vars

Symmetry == Permutations(Senders)

-----------------------------------------------------------------------------
(* Properties *)

(* 1. At most one sender writes the programme to the API at any moment.    *)
OneSenderAtATime == Cardinality({s \in Senders : pc[s] = "sending"}) <= 1

(* 2. While a sender writes, its own row is the running one: no later      *)
(* start takes over a send that is still writing.                          *)
SendingOwnsTheRunningRow ==
    \A s \in Senders : pc[s] = "sending" => runs[mine[s]].state = "running"

(* 3. At most one row is running.                                          *)
OneRunningRow == Cardinality({r \in 1..Len(runs) : Running(r)}) <= 1

(* 4. A finished row never changes again: a late finish cannot turn an     *)
(* interrupted run into a sent one.                                        *)
FinishedRunsStayFinished ==
    [][\A r \in 1..Len(runs) : runs[r].state # "running" => runs'[r].state = runs[r].state]_vars

(* Witness, expected violated: after a sender crashes, a later send can    *)
(* still start and finish. The run log never locks sends out for good.     *)
NoRecoveryAfterCrash ==
    ~(\E r1, r2 \in 1..Len(runs) : runs[r1].state = "interrupted" /\ runs[r2].state = "sent")
===============================================================================
