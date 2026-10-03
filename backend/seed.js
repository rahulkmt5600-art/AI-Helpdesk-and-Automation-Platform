// Run with:
//   node seed.js
//
// Add --fresh only if you intentionally want to delete
// all users, teams, and tickets:
//   node seed.js --fresh
//
// Normal execution is idempotent.

require("dotenv").config();

const mongoose = require("mongoose");

const User = require("./models/User");
const Team = require("./models/Team");
const Ticket = require("./models/Ticket");

const TEAMS = [
  "Network Team",
  "Hardware Team",
  "Software Team",
  "Access Team",
  "Billing Team",
  "General Support",
];

const AGENTS = [
  {
    name: "Ravi Kumar",
    email: "ravi.agent@deskline.com",
    team: "Network Team",
  },
  {
    name: "Ananya Rao",
    email: "ananya.agent@deskline.com",
    team: "Hardware Team",
  },
  {
    name: "Farhan Sheikh",
    email: "farhan.agent@deskline.com",
    team: "Access Team",
  },
  {
    name: "Neha Sharma",
    email: "neha.agent@deskline.com",
    team: "Software Team",
  },
  {
    name: "Arjun Mehta",
    email: "arjun.agent@deskline.com",
    team: "Billing Team",
  },
  {
    name: "Simran Kaur",
    email: "simran.agent@deskline.com",
    team: "General Support",
  },
];

/*
|--------------------------------------------------------------------------
| TEAM LEADS
|--------------------------------------------------------------------------
| One Team Lead for every Deskline team.
|
| All of them use the same role:
|
|     teamLead
|
| Their team determines which tickets/statistics they can see.
|--------------------------------------------------------------------------
*/

const TEAM_LEADS = [
  {
    name: "Network Team Lead",
    email: "network.lead@deskline.com",
    team: "Network Team",
  },
  {
    name: "Hardware Team Lead",
    email: "hardware.lead@deskline.com",
    team: "Hardware Team",
  },
  {
    name: "Software Team Lead",
    email: "software.lead@deskline.com",
    team: "Software Team",
  },
  {
    name: "Access Team Lead",
    email: "access.lead@deskline.com",
    team: "Access Team",
  },
  {
    name: "Billing Team Lead",
    email: "billing.lead@deskline.com",
    team: "Billing Team",
  },
  {
    name: "General Support Lead",
    email: "general.lead@deskline.com",
    team: "General Support",
  },
];

const USERS = [
  {
    name: "Meera Iyer",
    email: "meera@deskline.com",
  },
  {
    name: "Kabir Singh",
    email: "kabir@deskline.com",
  },
  {
    name: "Priya Nair",
    email: "priya@deskline.com",
  },
];

/*
|--------------------------------------------------------------------------
| SAMPLE TICKETS
|--------------------------------------------------------------------------
*/

const TICKETS = [
  {
    title: "VPN keeps disconnecting every few minutes",
    description:
      "Since this morning my VPN connection drops every 5-10 minutes and I have to manually reconnect. Happens on both wifi and ethernet.",
    category: "network",
    priority: "high",
    status: "open",
    aiSummary:
      "VPN connection repeatedly drops on all networks since this morning.",
    requester: "meera@deskline.com",
    team: "Network Team",
  },

  {
    title: "Request access to shared Finance drive",
    description:
      "I just joined the finance team and need read/write access to the shared Finance drive on the network share.",
    category: "access",
    priority: "medium",
    status: "in-progress",
    aiSummary:
      "New finance team member requesting access to shared Finance drive.",
    requester: "kabir@deskline.com",
    team: "Access Team",
  },

  {
    title: "Laptop won't turn on after Windows update",
    description:
      "Installed the latest Windows update last night and now the laptop won't boot past the manufacturer logo. Tried holding power button for 10 seconds, no change.",
    category: "hardware",
    priority: "high",
    status: "open",
    aiSummary:
      "Laptop stuck at boot logo after a Windows update; power-cycling didn't help.",
    requester: "priya@deskline.com",
    team: "Hardware Team",
  },

  {
    title: "Second monitor not detected",
    description:
      "My second monitor worked fine last week but today it's not being detected at all, even after replugging the HDMI cable.",
    category: "hardware",
    priority: "low",
    status: "resolved",
    aiSummary:
      "External monitor not detected despite reconnecting the HDMI cable.",
    requester: "meera@deskline.com",
    team: "Hardware Team",
  },

  {
    title: "Can't connect to office wifi from new phone",
    description:
      "Got a new phone this week and it won't connect to the office wifi network — keeps saying authentication failed.",
    category: "network",
    priority: "medium",
    status: "open",
    aiSummary:
      "New phone fails wifi authentication when joining the office network.",
    requester: "kabir@deskline.com",
    team: "Network Team",
  },

  {
    title: "Locked out of email account",
    description:
      "Entered my password wrong too many times and now my email account is locked. Need it unlocked or reset.",
    category: "access",
    priority: "high",
    status: "in-progress",
    aiSummary:
      "Email account locked after repeated failed login attempts.",
    requester: "priya@deskline.com",
    team: "Access Team",
  },

  {
    title: "Invoice software showing wrong tax calculation",
    description:
      "The billing tool is calculating GST incorrectly on invoices generated after the last update — off by about 2%.",
    category: "billing",
    priority: "medium",
    status: "open",
    aiSummary:
      "Billing software miscalculating GST on invoices since the recent update.",
    requester: "kabir@deskline.com",
    team: "Billing Team",
  },

  {
    title: "How do I set up email on my personal phone?",
    description:
      "Just want step-by-step instructions for adding my work email to the mail app on my personal Android phone.",
    category: "software",
    priority: "low",
    status: "resolved",
    aiSummary:
      "Requesting setup instructions for work email on a personal Android phone.",
    requester: "meera@deskline.com",
    team: "Software Team",
  },
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB");

    /*
    |--------------------------------------------------------------------------
    | OPTIONAL FRESH RESET
    |--------------------------------------------------------------------------
    */

    if (process.argv.includes("--fresh")) {
      await Promise.all([
        User.deleteMany({}),
        Team.deleteMany({}),
        Ticket.deleteMany({}),
      ]);

      console.log(
        "--fresh: cleared existing users, teams, and tickets"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 1. ADMIN
    |--------------------------------------------------------------------------
    */

    let admin = await User.findOne({
      email: "admin@deskline.com",
    });

    if (!admin) {
      admin = await User.create({
        name: "Admin",
        email: "admin@deskline.com",
        password: "admin123",
        role: "admin",
        team: null,
      });

      console.log(
        "Created admin: admin@deskline.com / admin123"
      );
    }

    /*
    |--------------------------------------------------------------------------
    | 2. TEAMS
    |--------------------------------------------------------------------------
    */

    const teamsByName = {};

    for (const name of TEAMS) {
      let team = await Team.findOne({ name });

      if (!team) {
        team = await Team.create({
          name,
          members: [],
        });

        console.log(`Created team: ${name}`);
      }

      teamsByName[name] = team;
    }

    /*
    |--------------------------------------------------------------------------
    | 3. AGENTS
    |--------------------------------------------------------------------------
    */

    for (const agentData of AGENTS) {
      let agent = await User.findOne({
        email: agentData.email,
      });

      if (!agent) {
        agent = await User.create({
          name: agentData.name,
          email: agentData.email,
          password: "agent123",
          role: "agent",
          team: teamsByName[agentData.team]._id,
        });

        console.log(
          `Created agent: ${agentData.email} / agent123 (${agentData.team})`
        );
      } else {
        // Keep existing agent connected to correct team.
        agent.role = "agent";
        agent.team = teamsByName[agentData.team]._id;

        await agent.save();
      }

      const team = teamsByName[agentData.team];

      if (
        !team.members.some(
          (memberId) =>
            memberId.toString() === agent._id.toString()
        )
      ) {
        team.members.push(agent._id);
        await team.save();
      }
    }

    /*
    |--------------------------------------------------------------------------
    | 4. TEAM LEADS
    |--------------------------------------------------------------------------
    */

    for (const leadData of TEAM_LEADS) {
      let lead = await User.findOne({
        email: leadData.email,
      });

      if (!lead) {
        lead = await User.create({
          name: leadData.name,
          email: leadData.email,
          password: "lead123",
          role: "teamLead",
          team: teamsByName[leadData.team]._id,
        });

        console.log(
          `Created team lead: ${leadData.email} / lead123 (${leadData.team})`
        );
      } else {
        // Make sure an existing account has the correct role/team.
        lead.role = "teamLead";
        lead.team = teamsByName[leadData.team]._id;

        await lead.save();

        console.log(
          `Updated team lead: ${leadData.email} (${leadData.team})`
        );
      }

      const team = teamsByName[leadData.team];

      if (
        !team.members.some(
          (memberId) =>
            memberId.toString() === lead._id.toString()
        )
      ) {
        team.members.push(lead._id);
        await team.save();
      }
    }

    /*
    |--------------------------------------------------------------------------
    | 5. REGULAR USERS
    |--------------------------------------------------------------------------
    */

    const usersByEmail = {};

    for (const userData of USERS) {
      let user = await User.findOne({
        email: userData.email,
      });

      if (!user) {
        user = await User.create({
          name: userData.name,
          email: userData.email,
          password: "user123",
          role: "user",
          team: null,
        });

        console.log(
          `Created user: ${userData.email} / user123`
        );
      }

      usersByEmail[userData.email] = user;
    }

    /*
    |--------------------------------------------------------------------------
    | 6. SAMPLE TICKETS
    |--------------------------------------------------------------------------
    */

    for (const ticketData of TICKETS) {
      const exists = await Ticket.findOne({
        title: ticketData.title,
      });

      if (exists) {
        continue;
      }

      await Ticket.create({
        title: ticketData.title,
        description: ticketData.description,
        category: ticketData.category,
        priority: ticketData.priority,
        status: ticketData.status,
        aiSummary: ticketData.aiSummary,
        createdBy: usersByEmail[ticketData.requester]._id,
        assignedTeam: teamsByName[ticketData.team]._id,
      });
    }

    console.log(
      `Seeded ${TICKETS.length} sample tickets (skipping any that already existed)`
    );

    /*
    |--------------------------------------------------------------------------
    | LOGIN INFORMATION
    |--------------------------------------------------------------------------
    */

    console.log("\n========================================");
    console.log("DESKLINE SEED COMPLETE");
    console.log("========================================");

    console.log("\nADMIN");
    console.log("admin@deskline.com / admin123");

    console.log("\nAGENTS");
    console.log(
      "ravi.agent@deskline.com / agent123  → Network Team"
    );
    console.log(
      "ananya.agent@deskline.com / agent123 → Hardware Team"
    );
    console.log(
      "farhan.agent@deskline.com / agent123 → Access Team"
    );

    console.log("\nTEAM LEADS");
    console.log(
      "network.lead@deskline.com / lead123   → Network Team"
    );
    console.log(
      "hardware.lead@deskline.com / lead123  → Hardware Team"
    );
    console.log(
      "software.lead@deskline.com / lead123  → Software Team"
    );
    console.log(
      "access.lead@deskline.com / lead123    → Access Team"
    );
    console.log(
      "billing.lead@deskline.com / lead123   → Billing Team"
    );
    console.log(
      "general.lead@deskline.com / lead123   → General Support"
    );

    console.log("\nUSERS");
    console.log("meera@deskline.com / user123");
    console.log("kabir@deskline.com / user123");
    console.log("priya@deskline.com / user123");

    console.log("\n========================================");

    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
}

run();