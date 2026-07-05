#ifndef SCHEDULER_HPP
#define SCHEDULER_HPP

#include "optimizer.hpp"

namespace Optimizer {

    struct Event {
        double time;
        int type; // 0 = Arrival, 1 = Completion
        int taskId;
        int vmId;

        bool operator>(const Event& other) const {
            return time > other.time; // Min-heap: earliest time first
        }
    };

    struct WaitingTaskCompare {
        bool operator()(const Task& a, const Task& b) const {
            if (a.priority != b.priority) {
                return a.priority > b.priority; // Lower priority number is scheduled first (highest priority)
            }
            return a.arrivalTime > b.arrivalTime; // First-come, first-served for same priority
        }
    };

    inline ScheduleResult runScheduler(std::vector<Task> tasks, int vmCount, double slaThreshold) {
        // Map tasks by ID for easy lookup and modification
        std::unordered_map<int, Task> taskMap;
        for (const auto& t : tasks) {
            taskMap[t.id] = t;
        }

        // Initialize event queue
        std::priority_queue<Event, std::vector<Event>, std::greater<Event>> eventQueue;
        for (const auto& t : tasks) {
            eventQueue.push({t.arrivalTime, 0, t.id, -1});
        }

        // Priority queue for tasks waiting to be processed
        std::priority_queue<Task, std::vector<Task>, WaitingTaskCompare> waitingQueue;

        // VM status: value is the time when the VM becomes free (0 initially)
        std::vector<double> vmFreeTime(vmCount, 0.0);
        std::vector<bool> vmBusy(vmCount, false);

        double currentTime = 0.0;
        int completedCount = 0;
        int slaViolations = 0;
        double totalWaitTime = 0.0;
        double totalTurnaroundTime = 0.0;

        std::vector<Task> finishedTasks;

        while (!eventQueue.empty()) {
            Event event = eventQueue.top();
            eventQueue.pop();
            currentTime = event.time;

            if (event.type == 0) { // Task Arrival
                Task& task = taskMap[event.taskId];
                
                // Find an idle VM
                int idleVmId = -1;
                for (int i = 0; i < vmCount; ++i) {
                    if (!vmBusy[i]) {
                        idleVmId = i;
                        break;
                    }
                }

                if (idleVmId != -1) {
                    // Schedule immediately
                    vmBusy[idleVmId] = true;
                    task.startTime = currentTime;
                    task.endTime = currentTime + task.burstTime;
                    task.assignedVmId = idleVmId;
                    
                    eventQueue.push({task.endTime, 1, task.id, idleVmId});
                } else {
                    // All VMs are busy, place in queue
                    waitingQueue.push(task);
                }
            } 
            else if (event.type == 1) { // Task Completion
                Task completedTask = taskMap[event.taskId];
                int vmId = event.vmId;
                vmBusy[vmId] = false;

                // Record finished task
                completedTask.endTime = currentTime;
                double waitTime = completedTask.startTime - completedTask.arrivalTime;
                double turnaroundTime = completedTask.endTime - completedTask.arrivalTime;
                
                totalWaitTime += waitTime;
                totalTurnaroundTime += turnaroundTime;
                if (waitTime > slaThreshold) {
                    slaViolations++;
                }
                completedCount++;
                finishedTasks.push_back(completedTask);

                // If there are waiting tasks, schedule the next one on this VM
                if (!waitingQueue.empty()) {
                    Task nextTask = waitingQueue.top();
                    waitingQueue.pop();

                    // Update map
                    Task& taskInMap = taskMap[nextTask.id];
                    taskInMap.startTime = currentTime;
                    taskInMap.endTime = currentTime + taskInMap.burstTime;
                    taskInMap.assignedVmId = vmId;

                    vmBusy[vmId] = true;
                    eventQueue.push({taskInMap.endTime, 1, taskInMap.id, vmId});
                }
            }
        }

        // Sort finished tasks by ID for consistent output
        std::sort(finishedTasks.begin(), finishedTasks.end(), [](const Task& a, const Task& b) {
            return a.id < b.id;
        });

        ScheduleResult result;
        result.totalSimulationTime = currentTime;
        result.tasksCompleted = completedCount;
        result.averageWaitTime = completedCount == 0 ? 0 : totalWaitTime / completedCount;
        result.averageTurnaroundTime = completedCount == 0 ? 0 : totalTurnaroundTime / completedCount;
        result.tasksSlaViolated = slaViolations;
        result.taskHistory = finishedTasks;

        return result;
    }

} // namespace Optimizer

#endif // SCHEDULER_HPP
