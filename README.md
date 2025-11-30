# Metaverse (SkyScope) 🌐

> **A cutting-edge real-time 2D virtual office platform** enabling spatial presence, interactive collaboration, instant messaging, and peer-to-peer voice communication.

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9-orange)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [High-Level Architecture](#-high-level-architecture)
- [System Architecture Diagrams](#-system-architecture-diagrams)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Database Schema](#-database-schema)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [WebSocket Protocol](#-websocket-protocol)
- [Deployment](#-deployment)
- [Security Considerations](#-security-considerations)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Metaverse (SkyScope)** is a modern, scalable virtual office platform that brings remote teams together in a shared 2D space. Users can move their avatars across custom office layouts, engage in proximity-based interactions, send messages, and initiate peer-to-peer voice calls—all in real-time.

Built with a microservices architecture using **Turborepo**, the platform separates concerns into:
- 🔌 **HTTP REST API** for authentication, user management, and CRUD operations
- 🔄 **WebSocket Server** for real-time presence, movement, chat, and WebRTC signaling
- 📦 **Shared Packages** for database models, UI components, and configurations

This architecture ensures **scalability**, **maintainability**, and **developer experience** at its core.

---

## ✨ Key Features

### 🎯 Core Functionality
- **Real-time Spatial Presence**: See where colleagues are in the virtual office
- **Dynamic Avatar Movement**: Smooth, tile-based navigation with collision detection
- **Live Chat**: Group and private messaging within spaces
- **Peer-to-Peer Voice Calls**: WebRTC-based high-quality audio communication
- **Custom Spaces**: Create and customize virtual office layouts

### 👔 Administration
- **Element Management**: Create and configure office furniture, decorations, and interactive objects
- **Map Templates**: Pre-built office layouts with default element placement
- **Space Management**: Full CRUD operations for workspace creation
- **Avatar Customization**: Rich avatar library for personalization

### 🔐 Security & Access Control
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control (RBAC)**: Admin and User roles
- **Zod Validation**: Runtime type checking and input validation
- **CORS Protection**: Configurable cross-origin resource sharing

---

## 🏗 High-Level Architecture

Metaverse follows a **microservices architecture** with clear separation between stateless HTTP services and stateful WebSocket services.

```mermaid
graph TB
    subgraph "Client Layer"
        A[Web Client<br/>React UI]
    end
    
    subgraph "API Gateway Layer"
        B[HTTP API Server<br/>:3000]
        C[WebSocket Server<br/>:8000]
    end
    
    subgraph "Data Layer"
        D[(PostgreSQL<br/>Database)]
    end
    
    subgraph "Shared Packages"
        E[Database Package<br/>Prisma Client]
        F[UI Components<br/>React Library]
        G[Config Packages<br/>ESLint, TS]
    end
    
    A -->|REST API Calls| B
    A -->|WebSocket Connection| C
    B --> E
    C --> E
    E --> D
    
    style A fill:#e1f5ff
    style B fill:#ffe1e1
    style C fill:#ffe1e1
    style D fill:#e1ffe1
    style E fill:#fff4e1
    style F fill:#fff4e1
    style G fill:#fff4e1
```

### Architecture Principles

1. **Separation of Concerns**: HTTP handles CRUD, WebSocket handles real-time
2. **Stateless HTTP**: Easy horizontal scaling behind load balancers
3. **Stateful WebSocket**: In-memory room management for low-latency updates
4. **Shared Code**: Database models and UI components are reusable across services
5. **Type Safety**: End-to-end TypeScript with Prisma and Zod

---

## 🎨 System Architecture Diagrams

### 1️⃣ Component Architecture

```mermaid
flowchart LR
    subgraph Monorepo["🗂 Turborepo Monorepo"]
        subgraph Apps["📱 Applications"]
            HTTP["🌐 HTTP API<br/>(Express 5)"]
            WS["🔄 WebSocket<br/>(ws library)"]
            FE["💻 Frontend<br/>(React)"]
        end
        
        subgraph Packages["📦 Shared Packages"]
            DB["🗄️ @repo/database<br/>(Prisma)"]
            UI["🎨 @repo/ui<br/>(React Components)"]
            ESLINT["🔍 @repo/eslint-config"]
            TS["📘 @repo/typescript-config"]
        end
    end
    
    HTTP --> DB
    WS --> DB
    FE --> UI
    
    style HTTP fill:#ff9999
    style WS fill:#99ccff
    style FE fill:#99ff99
    style DB fill:#ffcc99
    style UI fill:#cc99ff
```

### 2️⃣ Data Flow Architecture

```mermaid
sequenceDiagram
    participant Client
    participant HTTP as HTTP API<br/>:3000
    participant WS as WebSocket<br/>:8000
    participant DB as PostgreSQL
    
    Note over Client,DB: Authentication Flow
    Client->>HTTP: POST /api/v1/signup
    HTTP->>DB: Create User
    DB-->>HTTP: User Created
    HTTP-->>Client: { userId, username, role }
    
    Client->>HTTP: POST /api/v1/signin
    HTTP->>DB: Verify Credentials
    DB-->>HTTP: User Found
    HTTP-->>Client: { token: JWT }
    
    Note over Client,DB: Space Creation (Admin)
    Client->>HTTP: POST /api/v1/space<br/>Authorization: Bearer JWT
    HTTP->>HTTP: Validate Admin Role
    HTTP->>DB: Create Space
    DB-->>HTTP: Space Created
    HTTP-->>Client: { spaceId }
    
    Note over Client,DB: Join Space & Real-time
    Client->>HTTP: GET /api/v1/space/:id
    HTTP->>DB: Fetch Space & Elements
    DB-->>HTTP: Space Data
    HTTP-->>Client: { dimensions, elements }
    
    Client->>WS: WebSocket Connect
    WS-->>Client: Connection Established
    
    Client->>WS: {"type":"join", payload:{spaceId, token}}
    WS->>WS: Verify JWT
    WS->>DB: Validate Space
    DB-->>WS: Space Valid
    WS-->>Client: space-joined {spawn, users}
    WS-->>Client: user-joined (broadcast)
    
    Note over Client,WS: Movement & Chat
    Client->>WS: {"type":"move", payload:{x, y}}
    WS->>WS: Validate Movement
    WS-->>Client: movement {x, y} (broadcast to room)
    
    Client->>WS: {"type":"groupChat", payload:{message}}
    WS-->>Client: groupChat (broadcast to room)
    
    Note over Client,WS: WebRTC Voice Call
    Client->>WS: user:call {to, offer}
    WS-->>Client: incomming:call {from, offer}
    Client->>WS: call:accepted {to, ans}
    WS-->>Client: call:accepted {from, ans}
    Client->>WS: ice:candidate {to, candidate}
    WS-->>Client: ice:candidate {from, candidate}
    
    Note over Client,Client: P2P Audio Stream via WebRTC
```

### 3️⃣ Database Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Space : creates
    User ||--o| Avatar : has
    Space ||--o{ spaceElements : contains
    Element ||--o{ spaceElements : "placed in"
    Element ||--o{ MapElements : "template element"
    Map ||--o{ MapElements : defines
    
    User {
        string id PK
        string username UK
        string password
        string avatarId FK
        Role role
    }
    
    Space {
        string id PK
        string name
        int width
        int height
        string thumbnail
        string creatorId FK
    }
    
    spaceElements {
        string id PK
        string elementId FK
        string spaceId FK
        int x
        int y
    }
    
    Element {
        string id PK
        int width
        int height
        boolean static
        string imageUrl
    }
    
    Map {
        string id PK
        int width
        int height
        string name
        string thumbnail
    }
    
    MapElements {
        string id PK
        string mapId FK
        string elementId FK
        int x
        int y
    }
    
    Avatar {
        string id PK
        string imageUrl
        string name
    }
```

### 4️⃣ Real-Time Communication Flow

```mermaid
flowchart TD
    A[User A Joins Space] -->|WebSocket| B[WS Server]
    B --> C{Authenticate JWT}
    C -->|Valid| D[Assign to Room]
    C -->|Invalid| E[Reject Connection]
    
    D --> F[Send spawn and existing users]
    D --> G[Broadcast user-joined]
    
    H[User A Moves] -->|move x,y| B
    B --> I{Validate Movement}
    I -->|Valid| J[Update Room State]
    I -->|Invalid| K[Send movement-rejected]
    J --> L[Broadcast to all users in room]
    
    M[User A Sends Chat] -->|groupChat| B
    B --> N[Broadcast to room]
    
    O[User A Calls User B] -->|user:call| B
    B --> P[Relay to User B]
    P --> Q[User B receives incomming:call]
    Q -->|call:accepted| B
    B --> R[Relay to User A]
    R --> S[WebRTC Connection Established]
    S --> T[Peer-to-Peer Audio Stream]
    
    style B fill:#99ccff
    style D fill:#99ff99
    style E fill:#ff9999
    style T fill:#ffcc99
```

### 5️⃣ Deployment Architecture

```mermaid
flowchart TB
    subgraph Internet
        Users[👥 Users]
    end
    
    subgraph "Cloud Platform (e.g., Render)"
        subgraph "Frontend"
            Static[📄 Static Site<br/>React Build]
        end
        
        subgraph "Backend Services"
            LB1[⚖️ Load Balancer]
            LB2[⚖️ Load Balancer]
            
            subgraph "HTTP API Instances"
                HTTP1[🌐 HTTP-1<br/>:3000]
                HTTP2[🌐 HTTP-2<br/>:3000]
            end
            
            subgraph "WebSocket Instances"
                WS1[🔄 WS-1<br/>:8000]
                WS2[🔄 WS-2<br/>:8000]
            end
        end
        
        subgraph "Data Storage"
            PG[(🗄️ PostgreSQL<br/>Managed DB)]
            Redis[(🔴 Redis<br/>Pub/Sub)]
        end
    end
    
    Users -->|HTTPS| Static
    Users -->|HTTPS API| LB1
    Users -->|WSS| LB2
    
    LB1 --> HTTP1
    LB1 --> HTTP2
    LB2 --> WS1
    LB2 --> WS2
    
    HTTP1 --> PG
    HTTP2 --> PG
    WS1 --> PG
    WS2 --> PG
    
    WS1 -.->|Room Sync| Redis
    WS2 -.->|Room Sync| Redis
    
    style Users fill:#e1f5ff
    style Static fill:#99ff99
    style PG fill:#ffcc99
    style Redis fill:#ff9999
```

---

## 🛠 Tech Stack

### Core Technologies
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js ≥18 | Server-side JavaScript runtime |
| **Language** | TypeScript 5.8 | Type-safe development |
| **Package Manager** | pnpm ≥9 | Fast, disk-efficient package management |
| **Monorepo** | Turborepo | Build system and task orchestration |

### Backend Services
| Service | Framework/Library | Description |
|---------|------------------|-------------|
| **HTTP API** | Express 5 | REST API server |
| **WebSocket** | ws library | Real-time bidirectional communication |
| **Validation** | Zod | Runtime type validation |
| **Authentication** | jsonwebtoken | JWT-based auth |
| **Build Tool** | esbuild | Fast TypeScript bundler |

### Data & Storage
| Component | Technology | Use Case |
|-----------|-----------|----------|
| **Database** | PostgreSQL 14+ | Primary data store |
| **ORM** | Prisma | Type-safe database client |
| **Caching** | Redis (optional) | WebSocket room coordination |

### Frontend
| Component | Technology | Notes |
|-----------|-----------|-------|
| **Framework** | React | UI library |
| **Components** | @repo/ui package | Shared component library |
| **State** | Context API / Redux | Global state management |

### DevOps & Tooling
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **@turbo/gen** - Code generation
- **Git** - Version control

---

## 📂 Repository Structure

```
metaverse/                          # Monorepo root
├── apps/                           # Applications
│   ├── http/                       # 🌐 REST API Server
│   │   ├── src/
│   │   │   ├── index.ts           # Express app entry
│   │   │   ├── constants.ts       # JWT secret, config
│   │   │   ├── scrypt.ts          # Password hashing
│   │   │   ├── types/index.ts     # Zod schemas
│   │   │   └── middleware/        # Auth & role guards
│   │   │       ├── admin.ts
│   │   │       └── user.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ws/                         # 🔄 WebSocket Server
│   │   ├── src/
│   │   │   ├── index.ts           # WebSocket server entry
│   │   │   ├── config.ts          # JWT config
│   │   │   ├── RoomManager.ts     # In-memory room state
│   │   │   └── User.ts            # User connection state
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── nexus-office-env/           # 💻 Frontend Application
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
│
├── packages/                       # Shared Packages
│   ├── database/                   # 🗄️ Prisma Database Package
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Database schema
│   │   ├── src/generated/prisma/  # Generated Prisma Client
│   │   └── package.json
│   │
│   ├── ui/                         # 🎨 Shared React Components
│   │   ├── src/
│   │   └── package.json
│   │
│   ├── eslint-config/              # 🔍 Shared ESLint Config
│   │   └── package.json
│   │
│   └── typescript-config/          # 📘 Shared TypeScript Config
│       └── package.json
│
├── package.json                    # Root package.json
├── pnpm-workspace.yaml             # pnpm workspace config
├── turbo.json                      # Turborepo config
├── render.yaml                     # Render deployment blueprint
└── README.md                       # This file
```

### Key Files

- **`apps/http/src/index.ts`**: Express server with all REST endpoints
- **`apps/ws/src/index.ts`**: WebSocket server with room management
- **`packages/database/prisma/schema.prisma`**: Complete database schema
- **`turbo.json`**: Turborepo pipeline configuration
- **`render.yaml`**: Production deployment configuration

---

## 🗄 Database Schema

### Models Overview

The database consists of **7 core models** organized around users, spaces, and elements.

```mermaid
graph LR
    A[User] -->|creates| B[Space]
    A -->|has| C[Avatar]
    B -->|contains| D[spaceElements]
    E[Element] -->|placed in| D
    E -->|template in| F[MapElements]
    G[Map] -->|defines| F
    
    style A fill:#e1f5ff
    style B fill:#ffe1e1
    style C fill:#e1ffe1
    style D fill:#fff4e1
    style E fill:#f0e1ff
    style F fill:#ffe1f0
    style G fill:#f5f5f5
```

### Detailed Schema

#### 👤 User
```prisma
model User {
  id       String  @id @unique @default(cuid())
  username String  @unique
  password String
  avatarId String?
  role     Role    // Admin | User
  spaces   Space[]
  avatar   Avatar? @relation(fields: [avatarId], references: [id])
}
```

#### 🏢 Space
```prisma
model Space {
  id        String          @id @unique @default(cuid())
  name      String
  width     Int
  height    Int
  thumbnail String?
  creatorId String
  creator   User            @relation(fields: [creatorId], references: [id])
  elements  spaceElements[]
}
```

#### 📦 spaceElements (Junction Table)
```prisma
model spaceElements {
  id        String  @id @unique @default(cuid())
  elementId String
  spaceId   String
  x         Int     // Position in space
  y         Int
  space     Space   @relation(fields: [spaceId], references: [id])
  element   Element @relation(fields: [elementId], references: [id])
}
```

#### 🪑 Element
```prisma
model Element {
  id          String          @id @unique @default(cuid())
  width       Int
  height      Int
  static      Boolean         // Collision detection
  imageUrl    String
  spaces      spaceElements[]
  mapElements MapElements[]
}
```

#### 🗺 Map (Template)
```prisma
model Map {
  id          String        @id @unique @default(cuid())
  width       Int
  height      Int
  name        String
  thumbnail   String
  mapElements MapElements[]
}
```

#### 📍 MapElements (Template Placement)
```prisma
model MapElements {
  id        String  @id @unique @default(cuid())
  mapId     String
  elementId String
  x         Int?
  y         Int?
  map       Map     @relation(fields: [mapId], references: [id])
  element   Element @relation(fields: [elementId], references: [id])
}
```

#### 🎭 Avatar
```prisma
model Avatar {
  id       String  @id @unique @default(cuid())
  imageUrl String?
  name     String?
  users    User[]
}
```

#### 🔐 Role Enum
```prisma
enum Role {
  Admin
  User
}
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** ≥18 ([Download](https://nodejs.org/))
- **pnpm** ≥9 (enable via `corepack enable` or install from [pnpm.io](https://pnpm.io))
- **PostgreSQL** 14+ (local or cloud instance)
- **Git** for version control

### Installation

#### 1️⃣ Clone the Repository

```bash
git clone <repository-url>
cd metaverse/metaverse
```

> **Note**: The actual monorepo root is `metaverse/metaverse/`. All commands should be run from this directory.

#### 2️⃣ Install Dependencies

```bash
pnpm install
```

This will install all dependencies for all workspaces (apps and packages).

#### 3️⃣ Configure Database

Update the PostgreSQL connection URL in `packages/database/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = "postgresql://username:password@localhost:5432/metaverse"
}
```

**Example for local PostgreSQL:**
```prisma
url = "postgresql://postgres:yourPassword@localhost:5432/postgres"
```

#### 4️⃣ Run Database Migrations

From the monorepo root (`metaverse/metaverse/`):

```bash
# Generate Prisma Client and run migrations
pnpm dlx prisma migrate dev --name init --schema packages/database/prisma/schema.prisma
pnpm dlx prisma generate --schema packages/database/prisma/schema.prisma
```

**Alternative using workspace commands:**
```bash
pnpm --filter @repo/database exec prisma migrate dev --name init
pnpm --filter @repo/database exec prisma generate
```

#### 5️⃣ Start Development Servers

```bash
pnpm dev
```

This command starts both services via Turborepo:
- **HTTP API**: `http://localhost:3000`
- **WebSocket**: `ws://localhost:8000`

**To run services individually:**
```bash
# Terminal 1: HTTP API
pnpm --filter http dev

# Terminal 2: WebSocket Server
pnpm --filter ws dev
```

#### 6️⃣ Verify Installation

Test the HTTP API:
```bash
curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok"}
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
Most endpoints require a JWT token obtained from `/signin`:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

### 🔐 Authentication Endpoints

#### Sign Up
```http
POST /api/v1/signup
Content-Type: application/json

{
  "username": "johndoe",
  "password": "securePassword123",
  "type": "user"  // or "admin"
}
```

**Response (200):**
```json
{
  "message": "User created successfully",
  "username": "johndoe",
  "role": "User",
  "userId": "clxxx..."
}
```

#### Sign In
```http
POST /api/v1/signin
Content-Type: application/json

{
  "username": "johndoe",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 🌍 Public Endpoints

#### List All Elements
```http
GET /api/v1/elements
```

**Response (200):**
```json
[
  {
    "id": "elem_123",
    "imageUrl": "https://example.com/desk.png",
    "width": 2,
    "height": 1,
    "static": true
  }
]
```

#### List All Avatars
```http
GET /api/v1/avatars
```

**Response (200):**
```json
{
  "avatars": [
    {
      "id": "avatar_1",
      "name": "Professional",
      "imageUrl": "https://example.com/avatar1.png"
    }
  ]
}
```

#### Health Check
```http
GET /api/v1/health
```

**Response (200):**
```json
{
  "status": "ok"
}
```

---

### 👤 User Endpoints (Requires Auth)

#### Update User Metadata
```http
POST /api/v1/user/metadata
Authorization: Bearer <token>
Content-Type: application/json

{
  "avatarId": "avatar_123"
}
```

**Response (200):**
```json
{
  "message": "Metadata updated"
}
```

#### Bulk Get User Avatars
```http
GET /api/v1/user/metadata/bulk?ids=["user1","user2"]
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "avatars": [
    { "userId": "user1", "avatarId": "avatar_1" },
    { "userId": "user2", "avatarId": "avatar_2" }
  ]
}
```

---

### 🏢 Space Endpoints

#### List All Spaces (Admin Only)
```http
GET /api/v1/space/all
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "spaces": [
    {
      "id": "space_1",
      "name": "Main Office",
      "thumbnail": "https://example.com/office.png",
      "dimensions": "100x100"
    }
  ]
}
```

#### Create Space (Admin Only)
```http
POST /api/v1/space
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Conference Room",
  "dimensions": "50x50"
}
```

**Or create from a map template:**
```json
{
  "name": "Open Office",
  "dimensions": "100x80",
  "mapId": "map_123"
}
```

**Response (200):**
```json
{
  "spaceId": "space_new"
}
```

#### Get Space Details
```http
GET /api/v1/space/:spaceId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "dimensions": "100x100",
  "elements": [
    {
      "id": "spaceElem_1",
      "element": {
        "id": "elem_1",
        "imageUrl": "https://example.com/desk.png",
        "width": 2,
        "height": 1,
        "static": true
      },
      "x": 10,
      "y": 15
    }
  ]
}
```

#### Delete Space (Creator Only)
```http
DELETE /api/v1/space/:spaceId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Success"
}
```

#### Add Element to Space (Creator Only)
```http
POST /api/v1/space/element
Authorization: Bearer <token>
Content-Type: application/json

{
  "spaceId": "space_1",
  "elementId": "elem_1",
  "x": 10,
  "y": 20
}
```

**Response (200):**
```json
{
  "message": "Element added"
}
```

#### Remove Element from Space (Admin Only)
```http
DELETE /api/v1/space/element
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "id": "spaceElem_123"
}
```

**Response (200):**
```json
{
  "message": "Element deleted"
}
```

---

### 🛠 Admin Endpoints

#### Create Element
```http
POST /api/v1/admin/element
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "imageUrl": "https://example.com/chair.png",
  "width": 1,
  "height": 1,
  "static": true
}
```

**Response (200):**
```json
{
  "id": "elem_new"
}
```

#### Update Element
```http
PUT /api/v1/admin/element/:elementId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "imageUrl": "https://example.com/new_chair.png"
}
```

**Response (200):**
```json
{
  "message": "Success"
}
```

#### Create Avatar
```http
POST /api/v1/admin/avatar
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Executive",
  "imageUrl": "https://example.com/exec_avatar.png"
}
```

**Response (200):**
```json
{
  "avatarId": "avatar_new"
}
```

#### Create Map Template
```http
POST /api/v1/admin/map
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Standard Office",
  "thumbnail": "https://example.com/office_thumb.png",
  "dimensions": "100x100",
  "defaultElements": [
    { "elementId": "elem_1", "x": 10, "y": 10 },
    { "elementId": "elem_2", "x": 20, "y": 20 }
  ]
}
```

**Response (200):**
```json
{
  "id": "map_new"
}
```

---

## 🔌 WebSocket Protocol

### Connection
```
ws://localhost:8000
```

### Message Format
All messages follow this structure:
```json
{
  "type": "message_type",
  "payload": { /* message-specific data */ }
}
```

---

### 🚪 Join Space

**Client → Server:**
```json
{
  "type": "join",
  "payload": {
    "spaceId": "space_123",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Server → Client:**
```json
{
  "type": "space-joined",
  "payload": {
    "spawn": { "x": 10, "y": 10 },
    "users": [
      { "id": "user_1" },
      { "id": "user_2" }
    ]
  }
}
```

**Broadcast to Others:**
```json
{
  "type": "user-joined",
  "payload": {
    "userId": "new_user_id",
    "x": 10,
    "y": 10
  }
}
```

---

### 🚶 Movement

**Client → Server:**
```json
{
  "type": "move",
  "payload": {
    "x": 11,
    "y": 10
  }
}
```

> **Note**: Only single-tile orthogonal movements are accepted.

**Server → Others (Broadcast):**
```json
{
  "type": "movement",
  "payload": {
    "x": 11,
    "y": 10
  }
}
```

**Server → Client (Rejected):**
```json
{
  "type": "movement-rejected",
  "payload": {
    "x": 10,
    "y": 10  // Your current position
  }
}
```

---

### 💬 Chat

#### Group Chat
**Client → Server:**
```json
{
  "type": "groupChat",
  "payload": {
    "groupId": "space_123",
    "message": "Hello everyone!"
  }
}
```

**Server → All in Space:**
```json
{
  "type": "groupChat",
  "payload": {
    "userId": "sender_id",
    "message": "Hello everyone!"
  }
}
```

#### Private Chat
**Client → Server:**
```json
{
  "type": "privateChat",
  "payload": {
    "userId": "recipient_id",
    "spaceId": "space_123",
    "message": "Private message"
  }
}
```

**Server → Recipient:**
```json
{
  "type": "privateChat",
  "payload": {
    "userId": "sender_id",
    "message": "Private message"
  }
}
```

---

### 📞 WebRTC Signaling

#### Initiate Call
**Caller → Server:**
```json
{
  "type": "user:call",
  "payload": {
    "to": "recipient_id",
    "offer": { /* WebRTC SDP offer */ }
  }
}
```

**Server → Recipient:**
```json
{
  "type": "incomming:call",
  "payload": {
    "from": "caller_id",
    "offer": { /* WebRTC SDP offer */ }
  }
}
```

#### Accept Call
**Recipient → Server:**
```json
{
  "type": "call:accepted",
  "payload": {
    "to": "caller_id",
    "ans": { /* WebRTC SDP answer */ }
  }
}
```

**Server → Caller:**
```json
{
  "type": "call:accepted",
  "payload": {
    "from": "recipient_id",
    "ans": { /* WebRTC SDP answer */ }
  }
}
```

#### ICE Candidate Exchange
**Client → Server:**
```json
{
  "type": "ice:candidate",
  "payload": {
    "to": "peer_id",
    "candidate": { /* ICE candidate */ }
  }
}
```

**Server → Peer:**
```json
{
  "type": "ice:candidate",
  "payload": {
    "from": "sender_id",
    "candidate": { /* ICE candidate */ }
  }
}
```

#### Renegotiation (Optional)
```json
{
  "type": "peer:nego:needed",
  "payload": { /* Renegotiation data */ }
}
```

```json
{
  "type": "peer:nego:final",
  "payload": { /* Final negotiation data */ }
}
```

---

### 👋 Leave Space

When a user disconnects:
**Server → All in Space:**
```json
{
  "type": "user-left",
  "payload": {
    "userId": "disconnected_user_id"
  }
}
```

---

## 🚀 Deployment

### 🎯 Render Deployment (Recommended)

The project includes a `render.yaml` Blueprint for one-click deployment.

#### Prerequisites
- GitHub repository with this code pushed
- Render.com account

#### Deployment Steps

1. **Commit the Blueprint**
   ```bash
   git add render.yaml
   git commit -m "chore: add Render deployment blueprint"
   git push
   ```

2. **Create Blueprint on Render**
   - Go to Render Dashboard
   - Click **New** → **Blueprint**
   - Select your GitHub repository
   - Render will detect `render.yaml` and create:
     - PostgreSQL database (`metaverse-db`)
     - HTTP API service (`metaverse-http-api`)
     - WebSocket service (`metaverse-websocket`)
     - Frontend static site (`metaverse-frontend`)

3. **Configure Environment Variables**

   **HTTP API Service:**
   ```env
   NODE_ENV=production
   PORT=3000
   JWT_PASSWORD=<secure-random-secret>
   DATABASE_URL=<auto-wired-from-render-db>
   ```

   **WebSocket Service:**
   ```env
   NODE_ENV=production
   PORT=8000
   JWT_PASSWORD=<same-as-http-api>
   DATABASE_URL=<auto-wired-from-render-db>
   ```

   **Frontend Static Site:**
   ```env
   VITE_API_URL=https://<your-http-api>.onrender.com/api/v1
   VITE_WS_URL=wss://<your-websocket>.onrender.com
   ```

4. **Deploy**
   - Render will automatically:
     - Install dependencies with `pnpm install`
     - Run database migrations
     - Build all services
     - Start the applications

5. **Verify**
   - Visit your frontend URL
   - Sign up for an account
   - Create/join a space
   - Test real-time features

---

### ⚙️ Manual Deployment

#### Docker Deployment (Example)

```dockerfile
# Dockerfile for HTTP API
FROM node:18-alpine
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "--filter", "http", "start"]
```

#### Environment Variables

Create a `.env` file in production:

```env
# Shared
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/metaverse
JWT_PASSWORD=super-secret-jwt-key-change-me

# HTTP API
PORT=3000
CORS_ORIGIN=https://your-frontend.com

# WebSocket
WS_PORT=8000
```

---

## 🔒 Security Considerations

### 🔐 Production Security Checklist

- [ ] **Replace Hardcoded JWT Secret**
  - Update `apps/http/src/constants.ts` and `apps/ws/src/config.ts`
  - Use `process.env.JWT_PASSWORD` loaded from a secure secret manager

- [ ] **Configure CORS**
  - Update allowed origins in `apps/http/src/index.ts`
  - Restrict to your production frontend domain

- [ ] **Use Secure Database Credentials**
  - Create a dedicated PostgreSQL user with least privilege
  - Use connection pooling for production

- [ ] **Enable HTTPS/WSS**
  - Terminate SSL at load balancer or reverse proxy
  - Use `wss://` for WebSocket connections in production

- [ ] **Input Validation**
  - All inputs are validated with Zod schemas
  - Review and update schemas as needed

- [ ] **Rate Limiting**
  - Consider adding rate limiting middleware (e.g., `express-rate-limit`)

- [ ] **SQL Injection Protection**
  - Prisma ORM provides parameterized queries by default

- [ ] **Password Security**
  - Passwords are hashed using `scrypt` before storage
  - Consider adding password strength requirements

---

## 🐛 Troubleshooting

### Database Connection Issues

**Problem**: `Error: Can't reach database server`

**Solutions**:
1. Verify PostgreSQL is running:
   ```bash
   # Windows (if using local PostgreSQL)
   net start postgresql-x64-14
   
   # macOS
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

2. Check database URL in `schema.prisma`
3. Test connection:
   ```bash
   pnpm dlx prisma studio --schema packages/database/prisma/schema.prisma
   ```

---

### Prisma Generation Errors

**Problem**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
pnpm --filter @repo/database exec prisma generate
```

---

### WebSocket Connection Fails

**Problem**: `WebSocket connection to 'ws://localhost:8000' failed`

**Solutions**:
1. Ensure WS server is running: `pnpm --filter ws dev`
2. Check JWT token is valid (not expired)
3. Verify `spaceId` exists in database
4. Check browser console for detailed error messages

---

### 401 Unauthorized Errors

**Problem**: `401 Unauthorized` on API requests

**Solutions**:
1. Ensure you're sending the JWT token:
   ```http
   Authorization: Bearer <token>
   ```
2. Token must be obtained from `/signin`
3. Check token hasn't expired
4. Verify JWT_PASSWORD matches between HTTP and WS services

---

### Admin Routes Return 403

**Problem**: `403 Forbidden` on admin endpoints

**Solution**:
Ensure the user was created with `"type": "admin"` during signup:
```json
{
  "username": "admin",
  "password": "admin123",
  "type": "admin"
}
```

---

### Build Errors

**Problem**: `TypeError: Cannot read property 'x' of undefined`

**Solutions**:
1. Clear build cache:
   ```bash
   rm -rf .dist .turbo node_modules
   pnpm install
   pnpm build
   ```

2. Ensure all dependencies are installed:
   ```bash
   pnpm install
   ```

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific workspace
pnpm --filter http test
pnpm --filter ws test
```

### Manual Testing Flow

1. **Start Services**
   ```bash
   pnpm dev
   ```

2. **Create Admin User**
   ```bash
   curl -X POST http://localhost:3000/api/v1/signup \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123","type":"admin"}'
   ```

3. **Sign In**
   ```bash
   curl -X POST http://localhost:3000/api/v1/signin \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

4. **Create a Space**
   ```bash
   curl -X POST http://localhost:3000/api/v1/space \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Office","dimensions":"100x100"}'
   ```

5. **Test WebSocket Connection**
   - Use a WebSocket client (e.g., `websocat`, Postman, or browser DevTools)
   - Connect to `ws://localhost:8000`
   - Send join message with spaceId and token

---

## 📈 Scaling Considerations

### Horizontal Scaling

#### HTTP API
- **Stateless**: Can be horizontally scaled behind a load balancer
- **Session Management**: JWT tokens are self-contained, no shared session store needed
- **Database**: Use connection pooling (e.g., PgBouncer)

#### WebSocket Server
- **Current State**: In-memory room management (single instance)
- **Multi-Instance Scaling**: Implement Redis Pub/Sub for room coordination
  ```mermaid
  graph LR
      WS1[WS Server 1] --> Redis
      WS2[WS Server 2] --> Redis
      WS3[WS Server 3] --> Redis
      Redis -->|Broadcast| WS1
      Redis -->|Broadcast| WS2
      Redis -->|Broadcast| WS3
  ```

- **Room Partitioning**: Assign spaces to specific WS instances via consistent hashing

#### Database
- **Read Replicas**: Route read queries to replicas
- **Indexes**: Add indexes on frequently queried fields (userId, spaceId)
- **Caching**: Use Redis for frequently accessed data (user metadata, space details)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Workflow

```bash
# Install dependencies
pnpm install

# Run linting
pnpm lint

# Format code
pnpm format

# Type check
pnpm check-types

# Build all packages
pnpm build

# Run development servers
pnpm dev
```

### Code Style

- **TypeScript**: Use strict mode
- **ESLint**: Follow the shared configuration in `packages/eslint-config`
- **Prettier**: Format code before committing
- **Commits**: Use conventional commit messages

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Turborepo** for powerful monorepo tooling
- **Prisma** for type-safe database access
- **Express** for robust HTTP server
- **ws** for efficient WebSocket implementation

---

## 📞 Support

For issues, questions, or feature requests:
- **GitHub Issues**: [Create an issue](https://github.com/your-repo/issues)
- **Documentation**: See this README and inline code comments
- **Email**: support@yourproject.com

---

<div align="center">

**Built with ❤️ using modern web technologies**

[⬆ Back to Top](#metaverse-skyscope-)

</div>
