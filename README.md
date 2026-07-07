# Cloud Cost Optimizer (C++ & React Full-Stack Simulation)

An interactive, premium dashboard showing how fundamental Data Structures and Algorithms (DSA) optimize cloud infrastructure resources and network transit routing costs.

## 🚀 Key Features

1. **Virtual Machine Placement (Bin Packing - Greedy Heuristics)**: Packs multiple VMs into the fewest physical hosts to minimize hourly active server rentals. Compares **First Fit**, **Best Fit**, and **First Fit Decreasing (FFD)**.
2. **Priority Job Scheduler (Event-Driven Min-Heap)**: Simulates queuing streams of batch tasks scheduled onto active instances, prioritizing critical SLA targets.
3. **Infrastructure Budget Allocator (0/1 Knapsack - Dynamic Programming)**: Selects optimal database, cache, GPU, and worker instance tier profiles to maximize overall system performance under a monthly budget limit.
4. **Data Transit Router (Graphs - Dijkstra's Shortest Path)**: Computes the most cost-effective or lowest-latency network routing path across multi-region datacenters, visualized with moving packet flows.

---

## 🛠️ Project Structure

* `/cpp` - C++ optimization core engine (source files, headers, and Windows compiler scripts).
* `/backend` - Node.js & Express server hosting API endpoints and managing the C++ binary compiler subprocess. Features a full **JavaScript fallback** implementation of all algorithms.
* `/frontend` - React, Vite, and custom SVG visual charts detailing grid packing, event timelines, and network nodes.

---

## 💻 Quick Start

### 1. Start the Backend API
```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend Dev Server
```bash
cd ../frontend
npm install
npm run dev
```
Open **https://cloudcloudoptimizer.com** in your web browser.

---

## ⚙️ Running with the C++ Compiled Core
The backend uses a JavaScript implementation by default if a C++ compiler isn't detected. To run the high-performance C++ solver:

1. Install GCC/MinGW (e.g., via Chocolatey in an Administrator terminal: `choco install mingw -y`).
2. Build the C++ core:
   ```bash
   cd cpp
   build.bat
   ```
3. Restart the backend server. The engine will detect the compiled executable and automatically switch to running the C++ binary!
