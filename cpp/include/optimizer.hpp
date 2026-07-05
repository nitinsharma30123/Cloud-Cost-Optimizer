#ifndef OPTIMIZER_HPP
#define OPTIMIZER_HPP

#include <vector>
#include <string>
#include <queue>
#include <map>
#include <unordered_map>
#include <algorithm>
#include <iostream>
#include <sstream>
#include <cmath>
#include <iomanip>

namespace Optimizer {

    // ==========================================
    // 1. VM Placement (Bin Packing) Structures
    // ==========================================
    struct VM {
        int id;
        int cpu; // in cores
        int ram; // in GB
        double costPerHour;
    };

    struct Host {
        int id;
        int cpuCapacity;
        int ramCapacity;
        int cpuUsed = 0;
        int ramUsed = 0;
        std::vector<int> hostedVmIds;

        bool canAccommodate(const VM& vm) const {
            return (cpuCapacity - cpuUsed >= vm.cpu) && (ramCapacity - ramUsed >= vm.ram);
        }

        void placeVM(const VM& vm) {
            cpuUsed += vm.cpu;
            ramUsed += vm.ram;
            hostedVmIds.push_back(vm.id);
        }
    };

    struct PlacementResult {
        std::string algorithm;
        int hostsUsed;
        double totalCostPerHour;
        double averageCpuUtilization;
        double averageRamUtilization;
        std::vector<Host> hosts;
    };

    // ==========================================
    // 2. Task Scheduling (Priority Queue) Structures
    // ==========================================
    struct Task {
        int id;
        double arrivalTime;
        double burstTime; // execution duration
        int priority;     // lower number = higher priority
        double startTime = -1;
        double endTime = -1;
        int assignedVmId = -1;
    };

    struct TaskCompare {
        bool operator()(const Task& a, const Task& b) {
            if (std::abs(a.arrivalTime - b.arrivalTime) > 1e-5) {
                return a.arrivalTime > b.arrivalTime; // Earliest arrival first
            }
            return a.priority > b.priority; // Higher priority (lower int) first
        }
    };

    struct ScheduleResult {
        double totalSimulationTime;
        double averageWaitTime;
        double averageTurnaroundTime;
        int tasksCompleted;
        int tasksSlaViolated; // SLA target e.g. wait time > 5 units
        std::vector<Task> taskHistory;
    };

    // ==========================================
    // 3. Resource Budgeting (Dynamic Programming) Structures
    // ==========================================
    struct BudgetItem {
        int id;
        std::string name;
        int cost;        // integer weight
        int performance; // value
    };

    struct BudgetResult {
        int totalCost;
        int totalPerformance;
        std::vector<BudgetItem> selectedItems;
    };

    // ==========================================
    // 4. Graph Network Routing Structures
    // ==========================================
    struct Edge {
        std::string targetRegion;
        double latencyMs;
        double costPerGB;
    };

    struct Node {
        std::string regionName;
        std::vector<Edge> connections;
    };

    struct RouteResult {
        std::vector<std::string> path;
        double totalLatency;
        double totalCostPerGB;
        bool pathFound;
    };

    // Helper functions for JSON output escaping
    inline std::string escapeJsonString(const std::string& input) {
        std::ostringstream ss;
        for (char c : input) {
            if (c == '"' || c == '\\' || c == '/') {
                ss << '\\' << c;
            } else if (c == '\b') {
                ss << "\\b";
            } else if (c == '\f') {
                ss << "\\f";
            } else if (c == '\n') {
                ss << "\\n";
            } else if (c == '\r') {
                ss << "\\r";
            } else if (c == '\t') {
                ss << "\\t";
            } else {
                ss << c;
            }
        }
        return ss.str();
    }

} // namespace Optimizer

#endif // OPTIMIZER_HPP
