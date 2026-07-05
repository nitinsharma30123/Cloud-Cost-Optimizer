#ifndef BUDGETING_HPP
#define BUDGETING_HPP

#include "optimizer.hpp"

namespace Optimizer {

    inline BudgetResult runBudgetAllocation(const std::vector<BudgetItem>& items, int budget) {
        int n = items.size();
        if (n == 0 || budget <= 0) {
            return {0, 0, {}};
        }

        // dp[i][w] stores the max performance using first i items with budget limit w
        std::vector<std::vector<int>> dp(n + 1, std::vector<int>(budget + 1, 0));

        // Build table
        for (int i = 1; i <= n; ++i) {
            const auto& item = items[i - 1];
            for (int w = 0; w <= budget; ++w) {
                if (item.cost <= w) {
                    dp[i][w] = std::max(dp[i - 1][w], dp[i - 1][w - item.cost] + item.performance);
                } else {
                    dp[i][w] = dp[i - 1][w];
                }
            }
        }

        // Backtrack to find selected items
        std::vector<BudgetItem> selected;
        int w = budget;
        for (int i = n; i > 0 && w > 0; --i) {
            if (dp[i][w] != dp[i - 1][w]) {
                selected.push_back(items[i - 1]);
                w -= items[i - 1].cost;
            }
        }

        // Selected items are retrieved in reverse, reverse them for chronological ID ordering
        std::reverse(selected.begin(), selected.end());

        BudgetResult result;
        result.totalCost = dp[n][budget]; // wait, the max cost of selected is budget - w
        result.totalPerformance = dp[n][budget];
        
        // Calculate exact total cost of selected items
        int actualCost = 0;
        int actualPerformance = 0;
        for (const auto& item : selected) {
            actualCost += item.cost;
            actualPerformance += item.performance;
        }
        result.totalCost = actualCost;
        result.totalPerformance = actualPerformance;
        result.selectedItems = selected;

        return result;
    }

} // namespace Optimizer

#endif // BUDGETING_HPP
