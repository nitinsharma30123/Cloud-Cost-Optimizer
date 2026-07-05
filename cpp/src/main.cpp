#include "include/optimizer.hpp"
#include "include/bin_packing.hpp"
#include "include/scheduler.hpp"
#include "include/budgeting.hpp"
#include "include/router.hpp"

using namespace Optimizer;

void handlePlacement() {
    int hostCpu, hostRam;
    double hostCostPerHour;
    if (!(std::cin >> hostCpu >> hostRam >> hostCostPerHour)) return;

    int vmCount;
    if (!(std::cin >> vmCount)) return;

    std::vector<VM> vms(vmCount);
    for (int i = 0; i < vmCount; ++i) {
        std::cin >> vms[i].id >> vms[i].cpu >> vms[i].ram >> vms[i].costPerHour;
    }

    PlacementResult ff = runFirstFit(vms, hostCpu, hostRam, hostCostPerHour);
    PlacementResult bf = runBestFit(vms, hostCpu, hostRam, hostCostPerHour);
    PlacementResult ffd = runFirstFitDecreasing(vms, hostCpu, hostRam, hostCostPerHour);

    auto printResultJson = [](const PlacementResult& res) {
        std::cout << "{\n";
        std::cout << "  \"algorithm\": \"" << res.algorithm << "\",\n";
        std::cout << "  \"hostsUsed\": " << res.hostsUsed << ",\n";
        std::cout << "  \"totalCostPerHour\": " << res.totalCostPerHour << ",\n";
        std::cout << "  \"averageCpuUtilization\": " << res.averageCpuUtilization << ",\n";
        std::cout << "  \"averageRamUtilization\": " << res.averageRamUtilization << ",\n";
        std::cout << "  \"hosts\": [\n";
        for (size_t i = 0; i < res.hosts.size(); ++i) {
            const auto& h = res.hosts[i];
            std::cout << "    {\n";
            std::cout << "      \"id\": " << h.id << ",\n";
            std::cout << "      \"cpuUsed\": " << h.cpuUsed << ",\n";
            std::cout << "      \"ramUsed\": " << h.ramUsed << ",\n";
            std::cout << "      \"hostedVmIds\": [";
            for (size_t j = 0; j < h.hostedVmIds.size(); ++j) {
                std::cout << h.hostedVmIds[j];
                if (j + 1 < h.hostedVmIds.size()) std::cout << ", ";
            }
            std::cout << "]\n";
            std::cout << "    }" << (i + 1 < res.hosts.size() ? "," : "") << "\n";
        }
        std::cout << "  ]\n";
        std::cout << "}";
    };

    std::cout << "{\n";
    std::cout << "  \"firstFit\": ";
    printResultJson(ff);
    std::cout << ",\n  \"bestFit\": ";
    printResultJson(bf);
    std::cout << ",\n  \"firstFitDecreasing\": ";
    printResultJson(ffd);
    std::cout << "\n}\n";
}

void handleSchedule() {
    int vmCount;
    double slaThreshold;
    if (!(std::cin >> vmCount >> slaThreshold)) return;

    int taskCount;
    if (!(std::cin >> taskCount)) return;

    std::vector<Task> tasks(taskCount);
    for (int i = 0; i < taskCount; ++i) {
        std::cin >> tasks[i].id >> tasks[i].arrivalTime >> tasks[i].burstTime >> tasks[i].priority;
    }

    ScheduleResult res = runScheduler(tasks, vmCount, slaThreshold);

    std::cout << "{\n";
    std::cout << "  \"totalSimulationTime\": " << res.totalSimulationTime << ",\n";
    std::cout << "  \"averageWaitTime\": " << res.averageWaitTime << ",\n";
    std::cout << "  \"averageTurnaroundTime\": " << res.averageTurnaroundTime << ",\n";
    std::cout << "  \"tasksCompleted\": " << res.tasksCompleted << ",\n";
    std::cout << "  \"tasksSlaViolated\": " << res.tasksSlaViolated << ",\n";
    std::cout << "  \"taskHistory\": [\n";
    for (size_t i = 0; i < res.taskHistory.size(); ++i) {
        const auto& t = res.taskHistory[i];
        std::cout << "    {\n";
        std::cout << "      \"id\": " << t.id << ",\n";
        std::cout << "      \"arrivalTime\": " << t.arrivalTime << ",\n";
        std::cout << "      \"burstTime\": " << t.burstTime << ",\n";
        std::cout << "      \"priority\": " << t.priority << ",\n";
        std::cout << "      \"startTime\": " << t.startTime << ",\n";
        std::cout << "      \"endTime\": " << t.endTime << ",\n";
        std::cout << "      \"assignedVmId\": " << t.assignedVmId << "\n";
        std::cout << "    }" << (i + 1 < res.taskHistory.size() ? "," : "") << "\n";
    }
    std::cout << "  ]\n";
    std::cout << "}\n";
}

void handleBudget() {
    int budgetLimit;
    if (!(std::cin >> budgetLimit)) return;

    int itemCount;
    if (!(std::cin >> itemCount)) return;

    std::vector<BudgetItem> items(itemCount);
    for (int i = 0; i < itemCount; ++i) {
        std::cin >> items[i].id;
        std::string name;
        std::cin >> name;
        items[i].name = escapeJsonString(name);
        std::cin >> items[i].cost >> items[i].performance;
    }

    BudgetResult res = runBudgetAllocation(items, budgetLimit);

    std::cout << "{\n";
    std::cout << "  \"totalCost\": " << res.totalCost << ",\n";
    std::cout << "  \"totalPerformance\": " << res.totalPerformance << ",\n";
    std::cout << "  \"selectedItems\": [\n";
    for (size_t i = 0; i < res.selectedItems.size(); ++i) {
        const auto& item = res.selectedItems[i];
        std::cout << "    {\n";
        std::cout << "      \"id\": " << item.id << ",\n";
        std::cout << "      \"name\": \"" << item.name << "\",\n";
        std::cout << "      \"cost\": " << item.cost << ",\n";
        std::cout << "      \"performance\": " << item.performance << "\n";
        std::cout << "    }" << (i + 1 < res.selectedItems.size() ? "," : "") << "\n";
    }
    std::cout << "  ]\n";
    std::cout << "}\n";
}

void handleRoute() {
    std::string startRegion, targetRegion, mode;
    if (!(std::cin >> startRegion >> targetRegion >> mode)) return;

    int edgeCount;
    if (!(std::cin >> edgeCount)) return;

    Graph graph;
    for (int i = 0; i < edgeCount; ++i) {
        std::string src, dest;
        double latency;
        double cost;
        std::cin >> src >> dest >> latency >> cost;
        graph.addEdge(src, dest, latency, cost);
    }

    RouteResult res = runRouting(graph, startRegion, targetRegion, mode);

    std::cout << "{\n";
    std::cout << "  \"pathFound\": " << (res.pathFound ? "true" : "false") << ",\n";
    std::cout << "  \"totalLatency\": " << res.totalLatency << ",\n";
    std::cout << "  \"totalCostPerGB\": " << res.totalCostPerGB << ",\n";
    std::cout << "  \"path\": [";
    for (size_t i = 0; i < res.path.size(); ++i) {
        std::cout << "\"" << escapeJsonString(res.path[i]) << "\"";
        if (i + 1 < res.path.size()) std::cout << ", ";
    }
    std::cout << "]\n";
    std::cout << "}\n";
}

int main(int argc, char* argv[]) {
    // Force standard formatting for doubles in JSON
    std::cout << std::fixed << std::setprecision(4);

    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " --task [placement|schedule|budget|route]\n";
        return 1;
    }

    std::string task = argv[1];
    if (task == "placement" || task == "--task=placement") {
        handlePlacement();
    } else if (task == "schedule" || task == "--task=schedule") {
        handleSchedule();
    } else if (task == "budget" || task == "--task=budget") {
        handleBudget();
    } else if (task == "route" || task == "--task=route") {
        handleRoute();
    } else {
        std::cerr << "Unknown task: " << task << "\n";
        return 1;
    }

    return 0;
}
