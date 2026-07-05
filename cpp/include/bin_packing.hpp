#ifndef BIN_PACKING_HPP
#define BIN_PACKING_HPP

#include "optimizer.hpp"

namespace Optimizer {

    inline double calculateHostUtilization(const Host& h) {
        double cpuPct = (double)h.cpuUsed / h.cpuCapacity;
        double ramPct = (double)h.ramUsed / h.ramCapacity;
        return (cpuPct + ramPct) / 2.0;
    }

    // First Fit placement
    inline PlacementResult runFirstFit(std::vector<VM> vms, int hostCpu, int hostRam, double hostCostPerHour) {
        std::vector<Host> hosts;
        int hostCounter = 1;

        for (const auto& vm : vms) {
            bool placed = false;
            for (auto& host : hosts) {
                if (host.canAccommodate(vm)) {
                    host.placeVM(vm);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                Host newHost;
                newHost.id = hostCounter++;
                newHost.cpuCapacity = hostCpu;
                newHost.ramCapacity = hostRam;
                newHost.placeVM(vm);
                hosts.push_back(newHost);
            }
        }

        double totalCpuUsage = 0;
        double totalRamUsage = 0;
        for (const auto& h : hosts) {
            totalCpuUsage += (double)h.cpuUsed / h.cpuCapacity;
            totalRamUsage += (double)h.ramUsed / h.ramCapacity;
        }

        PlacementResult result;
        result.algorithm = "First Fit";
        result.hostsUsed = hosts.size();
        result.totalCostPerHour = hosts.size() * hostCostPerHour;
        result.averageCpuUtilization = hosts.empty() ? 0 : (totalCpuUsage / hosts.size()) * 100.0;
        result.averageRamUtilization = hosts.empty() ? 0 : (totalRamUsage / hosts.size()) * 100.0;
        result.hosts = hosts;
        return result;
    }

    // Best Fit placement
    inline PlacementResult runBestFit(std::vector<VM> vms, int hostCpu, int hostRam, double hostCostPerHour) {
        std::vector<Host> hosts;
        int hostCounter = 1;

        for (const auto& vm : vms) {
            int bestHostIndex = -1;
            int minCpuSlack = 999999;
            int minRamSlack = 999999;

            for (size_t i = 0; i < hosts.size(); ++i) {
                if (hosts[i].canAccommodate(vm)) {
                    int slackCpu = (hosts[i].cpuCapacity - hosts[i].cpuUsed) - vm.cpu;
                    int slackRam = (hosts[i].ramCapacity - hosts[i].ramUsed) - vm.ram;
                    // Primary metric: CPU slack, secondary: RAM slack
                    if (bestHostIndex == -1 || (slackCpu < minCpuSlack) || (slackCpu == minCpuSlack && slackRam < minRamSlack)) {
                        bestHostIndex = i;
                        minCpuSlack = slackCpu;
                        minRamSlack = slackRam;
                    }
                }
            }

            if (bestHostIndex != -1) {
                hosts[bestHostIndex].placeVM(vm);
            } else {
                Host newHost;
                newHost.id = hostCounter++;
                newHost.cpuCapacity = hostCpu;
                newHost.ramCapacity = hostRam;
                newHost.placeVM(vm);
                hosts.push_back(newHost);
            }
        }

        double totalCpuUsage = 0;
        double totalRamUsage = 0;
        for (const auto& h : hosts) {
            totalCpuUsage += (double)h.cpuUsed / h.cpuCapacity;
            totalRamUsage += (double)h.ramUsed / h.ramCapacity;
        }

        PlacementResult result;
        result.algorithm = "Best Fit";
        result.hostsUsed = hosts.size();
        result.totalCostPerHour = hosts.size() * hostCostPerHour;
        result.averageCpuUtilization = hosts.empty() ? 0 : (totalCpuUsage / hosts.size()) * 100.0;
        result.averageRamUtilization = hosts.empty() ? 0 : (totalRamUsage / hosts.size()) * 100.0;
        result.hosts = hosts;
        return result;
    }

    // First Fit Decreasing placement
    inline PlacementResult runFirstFitDecreasing(std::vector<VM> vms, int hostCpu, int hostRam, double hostCostPerHour) {
        // Sort VMs in descending order of size. 
        // We use core count as the primary key, and RAM as the secondary key.
        std::sort(vms.begin(), vms.end(), [](const VM& a, const VM& b) {
            if (a.cpu != b.cpu) {
                return a.cpu > b.cpu;
            }
            return a.ram > b.ram;
        });

        PlacementResult result = runFirstFit(vms, hostCpu, hostRam, hostCostPerHour);
        result.algorithm = "First Fit Decreasing";
        return result;
    }

} // namespace Optimizer

#endif // BIN_PACKING_HPP
