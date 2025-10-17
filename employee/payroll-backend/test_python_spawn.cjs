const { spawn } = require('child_process');
const path = require('path');

const pythonScript = path.resolve(
  process.cwd(),
  "..",
  "Biometric_connect",
  "integrated_capture.py"
);

console.log("🔍 Script path:", pythonScript);
console.log("🔍 Process CWD:", process.cwd());

const testProcess = spawn("python", [pythonScript, "--health"], {
  stdio: "pipe",
  shell: true,
});

let stdout = "";
let stderr = "";

testProcess.stdout.on("data", (data) => {
  stdout += data.toString();
  console.log("Python stdout:", data.toString());
});

testProcess.stderr.on("data", (data) => {
  stderr += data.toString();
  console.log("Python stderr:", data.toString());
});

testProcess.on("close", (code) => {
  console.log(`\nProcess exited with code: ${code}`);
  console.log("\n=== FULL STDOUT ===");
  console.log(stdout);
  console.log("\n=== FULL STDERR ===");
  console.log(stderr);
});

testProcess.on("error", (error) => {
  console.error("Process error:", error);
});
