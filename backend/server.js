const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec, execFile } = require('child_process');
const jsAlgorithms = require('./fallback_algorithms');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Request Logger
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});
// Paths
const cppDir = path.join(__dirname, '..', 'cpp');
const binDir = path.join(cppDir, 'bin');
const exePath = path.join(binDir, 'optimizer.exe');
const buildBatPath = path.join(cppDir, 'build.bat');

// Helper to compile C++ binary if not present
function compileCppBinary() {
    return new Promise((resolve, reject) => {
        console.log("Attempting to compile C++ binary using build.bat...");
        exec(`cmd.exe /c "${buildBatPath}"`, { cwd: cppDir }, (error, stdout, stderr) => {
            if (error) {
                console.warn("[BACKEND] C++ Compilation failed or g++ not present. Fallback to JS will be used.");
                console.warn(stderr || stdout);
                return resolve(false);
            }
            console.log("[BACKEND] C++ Core compiled successfully.");
            resolve(true);
        });
    });
}

// Check C++ binary status
async function getEngine(requestedEngine) {
    if (requestedEngine === 'js') {
        return { name: 'js', run: false };
    }

    if (fs.existsSync(exePath)) {
        return { name: 'cpp', run: true };
    }

    // Try compiling once
    const compiled = await compileCppBinary();
    if (compiled && fs.existsSync(exePath)) {
        return { name: 'cpp', run: true };
    }

    return { name: 'js (fallback)', run: false };
}

// Subprocess execution wrapper
function runCppSubprocess(task, stdinText) {
    return new Promise((resolve, reject) => {
        const child = execFile(exePath, [task], (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            try {
                const parsed = JSON.parse(stdout);
                resolve(parsed);
            } catch (parseError) {
                reject(new Error(`Failed to parse C++ stdout as JSON: ${stdout}`));
            }
        });

        // Write inputs to standard input
        child.stdin.write(stdinText);
        child.stdin.end();
    });
}

// --- API Routes ---

// 1. VM Placement Route
app.post('/api/placement', async (req, res) => {
    const { hostCpu, hostRam, hostCostPerHour, vms, engine } = req.body;
    
    // Simple validation
    if (!hostCpu || !hostRam || !vms || !Array.isArray(vms)) {
        return res.status(400).json({ error: "Invalid parameters. Host capacity and VM list required." });
    }

    const activeEngine = await getEngine(engine);
    let result;
    
    if (activeEngine.run) {
        try {
            // Serialize data for C++ stdin
            let stdinText = `${hostCpu} ${hostRam} ${hostCostPerHour}\n${vms.length}\n`;
            vms.forEach(vm => {
                stdinText += `${vm.id} ${vm.cpu} ${vm.ram} ${vm.costPerHour}\n`;
            });

            result = await runCppSubprocess('placement', stdinText);
        } catch (err) {
            console.error("C++ VM Placement Execution failed. Falling back to JS.", err);
            activeEngine.name = 'js (fallback after C++ error)';
            result = jsAlgorithms.runPlacementSimulation(vms, hostCpu, hostRam, hostCostPerHour);
        }
    } else {
        result = jsAlgorithms.runPlacementSimulation(vms, hostCpu, hostRam, hostCostPerHour);
    }

    res.json({
        engineUsed: activeEngine.name,
        data: result
    });
});

// 2. Task Scheduling Route
app.post('/api/schedule', async (req, res) => {
    const { vmCount, slaThreshold, tasks, engine } = req.body;

    if (!vmCount || !tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: "Invalid parameters. VM count and task list required." });
    }

    const activeEngine = await getEngine(engine);
    let result;

    if (activeEngine.run) {
        try {
            let stdinText = `${vmCount} ${slaThreshold}\n${tasks.length}\n`;
            tasks.forEach(t => {
                stdinText += `${t.id} ${t.arrivalTime} ${t.burstTime} ${t.priority}\n`;
            });

            result = await runCppSubprocess('schedule', stdinText);
        } catch (err) {
            console.error("C++ Task Scheduling Execution failed. Falling back to JS.", err);
            activeEngine.name = 'js (fallback after C++ error)';
            result = jsAlgorithms.runSchedulerSimulation(tasks, vmCount, slaThreshold);
        }
    } else {
        result = jsAlgorithms.runSchedulerSimulation(tasks, vmCount, slaThreshold);
    }

    res.json({
        engineUsed: activeEngine.name,
        data: result
    });
});

// 3. Budget Allocator Route
app.post('/api/budget', async (req, res) => {
    const { budgetLimit, items, engine } = req.body;

    if (!budgetLimit || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Invalid parameters. Budget limit and services list required." });
    }

    const activeEngine = await getEngine(engine);
    let result;

    if (activeEngine.run) {
        try {
            let stdinText = `${budgetLimit}\n${items.length}\n`;
            items.forEach(item => {
                const safeName = item.name.replace(/\s+/g, '_');
                stdinText += `${item.id} ${safeName} ${item.cost} ${item.performance}\n`;
            });

            result = await runCppSubprocess('budget', stdinText);
        } catch (err) {
            console.error("C++ Budget Execution failed. Falling back to JS.", err);
            activeEngine.name = 'js (fallback after C++ error)';
            result = jsAlgorithms.runBudgetAllocationSimulation(items, budgetLimit);
        }
    } else {
        result = jsAlgorithms.runBudgetAllocationSimulation(items, budgetLimit);
    }

    res.json({
        engineUsed: activeEngine.name,
        data: result
    });
});

// 4. Graph Network Routing Route
app.post('/api/route', async (req, res) => {
    const { startRegion, targetRegion, mode, edges, engine } = req.body;

    if (!startRegion || !targetRegion || !mode || !edges || !Array.isArray(edges)) {
        return res.status(400).json({ error: "Invalid parameters. Start, target, optimization mode, and edges network structure required." });
    }

    const activeEngine = await getEngine(engine);
    let result;

    if (activeEngine.run) {
        try {
            let stdinText = `${startRegion} ${targetRegion} ${mode}\n${edges.length}\n`;
            edges.forEach(e => {
                stdinText += `${e.source} ${e.target} ${e.latencyMs} ${e.costPerGB}\n`;
            });

            result = await runCppSubprocess('route', stdinText);
        } catch (err) {
            console.error("C++ Routing Execution failed. Falling back to JS.", err);
            activeEngine.name = 'js (fallback after C++ error)';
            result = jsAlgorithms.runRoutingSimulation(edges, startRegion, targetRegion, mode);
        }
    } else {
        result = jsAlgorithms.runRoutingSimulation(edges, startRegion, targetRegion, mode);
    }

    res.json({
        engineUsed: activeEngine.name,
        data: result
    });
});
// ================= HOME ROUTE =================
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "🚀 Cloud Cost Optimizer Backend is Running",
        project: "Cloud Cost Optimizer",
        version: "1.0.0",
        author: "Nitin Sharma",
        endpoints: {
            placement: "/api/placement",
            schedule: "/api/schedule",
            budget: "/api/budget",
            route: "/api/route"
        }
    });
});


// Compile binary on start if compiler exists
compileCppBinary().then(() => {
    app.listen(PORT, () => {
        console.log(`===================================================`);
        console.log(` Cloud Cost Optimizer Backend is running on port ${PORT}`);
        console.log(`===================================================`);
    });
});
