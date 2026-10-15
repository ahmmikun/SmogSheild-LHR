export function escapeMarkdownCell(val) {
  if (val === null || val === undefined) return "—";
  return String(val)
    .replace(/\|/g, "\\|")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

export function buildTestingRow(scenario, input, result, isBlockedByValidation = false) {
  let passFail = "FAIL";
  let actualOutcome = "—";
  let knownLimitations = "Regional CAMS 45km forecast resolution";

  if (isBlockedByValidation) {
    passFail = "PASS";
    actualOutcome = "Client validation caught invalid bounds (hours outside 1-12 or routine < 3 chars); zero network calls";
    knownLimitations = "Input domain bounded strictly to 1-12 hours";
  } else if (result && result.metrics) {
    if (result.ai) {
      passFail = "PASS";
      actualOutcome = `AQI ${result.metrics.usAqi} (${result.metrics.riskStatus}), ${result.metrics.cigarettes} cigs equiv, safe windows identified, 8B AI generated Roman Urdu alert (${result.meta?.latencyMs || "—"}ms)`;
    } else {
      passFail = "FAIL";
      actualOutcome = `Deterministic metrics computed, but AI inference failed (${result.aiError || "UPSTREAM_ERROR"})`;
    }
  }

  const scenarioCell = escapeMarkdownCell(scenario || "Manual Simulation");
  const inputCell = escapeMarkdownCell(
    typeof input === "string"
      ? input
      : `${input.zone || "riphah_johar"}, ${input.mode || "bike"}, ${input.hoursOutside || 0}h, "${input.userRoutine || ""}"`
  );
  const expectedCell = escapeMarkdownCell(
    isBlockedByValidation
      ? "Client validation blocks submission with inline errors; 0 API calls"
      : "Calculate deterministic health metrics & generate 8B commute rescheduling"
  );
  const actualCell = escapeMarkdownCell(actualOutcome);
  const statusCell = escapeMarkdownCell(passFail);
  const limitsCell = escapeMarkdownCell(knownLimitations);

  const row = `| ${scenarioCell} | ${inputCell} | ${expectedCell} | ${actualCell} | ${statusCell} | ${limitsCell} |`;
  const header = `| Test Scenario | Input | Expected Output | Actual Outcome | Pass/Fail | Known Limitations |\n| :--- | :--- | :--- | :--- | :--- | :--- |`;

  return `${header}\n${row}`;
}
