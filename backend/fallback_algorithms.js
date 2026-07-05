// JS implementations of the optimization algorithms.
// This is used if the C++ binary is not compiled/available.

// --- 1. VM Placement (Bin Packing) ---
function runFirstFit(vms, hostCpu, hostRam, hostCostPerHour) {
    const hosts = [];
    let hostCounter = 1;

    for (const vm of vms) {
        let placed = false;
        for (const host of hosts) {
            if ((host.cpuCapacity - host.cpuUsed >= vm.cpu) && (host.ramCapacity - host.ramUsed >= vm.ram)) {
                host.cpuUsed += vm.cpu;
                host.ramUsed += vm.ram;
                host.hostedVmIds.push(vm.id);
                placed = true;
                break;
            }
        }
        if (!placed) {
            hosts.push({
                id: hostCounter++,
                cpuCapacity: hostCpu,
                ramCapacity: hostRam,
                cpuUsed: vm.cpu,
                ramUsed: vm.ram,
                hostedVmIds: [vm.id]
            });
        }
    }

    let totalCpuUsage = 0;
    let totalRamUsage = 0;
    for (const h of hosts) {
        totalCpuUsage += h.cpuUsed / h.cpuCapacity;
        totalRamUsage += h.ramUsed / h.ramCapacity;
    }

    return {
        algorithm: "First Fit",
        hostsUsed: hosts.length,
        totalCostPerHour: hosts.length * hostCostPerHour,
        averageCpuUtilization: hosts.length === 0 ? 0 : (totalCpuUsage / hosts.length) * 100,
        averageRamUtilization: hosts.length === 0 ? 0 : (totalRamUsage / hosts.length) * 100,
        hosts: hosts
    };
}

function runBestFit(vms, hostCpu, hostRam, hostCostPerHour) {
    const hosts = [];
    let hostCounter = 1;

    for (const vm of vms) {
        let bestHostIndex = -1;
        let minCpuSlack = 999999;
        let minRamSlack = 999999;

        for (let i = 0; i < hosts.length; ++i) {
            const h = hosts[i];
            if ((h.cpuCapacity - h.cpuUsed >= vm.cpu) && (h.ramCapacity - h.ramUsed >= vm.ram)) {
                const slackCpu = (h.cpuCapacity - h.cpuUsed) - vm.cpu;
                const slackRam = (h.ramCapacity - h.ramUsed) - vm.ram;

                if (bestHostIndex === -1 || (slackCpu < minCpuSlack) || (slackCpu === minCpuSlack && slackRam < minRamSlack)) {
                    bestHostIndex = i;
                    minCpuSlack = slackCpu;
                    minRamSlack = slackRam;
                }
            }
        }

        if (bestHostIndex !== -1) {
            const h = hosts[bestHostIndex];
            h.cpuUsed += vm.cpu;
            h.ramUsed += vm.ram;
            h.hostedVmIds.push(vm.id);
        } else {
            hosts.push({
                id: hostCounter++,
                cpuCapacity: hostCpu,
                ramCapacity: hostRam,
                cpuUsed: vm.cpu,
                ramUsed: vm.ram,
                hostedVmIds: [vm.id]
            });
        }
    }

    let totalCpuUsage = 0;
    let totalRamUsage = 0;
    for (const h of hosts) {
        totalCpuUsage += h.cpuUsed / h.cpuCapacity;
        totalRamUsage += h.ramUsed / h.ramCapacity;
    }

    return {
        algorithm: "Best Fit",
        hostsUsed: hosts.length,
        totalCostPerHour: hosts.length * hostCostPerHour,
        averageCpuUtilization: hosts.length === 0 ? 0 : (totalCpuUsage / hosts.length) * 100,
        averageRamUtilization: hosts.length === 0 ? 0 : (totalRamUsage / hosts.length) * 100,
        hosts: hosts
    };
}

function runFirstFitDecreasing(vms, hostCpu, hostRam, hostCostPerHour) {
    const sortedVms = [...vms].sort((a, b) => {
        if (a.cpu !== b.cpu) return b.cpu - a.cpu;
        return b.ram - a.ram;
    });

    const result = runFirstFit(sortedVms, hostCpu, hostRam, hostCostPerHour);
    result.algorithm = "First Fit Decreasing";
    return result;
}

function runPlacementSimulation(vms, hostCpu, hostRam, hostCostPerHour) {
    return {
        firstFit: runFirstFit(vms, hostCpu, hostRam, hostCostPerHour),
        bestFit: runBestFit(vms, hostCpu, hostRam, hostCostPerHour),
        firstFitDecreasing: runFirstFitDecreasing(vms, hostCpu, hostRam, hostCostPerHour)
    };
}

// --- 2. Task Scheduling (Priority Queue Simulator) ---
// Simple MinHeap helper
class MinHeap {
    constructor(compare) {
        this.heap = [];
        this.compare = compare || ((a, b) => a - b);
    }
    push(val) {
        this.heap.push(val);
        this.bubbleUp(this.heap.length - 1);
    }
    pop() {
        if (this.heap.length === 1) return this.heap.pop();
        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown(0);
        return min;
    }
    peek() {
        return this.heap[0];
    }
    size() {
        return this.heap.length;
    }
    isEmpty() {
        return this.heap.length === 0;
    }
    bubbleUp(idx) {
        while (idx > 0) {
            const pIdx = Math.floor((idx - 1) / 2);
            if (this.compare(this.heap[idx], this.heap[pIdx]) >= 0) break;
            [this.heap[idx], this.heap[pIdx]] = [this.heap[pIdx], this.heap[idx]];
            idx = pIdx;
        }
    }
    bubbleDown(idx) {
        const len = this.heap.length;
        while (2 * idx + 1 < len) {
            let smallest = 2 * idx + 1;
            const right = smallest + 1;
            if (right < len && this.compare(this.heap[right], this.heap[smallest]) < 0) {
                smallest = right;
            }
            if (this.compare(this.heap[idx], this.heap[smallest]) <= 0) break;
            [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
            idx = smallest;
        }
    }
}

function runSchedulerSimulation(tasks, vmCount, slaThreshold) {
    // Clone and map tasks
    const taskMap = {};
    tasks.forEach(t => {
        taskMap[t.id] = { ...t, startTime: -1, endTime: -1, assignedVmId: -1 };
    });

    // Event Heap comparison: earliest time first
    const eventHeap = new MinHeap((a, b) => a.time - b.time);
    tasks.forEach(t => {
        eventHeap.push({ time: t.arrivalTime, type: 0, taskId: t.id, vmId: -1 });
    });

    // Waiting queue compare (Min priority number is highest priority, FIFO for same priority)
    const waitingQueue = []; 
    const pushToWaiting = (task) => {
        waitingQueue.push(task);
        waitingQueue.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.arrivalTime - b.arrivalTime;
        });
    };

    const vmBusy = Array(vmCount).fill(false);
    let currentTime = 0;
    let completedCount = 0;
    let slaViolations = 0;
    let totalWaitTime = 0;
    let totalTurnaroundTime = 0;
    const finishedTasks = [];

    while (!eventHeap.isEmpty()) {
        const event = eventHeap.pop();
        currentTime = event.time;

        if (event.type === 0) { // Arrival
            const task = taskMap[event.taskId];
            let idleVmId = -1;
            for (let i = 0; i < vmCount; ++i) {
                if (!vmBusy[i]) {
                    idleVmId = i;
                    break;
                }
            }

            if (idleVmId !== -1) {
                vmBusy[idleVmId] = true;
                task.startTime = currentTime;
                task.endTime = currentTime + task.burstTime;
                task.assignedVmId = idleVmId;
                eventHeap.push({ time: task.endTime, type: 1, taskId: task.id, vmId: idleVmId });
            } else {
                pushToWaiting(task);
            }
        } 
        else if (event.type === 1) { // Completion
            const completedTask = taskMap[event.taskId];
            const vmId = event.vmId;
            vmBusy[vmId] = false;

            completedTask.endTime = currentTime;
            const waitTime = completedTask.startTime - completedTask.arrivalTime;
            const turnaroundTime = completedTask.endTime - completedTask.arrivalTime;

            totalWaitTime += waitTime;
            totalTurnaroundTime += turnaroundTime;
            if (waitTime > slaThreshold) {
                slaViolations++;
            }
            completedCount++;
            finishedTasks.push(completedTask);

            if (waitingQueue.length > 0) {
                const nextTask = waitingQueue.shift();
                const taskInMap = taskMap[nextTask.id];
                taskInMap.startTime = currentTime;
                taskInMap.endTime = currentTime + taskInMap.burstTime;
                taskInMap.assignedVmId = vmId;

                vmBusy[vmId] = true;
                eventHeap.push({ time: taskInMap.endTime, type: 1, taskId: taskInMap.id, vmId: vmId });
            }
        }
    }

    finishedTasks.sort((a, b) => a.id - b.id);

    return {
        totalSimulationTime: currentTime,
        averageWaitTime: completedCount === 0 ? 0 : totalWaitTime / completedCount,
        averageTurnaroundTime: completedCount === 0 ? 0 : totalTurnaroundTime / completedCount,
        tasksCompleted: completedCount,
        tasksSlaViolated: slaViolations,
        taskHistory: finishedTasks
    };
}

// --- 3. Resource Budgeting (Dynamic Programming) ---
function runBudgetAllocationSimulation(items, budget) {
    const n = items.length;
    if (n === 0 || budget <= 0) {
        return { totalCost: 0, totalPerformance: 0, selectedItems: [] };
    }

    const dp = Array(n + 1).fill(null).map(() => Array(budget + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        const item = items[i - 1];
        for (let w = 0; w <= budget; w++) {
            if (item.cost <= w) {
                dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - item.cost] + item.performance);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    const selected = [];
    let w = budget;
    for (let i = n; i > 0 && w > 0; i--) {
        if (dp[i][w] !== dp[i - 1][w]) {
            selected.push(items[i - 1]);
            w -= items[i - 1].cost;
        }
    }
    selected.reverse();

    let actualCost = 0;
    let actualPerformance = 0;
    selected.forEach(item => {
        actualCost += item.cost;
        actualPerformance += item.performance;
    });

    return {
        totalCost: actualCost,
        totalPerformance: actualPerformance,
        selectedItems: selected
    };
}

// --- 4. Multi-Region Data Routing (Graph Shortest Path) ---
function runRoutingSimulation(edges, start, target, mode) {
    // Build adjacency list
    const graph = {};
    const addNode = (name) => {
        if (!graph[name]) graph[name] = [];
    };

    edges.forEach(e => {
        addNode(e.source);
        addNode(e.target);
        graph[e.source].push({ target: e.target, latencyMs: e.latencyMs, costPerGB: e.costPerGB });
        graph[e.target].push({ target: e.source, latencyMs: e.latencyMs, costPerGB: e.costPerGB }); // Bi-directional
    });

    if (!graph[start] || !graph[target]) {
        return { pathFound: false, totalLatency: 0, totalCostPerGB: 0, path: [] };
    }

    const dist = {};
    const parent = {};
    const visited = {};

    Object.keys(graph).forEach(node => {
        dist[node] = Infinity;
    });

    dist[start] = 0;
    
    // Dijkstra using standard array-based priority queue (perfect for small graphs)
    const pq = [{ name: start, value: 0 }];

    while (pq.length > 0) {
        pq.sort((a, b) => a.value - b.value);
        const curr = pq.shift();
        const u = curr.name;

        if (visited[u]) continue;
        visited[u] = true;

        if (u === target) break;

        const connections = graph[u] || [];
        for (const edge of connections) {
            const v = edge.target;
            const weight = mode === "latency" ? edge.latencyMs : edge.costPerGB;

            if (dist[u] + weight < dist[v]) {
                dist[v] = dist[u] + weight;
                parent[v] = u;
                pq.push({ name: v, value: dist[v] });
            }
        }
    }

    if (dist[target] === Infinity) {
        return { pathFound: false, totalLatency: 0, totalCostPerGB: 0, path: [] };
    }

    const path = [];
    let currNode = target;
    while (currNode !== start) {
        path.push(currNode);
        currNode = parent[currNode];
    }
    path.push(start);
    path.reverse();

    let totalLatency = 0;
    let totalCostPerGB = 0;

    for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        const edge = graph[u].find(conn => conn.target === v);
        if (edge) {
            totalLatency += edge.latencyMs;
            totalCostPerGB += edge.costPerGB;
        }
    }

    return {
        pathFound: true,
        totalLatency,
        totalCostPerGB,
        path
    };
}

module.exports = {
    runPlacementSimulation,
    runSchedulerSimulation,
    runBudgetAllocationSimulation,
    runRoutingSimulation
};
