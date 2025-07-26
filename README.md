# SkyScope


## Project Overview

SkyScope is a cutting-edge real-time 2D virtual office designed to foster dynamic user interaction and presence in a digital environment. It provides a comprehensive platform for collaboration, featuring integrated communication tools and a robust backend infrastructure engineered for scalability and responsiveness.

## Features

*   **Real-time Virtual Office:** Experience a dynamic 2D virtual space where users can interact and perceive each other's presence in real-time.
*   **REST & WebSocket APIs:** A robust backend facilitating seamless communication and data exchange through both traditional RESTful endpoints and persistent WebSocket connections for real-time updates.
*   **Proximity-Based Voice Chat (WebRTC):** Engage in intuitive peer-to-peer voice conversations that activate based on user proximity within the virtual office, powered by WebRTC for low-latency communication.
*   **Persistent Public Chat:** Participate in a general public chat channel with message persistence, ensuring conversation history is readily available, backed by MongoDB.
*   **Dynamic User Interaction & Presence:** Visual indicators and real-time updates for user presence, status, and interactions within the 2D environment.

## Technologies Used

SkyScope leverages a powerful combination of modern technologies to deliver its features:

*   **Monorepo Management:** TurboRepo
*   **Backend Runtime:** Node.js
*   **Real-time Communication:** WebSockets
*   **Peer-to-Peer Voice:** WebRTC
*   **Database:** MongoDB (for chat persistence)
*   **Caching/Message Broker:** Redis
*   **Containerization:** Docker
*   **Continuous Integration/Deployment:** CI/CD pipelines (e.g., GitHub Actions)

## Architecture & Development Practices

The backend architecture is designed for high performance and real-time capabilities. Key aspects include:

*   **API Design:** A dual approach utilizing both REST for traditional data operations and WebSockets for instantaneous updates and real-time interactions.
*   **Data Persistence:** MongoDB is employed for reliable storage of chat messages and other persistent data. Redis is integrated for caching and potentially for managing real-time events or session data, enhancing performance and scalability.
*   **Test-Driven Development (TDD):** Development was guided by TDD principles, ensuring high code quality, reliability, and maintainability through extensive unit and integration testing.
*   **Containerization:** The application is containerized using Docker, providing consistent environments across development, testing, and production, simplifying deployment and scaling.

### Prerequisites

*   Node.js (LTS version recommended)
*   Docker & Docker Compose
*   MongoDB instance (cloud)
*   Redis instance (cloud)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/skyscope.git
    cd skyscope
    ```
2.  **Install dependencies:**
    ```bash
    npm install # Or `yarn install` if using Yarn
    ```
3.  **Set up environment variables:**
    Create a `.env` file in the root directory based on a `.env.example` (if provided, otherwise create one) and configure your MongoDB and Redis connection strings, and any other necessary environment variables.
    ```
    # Example .env content
    MONGO_URI=mongodb://localhost:27017/skyscope
    REDIS_URI=redis://localhost:6379
    PORT=3000
    ```
4.  **Run with Docker Compose (Recommended):**
    ```bash
    docker-compose up --build
    ```
    This will build and start all services, including MongoDB and Redis if configured in your `docker-compose.yml`.

5.  **Run Locally (without Docker Compose for services):**
    Ensure MongoDB and Redis instances are running and accessible.
    ```bash
    npm run dev # Or `npm start`
    ```

## Usage

Once the backend services are running, you can interact with the SkyScope virtual office.
*   Access the REST APIs via `http://localhost:3000/api/...` (adjust port as configured).
*   Connect to the WebSocket server at `ws://localhost:3000/ws`.
*   A separate frontend application (not detailed here) would typically connect to these endpoints to provide the 2D virtual office experience.



## Contact

[Nehil Chandrakar] - [chnadrakarnehil.06112002@gmail.com]
