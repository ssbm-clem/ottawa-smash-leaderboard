import { hrtime } from "node:process";
const startup = hrtime.bigint();
let executedOnce = false;

import functions from "@google-cloud/functions-framework";

import { register } from "./register.js";
import { recurringScrape } from "./recurring-scrape.js";
import { discordAuth } from "./discord-auth.js";
import { PubSub } from "@google-cloud/pubsub";
import { getRegistrationDetails } from "./db.js";
import Discord from "./discord/Discord.js";

async function auth(req, res, callback) {
  const error = await discordAuth(req.headers, req.rawBody);
  if (error && error.code) {
    res.status(error.code);
    return;
  }
  if (req.body.type == 1) {
    res.json({ type: 1 });
    return;
  }
  if (req.body.type == 2) {
    await callback();
    return;
  }
  res.status(400).json({ error: `Unknown type: ${req.body.type}` });
}

async function triggerScrape(res) {
  const pubsub = new PubSub();
  try {
    const messageId = await pubsub
      .topic("daily-scrape")
      .publishMessage({ data: Buffer.from("foo") });
    console.log(`Message ${messageId} published.`);
    res.status(201).json({
      type: 4,
      data: {
        content: "Asking Slippi nicely for updated stats; please wait.",
      },
    });
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    res.status(500).json({
      type: 4,
      data: {
        content: "Unexpected error",
      },
    });
  }
}

async function removeUser(req, res) {
  const { member, data } = req.body;
  const connectCode = data.options[0].value.toUpperCase();

  console.log(
    `removeUser requested by: ${member.user.id}, ${member.user.username}`
  );
  const canManageGuild = Discord.hasManageGuildPermissions(member.permissions);
  let message = null,
    shouldRemove = false;
  if (canManageGuild) {
    message = `Mod removed user with code: ${connectCode}`;
    await removeUser(connectCode);
  } else {
    const details = await getRegistrationDetails(connectCode);
    const requestingUserId = member.user.id;
    const discordId = details.user.discordUserId;
    if (requestingUserId === discordId) {
      message = `User: ${requestingUserId} removed ${connectCode} - they added it`;
    } else {
      message = `User: ${requestingUserId} attempted to remove code ${connectCode} but they did not add it`;
    }
  }

  res.status(200).json({
    type: 4,
    data: {
      content: message,
    },
  });
  if (shouldRemove) {
    await removeUser();
  }
}

functions.http("register", async function (req, res) {
  if (!executedOnce) {
    const coldStartTimeNanos = hrtime.bigint() - startup;
    const millis = coldStartTimeNanos / 1_000_000n;
    console.log(`Startup time: ${millis}ms`);
    executedOnce = true;
  }
  return await auth(req, res, async () => {
    if (req.body.data.name === "register") {
      await register(req, res);
    } else if (req.body.data.name === "show_leaderboard") {
      await triggerScrape(res);
    } else if (req.body.data.name === "remove") {
      await removeUser(req, res);
    }
  });
});
functions.cloudEvent("recurring-scrape", recurringScrape);
