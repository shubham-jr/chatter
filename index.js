#!/usr/bin/env node

const { RTCPeerConnection } = require("@koush/wrtc");
const fs = require("fs").promises;
const readline = require("readline");
const sendNotification = require("./noitifier");

const connection = new RTCPeerConnection();
let sendChannel;
let receiveChannel;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const saveLocalDescription = async (description, filename) => {
  try {
    const jsonDescription = JSON.stringify(description, null, 2);
    await fs.writeFile(filename, jsonDescription);
    console.log(`Local description saved to ${filename}`);
  } catch (error) {
    console.error(`Error saving local description to ${filename}:`, error);
  }
};

const readDescriptionFromFile = async (filename) => {
  try {
    const data = await fs.readFile(filename, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading description from ${filename}:`, error);
  }
};

const startMessagePrompt = () => {
  console.log("You can now type messages to send:");
  rl.on("line", (line) => {
    if (sendChannel.readyState === "open") {
      sendChannel.send(line);
      console.log(`Sent: ${line}`);
    } else {
      console.log("Channel is not open. Cannot send message.");
    }
  });
};

const startReadingInput = (channel) => {
  console.log("You can now type messages to send:");
  rl.on("line", (line) => {
    if (channel.readyState === "open") {
      channel.send(line);
      console.log(`Sent: ${line}`);
    } else {
      console.log("Channel is not open. Cannot send message.");
    }
  });
};

const invite = async () => {
  connection.onicecandidate = (e) => {
    if (e.candidate) {
      console.log("NEW ice candidate!! on local connection reprinting SDP");
      console.log(JSON.stringify(connection.localDescription));
      saveLocalDescription(connection.localDescription, "peerA.json");
    }
  };

  sendChannel = connection.createDataChannel("sendChannel");
  sendChannel.onmessage = (e) => {
    console.log("Message received: " + e.data);
    sendNotification(e.data);
  };
  sendChannel.onopen = () => {
    console.log("Channel opened!");
    startMessagePrompt();
  };
  sendChannel.onclose = () => {
    console.log("Channel closed!");
  };

  try {
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await saveLocalDescription(connection.localDescription, "peerA.json");
    console.log("Local description saved to peerA.json");

    console.log("Type 'yes' to set the remote description from peerB.json:");
    const input = await prompt("");
    if (input.trim().toLowerCase() === "yes") {
      const remotePath = await prompt("Enter the path to remotepeer.js: ");
      const answer = await readDescriptionFromFile(remotePath);
      await connection.setRemoteDescription(answer);
      console.log("Remote description set successfully from remotepeer.js");
    }
  } catch (error) {
    console.error("Error creating offer or saving local description:", error);
  }
};

const accept = async () => {
  try {
    const remotePath = await prompt(
      "Are you the acceptor? Enter the path to remotepeer.js: "
    );
    const offer = await readDescriptionFromFile(remotePath);

    connection.onicecandidate = (e) => {
      if (e.candidate) {
        console.log("NEW ice candidate!! on remote connection reprinting SDP");
        console.log(JSON.stringify(connection.localDescription));
        saveLocalDescription(connection.localDescription, "peerB.json");
      }
    };

    connection.ondatachannel = (e) => {
      receiveChannel = e.channel;
      receiveChannel.onmessage = (e) => {
        console.log("Message received!!! " + e.data);
        sendNotification(e.data);
      };
      receiveChannel.onopen = (e) => {
        console.log("Channel opened!!!!");
        startReadingInput(receiveChannel);
      };
      receiveChannel.onclose = (e) => console.log("Channel closed!!!!!!");
    };

    await connection.setRemoteDescription(offer);
    console.log("Remote description set successfully");

    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    await saveLocalDescription(connection.localDescription, "peerB.json");
    console.log("Answer set and local description updated:");
    console.log(JSON.stringify(connection.localDescription));
  } catch (error) {
    console.error("Error setting up remote connection:", error);
  }
};

const main = async () => {
  const choice = await prompt(
    "Do you want to invite or accept? (invite/accept): "
  );
  if (choice.trim().toLowerCase() === "invite") {
    await invite();
  } else if (choice.trim().toLowerCase() === "accept") {
    await accept();
  } else {
    console.log(
      "Invalid choice. Please restart and type 'invite' or 'accept'."
    );
    rl.close();
  }
};

main();
