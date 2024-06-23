const notifier = require("node-notifier");
const path = require("path");

const sendNotification = (message) => {
  notifier.notify(
    {
      title: `Notification`,
      message: `${message}`,
      icon: path.join(__dirname, "icon.jpg"),
      sound: true,
      wait: true,
    },
    function (err, response, metadata) {
      if (err) {
        console.error(err);
      } else {
        // console.log("Notification response:", response);
        // console.log("Notification metadata:", metadata);
      }
    }
  );
};

module.exports = sendNotification;
