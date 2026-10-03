const mongoose = require("mongoose");
require("dotenv").config();

const KnowledgeBase = require("./models/KnowledgeBase");

const knowledgeArticles = [
  {
    title: "Wi-Fi Connection Troubleshooting",
    category: "network",
    problem: "User cannot connect to the office Wi-Fi.",
    symptoms: [
      "Wi-Fi network not visible",
      "Connected but no internet",
      "Frequent disconnections",
    ],
    solution:
      "Restart the network adapter and verify IP configuration.",
    troubleshootingSteps: [
      "Check that Wi-Fi is enabled.",
      "Forget and reconnect to the network.",
      "Restart the network adapter.",
      "Run IP configuration commands.",
      "Restart the device if required.",
    ],
  },

  {
    title: "VPN Connection Failure",
    category: "network",
    problem: "User cannot connect to the company VPN.",
    symptoms: [
      "VPN connection fails",
      "Authentication error",
      "VPN disconnects frequently",
    ],
    solution:
      "Verify internet connectivity, VPN credentials, and restart the VPN client.",
    troubleshootingSteps: [
      "Check that the internet connection is working.",
      "Verify VPN username and password.",
      "Restart the VPN application.",
      "Reconnect to the VPN.",
      "Contact IT support if the VPN server remains unreachable.",
    ],
  },

  {
    title: "Laptop Overheating",
    category: "hardware",
    problem: "User reports that the laptop becomes unusually hot.",
    symptoms: [
      "High fan speed",
      "Laptop becomes very hot",
      "System performance decreases",
      "Unexpected shutdown",
    ],
    solution:
      "Check ventilation, remove dust from air vents, and reduce unnecessary background processes.",
    troubleshootingSteps: [
      "Place the laptop on a hard and flat surface.",
      "Check that ventilation openings are not blocked.",
      "Close unnecessary applications.",
      "Check CPU usage.",
      "Clean the ventilation area if required.",
    ],
  },

  {
    title: "Printer Not Detected",
    category: "hardware",
    problem: "User cannot find or use the office printer.",
    symptoms: [
      "Printer not visible",
      "Print jobs remain pending",
      "Printer shows offline",
    ],
    solution:
      "Verify the printer connection and restart the printer service.",
    troubleshootingSteps: [
      "Check printer power and network connection.",
      "Verify that the correct printer is selected.",
      "Restart the printer.",
      "Restart the print spooler service.",
      "Try printing a test page.",
    ],
  },

  {
    title: "Software Installation Failure",
    category: "software",
    problem: "User cannot install required company software.",
    symptoms: [
      "Installation fails",
      "Permission error",
      "Installation stops unexpectedly",
    ],
    solution:
      "Verify installation permissions and ensure the required software dependencies are available.",
    troubleshootingSteps: [
      "Verify that the installer is from an approved source.",
      "Check available disk space.",
      "Run the installer with appropriate permissions.",
      "Close conflicting applications.",
      "Contact IT support if administrator access is required.",
    ],
  },

  {
    title: "Password Reset",
    category: "access",
    problem: "User has forgotten their account password.",
    symptoms: [
      "Cannot log in",
      "Forgotten password",
      "Password authentication failure",
    ],
    solution:
      "Use the organization's approved password-reset procedure.",
    troubleshootingSteps: [
      "Open the company password-reset portal.",
      "Verify your identity.",
      "Create a new strong password.",
      "Sign in again using the new password.",
      "Contact IT support if the reset process fails.",
    ],
  },

  {
    title: "Account Locked",
    category: "access",
    problem: "User account has been locked after multiple failed login attempts.",
    symptoms: [
      "Account locked message",
      "Repeated login failures",
      "Unable to access company applications",
    ],
    solution:
      "Verify the user's identity and unlock the account through the approved IT process.",
    troubleshootingSteps: [
      "Stop repeated login attempts.",
      "Verify the username.",
      "Check whether another device is using an old password.",
      "Request account unlock through IT support.",
      "Update saved credentials after the account is unlocked.",
    ],
  },

  {
    title: "Email Not Syncing",
    category: "software",
    problem: "User's company email is not synchronizing.",
    symptoms: [
      "New emails are not appearing",
      "Email sending fails",
      "Mailbox shows outdated messages",
    ],
    solution:
      "Check network connectivity and restart the email application.",
    troubleshootingSteps: [
      "Verify internet connectivity.",
      "Check mailbox storage.",
      "Restart the email application.",
      "Verify account synchronization settings.",
      "Sign out and sign in again if necessary.",
    ],
  },

  {
    title: "Billing or Payment Issue",
    category: "billing",
    problem: "User reports an incorrect charge or payment problem.",
    symptoms: [
      "Unexpected charge",
      "Payment failed",
      "Duplicate charge",
      "Invoice discrepancy",
    ],
    solution:
      "Verify the invoice and payment information before escalating the issue to the billing team.",
    troubleshootingSteps: [
      "Collect the invoice or transaction reference.",
      "Verify the billing date.",
      "Check the charged amount.",
      "Check whether the transaction was duplicated.",
      "Escalate unresolved discrepancies to the billing team.",
    ],
  },

  {
    title: "General IT Support",
    category: "other",
    problem: "User has an IT issue that does not match a specific category.",
    symptoms: [
      "Unclassified technical issue",
      "Unknown application problem",
      "General IT assistance required",
    ],
    solution:
      "Collect the user's issue details and route the ticket to General Support.",
    troubleshootingSteps: [
      "Collect a clear description of the problem.",
      "Record relevant error messages.",
      "Identify the affected device or application.",
      "Check whether the issue can be reproduced.",
      "Escalate to the appropriate team if required.",
    ],
  },
];

async function seedKnowledgeBase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB");

    for (const article of knowledgeArticles) {
      const existing = await KnowledgeBase.findOne({
        title: article.title,
      });

      if (existing) {
        console.log(`Skipping existing article: ${article.title}`);
        continue;
      }

      await KnowledgeBase.create(article);
      console.log(`Created: ${article.title}`);
    }

    console.log("\nKNOWLEDGE BASE SEED COMPLETE");

    await mongoose.connection.close();
  } catch (error) {
    console.error("Knowledge base seed failed:", error);
    process.exit(1);
  }
}

seedKnowledgeBase();