
const WEBHOOK_URL = "PASTE_YOUR_N8N_PRODUCTION_WEBHOOK_URL_HERE";

const form = document.getElementById("requestForm");
const submitBtn = document.getElementById("submitBtn");
const message = document.getElementById("formMessage");
const transactionList = document.getElementById("transactionList");

let transactions = [];

function updateDashboard() {
  document.getElementById("totalCount").textContent =
    transactions.length;

  document.getElementById("autoCount").textContent =
    transactions.filter(t => t.status === "AUTO_PROCESSED").length;

  document.getElementById("pendingCount").textContent =
    transactions.filter(t => t.status === "PENDING_APPROVAL").length;

  document.getElementById("exceptionCount").textContent =
    transactions.filter(t => t.status === "NEEDS_CORRECTION").length;
}

function renderTransactions() {
  transactionList.replaceChildren();

  if (transactions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.className = "empty";
    cell.textContent = "No transactions submitted yet.";

    row.appendChild(cell);
    transactionList.appendChild(row);
    return;
  }

  transactions.slice().reverse().forEach(t => {
    const row = document.createElement("tr");

    const values = [
      t.requestId.slice(0, 8),
      t.vendorName,
      `₹${Number(t.amount).toLocaleString("en-IN")}`,
      t.department
    ];

    values.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });

    const statusCell = document.createElement("td");
    const badge = document.createElement("span");

    badge.className = `status ${t.status}`;
    badge.textContent = t.status.replaceAll("_", " ");

    statusCell.appendChild(badge);
    row.appendChild(statusCell);
    transactionList.appendChild(row);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!WEBHOOK_URL.startsWith("https://")) {
    message.textContent = "Configure your n8n webhook URL first.";
    return;
  }

  const amount = Number(document.getElementById("amount").value);

  if (!Number.isFinite(amount) || amount <= 0) {
    message.textContent = "Enter a valid purchase amount.";
    return;
  }

  const payload = {
    requestId: crypto.randomUUID(),
    requester: document.getElementById("requester").value.trim(),
    department: document.getElementById("department").value,
    vendorName: document.getElementById("vendor").value.trim(),
    amount,
    currency: "INR",
    category: document.getElementById("category").value,
    description: document.getElementById("description").value.trim(),
    submittedAt: new Date().toISOString()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";
  message.textContent = "Sending request to ProcureFlow AI...";

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();

    const transaction = {
      ...payload,
      status: result.status || "FAILED"
    };

    transactions.push(transaction);

    updateDashboard();
    renderTransactions();

    message.textContent =
      `Request ${payload.requestId.slice(0, 8)}: ${transaction.status}`;

    form.reset();

  } catch (error) {
    console.error("Submission failed:", error);
    message.textContent =
      "Unable to confirm processing. Check the workflow execution before retrying.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit for AI Processing →";
  }
});

updateDashboard();
renderTransactions();