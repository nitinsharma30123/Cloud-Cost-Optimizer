#ifndef ROUTER_HPP
#define ROUTER_HPP

#include "optimizer.hpp"

namespace Optimizer {

    struct Graph {
        std::unordered_map<std::string, Node> nodes;

        void addNode(const std::string& name) {
            if (nodes.find(name) == nodes.end()) {
                nodes[name] = {name, {}};
            }
        }

        void addEdge(const std::string& source, const std::string& target, double latencyMs, double costPerGB) {
            addNode(source);
            addNode(target);
            nodes[source].connections.push_back({target, latencyMs, costPerGB});
            // Assuming bidirectional connections for simulation, but can be directional
            nodes[target].connections.push_back({source, latencyMs, costPerGB});
        }
    };

    struct PathNode {
        double value; // cost or latency depending on mode
        std::string name;

        bool operator>(const PathNode& other) const {
            return value > other.value; // Min-heap: smallest weight first
        }
    };

    inline RouteResult runRouting(const Graph& graph, const std::string& start, const std::string& target, const std::string& mode) {
        if (graph.nodes.find(start) == graph.nodes.end() || graph.nodes.find(target) == graph.nodes.end()) {
            return {{}, 0, 0, false};
        }

        std::unordered_map<std::string, double> dist;
        std::unordered_map<std::string, std::string> parent;
        std::priority_queue<PathNode, std::vector<PathNode>, std::greater<PathNode>> pq;

        for (const auto& pair : graph.nodes) {
            dist[pair.first] = 1e18; // Infinity
        }

        dist[start] = 0.0;
        pq.push({0.0, start});

        while (!pq.empty()) {
            PathNode curr = pq.top();
            pq.pop();

            std::string u = curr.name;
            double d = curr.value;

            if (d > dist[u]) continue;
            if (u == target) break;

            const auto& node = graph.nodes.at(u);
            for (const auto& edge : node.connections) {
                double weight = (mode == "latency") ? edge.latencyMs : edge.costPerGB;
                if (dist[u] + weight < dist[edge.targetRegion]) {
                    dist[edge.targetRegion] = dist[u] + weight;
                    parent[edge.targetRegion] = u;
                    pq.push({dist[edge.targetRegion], edge.targetRegion});
                }
            }
        }

        if (dist[target] >= 1e17) {
            return {{}, 0, 0, false};
        }

        // Reconstruct path
        std::vector<std::string> path;
        std::string curr = target;
        while (curr != start) {
            path.push_back(curr);
            curr = parent[curr];
        }
        path.push_back(start);
        std::reverse(path.begin(), path.end());

        // Calculate total cost and latency along the path
        double totalLatency = 0.0;
        double totalCostPerGB = 0.0;

        for (size_t i = 0; i < path.size() - 1; ++i) {
            std::string u = path[i];
            std::string v = path[i+1];
            // Find edge connection from u to v
            const auto& node = graph.nodes.at(u);
            for (const auto& edge : node.connections) {
                if (edge.targetRegion == v) {
                    totalLatency += edge.latencyMs;
                    totalCostPerGB += edge.costPerGB;
                    break;
                }
            }
        }

        RouteResult result;
        result.path = path;
        result.totalLatency = totalLatency;
        result.totalCostPerGB = totalCostPerGB;
        result.pathFound = true;
        return result;
    }

} // namespace Optimizer

#endif // ROUTER_HPP
