# Architecture Design Deliverable

# Component Identification Process and Rationale

For component identification, the Actions/Actors Approach was selected.

This methodology was chosen because it establishes a direct relationship between users of the system and the operations they perform. By identifying the actors and their interactions with the application, it becomes easier to derive candidate components and determine their responsibilities.

The identification process followed these steps:

1. Identify system actors.
2. Identify actions performed by each actor.
3. Associate actions with candidate components.
4. Assign responsibilities to each component.
5. Refine the components considering requirements and quality attributes.

The following actors were identified:

- Manager
- Developer

The following actions were identified:

- Create Sprint
- Edit Sprint
- Delete Sprint
- Create Task
- Assign Task
- Change Task State
- View Tasks
- View KPIs
- Generate AI Reports
- Login
- Register User
- Logout
- View User Statistics

The identified actions were grouped according to their responsibilities and converted into system components.

---

# Flow Diagram

```mermaid
flowchart LR

subgraph Actors
M[Manager]
D[Developer]
end


subgraph Actions
A1[Create Sprint]
A2[Edit Sprint]
A3[Create Task]
A4[Assign Task]
A5[Change Task State]
A6[View Tasks]
A7[View KPIs]
A8[Generate Report]
A9[Login]
end


subgraph Components

C1[Sprint Creator]
C2[Sprint Editor]

C3[Task Creator]
C4[Task Assigner]
C5[Task Status Changer]

C6[Kanban Page]
C7[KPI Dashboard]

C8[AI Report Generator]

C9[Session Manager]

end


M --> A1
M --> A2
M --> A3
M --> A4
M --> A8
M --> A9

D --> A5
D --> A6
D --> A7
D --> A8
D --> A9


A1 --> C1
A2 --> C2

A3 --> C3
A4 --> C4
A5 --> C5

A6 --> C6
A7 --> C7

A8 --> C8

A9 --> C9
```

---

# Component Table

| Actor | Event/Action | Component | Responsibilities |
|----------|----------|----------|----------|
| Manager | Create Sprint | Sprint Creator | Creates project sprints |
| Manager | Edit Sprint | Sprint Editor | Modifies sprint attributes |
| Manager | Delete Sprint | Sprint Remover | Removes project sprints |
| Manager | Create Task | Task Creator | Creates tasks associated with a sprint |
| Manager, Developer | Edit Task | Task Editor | Modifies task attributes |
| Manager | Assign Task | Task Assigner | Assigns responsible developers |
| Manager, Developer | Change Task State | Task Status Changer | Updates task progress |
| Manager | Delete Task | Task Remover | Removes tasks |
| Manager, Developer | View Tasks | Kanban Page | Displays tasks using Kanban visualization |
| Manager, Developer | View KPIs | KPI Dashboard | Displays project metrics and graphical KPIs |
| Manager, Developer | Generate Report | AI Report Generator | Sends requests to external AI for report generation |
| Manager, Developer | Login | Session Manager | Authenticates users and creates sessions |
| Manager, Developer | Register User | User Creator | Creates new users |
| Manager, Developer | Logout | Session Manager | Closes user sessions |
| Manager, Developer | View User Statistics | User Report | Displays productivity metrics |

---

# Technical Partitioning

```mermaid
flowchart TB

subgraph Presentation_Layer

P1[Kanban Page]

P2[KPI Dashboard]

P3[Login/Register]

end



subgraph Business_Layer

subgraph Sprint_Services

B1[Sprint Creator]

B2[Sprint Editor]

B3[Sprint Remover]

end



subgraph Task_Services

B4[Task Creator]

B5[Task Editor]

B6[Task Assigner]

B7[Task Status Changer]

B8[Task Remover]

end



subgraph Analytics_Services

B9[User Report]

B10[AI Report Generator]

end



subgraph Authentication

B11[Session Manager]

B12[User Creator]

end

end



subgraph Persistence_Layer

DB[(Database)]

end



P1 --> B4
P1 --> B5
P1 --> B7

P2 --> B9

P3 --> B11
P3 --> B12


B1 --> DB
B2 --> DB
B3 --> DB

B4 --> DB
B5 --> DB
B6 --> DB
B7 --> DB
B8 --> DB

B9 --> DB
B10 --> DB

B11 --> DB
B12 --> DB
```

---

# Domain Partitioning

```mermaid
flowchart LR


subgraph User_Management_Domain

U1[Session Manager]

U2[User Creator]

end



subgraph Sprint_Domain

S1[Sprint Creator]

S2[Sprint Editor]

S3[Sprint Remover]

end



subgraph Task_Domain

T1[Task Creator]

T2[Task Editor]

T3[Task Assigner]

T4[Task Status Changer]

T5[Task Remover]

T6[Kanban Page]

end



subgraph Analytics_Domain

A1[KPI Dashboard]

A2[User Report]

end



subgraph AI_Reporting_Domain

R1[AI Report Generator]

end



User_Management_Domain --> Sprint_Domain

Sprint_Domain --> Task_Domain

Task_Domain --> Analytics_Domain

Task_Domain --> AI_Reporting_Domain
```
